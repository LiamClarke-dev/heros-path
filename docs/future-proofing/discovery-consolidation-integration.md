# Discovery Consolidation Integration Points

## Overview

This document outlines the integration points for the Discovery Consolidation feature within the refactored MapScreen architecture. The discovery consolidation system will integrate with the existing hook-based architecture to provide seamless data flow patterns for consolidated discovery data, extending the saved places system, and integrating with journey completion workflows.

## Hook Extension Points

### 1. useDiscoveryConsolidation Hook

The core hook for managing discovery consolidation functionality, designed to integrate with existing journey and discovery hooks.

```javascript
/**
 * Custom hook for discovery consolidation functionality
 * 
 * Integrates with:
 * - useJourneyTracking for journey completion triggers
 * - useSavedPlaces for consolidated discovery display
 * - useLocationTracking for route data
 * 
 * Requirements: 9.1, 9.5
 */
const useDiscoveryConsolidation = () => {
  // State management
  const [consolidationStatus, setConsolidationStatus] = useState('idle'); // idle, processing, completed, error
  const [consolidatedDiscoveries, setConsolidatedDiscoveries] = useState([]);
  const [consolidationStats, setConsolidationStats] = useState(null);
  const [pendingConsolidation, setPendingConsolidation] = useState(null);
  const [consolidationHistory, setConsolidationHistory] = useState([]);

  // Service integration
  const consolidationServiceRef = useRef(null);

  // Initialize consolidation service
  useEffect(() => {
    consolidationServiceRef.current = new DiscoveryConsolidationService();
    loadConsolidationHistory();
    return cleanup;
  }, []);

  // Trigger consolidation for completed journey
  const consolidateJourneyDiscoveries = useCallback(async (journeyData) => {
    try {
      setConsolidationStatus('processing');
      setPendingConsolidation(journeyData);

      const result = await consolidationServiceRef.current.consolidateJourneyDiscoveries(
        journeyData.userId,
        journeyData.journeyId,
        journeyData.routeCoordinates,
        journeyData.discoveryPreferences
      );

      // Update state with consolidated results
      setConsolidatedDiscoveries(result.consolidatedPlaces);
      setConsolidationStats({
        sarPlaces: result.sarPlaces,
        pingPlaces: result.pingPlaces,
        consolidatedPlaces: result.consolidatedPlaces,
        savedCount: result.savedCount,
        journeyId: journeyData.journeyId,
        timestamp: Date.now(),
      });

      setConsolidationStatus('completed');
      setPendingConsolidation(null);

      // Add to history
      setConsolidationHistory(prev => [...prev, {
        journeyId: journeyData.journeyId,
        timestamp: Date.now(),
        stats: result,
      }]);

      return { success: true, result };
    } catch (error) {
      console.error('Discovery consolidation failed:', error);
      setConsolidationStatus('error');
      setPendingConsolidation(null);
      return { success: false, error };
    }
  }, []);

  // Get consolidation statistics for a journey
  const getConsolidationStats = useCallback(async (journeyId) => {
    try {
      const stats = await consolidationServiceRef.current.getConsolidationStats(
        userId,
        journeyId
      );
      return stats;
    } catch (error) {
      console.error('Failed to get consolidation stats:', error);
      return null;
    }
  }, []);

  // Load consolidation history
  const loadConsolidationHistory = useCallback(async () => {
    try {
      // Load from local storage or service
      const history = await AsyncStorage.getItem('consolidation_history');
      if (history) {
        setConsolidationHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Failed to load consolidation history:', error);
    }
  }, []);

  // Clear consolidation data
  const clearConsolidationData = useCallback(() => {
    setConsolidatedDiscoveries([]);
    setConsolidationStats(null);
    setConsolidationStatus('idle');
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (consolidationServiceRef.current) {
      consolidationServiceRef.current.cleanup();
    }
  }, []);

  return {
    // State
    consolidationStatus,
    consolidatedDiscoveries,
    consolidationStats,
    pendingConsolidation,
    consolidationHistory,
    
    // Actions
    consolidateJourneyDiscoveries,
    getConsolidationStats,
    clearConsolidationData,
    
    // Computed values
    isProcessing: consolidationStatus === 'processing',
    isCompleted: consolidationStatus === 'completed',
    hasError: consolidationStatus === 'error',
    
    // Utilities
    cleanup,
  };
};
```

### 2. Integration with Existing Hooks

#### useJourneyTracking Integration

The journey tracking hook will be enhanced to trigger consolidation on journey completion:

```javascript
// Enhanced useJourneyTracking hook with consolidation integration
const useJourneyTracking = () => {
  // Existing journey state...
  const [journeyDiscoveries, setJourneyDiscoveries] = useState({
    sarResults: [],
    pingResults: [],
    consolidatedResults: [],
  });

  // Integration with consolidation hook
  const consolidation = useDiscoveryConsolidation();

  // Enhanced journey completion with consolidation
  const completeJourney = useCallback(async (journeyName) => {
    try {
      // Save journey data first
      const journeyData = {
        // Existing journey data...
        routeCoordinates: currentPath,
        discoveryPreferences: await getDiscoveryPreferences(),
        sarResults: journeyDiscoveries.sarResults,
        pingResults: journeyDiscoveries.pingResults,
      };

      const savedJourney = await saveJourney(journeyData);

      // Trigger discovery consolidation
      const consolidationResult = await consolidation.consolidateJourneyDiscoveries({
        userId: user.uid,
        journeyId: savedJourney.id,
        routeCoordinates: journeyData.routeCoordinates,
        discoveryPreferences: journeyData.discoveryPreferences,
      });

      if (consolidationResult.success) {
        // Update journey with consolidated discoveries
        setJourneyDiscoveries(prev => ({
          ...prev,
          consolidatedResults: consolidationResult.result.consolidatedPlaces,
        }));

        // Show consolidation results to user
        showConsolidationResults(consolidationResult.result);
      }

      return { success: true, journey: savedJourney, consolidation: consolidationResult };
    } catch (error) {
      console.error('Journey completion with consolidation failed:', error);
      throw error;
    }
  }, [currentPath, journeyDiscoveries, consolidation, user?.uid]);

  // Add SAR results to journey
  const addSARResults = useCallback((results) => {
    setJourneyDiscoveries(prev => ({
      ...prev,
      sarResults: [...prev.sarResults, ...results],
    }));
  }, []);

  // Add ping results to journey
  const addPingResults = useCallback((results) => {
    setJourneyDiscoveries(prev => ({
      ...prev,
      pingResults: [...prev.pingResults, ...results],
    }));
  }, []);

  return {
    // Existing returns...
    journeyDiscoveries,
    addSARResults,
    addPingResults,
    completeJourney, // Enhanced with consolidation
  };
};
```

#### useSavedPlaces Integration

The saved places hook will be enhanced to handle consolidated discovery data:

```javascript
// Enhanced useSavedPlaces hook with consolidation support
const useSavedPlaces = () => {
  // Existing saved places state...
  const [consolidatedDiscoveries, setConsolidatedDiscoveries] = useState([]);
  const [showConsolidatedDiscoveries, setShowConsolidatedDiscoveries] = useState(true);
  const [discoveryFilter, setDiscoveryFilter] = useState('all'); // all, saved, dismissed, pending

  // Integration with consolidation hook
  const consolidation = useDiscoveryConsolidation();

  // Combine saved places with consolidated discoveries
  const combinedPlaces = useMemo(() => {
    let places = [...savedPlaces];
    
    if (showConsolidatedDiscoveries) {
      const filteredDiscoveries = filterConsolidatedDiscoveries(
        consolidatedDiscoveries,
        discoveryFilter
      );
      
      const discoveryPlaces = filteredDiscoveries.map(discovery => ({
        ...discovery,
        source: 'consolidated',
        isConsolidatedDiscovery: true,
        // Map consolidated discovery fields to place fields
        id: discovery.id,
        name: discovery.placeName,
        location: discovery.location,
        placeType: discovery.placeType,
        rating: discovery.placeData?.rating,
        // Additional consolidated data
        allSources: discovery.allSources,
        pingCount: discovery.pingCount,
        sarCount: discovery.sarCount,
      }));
      
      places.push(...discoveryPlaces);
    }
    
    return places;
  }, [savedPlaces, consolidatedDiscoveries, showConsolidatedDiscoveries, discoveryFilter]);

  // Filter consolidated discoveries based on user preference
  const filterConsolidatedDiscoveries = useCallback((discoveries, filter) => {
    switch (filter) {
      case 'saved':
        return discoveries.filter(d => d.saved);
      case 'dismissed':
        return discoveries.filter(d => d.dismissed);
      case 'pending':
        return discoveries.filter(d => !d.saved && !d.dismissed);
      default:
        return discoveries;
    }
  }, []);

  // Load consolidated discoveries for current journey
  const loadConsolidatedDiscoveries = useCallback(async (journeyId) => {
    try {
      const discoveries = await DiscoveryService.getConsolidatedDiscoveries(
        user.uid,
        journeyId
      );
      setConsolidatedDiscoveries(discoveries);
    } catch (error) {
      console.error('Failed to load consolidated discoveries:', error);
    }
  }, [user?.uid]);

  // Handle discovery action (save/dismiss)
  const handleDiscoveryAction = useCallback(async (discoveryId, action) => {
    try {
      await DiscoveryService.updateDiscoveryStatus(discoveryId, action);
      
      // Update local state
      setConsolidatedDiscoveries(prev => 
        prev.map(discovery => 
          discovery.id === discoveryId 
            ? { ...discovery, [action]: true }
            : discovery
        )
      );
    } catch (error) {
      console.error(`Failed to ${action} discovery:`, error);
    }
  }, []);

  // Update consolidated discoveries from consolidation hook
  useEffect(() => {
    if (consolidation.consolidatedDiscoveries.length > 0) {
      setConsolidatedDiscoveries(consolidation.consolidatedDiscoveries);
    }
  }, [consolidation.consolidatedDiscoveries]);

  return {
    // Existing returns...
    combinedPlaces,
    consolidatedDiscoveries,
    showConsolidatedDiscoveries,
    setShowConsolidatedDiscoveries,
    discoveryFilter,
    setDiscoveryFilter,
    loadConsolidatedDiscoveries,
    handleDiscoveryAction,
  };
};
```

## Data Flow Patterns

### 1. Journey Completion Flow

The consolidated discovery data flow during journey completion:

```javascript
/**
 * Journey completion flow with discovery consolidation
 */
const JourneyCompletionFlow = () => {
  const journeyTracking = useJourneyTracking();
  const consolidation = useDiscoveryConsolidation();
  const savedPlaces = useSavedPlaces();

  const handleJourneyCompletion = useCallback(async (journeyName) => {
    try {
      // 1. Complete journey and trigger consolidation
      const result = await journeyTracking.completeJourney(journeyName);
      
      if (result.success && result.consolidation.success) {
        // 2. Update saved places with consolidated discoveries
        savedPlaces.loadConsolidatedDiscoveries(result.journey.id);
        
        // 3. Show consolidation results modal
        showConsolidationResultsModal({
          stats: result.consolidation.result,
          discoveries: result.consolidation.result.consolidatedPlaces,
        });
      }
    } catch (error) {
      console.error('Journey completion flow failed:', error);
    }
  }, [journeyTracking, consolidation, savedPlaces]);

  return { handleJourneyCompletion };
};
```

### 2. Real-time Discovery Integration

Integration pattern for real-time discovery updates during journey:

```javascript
/**
 * Real-time discovery integration during active journey
 */
const RealTimeDiscoveryIntegration = () => {
  const journeyTracking = useJourneyTracking();
  const locationTracking = useLocationTracking();

  // Handle SAR results
  const handleSARResults = useCallback((results) => {
    // Add to journey tracking
    journeyTracking.addSARResults(results);
    
    // Optionally show immediate preview (without consolidation)
    showDiscoveryPreview(results, 'sar');
  }, [journeyTracking]);

  // Handle ping results
  const handlePingResults = useCallback((results) => {
    // Add to journey tracking
    journeyTracking.addPingResults(results);
    
    // Show immediate feedback
    showDiscoveryPreview(results, 'ping');
  }, [journeyTracking]);

  return {
    handleSARResults,
    handlePingResults,
  };
};
```

### 3. Consolidated Discovery Display

Pattern for displaying consolidated discoveries in the UI:

```javascript
/**
 * Consolidated discovery display component
 */
const ConsolidatedDiscoveryDisplay = ({ discovery }) => {
  const savedPlaces = useSavedPlaces();

  const handleSaveDiscovery = useCallback(() => {
    savedPlaces.handleDiscoveryAction(discovery.id, 'saved');
  }, [discovery.id, savedPlaces]);

  const handleDismissDiscovery = useCallback(() => {
    savedPlaces.handleDiscoveryAction(discovery.id, 'dismissed');
  }, [discovery.id, savedPlaces]);

  return (
    <View style={styles.discoveryCard}>
      <View style={styles.discoveryHeader}>
        <Text style={styles.discoveryName}>{discovery.placeName}</Text>
        <View style={styles.sourceIndicators}>
          {discovery.allSources.map(source => (
            <SourceBadge key={source} source={source} />
          ))}
        </View>
      </View>
      
      <View style={styles.discoveryDetails}>
        <Text style={styles.discoveryType}>{discovery.placeType}</Text>
        {discovery.placeData?.rating && (
          <RatingDisplay rating={discovery.placeData.rating} />
        )}
      </View>
      
      <View style={styles.consolidationInfo}>
        <Text style={styles.consolidationText}>
          Found by {discovery.allSources.length} source{discovery.allSources.length > 1 ? 's' : ''}
          {discovery.pingCount > 0 && ` • ${discovery.pingCount} ping${discovery.pingCount > 1 ? 's' : ''}`}
          {discovery.sarCount > 0 && ` • ${discovery.sarCount} route search${discovery.sarCount > 1 ? 'es' : ''}`}
        </Text>
      </View>
      
      <View style={styles.discoveryActions}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveDiscovery}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={handleDismissDiscovery}
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

## Component Integration

### 1. MapScreen Integration

Complete integration showing how consolidation fits into the MapScreen:

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
  
  // New consolidation hook
  const consolidation = useDiscoveryConsolidation();

  // Handle journey completion with consolidation
  const handleJourneyCompletion = useCallback(async (journeyName) => {
    try {
      const result = await journeyTracking.completeJourney(journeyName);
      
      if (result.success && result.consolidation.success) {
        // Show consolidation results
        navigation.navigate('ConsolidationResults', {
          stats: result.consolidation.result,
          discoveries: result.consolidation.result.consolidatedPlaces,
        });
      }
    } catch (error) {
      console.error('Journey completion failed:', error);
    }
  }, [journeyTracking, navigation]);

  // Handle SAR results during journey
  const handleSARResults = useCallback((results) => {
    journeyTracking.addSARResults(results);
    
    // Show temporary markers on map
    savedPlaces.addTemporaryPlaces(results.map(place => ({
      ...place,
      source: 'sar',
      isTemporary: true,
    })));
  }, [journeyTracking, savedPlaces]);

  // Handle ping results during journey
  const handlePingResults = useCallback((results) => {
    journeyTracking.addPingResults(results);
    
    // Show temporary markers on map
    savedPlaces.addTemporaryPlaces(results.map(place => ({
      ...place,
      source: 'ping',
      isTemporary: true,
    })));
  }, [journeyTracking, savedPlaces]);

  return (
    <View style={styles.container}>
      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
        // Show consolidated discoveries on map
        consolidatedDiscoveries={savedPlaces.consolidatedDiscoveries}
        onSARResults={handleSARResults}
        onPingResults={handlePingResults}
      />
      
      <MapControls
        onLocateMe={locationTracking.locateMe}
        onToggleTracking={journeyTracking.toggleTracking}
        onToggleMapStyle={mapStyle.toggleSelector}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        trackingState={journeyTracking.state}
        permissions={permissions}
      />
      
      <MapStatusDisplays
        journeyInfo={journeyTracking.currentJourney}
        gpsStatus={locationTracking.gpsStatus}
        // Show consolidation status
        consolidationStatus={consolidation.consolidationStatus}
      />
      
      <MapModals
        journeyNaming={{
          ...journeyTracking.namingModal,
          onSave: handleJourneyCompletion, // Enhanced with consolidation
        }}
        placeDetail={savedPlaces.detailModal}
        mapStyleSelector={mapStyle.selector}
        // New consolidation modal
        consolidationResults={consolidation.consolidationModal}
      />
    </View>
  );
};
```

### 2. ConsolidationResults Screen

A dedicated screen for showing consolidation results:

```javascript
/**
 * Consolidation results screen
 */
const ConsolidationResultsScreen = ({ route, navigation }) => {
  const { stats, discoveries } = route.params;
  const savedPlaces = useSavedPlaces();
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [processedDiscoveries, setProcessedDiscoveries] = useState(discoveries);

  const filteredDiscoveries = useMemo(() => {
    return savedPlaces.filterConsolidatedDiscoveries(processedDiscoveries, selectedFilter);
  }, [processedDiscoveries, selectedFilter, savedPlaces]);

  const handleDiscoveryAction = useCallback(async (discoveryId, action) => {
    await savedPlaces.handleDiscoveryAction(discoveryId, action);
    
    // Update local state
    setProcessedDiscoveries(prev => 
      prev.map(discovery => 
        discovery.id === discoveryId 
          ? { ...discovery, [action]: true }
          : discovery
      )
    );
  }, [savedPlaces]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journey Discoveries</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <StatCard 
          title="Total Found" 
          value={stats.sarPlaces + stats.pingPlaces} 
        />
        <StatCard 
          title="After Consolidation" 
          value={stats.consolidatedPlaces} 
        />
        <StatCard 
          title="Duplicates Removed" 
          value={(stats.sarPlaces + stats.pingPlaces) - stats.consolidatedPlaces} 
        />
      </View>
      
      <View style={styles.filterContainer}>
        <FilterButton 
          title="All" 
          active={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
        />
        <FilterButton 
          title="Pending" 
          active={selectedFilter === 'pending'}
          onPress={() => setSelectedFilter('pending')}
        />
        <FilterButton 
          title="Saved" 
          active={selectedFilter === 'saved'}
          onPress={() => setSelectedFilter('saved')}
        />
      </View>
      
      <FlatList
        data={filteredDiscoveries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConsolidatedDiscoveryDisplay
            discovery={item}
            onSave={() => handleDiscoveryAction(item.id, 'saved')}
            onDismiss={() => handleDiscoveryAction(item.id, 'dismissed')}
          />
        )}
        style={styles.discoveryList}
      />
    </View>
  );
};
```

## Testing Integration Points

### 1. Hook Testing

```javascript
// Test discovery consolidation hook integration
describe('useDiscoveryConsolidation Integration', () => {
  test('should integrate with journey tracking for consolidation trigger', async () => {
    const { result } = renderHook(() => ({
      journey: useJourneyTracking(),
      consolidation: useDiscoveryConsolidation(),
    }));

    // Mock journey data
    const mockJourneyData = {
      userId: 'test-user',
      journeyId: 'test-journey',
      routeCoordinates: [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
      ],
      discoveryPreferences: { minRating: 4.0 },
    };

    // Trigger consolidation
    await act(async () => {
      const result = await result.current.consolidation.consolidateJourneyDiscoveries(
        mockJourneyData
      );
      expect(result.success).toBe(true);
    });

    expect(result.current.consolidation.isCompleted).toBe(true);
  });
});
```

### 2. Component Integration Testing

```javascript
// Test consolidation results screen
describe('ConsolidationResultsScreen Integration', () => {
  test('should display consolidated discoveries correctly', () => {
    const mockStats = {
      sarPlaces: 10,
      pingPlaces: 8,
      consolidatedPlaces: 12,
      savedCount: 12,
    };

    const mockDiscoveries = [
      {
        id: '1',
        placeName: 'Test Place',
        allSources: ['sar', 'ping'],
        pingCount: 1,
        sarCount: 1,
        saved: false,
        dismissed: false,
      },
    ];

    const { getByText } = render(
      <ConsolidationResultsScreen
        route={{ params: { stats: mockStats, discoveries: mockDiscoveries } }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    expect(getByText('Journey Discoveries')).toBeTruthy();
    expect(getByText('18')).toBeTruthy(); // Total found
    expect(getByText('12')).toBeTruthy(); // After consolidation
    expect(getByText('Test Place')).toBeTruthy();
  });
});
```

## Performance Considerations

### 1. Consolidation Performance

- Use background processing for consolidation to avoid blocking UI
- Implement progressive consolidation for large datasets
- Cache consolidation results to avoid reprocessing

### 2. UI Performance

- Use virtualized lists for large discovery sets
- Implement lazy loading for discovery details
- Optimize re-renders with proper memoization

### 3. Data Management

- Clean up temporary discovery data after consolidation
- Implement efficient storage for consolidated discoveries
- Use batch operations for database updates

## Conclusion

The discovery consolidation integration points are designed to seamlessly extend the existing modular MapScreen architecture while providing comprehensive data consolidation capabilities. The integration maintains the established patterns of custom hooks for state management and component composition for UI, ensuring that the consolidation features integrate naturally without disrupting the existing codebase structure.

The integration preserves the single responsibility principle, ensures proper separation of concerns, and provides clear extension points for future enhancements while maintaining the performance optimizations and testing strategies established during the MapScreen refactoring. The consolidation system enhances the discovery experience by providing clean, deduplicated data that improves the overall user experience of Hero's Path.