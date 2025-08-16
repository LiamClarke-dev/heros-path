# Destination Routing Integration Points

## Overview

This document outlines the integration points for the Destination Routing feature within the refactored MapScreen architecture. The destination routing system will extend the existing modular architecture to provide turn-by-turn navigation while maintaining the exploration-focused nature of the Hero's Path app.

## Hook Extension Points

### 1. useDestinationRouting Hook

The core hook for managing destination routing functionality, designed to integrate with existing location and map state hooks.

```javascript
/**
 * Custom hook for destination routing functionality
 * 
 * Integrates with:
 * - useLocationTracking for current position and navigation
 * - useJourneyTracking for route recording
 * - useMapState for route visualization
 * 
 * Requirements: 9.1, 9.3
 */
const useDestinationRouting = () => {
  // State management
  const [activeRoute, setActiveRoute] = useState(null);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [navigationState, setNavigationState] = useState('idle'); // idle, planning, navigating
  const [currentStep, setCurrentStep] = useState(0);
  const [routeProgress, setRouteProgress] = useState(0);
  const [destination, setDestination] = useState(null);
  const [routePreferences, setRoutePreferences] = useState({
    routeType: 'optimal', // optimal, exploration, discovery
    maxDeviation: 10, // minutes
    avoidFeatures: [],
  });

  // Service integration
  const routingServiceRef = useRef(null);
  const explorationRoutingServiceRef = useRef(null);
  const discoveryRoutingServiceRef = useRef(null);

  // Initialize routing services
  useEffect(() => {
    routingServiceRef.current = new RoutingService();
    explorationRoutingServiceRef.current = new ExplorationRoutingService();
    discoveryRoutingServiceRef.current = new DiscoveryRoutingService();
    
    return cleanup;
  }, []);

  // Calculate routes to destination
  const calculateRoutes = useCallback(async (origin, destination, preferences = routePreferences) => {
    try {
      setNavigationState('planning');
      
      const routes = await Promise.all([
        // Optimal route
        routingServiceRef.current.calculateRoutes(origin, destination, {
          ...preferences,
          routeType: 'optimal'
        }),
        
        // Exploration route (if enabled)
        preferences.includeExploration ? 
          explorationRoutingServiceRef.current.calculateExplorationRoute(
            origin, destination, preferences
          ) : null,
          
        // Discovery route (if enabled)
        preferences.includeDiscovery ?
          discoveryRoutingServiceRef.current.calculateDiscoveryRoute(
            origin, destination, preferences
          ) : null,
      ]);

      const validRoutes = routes.filter(Boolean);
      setAvailableRoutes(validRoutes);
      
      return validRoutes;
    } catch (error) {
      console.error('Route calculation failed:', error);
      setNavigationState('idle');
      throw error;
    }
  }, [routePreferences]);

  // Start navigation with selected route
  const startNavigation = useCallback(async (route) => {
    try {
      setActiveRoute(route);
      setCurrentStep(0);
      setRouteProgress(0);
      setNavigationState('navigating');
      
      await routingServiceRef.current.startNavigation(route.id);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to start navigation:', error);
      setNavigationState('idle');
      return { success: false, error };
    }
  }, []);

  // Stop navigation
  const stopNavigation = useCallback(async () => {
    try {
      if (activeRoute) {
        await routingServiceRef.current.stopNavigation();
      }
      
      setActiveRoute(null);
      setCurrentStep(0);
      setRouteProgress(0);
      setNavigationState('idle');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to stop navigation:', error);
      return { success: false, error };
    }
  }, [activeRoute]);

  // Update navigation progress
  const updateNavigationProgress = useCallback((currentPosition) => {
    if (!activeRoute || navigationState !== 'navigating') return;

    // Calculate progress and current step
    const progress = calculateRouteProgress(currentPosition, activeRoute);
    const step = getCurrentNavigationStep(currentPosition, activeRoute);
    
    setRouteProgress(progress);
    setCurrentStep(step);

    // Check for route completion
    if (progress >= 1.0) {
      handleRouteCompletion();
    }
  }, [activeRoute, navigationState]);

  // Handle route completion
  const handleRouteCompletion = useCallback(async () => {
    try {
      await routingServiceRef.current.onRouteCompletion();
      setNavigationState('completed');
      
      // Auto-stop navigation after completion
      setTimeout(() => {
        stopNavigation();
      }, 3000);
    } catch (error) {
      console.error('Route completion handling failed:', error);
    }
  }, [stopNavigation]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (routingServiceRef.current) {
      routingServiceRef.current.cleanup();
    }
    if (explorationRoutingServiceRef.current) {
      explorationRoutingServiceRef.current.cleanup();
    }
    if (discoveryRoutingServiceRef.current) {
      discoveryRoutingServiceRef.current.cleanup();
    }
  }, []);

  return {
    // State
    activeRoute,
    availableRoutes,
    navigationState,
    currentStep,
    routeProgress,
    destination,
    routePreferences,
    
    // Actions
    calculateRoutes,
    startNavigation,
    stopNavigation,
    updateNavigationProgress,
    setDestination,
    setRoutePreferences,
    
    // Computed values
    isNavigating: navigationState === 'navigating',
    isPlanning: navigationState === 'planning',
    currentInstruction: activeRoute?.steps[currentStep]?.instruction,
    remainingDistance: activeRoute ? calculateRemainingDistance(currentStep, activeRoute) : 0,
    estimatedTimeRemaining: activeRoute ? calculateEstimatedTime(currentStep, activeRoute) : 0,
    
    // Utilities
    cleanup,
  };
};
```

### 2. Integration with Existing Hooks

#### useLocationTracking Integration

The destination routing hook will consume and enhance location tracking:

```javascript
// Enhanced useLocationTracking hook for navigation support
const useLocationTracking = () => {
  // Existing location tracking state...
  const [navigationMode, setNavigationMode] = useState(false);
  const [routeDeviation, setRouteDeviation] = useState(null);

  // Enhanced location tracking for navigation
  const startNavigationTracking = useCallback(async (route) => {
    setNavigationMode(true);
    
    // Increase location accuracy for navigation
    await locationServiceRef.current.setHighAccuracyMode(true);
    
    // Set up route deviation monitoring
    setupRouteDeviationMonitoring(route);
  }, []);

  const stopNavigationTracking = useCallback(async () => {
    setNavigationMode(false);
    setRouteDeviation(null);
    
    // Return to normal accuracy mode
    await locationServiceRef.current.setHighAccuracyMode(false);
  }, []);

  const setupRouteDeviationMonitoring = useCallback((route) => {
    // Monitor for significant deviations from planned route
    const deviationThreshold = 50; // meters
    
    const checkDeviation = (currentPosition) => {
      const distanceFromRoute = calculateDistanceFromRoute(currentPosition, route);
      
      if (distanceFromRoute > deviationThreshold) {
        setRouteDeviation({
          distance: distanceFromRoute,
          suggestRecalculation: distanceFromRoute > 100,
        });
      } else {
        setRouteDeviation(null);
      }
    };

    // Add to location update callbacks
    addLocationUpdateCallback(checkDeviation);
  }, []);

  return {
    // Existing returns...
    navigationMode,
    routeDeviation,
    startNavigationTracking,
    stopNavigationTracking,
  };
};
```

#### useJourneyTracking Integration

Journey tracking will be enhanced to record navigated routes:

```javascript
// Enhanced useJourneyTracking hook for route recording
const useJourneyTracking = () => {
  // Existing journey state...
  const [navigatedRoute, setNavigatedRoute] = useState(null);
  const [routeDeviations, setRouteDeviations] = useState([]);

  // Start route-based journey
  const startRouteJourney = useCallback(async (route) => {
    const journeyId = await startJourney();
    
    setNavigatedRoute({
      routeId: route.id,
      plannedRoute: route,
      startTime: Date.now(),
      deviations: [],
    });
    
    return journeyId;
  }, [startJourney]);

  // Record route deviation
  const recordRouteDeviation = useCallback((deviation) => {
    setRouteDeviations(prev => [...prev, {
      ...deviation,
      timestamp: Date.now(),
    }]);
  }, []);

  // Complete route-based journey
  const completeRouteJourney = useCallback(async (completionData) => {
    const journeyData = {
      // Existing journey data...
      navigatedRoute: {
        ...navigatedRoute,
        endTime: Date.now(),
        completed: completionData.completed,
        deviations: routeDeviations,
        actualDistance: completionData.actualDistance,
        actualDuration: completionData.actualDuration,
      },
    };

    await saveJourney(journeyData);
    
    setNavigatedRoute(null);
    setRouteDeviations([]);
  }, [navigatedRoute, routeDeviations, saveJourney]);

  return {
    // Existing returns...
    navigatedRoute,
    routeDeviations,
    startRouteJourney,
    recordRouteDeviation,
    completeRouteJourney,
  };
};
```

## MapPolylines Component Extension

### 1. Enhanced MapPolylines for Route Rendering

The existing `MapPolylines` component will be extended to support route visualization:

```javascript
/**
 * Enhanced MapPolylines component with route rendering support
 * 
 * Extends existing polyline rendering for destination routing
 * 
 * Requirements: 9.1, 9.3
 */
const MapPolylines = ({
  currentPath,
  savedRoutes,
  styleConfig,
  // New route-related props
  activeRoute,
  availableRoutes,
  routeProgress,
  showAlternativeRoutes,
}) => {
  // Existing polyline rendering...

  // Route polyline rendering
  const renderRoutePolylines = useCallback(() => {
    if (!activeRoute && !availableRoutes.length) return null;

    return (
      <>
        {/* Alternative routes (dimmed) */}
        {showAlternativeRoutes && availableRoutes.map((route, index) => (
          <Polyline
            key={`alt-route-${index}`}
            coordinates={route.waypoints}
            strokeColor={getAlternativeRouteColor(route.routeType)}
            strokeWidth={3}
            strokeOpacity={0.5}
            lineDashPattern={[5, 5]}
          />
        ))}

        {/* Active route */}
        {activeRoute && (
          <>
            {/* Completed portion */}
            <Polyline
              key="active-route-completed"
              coordinates={getCompletedRouteSegment(activeRoute, routeProgress)}
              strokeColor={getActiveRouteColor('completed')}
              strokeWidth={5}
              strokeOpacity={0.8}
            />
            
            {/* Remaining portion */}
            <Polyline
              key="active-route-remaining"
              coordinates={getRemainingRouteSegment(activeRoute, routeProgress)}
              strokeColor={getActiveRouteColor('remaining')}
              strokeWidth={5}
              strokeOpacity={1.0}
            />
            
            {/* Turn indicators */}
            {renderTurnIndicators(activeRoute)}
          </>
        )}
      </>
    );
  }, [activeRoute, availableRoutes, routeProgress, showAlternativeRoutes]);

  // Turn indicator rendering
  const renderTurnIndicators = useCallback((route) => {
    return route.steps
      .filter(step => step.maneuver !== 'straight')
      .map((step, index) => (
        <Marker
          key={`turn-${index}`}
          coordinate={step.startLocation}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.turnIndicator}>
            <TurnIcon maneuver={step.maneuver} />
          </View>
        </Marker>
      ));
  }, []);

  // Color scheme for different route types
  const getActiveRouteColor = useCallback((segment) => {
    const colors = {
      completed: '#4CAF50', // Green for completed
      remaining: '#2196F3',  // Blue for remaining
    };
    return colors[segment] || '#2196F3';
  }, []);

  const getAlternativeRouteColor = useCallback((routeType) => {
    const colors = {
      optimal: '#9E9E9E',     // Gray for optimal
      exploration: '#FF9800', // Orange for exploration
      discovery: '#9C27B0',   // Purple for discovery
    };
    return colors[routeType] || '#9E9E9E';
  }, []);

  return (
    <>
      {/* Existing polylines */}
      <Polyline
        coordinates={currentPath}
        strokeColor={styleConfig.pathColor}
        strokeWidth={4}
      />
      
      {savedRoutes.map((route, index) => (
        <Polyline
          key={`saved-${index}`}
          coordinates={route.path}
          strokeColor={styleConfig.savedRouteColor}
          strokeWidth={2}
          strokeOpacity={0.7}
        />
      ))}

      {/* New route polylines */}
      {renderRoutePolylines()}
    </>
  );
};

const styles = StyleSheet.create({
  turnIndicator: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### 2. TurnIcon Component

A specialized component for rendering turn indicators:

```javascript
/**
 * Turn icon component for navigation indicators
 */
const TurnIcon = ({ maneuver, size = 16 }) => {
  const getIconName = useCallback((maneuver) => {
    const iconMap = {
      'turn-left': 'turn-left',
      'turn-right': 'turn-right',
      'turn-slight-left': 'turn-slight-left',
      'turn-slight-right': 'turn-slight-right',
      'turn-sharp-left': 'turn-sharp-left',
      'turn-sharp-right': 'turn-sharp-right',
      'uturn-left': 'u-turn-left',
      'uturn-right': 'u-turn-right',
      'continue': 'arrow-up',
      'merge': 'merge',
      'roundabout-left': 'rotate-ccw',
      'roundabout-right': 'rotate-cw',
    };
    return iconMap[maneuver] || 'arrow-up';
  }, []);

  return (
    <Ionicons
      name={getIconName(maneuver)}
      size={size}
      color="#2196F3"
    />
  );
};
```

## MapControls Component Integration

### 1. Navigation Controls Integration

The existing `MapControls` component will be extended with navigation controls:

```javascript
/**
 * Enhanced MapControls component with navigation controls
 * 
 * Integrates navigation controls with existing map controls
 * 
 * Requirements: 9.1, 9.3
 */
const MapControls = ({
  onLocateMe,
  onToggleTracking,
  onToggleMapStyle,
  onToggleSavedRoutes,
  onToggleSavedPlaces,
  // New navigation-related props
  onStartRoutePlanning,
  onStopNavigation,
  onToggleAlternativeRoutes,
  navigationState,
  routingState,
  trackingState,
  permissions
}) => {
  if (!permissions.granted) return null;

  return (
    <>
      {/* Existing controls */}
      <View style={styles.topRightControls}>
        <LocateButton onPress={onLocateMe} />
        <MapStyleButton onPress={onToggleMapStyle} />
      </View>
      
      <View style={styles.topRightToggles}>
        <SavedRoutesToggle onPress={onToggleSavedRoutes} />
        <SavedPlacesToggle onPress={onToggleSavedPlaces} />
        
        {/* New alternative routes toggle */}
        {routingState.availableRoutes.length > 1 && (
          <AlternativeRoutesToggle 
            onPress={onToggleAlternativeRoutes}
            isVisible={routingState.showAlternativeRoutes}
          />
        )}
      </View>
      
      <View style={styles.bottomControls}>
        <TrackingButton
          onPress={onToggleTracking}
          isTracking={trackingState.isTracking}
          isAuthenticated={trackingState.isAuthenticated}
        />
        
        {/* Navigation controls */}
        {navigationState === 'idle' && (
          <RoutePlanningButton
            onPress={onStartRoutePlanning}
            disabled={!trackingState.isAuthenticated}
          />
        )}
        
        {navigationState === 'navigating' && (
          <StopNavigationButton
            onPress={onStopNavigation}
          />
        )}
      </View>
    </>
  );
};
```

### 2. Navigation Control Components

#### RoutePlanningButton Component

```javascript
/**
 * Route planning button component
 */
const RoutePlanningButton = ({ onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.controlButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      testID="route-planning-button"
    >
      <Ionicons name="navigate" size={24} color={disabled ? '#999' : '#007AFF'} />
      <Text style={[styles.buttonText, disabled && styles.disabledText]}>
        Route
      </Text>
    </TouchableOpacity>
  );
};
```

#### StopNavigationButton Component

```javascript
/**
 * Stop navigation button component
 */
const StopNavigationButton = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.controlButton, styles.stopButton]}
      onPress={onPress}
      testID="stop-navigation-button"
    >
      <Ionicons name="stop" size={24} color="#FF3B30" />
      <Text style={[styles.buttonText, styles.stopButtonText]}>
        Stop
      </Text>
    </TouchableOpacity>
  );
};
```

#### AlternativeRoutesToggle Component

```javascript
/**
 * Alternative routes toggle component
 */
const AlternativeRoutesToggle = ({ onPress, isVisible }) => {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, isVisible && styles.activeToggle]}
      onPress={onPress}
      testID="alternative-routes-toggle"
    >
      <Ionicons 
        name="git-branch" 
        size={20} 
        color={isVisible ? '#007AFF' : '#666'} 
      />
    </TouchableOpacity>
  );
};
```

## MapStatusDisplays Component Integration

### 1. Turn-by-Turn Display Integration

The existing `MapStatusDisplays` component will be extended with navigation information:

```javascript
/**
 * Enhanced MapStatusDisplays component with navigation support
 * 
 * Integrates turn-by-turn navigation with existing status displays
 * 
 * Requirements: 9.1, 9.3
 */
const MapStatusDisplays = ({
  journeyInfo,
  gpsStatus,
  // New navigation-related props
  navigationState,
  activeRoute,
  currentStep,
  routeProgress,
  routeDeviation,
}) => {
  return (
    <>
      {/* Existing status displays */}
      <JourneyInfoDisplay journeyInfo={journeyInfo} />
      
      {/* Navigation status displays */}
      {navigationState === 'navigating' && activeRoute && (
        <>
          <TurnByTurnDisplay
            currentStep={activeRoute.steps[currentStep]}
            upcomingStep={activeRoute.steps[currentStep + 1]}
            remainingDistance={calculateRemainingDistance(currentStep, activeRoute)}
            estimatedTime={calculateEstimatedTime(currentStep, activeRoute)}
          />
          
          <RouteProgressDisplay
            progress={routeProgress}
            totalDistance={activeRoute.distance}
            totalTime={activeRoute.duration}
          />
        </>
      )}
      
      {/* Route deviation alert */}
      {routeDeviation && (
        <RouteDeviationAlert
          deviation={routeDeviation}
          onRecalculate={() => {/* Handle recalculation */}}
          onIgnore={() => {/* Handle ignore */}}
        />
      )}
    </>
  );
};
```

### 2. Navigation Display Components

#### TurnByTurnDisplay Component

```javascript
/**
 * Turn-by-turn navigation display component
 */
const TurnByTurnDisplay = ({ 
  currentStep, 
  upcomingStep, 
  remainingDistance, 
  estimatedTime 
}) => {
  if (!currentStep) return null;

  return (
    <View style={styles.turnByTurnContainer}>
      <View style={styles.currentInstruction}>
        <TurnIcon maneuver={currentStep.maneuver} size={32} />
        <View style={styles.instructionText}>
          <Text style={styles.primaryInstruction}>
            {currentStep.instruction}
          </Text>
          <Text style={styles.distanceText}>
            {formatDistance(currentStep.distance)}
          </Text>
        </View>
      </View>
      
      {upcomingStep && (
        <View style={styles.upcomingInstruction}>
          <TurnIcon maneuver={upcomingStep.maneuver} size={16} />
          <Text style={styles.upcomingText}>
            Then {upcomingStep.instruction}
          </Text>
        </View>
      )}
      
      <View style={styles.routeInfo}>
        <Text style={styles.routeInfoText}>
          {formatDistance(remainingDistance)} • {formatTime(estimatedTime)}
        </Text>
      </View>
    </View>
  );
};
```

#### RouteProgressDisplay Component

```javascript
/**
 * Route progress display component
 */
const RouteProgressDisplay = ({ 
  progress, 
  totalDistance, 
  totalTime 
}) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${Math.min(progress * 100, 100)}%` }
          ]} 
        />
      </View>
      
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {Math.round(progress * 100)}% complete
        </Text>
        <Text style={styles.totalInfo}>
          {formatDistance(totalDistance)} • {formatTime(totalTime)}
        </Text>
      </View>
    </View>
  );
};
```

#### RouteDeviationAlert Component

```javascript
/**
 * Route deviation alert component
 */
const RouteDeviationAlert = ({ deviation, onRecalculate, onIgnore }) => {
  return (
    <View style={styles.deviationAlert}>
      <View style={styles.alertContent}>
        <Ionicons name="warning" size={20} color="#FF9500" />
        <Text style={styles.alertText}>
          You're {formatDistance(deviation.distance)} off route
        </Text>
      </View>
      
      <View style={styles.alertActions}>
        {deviation.suggestRecalculation && (
          <TouchableOpacity 
            style={styles.recalculateButton}
            onPress={onRecalculate}
          >
            <Text style={styles.recalculateText}>Recalculate</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.ignoreButton}
          onPress={onIgnore}
        >
          <Text style={styles.ignoreText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

## Data Flow Integration

### 1. Route Planning Integration

Route planning will integrate with the existing map state and user interactions:

```javascript
// Enhanced MapScreen integration for route planning
const MapScreen = ({ navigation }) => {
  // Existing hooks
  const mapState = useMapState();
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();
  const permissions = useMapPermissions();
  
  // New destination routing hook
  const destinationRouting = useDestinationRouting();

  // Handle route planning start
  const handleStartRoutePlanning = useCallback(() => {
    navigation.navigate('RoutePlanner', {
      currentLocation: locationTracking.currentPosition,
      onRouteSelected: handleRouteSelected,
    });
  }, [locationTracking.currentPosition, navigation]);

  // Handle route selection
  const handleRouteSelected = useCallback(async (route) => {
    try {
      // Start navigation tracking
      await locationTracking.startNavigationTracking(route);
      
      // Start route-based journey
      const journeyId = await journeyTracking.startRouteJourney(route);
      
      // Start navigation
      const result = await destinationRouting.startNavigation(route);
      
      if (result.success) {
        // Navigate back to map
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to start navigation:', error);
    }
  }, [locationTracking, journeyTracking, destinationRouting, navigation]);

  // Handle navigation stop
  const handleStopNavigation = useCallback(async () => {
    try {
      // Stop navigation
      await destinationRouting.stopNavigation();
      
      // Stop navigation tracking
      await locationTracking.stopNavigationTracking();
      
      // Complete route journey
      await journeyTracking.completeRouteJourney({
        completed: destinationRouting.routeProgress >= 1.0,
        actualDistance: journeyTracking.currentJourney.distance,
        actualDuration: journeyTracking.currentJourney.duration,
      });
    } catch (error) {
      console.error('Failed to stop navigation:', error);
    }
  }, [destinationRouting, locationTracking, journeyTracking]);

  // Update navigation progress
  useEffect(() => {
    if (destinationRouting.isNavigating && locationTracking.currentPosition) {
      destinationRouting.updateNavigationProgress(locationTracking.currentPosition);
    }
  }, [
    destinationRouting.isNavigating,
    locationTracking.currentPosition,
    destinationRouting.updateNavigationProgress,
  ]);

  // Handle route deviation
  useEffect(() => {
    if (locationTracking.routeDeviation) {
      journeyTracking.recordRouteDeviation(locationTracking.routeDeviation);
    }
  }, [locationTracking.routeDeviation, journeyTracking.recordRouteDeviation]);

  return (
    <View style={styles.container}>
      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
        // New routing-related props
        activeRoute={destinationRouting.activeRoute}
        availableRoutes={destinationRouting.availableRoutes}
        routeProgress={destinationRouting.routeProgress}
        showAlternativeRoutes={destinationRouting.showAlternativeRoutes}
      />
      
      <MapControls
        onLocateMe={locationTracking.locateMe}
        onToggleTracking={journeyTracking.toggleTracking}
        onToggleMapStyle={mapStyle.toggleSelector}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        // New navigation controls
        onStartRoutePlanning={handleStartRoutePlanning}
        onStopNavigation={handleStopNavigation}
        onToggleAlternativeRoutes={destinationRouting.toggleAlternativeRoutes}
        navigationState={destinationRouting.navigationState}
        routingState={destinationRouting}
        trackingState={journeyTracking.state}
        permissions={permissions}
      />
      
      <MapStatusDisplays
        journeyInfo={journeyTracking.currentJourney}
        gpsStatus={locationTracking.gpsStatus}
        // New navigation status
        navigationState={destinationRouting.navigationState}
        activeRoute={destinationRouting.activeRoute}
        currentStep={destinationRouting.currentStep}
        routeProgress={destinationRouting.routeProgress}
        routeDeviation={locationTracking.routeDeviation}
      />
      
      <MapModals
        journeyNaming={journeyTracking.namingModal}
        placeDetail={savedPlaces.detailModal}
        mapStyleSelector={mapStyle.selector}
        // Navigation modals could be added here
      />
    </View>
  );
};
```

### 2. Route Data Integration with Saved Routes

Navigated routes will be integrated with the saved routes system:

```javascript
// Enhanced useSavedRoutes hook to include navigated routes
const useSavedRoutes = () => {
  // Existing saved routes state...
  const [navigatedRoutes, setNavigatedRoutes] = useState([]);
  const [showNavigatedRoutes, setShowNavigatedRoutes] = useState(true);

  // Combine saved routes with navigated routes
  const combinedRoutes = useMemo(() => {
    const routes = [...savedRoutes];
    
    if (showNavigatedRoutes) {
      const navRoutes = navigatedRoutes.map(route => ({
        ...route,
        source: 'navigation',
        isNavigatedRoute: true,
      }));
      routes.push(...navRoutes);
    }
    
    return routes;
  }, [savedRoutes, navigatedRoutes, showNavigatedRoutes]);

  // Add navigated route
  const addNavigatedRoute = useCallback((route) => {
    setNavigatedRoutes(prev => [...prev, {
      ...route,
      timestamp: Date.now(),
      source: 'navigation',
    }]);
  }, []);

  return {
    // Existing returns...
    combinedRoutes,
    navigatedRoutes,
    showNavigatedRoutes,
    setShowNavigatedRoutes,
    addNavigatedRoute,
  };
};
```

## Testing Integration Points

### 1. Hook Testing

```javascript
// Test destination routing hook integration
describe('useDestinationRouting Integration', () => {
  test('should integrate with location tracking for navigation', async () => {
    const { result } = renderHook(() => ({
      location: useLocationTracking(),
      routing: useDestinationRouting(),
    }));

    // Mock route data
    const mockRoute = {
      id: 'test-route',
      waypoints: [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
      ],
      steps: [
        { instruction: 'Head north', maneuver: 'straight', distance: 100 },
      ],
    };

    // Start navigation
    await act(async () => {
      const result = await result.current.routing.startNavigation(mockRoute);
      expect(result.success).toBe(true);
    });

    expect(result.current.routing.isNavigating).toBe(true);
  });
});
```

### 2. Component Integration Testing

```javascript
// Test navigation controls integration
describe('MapControls Navigation Integration', () => {
  test('should show navigation controls based on state', () => {
    const { getByTestId, queryByTestId } = render(
      <MapControls
        navigationState="idle"
        routingState={{ availableRoutes: [] }}
        trackingState={{ isAuthenticated: true }}
        permissions={{ granted: true }}
        onStartRoutePlanning={jest.fn()}
      />
    );

    expect(getByTestId('route-planning-button')).toBeTruthy();
    expect(queryByTestId('stop-navigation-button')).toBeNull();
  });

  test('should show stop navigation when navigating', () => {
    const { getByTestId, queryByTestId } = render(
      <MapControls
        navigationState="navigating"
        routingState={{ availableRoutes: [] }}
        trackingState={{ isAuthenticated: true }}
        permissions={{ granted: true }}
        onStopNavigation={jest.fn()}
      />
    );

    expect(getByTestId('stop-navigation-button')).toBeTruthy();
    expect(queryByTestId('route-planning-button')).toBeNull();
  });
});
```

## Performance Considerations

### 1. Route Calculation Performance

- Use background processing for complex route calculations
- Implement progressive route enhancement (optimal first, then exploration/discovery)
- Cache calculated routes for common origin-destination pairs

### 2. Navigation Performance

- Optimize location update frequency based on navigation needs
- Use geofencing for turn-by-turn instructions to reduce battery usage
- Implement efficient route progress calculation algorithms

### 3. UI Performance

- Use React.memo for navigation components to prevent unnecessary re-renders
- Implement virtualization for route lists when showing multiple options
- Optimize polyline rendering for complex routes

## Conclusion

The destination routing integration points are designed to seamlessly extend the existing modular MapScreen architecture while adding comprehensive navigation capabilities. The integration maintains the established patterns of custom hooks for state management and component composition for UI, ensuring that the navigation features integrate naturally without disrupting the existing codebase structure.

The integration preserves the single responsibility principle, ensures proper separation of concerns, and provides clear extension points for future enhancements while maintaining the performance optimizations and testing strategies established during the MapScreen refactoring. The navigation system enhances the exploration experience while maintaining the core values of discovery and adventure that define Hero's Path.