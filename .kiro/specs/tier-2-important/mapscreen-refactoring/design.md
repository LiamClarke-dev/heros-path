# Design Document

## Overview

This design outlines the refactoring of the monolithic MapScreen component into a modular, maintainable architecture. The refactoring will extract functionality into focused components and custom hooks while maintaining all existing functionality and improving code organization, testability, and performance.

## Architecture

### Component Hierarchy

```
MapScreen (< 200 lines hard limit, target 150 lines)
├── MapRenderer
│   ├── MapView (platform-specific)
│   ├── MapOverlays
│   │   ├── SpriteOverlay
│   │   ├── SavedPlacesOverlay
│   │   └── ClusterOverlay
│   └── MapPolylines
├── MapControls
│   ├── LocateButton
│   ├── TrackingButton
│   ├── MapStyleButton
│   ├── SavedRoutesToggle
│   └── SavedPlacesToggle
├── MapStatusDisplays
│   ├── JourneyInfoDisplay
│   └── GPSStatusDisplay
└── MapModals
    ├── JourneyNamingModal
    ├── PlaceDetailModal
    └── MapStyleSelector
```

### Custom Hooks Architecture

```
Custom Hooks
├── useMapState - Core map state management
├── useLocationTracking - Location and GPS management
├── useJourneyTracking - Journey recording logic
├── useSavedRoutes - Saved routes data and display
├── useSavedPlaces - Saved places data and clustering
├── useMapStyle - Map styling and theme integration
└── useMapPermissions - Permission handling
```

## Components and Interfaces

### 1. MapScreen (Main Container)

**Responsibility:** Orchestrate child components and manage high-level state

```javascript
const MapScreen = ({ navigation }) => {
  // Custom hooks for state management
  const mapState = useMapState();
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();
  const permissions = useMapPermissions();

  return (
    <View style={styles.container}>
      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
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
      />
      <MapModals
        journeyNaming={journeyTracking.namingModal}
        placeDetail={savedPlaces.detailModal}
        mapStyleSelector={mapStyle.selector}
      />
    </View>
  );
};
```

### 2. MapRenderer Component

**Responsibility:** Handle map rendering and platform-specific logic

```javascript
const MapRenderer = ({
  mapState,
  locationTracking,
  savedRoutes,
  savedPlaces,
  mapStyle
}) => {
  const mapRef = useRef(null);
  
  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        cameraPosition={mapState.cameraPosition}
        mapType={mapStyle.config.mapType}
        customMapStyle={mapStyle.config.customStyle}
        onError={mapState.handleError}
      />
      <MapPolylines
        currentPath={locationTracking.currentPath}
        savedRoutes={savedRoutes.visible ? savedRoutes.data : []}
        styleConfig={mapStyle.config}
      />
      <MapOverlays
        currentPosition={locationTracking.currentPosition}
        recentPositions={locationTracking.recentPositions}
        savedPlaces={savedPlaces.visible ? savedPlaces.data : []}
        clusters={savedPlaces.clusters}
        onPlacePress={savedPlaces.handleMarkerPress}
        onClusterPress={savedPlaces.handleClusterPress}
      />
    </View>
  );
};
```

### 3. MapControls Component

**Responsibility:** Render and manage all map control buttons

```javascript
const MapControls = ({
  onLocateMe,
  onToggleTracking,
  onToggleMapStyle,
  onToggleSavedRoutes,
  onToggleSavedPlaces,
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
      </View>
    </>
  );
};
```

### 4. Custom Hooks Design

#### useMapState Hook

```javascript
const useMapState = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [cameraPosition, setCameraPosition] = useState(null);

  const handleError = useCallback((error) => {
    console.error('Map error:', error);
    setMapError('Map failed to load. Please check your internet connection.');
  }, []);

  const updateCameraPosition = useCallback((position) => {
    setCameraPosition({
      center: {
        latitude: position.latitude,
        longitude: position.longitude,
      },
      zoom: 16,
    });
  }, []);

  return {
    currentPosition,
    setCurrentPosition,
    mapError,
    cameraPosition,
    handleError,
    updateCameraPosition,
  };
};
```

#### useLocationTracking Hook

```javascript
const useLocationTracking = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [recentPositions, setRecentPositions] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [gpsStatus, setGpsStatus] = useState(null);
  const locationServiceRef = useRef(null);

  // Initialize location service
  useEffect(() => {
    initializeLocationService();
    return () => cleanup();
  }, []);

  const locateMe = useCallback(async () => {
    // Implementation
  }, []);

  const startTracking = useCallback(async () => {
    // Implementation
  }, []);

  const stopTracking = useCallback(async () => {
    // Implementation
  }, []);

  return {
    currentPosition,
    recentPositions,
    currentPath,
    gpsStatus,
    locateMe,
    startTracking,
    stopTracking,
  };
};
```

#### useJourneyTracking Hook

```javascript
const useJourneyTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentJourneyId, setCurrentJourneyId] = useState(null);
  const [journeyStartTime, setJourneyStartTime] = useState(null);
  const [namingModal, setNamingModal] = useState({ visible: false, journey: null });

  const toggleTracking = useCallback(async () => {
    // Implementation
  }, []);

  const saveJourney = useCallback(async (name) => {
    // Implementation
  }, []);

  return {
    state: {
      isTracking,
      currentJourneyId,
      isAuthenticated: true, // From context
    },
    currentJourney: {
      startTime: journeyStartTime,
      // Other journey info
    },
    namingModal,
    toggleTracking,
    saveJourney,
  };
};
```

## Data Models

### MapState Interface

```javascript
interface MapState {
  currentPosition: Location | null;
  mapError: string | null;
  cameraPosition: CameraPosition | null;
  handleError: (error: any) => void;
  updateCameraPosition: (position: Location) => void;
}
```

### LocationTrackingState Interface

```javascript
interface LocationTrackingState {
  currentPosition: Location | null;
  recentPositions: Location[];
  currentPath: Location[];
  gpsStatus: GPSStatus | null;
  locateMe: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}
```

### JourneyTrackingState Interface

```javascript
interface JourneyTrackingState {
  state: {
    isTracking: boolean;
    currentJourneyId: string | null;
    isAuthenticated: boolean;
  };
  currentJourney: {
    startTime: number | null;
    distance: number;
    duration: number;
    pointCount: number;
  };
  namingModal: {
    visible: boolean;
    journey: Journey | null;
  };
  toggleTracking: () => Promise<void>;
  saveJourney: (name: string) => Promise<void>;
}
```

## Error Handling

### Component-Level Error Handling

- Each component will handle its own errors and display appropriate user feedback
- Error boundaries will be implemented for critical components
- Service errors will be caught and transformed into user-friendly messages

### Hook-Level Error Handling

- Custom hooks will include error states and error handling logic
- Async operations will be wrapped in try-catch blocks
- Error recovery mechanisms will be implemented where appropriate

## Testing Strategy

### Component Testing

- Each component will be unit tested in isolation
- Props and callbacks will be mocked for testing
- Rendering and user interaction scenarios will be covered

### Hook Testing

- Custom hooks will be tested using React Testing Library's renderHook
- State changes and side effects will be verified
- Error scenarios will be tested

### Integration Testing

- The refactored MapScreen will be integration tested to ensure all parts work together
- User workflows will be tested end-to-end
- Performance impact will be measured and verified

## Performance Considerations

### Memoization Strategy

- Components will use React.memo where appropriate
- Expensive calculations will be memoized with useMemo
- Callback functions will be memoized with useCallback

### State Update Optimization

- State will be split to minimize unnecessary re-renders
- Context providers will be split by concern
- State updates will be batched where possible

### Memory Management

- Cleanup functions will be implemented in all hooks
- Event listeners and subscriptions will be properly removed
- Large data structures will be managed efficiently

## Future Feature Integration Points

### Ping Discovery Integration

The refactored architecture will support ping discovery through:

- **usePingDiscovery Hook**: Manages ping credits, cooldown timers, and discovery results
- **PingButton Component**: Integrates with MapControls for ping triggering
- **PingAnimation Overlay**: Extends MapOverlays for ping visual feedback
- **PingResults Integration**: Uses useSavedPlaces hook for result display and clustering

### Destination Routing Integration

The architecture will accommodate routing features through:

- **useDestinationRouting Hook**: Manages route calculation and navigation state
- **RoutePolylines Component**: Extends MapPolylines for route visualization
- **NavigationControls Component**: Integrates with MapControls for route management
- **TurnByTurn Display**: Extends MapStatusDisplays for navigation instructions

### Discovery Consolidation Integration

Consolidation will integrate through:

- **useDiscoveryConsolidation Hook**: Manages consolidation logic and state
- **Enhanced useSavedPlaces Hook**: Handles consolidated discovery data
- **Journey Completion Integration**: Extends useJourneyTracking for completion workflows

### Gamification Integration

Gamification features will integrate through:

- **useGamification Hook**: Manages experience points, achievements, and levels
- **Achievement Overlays**: Extends MapOverlays for achievement notifications
- **Progress Displays**: Integrates with MapStatusDisplays for level progression

## Migration Strategy

### Phase 1: Extract Custom Hooks

1. Create useMapState hook and integrate
2. Create useLocationTracking hook and integrate
3. Create useJourneyTracking hook and integrate
4. Test each hook integration individually

### Phase 2: Extract UI Components

1. Create MapRenderer component
2. Create MapControls component
3. Create MapStatusDisplays component
4. Create MapModals component

### Phase 3: Optimize and Clean Up

1. Remove unused code from original MapScreen
2. Optimize performance with memoization
3. Add comprehensive testing
4. Update documentation

### Phase 4: Future-Proofing and Guidelines

1. Create extension points for upcoming features
2. Document modular architecture patterns
3. Create AI agent development guidelines
4. Establish architectural compliance criteria

### Phase 5: Validation

1. Perform thorough regression testing
2. Validate performance improvements
3. Ensure all functionality works identically
4. Deploy and monitor for issues