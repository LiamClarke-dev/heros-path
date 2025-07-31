/**
 * MapStatusDisplays Component
 * 
 * Container component that manages the layout and positioning of status displays
 * on the map, including journey information and GPS status displays.
 * Implements conditional display logic based on status data and visibility states.
 * 
 * Requirements addressed:
 * - 4.1: Extract status display components
 * - 4.2: Implement journey info and GPS status displays
 * - 4.3: Handle display visibility and user interactions
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';

import JourneyInfoDisplay from './JourneyInfoDisplay';
import GPSStatusDisplay from '../ui/GPSStatusDisplay';

/**
 * MapStatusDisplays Component Props
 * @typedef {Object} MapStatusDisplaysProps
 * @property {Object} journeyInfo - Journey tracking information
 * @property {boolean} journeyInfo.isTracking - Whether journey tracking is active
 * @property {number} journeyInfo.startTime - Journey start timestamp
 * @property {Array} journeyInfo.currentPath - Current journey path coordinates
 * @property {Object} gpsStatus - GPS status information
 * @property {Object} gpsStatus.gpsState - GPS state object
 * @property {number} gpsStatus.signalStrength - GPS signal strength (0-100)
 * @property {boolean} gpsStatus.visible - Whether GPS status should be shown
 * @property {string} theme - Current theme ('light', 'dark', 'adventure')
 * @property {Function} onGPSStatusPress - Callback when GPS status is pressed
 * @property {boolean} gpsExpanded - Whether GPS details should be shown expanded
 */

const MapStatusDisplays = ({
  journeyInfo,
  gpsStatus,
  theme = 'light',
  onGPSStatusPress,
  gpsExpanded = false,
}) => {
  // Don't render anything if no status data is provided
  if (!journeyInfo && !gpsStatus) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Journey Info Display */}
      {journeyInfo && journeyInfo.isTracking && (
        <View style={styles.journeyInfoContainer}>
          <JourneyInfoDisplay
            isTracking={journeyInfo.isTracking}
            startTime={journeyInfo.startTime}
            currentPath={journeyInfo.currentPath}
            theme={theme}
          />
        </View>
      )}

      {/* GPS Status Display - Only show when expanded */}
      {gpsExpanded && gpsStatus && gpsStatus.visible && gpsStatus.gpsState && (
        <View style={styles.gpsStatusContainer}>
          <GPSStatusDisplay
            gpsState={gpsStatus.gpsState}
            signalStrength={gpsStatus.signalStrength || 0}
            visible={gpsStatus.visible}
            theme={theme}
            onPress={onGPSStatusPress}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none', // Allow touches to pass through to map
  },
  journeyInfoContainer: {
    position: 'absolute',
    top: 120, // Below locate button and map controls
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  gpsStatusContainer: {
    position: 'absolute',
    top: 180, // Below journey info display
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'auto', // Allow GPS status to be tappable
  },
});

export default React.memo(MapStatusDisplays);