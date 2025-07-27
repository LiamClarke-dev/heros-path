import React from 'react';
import { View, StyleSheet } from 'react-native';
import TrackingButton from './TrackingButton';
import SavedRoutesToggle from './SavedRoutesToggle';
import SavedPlacesToggle from './SavedPlacesToggle';
import MapStyleButton from './MapStyleButton';

/**
 * MapControls Component
 * 
 * Container component that manages the layout and positioning of all map control buttons.
 * Provides responsive control arrangement and handles control states and callbacks.
 * 
 * Requirements addressed:
 * - 4.1: Extract UI controls into separate components
 * - 4.2: Implement control positioning and interaction handling
 * - 4.3: Accept props for control states and callbacks
 */
const MapControls = ({
  // Control states
  trackingState,
  savedRoutesState,
  savedPlacesState,
  mapStyleState,
  permissions,
  
  // Control callbacks
  onToggleTracking,
  onToggleSavedRoutes,
  onToggleSavedPlaces,
  onToggleMapStyle,
}) => {
  // Don't render controls if permissions are not granted
  if (!permissions?.granted) {
    return null;
  }

  return (
    <>
      {/* Top Right Controls */}
      <View style={styles.topRightControls}>
        <MapStyleButton
          onPress={onToggleMapStyle}
          currentStyle={mapStyleState?.currentStyle}
          isVisible={mapStyleState?.selectorVisible}
        />
      </View>

      {/* Top Right Toggles */}
      <View style={styles.topRightToggles}>
        <SavedRoutesToggle
          onPress={onToggleSavedRoutes}
          isVisible={savedRoutesState?.isVisible}
          isLoading={savedRoutesState?.isLoading}
          hasRoutes={savedRoutesState?.hasRoutes}
          isAuthenticated={trackingState?.isAuthenticated}
        />
        <SavedPlacesToggle
          onPress={onToggleSavedPlaces}
          isVisible={savedPlacesState?.isVisible}
          isLoading={savedPlacesState?.isLoading}
          hasPlaces={savedPlacesState?.hasPlaces}
          isAuthenticated={trackingState?.isAuthenticated}
        />
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TrackingButton
          onPress={onToggleTracking}
          isTracking={trackingState?.isTracking}
          isAuthenticated={trackingState?.isAuthenticated}
          journeyStartTime={trackingState?.journeyStartTime}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  topRightControls: {
    position: 'absolute',
    top: 60, // Below status bar
    right: 20,
    zIndex: 1000,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  topRightToggles: {
    position: 'absolute',
    top: 120, // Below top controls
    right: 20,
    zIndex: 1000,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapControls;