import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrackingButton from './TrackingButton';
import SavedRoutesToggle from './SavedRoutesToggle';
import SavedPlacesToggle from './SavedPlacesToggle';
import MapStyleButton from './MapStyleButton';
import TrackingStatusIndicator from './TrackingStatusIndicator';

/**
 * MapControls Component
 * 
 * Container component that manages the layout and positioning of all map control buttons.
 * Extracted from the main MapScreen to separate UI control logic from map rendering.
 * 
 * Responsibilities:
 * - Layout and positioning of all map controls
 * - Permission-based visibility management
 * - Control state coordination and callback handling
 * - Responsive control arrangement
 * 
 * Control Layout:
 * - Top Right: Locate button, Map style button
 * - Top Right (below): Saved routes toggle, Saved places toggle  
 * - Bottom Center: Journey tracking button
 * 
 * Props:
 * - trackingState: Journey tracking state and authentication
 * - savedRoutesState: Routes visibility, loading, and data state
 * - savedPlacesState: Places visibility, loading, and data state
 * - mapStyleState: Current style and selector visibility
 * - permissions: Location permission status
 * - onLocateMe: Callback for locate button press
 * - onToggleTracking: Callback for journey tracking toggle
 * - onToggleSavedRoutes: Callback for routes visibility toggle
 * - onToggleSavedPlaces: Callback for places visibility toggle
 * - onToggleMapStyle: Callback for style selector toggle
 * 
 * Permission Handling:
 * - Locate button always visible (allows permission requests)
 * - Other controls hidden until permissions granted
 * - Graceful degradation for permission-dependent features
 * 
 * Performance:
 * - Memoized with React.memo to prevent unnecessary re-renders
 * - Individual control components for focused updates
 * - Conditional rendering based on permission state
 * 
 * Requirements Addressed:
 * - 4.1: Extract UI controls into separate components
 * - 4.2: Implement control positioning and interaction handling
 * - 4.3: Accept props for control states and callbacks
 * - 4.4: Handle authentication checks and user feedback
 * 
 * @see components/map/TrackingButton.js for journey control
 * @see components/map/SavedRoutesToggle.js for routes toggle
 * @see components/map/SavedPlacesToggle.js for places toggle
 * @see components/map/MapStyleButton.js for style selector
 */
const MapControls = ({
  // Control states
  trackingState,
  savedRoutesState,
  savedPlacesState,
  mapStyleState,
  permissions,
  isLocating,
  
  // Control callbacks
  onLocateMe,
  onToggleTracking,
  onToggleSavedRoutes,
  onToggleSavedPlaces,
  onToggleMapStyle,
}) => {
  // Show locate button even if permissions aren't granted so users can request them
  // Other controls are hidden until permissions are granted

  return (
    <>
      {/* Tracking Status Indicator - only show if permissions granted */}
      {permissions?.granted && (
        <TrackingStatusIndicator
          trackingStatus={trackingState?.trackingStatus}
          metrics={trackingState?.metrics}
          isVisible={trackingState?.isTracking || trackingState?.trackingStatus !== 'idle'}
          compact={false}
        />
      )}

      {/* Top Right Controls */}
      <View style={styles.topRightControls}>
        <TouchableOpacity
          style={[styles.locateButton, isLocating && styles.locateButtonActive]}
          onPress={onLocateMe}
          disabled={isLocating}
        >
          <Ionicons 
            name={isLocating ? "hourglass" : "locate"} 
            size={24} 
            color={isLocating ? "#FF9500" : "#007AFF"} 
          />
        </TouchableOpacity>
        <MapStyleButton
          onPress={onToggleMapStyle}
          currentStyle={mapStyleState?.currentStyle}
          isVisible={mapStyleState?.selectorVisible}
        />
      </View>

      {/* Top Right Toggles - only show if permissions granted */}
      {permissions?.granted && (
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
      )}

      {/* Bottom Controls - only show if permissions granted */}
      {permissions?.granted && (
        <View style={styles.bottomControls}>
          <TrackingButton
            onPress={onToggleTracking}
            isTracking={trackingState?.isTracking}
            isAuthenticated={trackingState?.isAuthenticated}
            journeyStartTime={trackingState?.journeyStartTime}
            trackingStatus={trackingState?.trackingStatus}
            metrics={trackingState?.metrics}
          />
        </View>
      )}
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
  locateButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locateButtonActive: {
    backgroundColor: '#FFF3E0', // Light orange background when locating
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

export default React.memo(MapControls);