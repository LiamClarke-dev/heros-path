# Ping Discovery Integration Points

## Overview

This document outlines the integration points for the Ping Discovery feature within the refactored MapScreen architecture. The ping discovery system will seamlessly integrate with the existing hook-based architecture while maintaining the modular design principles established during the MapScreen refactoring.

## Hook Extension Points

### 1. usePingDiscovery Hook

The core hook for managing ping discovery functionality, designed to integrate with existing location and map state hooks.

```javascript
/**
 * Custom hook for ping discovery functionality
 * 
 * Integrates with:
 * - useLocationTracking for current position
 * - useJourneyTracking for journey context
 * - useMapState for map interactions
 * 
 * Requirements: 9.1, 9.2
 */
const usePingDiscovery = () => {
  // State management
  const [credits, setCredits] = useState(50);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPingResults, setLastPingResults] = useState([]);
  const [animationState, setAnimationState] = useState({ visible: false, type: 'pulse' });

  // Service integration
  const pingServiceRef = useRef(null);

  // Initialize ping service
  useEffect(() => {
    pingServiceRef.current = new PingService();
    loadUserPingData();
    return cleanup;
  }, []);

  // Ping execution
  const executePing = useCallback(async (currentLocation, journeyId) => {
    if (!canPing()) return { success: false, reason: 'not_eligible' };

    try {
      setIsLoading(true);
      setAnimationState({ visible: true, type: 'pulse' });

      const results = await pingServiceRef.current.pingNearbyPlaces(
        userId, 
        journeyId, 
        currentLocation
      );

      setLastPingResults(results.places);
      updateCreditsAndCooldown();
      
      return { success: true, results: results.places };
    } catch (error) {
      console.error('Ping execution failed:', error);
      return { success: false, reason: 'api_error', error };
    } finally {
      setIsLoading(false);
      setAnimationState({ visible: false, type: 'pulse' });
    }
  }, [credits, cooldownRemaining]);

  // Eligibility checking
  const canPing = useCallback(() => {
    return credits > 0 && cooldownRemaining === 0 && !isLoading;
  }, [credits, cooldownRemaining, isLoading]);

  // Credit and cooldown management
  const updateCreditsAndCooldown = useCallback(() => {
    setCredits(prev => Math.max(0, prev - 1));
    setCooldownRemaining(10); // 10 second cooldown
    
    // Start cooldown timer
    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pingServiceRef.current) {
      pingServiceRef.current.cleanup();
    }
  }, []);

  return {
    // State
    credits,
    cooldownRemaining,
    isLoading,
    lastPingResults,
    animationState,
    
    // Actions
    executePing,
    canPing,
    
    // Utilities
    cleanup,
  };
};
```

### 2. Integration with Existing Hooks

#### useLocationTracking Integration

The ping discovery hook will consume location data from the existing `useLocationTracking` hook:

```javascript
// In MapScreen component
const MapScreen = () => {
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const pingDiscovery = usePingDiscovery();

  // Coordinate ping execution with location data
  const handlePingRequest = useCallback(async () => {
    if (!locationTracking.currentPosition) {
      console.warn('No current position available for ping');
      return;
    }

    const result = await pingDiscovery.executePing(
      locationTracking.currentPosition,
      journeyTracking.state.currentJourneyId
    );

    if (result.success) {
      // Handle successful ping results
      console.log('Ping successful:', result.results);
    } else {
      // Handle ping failure
      console.warn('Ping failed:', result.reason);
    }
  }, [locationTracking.currentPosition, journeyTracking.state.currentJourneyId]);

  return (
    // Component JSX
  );
};
```

#### useMapState Integration

The ping discovery will integrate with map state for visual feedback:

```javascript
// Enhanced useMapState hook to support ping animations
const useMapState = () => {
  // Existing state...
  const [pingAnimationCenter, setPingAnimationCenter] = useState(null);

  // Method to center animation on current position
  const centerPingAnimation = useCallback((position) => {
    setPingAnimationCenter({
      latitude: position.latitude,
      longitude: position.longitude,
    });
  }, []);

  return {
    // Existing returns...
    pingAnimationCenter,
    centerPingAnimation,
  };
};
```

## Map Overlay System Integration

### 1. PingAnimation Overlay Component

A new overlay component that integrates with the existing `MapOverlays` system:

```javascript
/**
 * Ping animation overlay component
 * 
 * Integrates with MapOverlays for consistent positioning and rendering
 * 
 * Requirements: 9.1, 9.2
 */
const PingAnimationOverlay = ({ 
  isVisible, 
  animationType, 
  centerPosition, 
  onAnimationComplete 
}) => {
  const animationRef = useRef(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Animation lifecycle
  useEffect(() => {
    if (isVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [isVisible]);

  const startAnimation = useCallback(() => {
    // Pulse animation implementation
    const animation = Animated.sequence([
      Animated.timing(animationProgress, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(animationProgress, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      onAnimationComplete?.();
    });

    animationRef.current = animation;
  }, [animationProgress, onAnimationComplete]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      setAnimationProgress(0);
    }
  }, []);

  if (!isVisible || !centerPosition) return null;

  return (
    <Animated.View
      style={[
        styles.animationContainer,
        {
          transform: [
            {
              scale: animationProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 2.0],
              }),
            },
          ],
          opacity: animationProgress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 0],
          }),
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.pulseRing} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animationContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
});
```

### 2. Integration with MapOverlays Component

The existing `MapOverlays` component will be extended to include ping animations:

```javascript
// Enhanced MapOverlays component
const MapOverlays = ({
  currentPosition,
  recentPositions,
  savedPlaces,
  clusters,
  onPlacePress,
  onClusterPress,
  // New ping-related props
  pingAnimation,
  pingResults,
  onPingResultPress,
}) => {
  return (
    <>
      {/* Existing overlays */}
      <SpriteOverlay
        currentPosition={currentPosition}
        recentPositions={recentPositions}
      />
      
      <SavedPlacesOverlay
        savedPlaces={savedPlaces}
        clusters={clusters}
        onPlacePress={onPlacePress}
        onClusterPress={onClusterPress}
      />

      {/* New ping-related overlays */}
      <PingAnimationOverlay
        isVisible={pingAnimation.visible}
        animationType={pingAnimation.type}
        centerPosition={currentPosition}
        onAnimationComplete={pingAnimation.onComplete}
      />

      <PingResultsOverlay
        results={pingResults}
        onResultPress={onPingResultPress}
        isVisible={pingResults.length > 0}
      />
    </>
  );
};
```

## Credit System Integration

### 1. Credit Management Hook Extension

The credit system will integrate with existing state management patterns:

```javascript
/**
 * Credit system integration with existing user context
 * 
 * Extends user context to include ping credits
 */
const usePingCredits = () => {
  const { user } = useContext(UserContext);
  const [credits, setCredits] = useState(50);
  const [lastReset, setLastReset] = useState(null);

  // Load credits from Firestore
  useEffect(() => {
    if (user?.uid) {
      loadUserCredits(user.uid);
    }
  }, [user?.uid]);

  // Monthly credit reset logic
  useEffect(() => {
    checkForMonthlyReset();
  }, [lastReset]);

  const loadUserCredits = useCallback(async (userId) => {
    try {
      const pingData = await PingService.getUserPingData(userId);
      setCredits(pingData.creditsRemaining);
      setLastReset(pingData.lastCreditReset);
    } catch (error) {
      console.error('Failed to load ping credits:', error);
      // Default to full credits on error
      setCredits(50);
    }
  }, []);

  const deductCredit = useCallback(async () => {
    if (credits > 0) {
      const newCredits = credits - 1;
      setCredits(newCredits);
      
      // Update in Firestore
      try {
        await PingService.updatePingUsage(user.uid);
      } catch (error) {
        console.error('Failed to update ping usage:', error);
        // Revert local state on error
        setCredits(credits);
      }
    }
  }, [credits, user?.uid]);

  const checkForMonthlyReset = useCallback(async () => {
    if (!lastReset) return;

    const now = new Date();
    const resetDate = new Date(lastReset);
    const monthsDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + 
                      (now.getMonth() - resetDate.getMonth());

    if (monthsDiff >= 1) {
      try {
        await PingService.resetMonthlyCredits(user.uid);
        setCredits(50);
        setLastReset(now.toISOString());
      } catch (error) {
        console.error('Failed to reset monthly credits:', error);
      }
    }
  }, [lastReset, user?.uid]);

  return {
    credits,
    deductCredit,
    canPing: credits > 0,
  };
};
```

### 2. Integration with MapControls

The ping button will be added to the existing `MapControls` component:

```javascript
// Enhanced MapControls component
const MapControls = ({
  onLocateMe,
  onToggleTracking,
  onToggleMapStyle,
  onToggleSavedRoutes,
  onToggleSavedPlaces,
  // New ping-related props
  onPingRequest,
  pingState,
  trackingState,
  permissions
}) => {
  if (!permissions.granted) return null;

  return (
    <>
      <View style={styles.topRightControls}>
        <LocateButton onPress={onLocateMe} />
        <MapStyleButton onPress={onToggleMapStyle} />
      </View>
      
      <View style={styles.topRightToggles}>
        <SavedRoutesToggle onPress={onToggleSavedRoutes} />
        <SavedPlacesToggle onPress={onToggleSavedPlaces} />
      </View>
      
      <View style={styles.bottomControls}>
        <TrackingButton
          onPress={onToggleTracking}
          isTracking={trackingState.isTracking}
          isAuthenticated={trackingState.isAuthenticated}
        />
        
        {/* New ping button */}
        <PingButton
          onPress={onPingRequest}
          credits={pingState.credits}
          cooldownRemaining={pingState.cooldownRemaining}
          isLoading={pingState.isLoading}
          canPing={pingState.canPing}
          disabled={!trackingState.isTracking}
        />
      </View>
    </>
  );
};
```

## Data Flow Integration

### 1. Ping Results Integration with Saved Places

Ping results will integrate with the existing saved places system:

```javascript
// Enhanced useSavedPlaces hook to include ping results
const useSavedPlaces = () => {
  // Existing saved places state...
  const [pingResults, setPingResults] = useState([]);
  const [showPingResults, setShowPingResults] = useState(true);

  // Combine saved places with ping results for display
  const combinedPlaces = useMemo(() => {
    const places = [...savedPlaces];
    
    if (showPingResults) {
      const pingPlaces = pingResults.map(result => ({
        ...result,
        source: 'ping',
        isPingResult: true,
      }));
      places.push(...pingPlaces);
    }
    
    return places;
  }, [savedPlaces, pingResults, showPingResults]);

  // Method to add ping results
  const addPingResults = useCallback((results) => {
    setPingResults(prev => [...prev, ...results]);
  }, []);

  // Method to clear ping results
  const clearPingResults = useCallback(() => {
    setPingResults([]);
  }, []);

  return {
    // Existing returns...
    combinedPlaces,
    pingResults,
    showPingResults,
    setShowPingResults,
    addPingResults,
    clearPingResults,
  };
};
```

### 2. Journey Integration

Ping results will be associated with journey data:

```javascript
// Enhanced useJourneyTracking hook to include ping data
const useJourneyTracking = () => {
  // Existing journey state...
  const [journeyPings, setJourneyPings] = useState([]);

  // Method to add ping to current journey
  const addPingToJourney = useCallback((pingResult) => {
    setJourneyPings(prev => [...prev, {
      ...pingResult,
      journeyId: currentJourneyId,
      timestamp: Date.now(),
    }]);
  }, [currentJourneyId]);

  // Enhanced save journey to include ping data
  const saveJourney = useCallback(async (name) => {
    try {
      const journeyData = {
        // Existing journey data...
        pings: journeyPings,
        pingCount: journeyPings.length,
        placesDiscovered: journeyPings.reduce((total, ping) => 
          total + ping.places.length, 0
        ),
      };

      await JourneyService.saveJourney(journeyData);
      
      // Clear ping data after saving
      setJourneyPings([]);
    } catch (error) {
      console.error('Failed to save journey with ping data:', error);
      throw error;
    }
  }, [journeyPings]);

  return {
    // Existing returns...
    journeyPings,
    addPingToJourney,
  };
};
```

## Component Integration Examples

### 1. MapScreen Integration

Complete integration example showing how ping discovery fits into the refactored MapScreen:

```javascript
const MapScreen = ({ navigation }) => {
  // Existing hooks
  const mapState = useMapState();
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();
  const permissions = useMapPermissions();
  
  // New ping discovery hook
  const pingDiscovery = usePingDiscovery();

  // Handle ping request
  const handlePingRequest = useCallback(async () => {
    if (!locationTracking.currentPosition || !journeyTracking.state.isTracking) {
      return;
    }

    const result = await pingDiscovery.executePing(
      locationTracking.currentPosition,
      journeyTracking.state.currentJourneyId
    );

    if (result.success) {
      // Add results to saved places for display
      savedPlaces.addPingResults(result.results);
      
      // Add ping to current journey
      journeyTracking.addPingToJourney({
        location: locationTracking.currentPosition,
        places: result.results,
        timestamp: Date.now(),
      });
    }
  }, [
    locationTracking.currentPosition,
    journeyTracking.state.isTracking,
    journeyTracking.state.currentJourneyId,
    pingDiscovery.executePing,
    savedPlaces.addPingResults,
    journeyTracking.addPingToJourney,
  ]);

  return (
    <View style={styles.container}>
      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
        // New ping-related props
        pingAnimation={pingDiscovery.animationState}
        pingResults={pingDiscovery.lastPingResults}
      />
      
      <MapControls
        onLocateMe={locationTracking.locateMe}
        onToggleTracking={journeyTracking.toggleTracking}
        onToggleMapStyle={mapStyle.toggleSelector}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        // New ping control
        onPingRequest={handlePingRequest}
        pingState={{
          credits: pingDiscovery.credits,
          cooldownRemaining: pingDiscovery.cooldownRemaining,
          isLoading: pingDiscovery.isLoading,
          canPing: pingDiscovery.canPing(),
        }}
        trackingState={journeyTracking.state}
        permissions={permissions}
      />
      
      <MapStatusDisplays
        journeyInfo={journeyTracking.currentJourney}
        gpsStatus={locationTracking.gpsStatus}
        // New ping status
        pingStatus={{
          credits: pingDiscovery.credits,
          lastPingTime: pingDiscovery.lastPingTime,
        }}
      />
      
      <MapModals
        journeyNaming={journeyTracking.namingModal}
        placeDetail={savedPlaces.detailModal}
        mapStyleSelector={mapStyle.selector}
        // New ping-related modals could be added here
      />
    </View>
  );
};
```

## Testing Integration Points

### 1. Hook Testing

```javascript
// Test ping discovery hook integration
describe('usePingDiscovery Integration', () => {
  test('should integrate with location tracking', async () => {
    const { result } = renderHook(() => ({
      location: useLocationTracking(),
      ping: usePingDiscovery(),
    }));

    // Mock location data
    act(() => {
      result.current.location.setCurrentPosition({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    // Execute ping
    await act(async () => {
      const pingResult = await result.current.ping.executePing(
        result.current.location.currentPosition,
        'test-journey-id'
      );
      expect(pingResult.success).toBe(true);
    });
  });
});
```

### 2. Component Integration Testing

```javascript
// Test ping button integration with MapControls
describe('MapControls Ping Integration', () => {
  test('should render ping button with correct state', () => {
    const mockPingState = {
      credits: 45,
      cooldownRemaining: 0,
      isLoading: false,
      canPing: true,
    };

    const { getByTestId } = render(
      <MapControls
        onPingRequest={jest.fn()}
        pingState={mockPingState}
        trackingState={{ isTracking: true, isAuthenticated: true }}
        permissions={{ granted: true }}
      />
    );

    const pingButton = getByTestId('ping-button');
    expect(pingButton).toBeTruthy();
    expect(pingButton.props.credits).toBe(45);
  });
});
```

## Performance Considerations

### 1. Animation Performance

- Use native driver for animations to ensure smooth performance
- Implement animation pooling to reuse animation instances
- Respect device capabilities and reduce animation complexity on lower-end devices

### 2. State Management Performance

- Use `useMemo` and `useCallback` to prevent unnecessary re-renders
- Implement proper cleanup in hooks to prevent memory leaks
- Batch state updates when possible

### 3. API Integration Performance

- Implement request debouncing to prevent rapid-fire ping requests
- Cache ping results to avoid duplicate API calls
- Use background processing for non-critical ping data updates

## Conclusion

The ping discovery integration points are designed to seamlessly extend the existing modular MapScreen architecture. By following the established patterns of custom hooks for state management and component composition for UI, the ping discovery feature will integrate naturally without disrupting the existing codebase structure.

The integration maintains the single responsibility principle, ensures proper separation of concerns, and provides clear extension points for future enhancements while preserving the performance optimizations and testing strategies established during the MapScreen refactoring.