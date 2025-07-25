/**
 * GPSStatusDisplay Component
 * 
 * Displays detailed GPS status information including signal strength,
 * accuracy, and helpful messages for GPS issues. Provides visual feedback
 * for GPS states and guidance for improving GPS signal.
 * 
 * Requirements addressed:
 * - 1.4: Visual indicators for GPS signal strength
 * - 5.4: GPS signal loss feedback
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GPS_STATE_INDICATORS } from '../../constants/SpriteConstants';
import { getGPSSignalStrength } from '../../utils/spriteUtils';

/**
 * GPSStatusDisplay Component Props
 * @typedef {Object} GPSStatusDisplayProps
 * @property {Object} gpsState - GPS state object from getSpriteState
 * @property {number} signalStrength - GPS signal strength percentage (0-100)
 * @property {boolean} visible - Whether to show the display
 * @property {string} theme - Theme for styling ('light', 'dark', 'adventure')
 * @property {Function} onPress - Callback when display is pressed (optional)
 */

const GPSStatusDisplay = ({
  gpsState,
  signalStrength = 0,
  visible = true,
  theme = 'light',
  onPress,
}) => {
  if (!visible || !gpsState) {
    return null;
  }

  const indicators = GPS_STATE_INDICATORS[gpsState.indicator] || GPS_STATE_INDICATORS.LOST;

  /**
   * Get status icon based on GPS state
   */
  const getStatusIcon = () => {
    switch (gpsState.indicator) {
      case 'GOOD':
        return 'checkmark-circle';
      case 'POOR':
        return 'warning';
      case 'LOST':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  /**
   * Get helpful message based on GPS state
   */
  const getHelpfulMessage = () => {
    switch (gpsState.indicator) {
      case 'GOOD':
        return 'GPS signal is strong';
      case 'POOR':
        return 'GPS signal is weak. Move to open area for better accuracy.';
      case 'LOST':
        return 'GPS signal lost. Check location permissions and move outdoors.';
      default:
        return 'Checking GPS signal...';
    }
  };

  /**
   * Get container style based on theme and GPS state
   */
  const getContainerStyle = () => {
    const baseStyle = {
      ...styles.container,
      borderColor: indicators.borderColor || indicators.color,
      borderWidth: indicators.borderWidth || 1,
    };

    // Theme-specific styling
    switch (theme) {
      case 'dark':
        baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        break;
      case 'adventure':
        baseStyle.backgroundColor = 'rgba(139, 69, 19, 0.8)';
        break;
      default:
        baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    }

    return baseStyle;
  };

  /**
   * Get text color based on theme
   */
  const getTextColor = () => {
    switch (theme) {
      case 'dark':
        return '#fff';
      case 'adventure':
        return '#f5f5dc'; // Beige
      default:
        return '#333';
    }
  };

  /**
   * Render signal strength bars
   */
  const renderSignalBars = () => {
    return (
      <View style={styles.signalBarsContainer}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <View
            key={bar}
            style={[
              styles.signalBar,
              {
                backgroundColor: signalStrength >= (bar * 20) 
                  ? indicators.color 
                  : 'rgba(128, 128, 128, 0.3)',
                height: 4 + (bar * 2), // Increasing height for each bar
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={getContainerStyle()}>
      <View style={styles.header}>
        <Ionicons
          name={getStatusIcon()}
          size={16}
          color={indicators.color}
          style={styles.statusIcon}
        />
        <Text style={[styles.statusText, { color: getTextColor() }]}>
          GPS: {gpsState.level}
        </Text>
        {renderSignalBars()}
      </View>
      
      <View style={styles.details}>
        <Text style={[styles.accuracyText, { color: getTextColor() }]}>
          Accuracy: {gpsState.accuracy ? `${Math.round(gpsState.accuracy)}m` : 'Unknown'}
        </Text>
        <Text style={[styles.strengthText, { color: getTextColor() }]}>
          Signal: {signalStrength}%
        </Text>
      </View>
      
      <Text style={[styles.messageText, { color: getTextColor() }]}>
        {getHelpfulMessage()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  signalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: 25,
    height: 14,
  },
  signalBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accuracyText: {
    fontSize: 12,
    opacity: 0.8,
  },
  strengthText: {
    fontSize: 12,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default GPSStatusDisplay;