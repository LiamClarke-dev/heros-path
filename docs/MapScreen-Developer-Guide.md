# MapScreen Developer Guide

## Quick Start

This guide helps developers understand and work with the refactored MapScreen architecture. The MapScreen has been transformed from a 1600+ line monolithic component into a modular, maintainable system.

## Architecture Overview

### Main Components

```
MapScreen (< 200 lines) - Orchestrator
├── MapRenderer - Map display and rendering
├── MapControls - UI controls and buttons
├── MapStatusDisplays - Status information
└── MapModals - Modal dialogs
```

### Custom Hooks

```
useMapPermissions - Location permission management
useLocationTracking - GPS and location services
useMapState - Core map state
useJourneyTracking - Journey recording
useSavedRoutes - Saved routes display
useSavedPlaces - Saved places management
useMapStyle - Map styling and themes
```

## Working with the Refactored Code

### Understanding the Main MapScreen

The main MapScreen component is now a simple orchestrator:

```javascript
const MapScreen = () => {
  // All state management through hooks
  const permissions = useMapPermissions();
  const locationTracking = useLocationTracking();
  const mapState = useMapState();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();

  // Simple coordination logic
  useEffect(() => {
    if (locationTracking.currentPosition && journeyTracking.state.isTracking) {
      journeyTracking.addToPath(locationTracking.currentPosition);
    }
  }, [locationTracking.currentPosition, journeyTracking.state.isTracking]);

  // Clean component composition
  return (
    <View style={styles.container}>
      <MapRenderer {...mapProps} />
      <MapControls {...controlProps} />
      <MapStatusDisplays {...statusProps} />
      <MapModals {...modalProps} />
    </View>
  );
};
```

### Working with Custom Hooks

#### useLocationTracking Hook

**Purpose**: Manages GPS, location services, and position tracking

```javascript
const locationTracking = useLocationTracking();

// Available state
locationTracking.currentPosition    // Current GPS position
locationTracking.recentPositions   // Last 5 positions for direction
locationTracking.currentPath       // Path being tracked
locationTracking.gpsStatus         // GPS signal status
locationTracking.permissionsGranted // Permission status
locationTracking.isLocating        // Loading state

// Available actions
locationTracking.locateMe(mapRef)   // Center map on user location
locationTracking.startTracking(id)  // Start journey tracking
locationTracking.stopTracking()     // Stop journey tracking
locationTracking.addToPath(pos)     // Add position to current path
locationTracking.clearPath()        // Clear current path
```

**Common Usage Patterns:**

```javascript
// Get current location and center map
const handleLocateMe = useCallback(async () => {
  await locationTracking.locateMe(mapRef);
}, [locationTracking.locateMe]);

// Start tracking a journey
const handleStartJourney = useCallback(async () => {
  try {
    await locationTracking.startTracking(journeyId);
    console.log('Journey tracking started');
  } catch (error) {
    console.error('Failed to start tracking:', error);
  }
}, [locationTracking.startTracking]);

// Monitor GPS status
useEffect(() => {
  if (locationTracking.gpsStatus?.indicator === 'ERROR') {
    Alert.alert('GPS Error', locationTracking.gpsStatus.message);
  }
}, [locationTracking.gpsStatus]);
```

#### useJourneyTracking Hook

**Purpose**: Manages journey recording, saving, and state

```javascript
const journeyTracking = useJourneyTracking();

// Available state
journeyTracking.state.isTracking        // Currently tracking
journeyTracking.state.currentJourneyId  // Active journey ID
journeyTracking.state.isAuthenticated   // User auth status
journeyTracking.currentJourney          // Journey info (time, distance, etc.)
journeyTracking.namingModal             // Modal state for naming
journeyTracking.pathToRender            // Path data for map display
journeyTracking.savingJourney           // Save operation status

// Available actions
journeyTracking.toggleTracking(locationHook) // Start/stop tracking
journeyTracking.addToPath(position)          // Add position to journey
journeyTracking.saveJourney(name)            // Save with custom name
journeyTracking.cancelSave()                 // Cancel save operation
```

**Common Usage Patterns:**

```javascript
// Toggle journey tracking
const handleToggleTracking = useCallback(async () => {
  try {
    await journeyTracking.toggleTracking(locationTracking);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
}, [journeyTracking.toggleTracking, locationTracking]);

// Save journey with custom name
const handleSaveJourney = useCallback(async (journeyName) => {
  try {
    await journeyTracking.saveJourney(journeyName);
    Alert.alert('Success', 'Journey saved successfully');
  } catch (error) {
    Alert.alert('Error', 'Failed to save journey');
  }
}, [journeyTracking.saveJourney]);

// Monitor journey state changes
useEffect(() => {
  if (journeyTracking.state.isTracking) {
    console.log('Journey started at:', journeyTracking.currentJourney.startTime);
  }
}, [journeyTracking.state.isTracking]);
```

#### useSavedPlaces Hook

**Purpose**: Manages saved places display, clustering, and interactions

```javascript
const savedPlaces = useSavedPlaces();

// Available state
savedPlaces.data            // Array of saved places
savedPlaces.visible         // Display toggle state
savedPlaces.loading         // Loading state
savedPlaces.clusters        // Clustered markers
savedPlaces.detailModal     // Place detail modal state

// Available actions
savedPlaces.toggleVisibility()           // Show/hide places
savedPlaces.refreshPlaces()              // Reload from Firebase
savedPlaces.handleMarkerPress(place)     // Handle place tap
savedPlaces.handleClusterPress(cluster)  // Handle cluster tap
savedPlaces.savePlace(place)             // Save a place
savedPlaces.unsavePlace(placeId)         // Remove saved place
savedPlaces.navigateToPlace(place, mapRef) // Navigate to place
savedPlaces.closeDetailModal()           // Close detail modal
```

**Common Usage Patterns:**

```javascript
// Toggle places visibility
const handleTogglePlaces = useCallback(() => {
  savedPlaces.toggleVisibility();
}, [savedPlaces.toggleVisibility]);

// Handle place marker press
const handlePlacePress = useCallback((place) => {
  savedPlaces.handleMarkerPress(place);
}, [savedPlaces.handleMarkerPress]);

// Save a discovered place
const handleSavePlace = useCallback(async (place) => {
  try {
    await savedPlaces.savePlace(place);
    Alert.alert('Success', 'Place saved to your collection');
  } catch (error) {
    Alert.alert('Error', 'Failed to save place');
  }
}, [savedPlaces.savePlace]);

// Monitor places data changes
useEffect(() => {
  if (savedPlaces.data.length > 0) {
    console.log(`Loaded ${savedPlaces.data.length} saved places`);
  }
}, [savedPlaces.data.length]);
```

### Working with Components

#### MapRenderer Component

**Purpose**: Handles map display and platform-specific rendering

```javascript
<MapRenderer
  mapState={mapState}
  locationTracking={locationTracking}
  journeyTracking={journeyTracking}
  savedRoutes={savedRoutes}
  savedPlaces={savedPlaces}
  mapStyle={mapStyle}
  onMapReady={handleMapReady}
/>
```

**Key Features:**
- Platform-specific MapView handling
- Error handling and fallbacks
- Map ready callback integration
- Region calculation with safe defaults

#### MapControls Component

**Purpose**: Manages all map control buttons and their layout

```javascript
<MapControls
  trackingState={{
    isTracking: journeyTracking.state.isTracking,
    isAuthenticated: journeyTracking.state.isAuthenticated,
    journeyStartTime: journeyTracking.currentJourney?.startTime
  }}
  savedRoutesState={{
    isVisible: savedRoutes.visible,
    isLoading: savedRoutes.loading,
    hasRoutes: savedRoutes.data.length > 0
  }}
  savedPlacesState={{
    isVisible: savedPlaces.visible,
    isLoading: savedPlaces.loading,
    hasPlaces: savedPlaces.data.length > 0
  }}
  mapStyleState={{
    currentStyle: mapStyle.currentStyleName,
    selectorVisible: mapStyle.selector.visible
  }}
  permissions={permissions}
  onLocateMe={handleLocateMe}
  onToggleTracking={handleToggleTracking}
  onToggleSavedRoutes={savedRoutes.toggleVisibility}
  onToggleSavedPlaces={savedPlaces.toggleVisibility}
  onToggleMapStyle={mapStyle.toggleSelector}
/>
```

**Control Layout:**
- **Top Right**: Locate button, Map style button
- **Top Right (below)**: Saved routes toggle, Saved places toggle
- **Bottom Center**: Journey tracking button

## Common Development Tasks

### Adding a New Map Control

1. **Create the control component:**

```javascript
// components/map/MyNewControl.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const MyNewControl = ({ onPress, isActive }) => {
  return (
    <TouchableOpacity
      style={[styles.button, isActive && styles.activeButton]}
      onPress={onPress}
    >
      <Text style={styles.text}>My Control</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  text: {
    color: '#333',
  },
});

export default React.memo(MyNewControl);
```

2. **Add to MapControls:**

```javascript
// components/map/MapControls.js
import MyNewControl from './MyNewControl';

const MapControls = ({ onMyNewAction, myNewState, ...otherProps }) => {
  return (
    <>
      {/* Existing controls */}
      <View style={styles.topRightControls}>
        <MyNewControl
          onPress={onMyNewAction}
          isActive={myNewState?.isActive}
        />
        {/* Other controls */}
      </View>
    </>
  );
};
```

3. **Update MapScreen:**

```javascript
// screens/MapScreen.js
const MapScreen = () => {
  const myNewHook = useMyNewFeature();
  
  return (
    <View style={styles.container}>
      <MapControls
        onMyNewAction={myNewHook.performAction}
        myNewState={myNewHook.state}
        // ... other props
      />
    </View>
  );
};
```

### Adding a New Custom Hook

1. **Create the hook file:**

```javascript
// hooks/useMyNewFeature.js
import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing [feature description]
 * 
 * Handles:
 * - [Responsibility 1]
 * - [Responsibility 2]
 * 
 * Requirements: [Reference requirements]
 */
const useMyNewFeature = () => {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performAction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Implementation
      const result = await MyService.performAction();
      setState(result);
    } catch (err) {
      console.error('Action failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      // Cleanup logic
    };
  }, []);

  return {
    state,
    loading,
    error,
    performAction,
  };
};

export default useMyNewFeature;
```

2. **Add tests:**

```javascript
// hooks/__tests__/useMyNewFeature.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import useMyNewFeature from '../useMyNewFeature';

describe('useMyNewFeature', () => {
  test('should initialize correctly', () => {
    const { result } = renderHook(() => useMyNewFeature());
    
    expect(result.current.state).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  test('should perform action correctly', async () => {
    const { result } = renderHook(() => useMyNewFeature());
    
    await act(async () => {
      await result.current.performAction();
    });
    
    expect(result.current.state).toBeDefined();
  });
});
```

3. **Integrate in MapScreen:**

```javascript
// screens/MapScreen.js
import useMyNewFeature from '../hooks/useMyNewFeature';

const MapScreen = () => {
  const myNewFeature = useMyNewFeature();
  
  // Use the hook data and actions
  return (
    <View style={styles.container}>
      {/* Pass to components as needed */}
    </View>
  );
};
```

### Modifying Existing Functionality

1. **Identify the responsible hook/component**
2. **Make changes in isolation**
3. **Update tests**
4. **Verify integration still works**

Example - Adding new journey tracking feature:

```javascript
// hooks/useJourneyTracking.js
const useJourneyTracking = () => {
  // Existing state...
  const [newFeatureState, setNewFeatureState] = useState(null);

  // New action
  const newAction = useCallback(async () => {
    // Implementation
  }, []);

  return {
    // Existing returns...
    newFeatureState,
    newAction,
  };
};
```

## Testing the Refactored Code

### Hook Testing

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import useLocationTracking from '../hooks/useLocationTracking';

// Mock services
jest.mock('../services/BackgroundLocationService');

describe('useLocationTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => useLocationTracking());
    
    expect(result.current.currentPosition).toBeNull();
    expect(result.current.gpsStatus).toBeNull();
    expect(result.current.isLocating).toBe(false);
  });

  test('should handle location updates', async () => {
    const { result } = renderHook(() => useLocationTracking());
    
    await act(async () => {
      await result.current.locateMe();
    });
    
    expect(result.current.currentPosition).toBeDefined();
  });
});
```

### Component Testing

```javascript
import { render, fireEvent } from '@testing-library/react-native';
import MapControls from '../components/map/MapControls';

describe('MapControls', () => {
  const defaultProps = {
    trackingState: { isTracking: false, isAuthenticated: true },
    savedRoutesState: { isVisible: false, isLoading: false, hasRoutes: true },
    savedPlacesState: { isVisible: false, isLoading: false, hasPlaces: true },
    mapStyleState: { currentStyle: 'standard', selectorVisible: false },
    permissions: { granted: true },
    onLocateMe: jest.fn(),
    onToggleTracking: jest.fn(),
    onToggleSavedRoutes: jest.fn(),
    onToggleSavedPlaces: jest.fn(),
    onToggleMapStyle: jest.fn(),
  };

  test('should render all controls when permissions granted', () => {
    const { getByTestId } = render(<MapControls {...defaultProps} />);
    
    expect(getByTestId('locate-button')).toBeTruthy();
    expect(getByTestId('tracking-button')).toBeTruthy();
    expect(getByTestId('saved-routes-toggle')).toBeTruthy();
  });

  test('should call callbacks when buttons pressed', () => {
    const { getByTestId } = render(<MapControls {...defaultProps} />);
    
    fireEvent.press(getByTestId('locate-button'));
    expect(defaultProps.onLocateMe).toHaveBeenCalled();
    
    fireEvent.press(getByTestId('tracking-button'));
    expect(defaultProps.onToggleTracking).toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
import { render } from '@testing-library/react-native';
import MapScreen from '../screens/MapScreen';

// Mock all hooks
jest.mock('../hooks/useMapPermissions');
jest.mock('../hooks/useLocationTracking');
// ... other hooks

describe('MapScreen Integration', () => {
  test('should render all major components', () => {
    const { getByTestId } = render(<MapScreen />);
    
    expect(getByTestId('map-renderer')).toBeTruthy();
    expect(getByTestId('map-controls')).toBeTruthy();
    expect(getByTestId('map-status-displays')).toBeTruthy();
    expect(getByTestId('map-modals')).toBeTruthy();
  });

  test('should coordinate between hooks correctly', () => {
    // Test hook coordination logic
  });
});
```

## Performance Considerations

### Memoization Best Practices

```javascript
const MapScreen = () => {
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();

  // ✅ Memoize complex objects passed as props
  const trackingState = useMemo(() => ({
    isTracking: journeyTracking.state.isTracking,
    isAuthenticated: journeyTracking.state.isAuthenticated,
    journeyStartTime: journeyTracking.currentJourney?.startTime
  }), [
    journeyTracking.state.isTracking,
    journeyTracking.state.isAuthenticated,
    journeyTracking.currentJourney?.startTime
  ]);

  // ✅ Memoize callbacks
  const handleToggleTracking = useCallback(() => {
    journeyTracking.toggleTracking(locationTracking);
  }, [journeyTracking.toggleTracking, locationTracking]);

  return (
    <MapControls
      trackingState={trackingState}
      onToggleTracking={handleToggleTracking}
    />
  );
};
```

### Avoiding Common Performance Pitfalls

```javascript
// ❌ Don't create objects inline
<MapControls
  trackingState={{
    isTracking: journeyTracking.state.isTracking // Creates new object every render
  }}
/>

// ❌ Don't use inline functions
<MapControls
  onToggleTracking={() => journeyTracking.toggleTracking()} // Creates new function every render
/>

// ✅ Use memoized values and callbacks
const trackingState = useMemo(() => ({ ... }), [dependencies]);
const handleToggleTracking = useCallback(() => { ... }, [dependencies]);
```

## Debugging Tips

### Hook Debugging

```javascript
const useLocationTracking = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  
  // Add debug logging
  useEffect(() => {
    console.log('Location tracking state changed:', {
      currentPosition,
      hasPosition: !!currentPosition
    });
  }, [currentPosition]);

  return { currentPosition, setCurrentPosition };
};
```

### Component Debugging

```javascript
const MapControls = ({ trackingState, onToggleTracking }) => {
  // Debug prop changes
  useEffect(() => {
    console.log('MapControls props changed:', {
      isTracking: trackingState?.isTracking,
      callbackChanged: onToggleTracking.toString()
    });
  }, [trackingState, onToggleTracking]);

  return (/* Component JSX */);
};
```

### Performance Debugging

```javascript
import { Profiler } from 'react';

const MapScreen = () => {
  const onRenderCallback = (id, phase, actualDuration) => {
    console.log('Component render:', { id, phase, actualDuration });
  };

  return (
    <Profiler id="MapScreen" onRender={onRenderCallback}>
      {/* Component content */}
    </Profiler>
  );
};
```

## Migration Notes

### What Changed

- **File Structure**: Code split across multiple files
- **State Management**: Moved from component state to custom hooks
- **Component Size**: Main component reduced from 1600+ to < 200 lines
- **Testing**: Each piece can now be tested in isolation
- **Performance**: Optimized re-rendering and memory usage

### What Stayed the Same

- **User Experience**: All functionality works identically
- **API**: External interfaces unchanged
- **Data Flow**: Same data sources and destinations
- **Styling**: Visual appearance preserved

### Common Migration Issues

1. **Hook Dependencies**: Ensure proper dependency arrays
2. **Ref Handling**: MapRef passed correctly through components
3. **State Synchronization**: Coordinate between hooks properly
4. **Error Handling**: Maintain error boundaries and user feedback

## Conclusion

The refactored MapScreen provides a solid foundation for future development. The modular architecture makes it easier to:

- Add new features without affecting existing code
- Test individual pieces in isolation
- Debug issues more effectively
- Maintain consistent code quality
- Onboard new developers quickly

Follow the patterns established in this refactoring for all future map-related development to maintain architectural consistency and code quality.