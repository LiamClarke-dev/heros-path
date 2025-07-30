import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * TrackingStatusIndicator Component
 * 
 * Displays tracking status information and metrics to the user.
 * Shows current tracking state, GPS accuracy, and journey metrics.
 * 
 * Responsibilities:
 * - Display tracking status with appropriate icons and colors
 * - Show GPS accuracy and signal strength indicators
 * - Display journey metrics (points recorded, duration)
 * - Provide visual feedback for different tracking states
 * 
 * Props:
 * - trackingStatus: Current tracking status ('idle', 'starting', 'active', 'stopping', 'error')
 * - metrics: Tracking metrics object with pointsRecorded, lastUpdate, gpsAccuracy
 * - isVisible: Whether to show the indicator
 * - compact: Whether to use compact display mode
 * 
 * Requirements Addressed:
 * - 1.1: Tracking state indicators
 * - 1.6: Real-time position updates on map
 * 
 * @see hooks/useJourneyTracking.js for state management
 */
const TrackingStatusIndicator = ({
  trackingStatus = 'idle',
  metrics = null,
  isVisible = true,
  compact = false,
}) => {
  const { theme } = useTheme();

  if (!isVisible) {
    return null;
  }

  /**
   * Get status icon based on tracking status
   */
  const getStatusIcon = () => {
    switch (trackingStatus) {
      case 'starting':
        return 'hourglass-outline';
      case 'active':
        return 'radio-button-on';
      case 'stopping':
        return 'hourglass-outline';
      case 'error':
        return 'warning-outline';
      case 'idle':
      default:
        return 'radio-button-off';
    }
  };

  /**
   * Get status color based on tracking status
   */
  const getStatusColor = () => {
    switch (trackingStatus) {
      case 'starting':
      case 'stopping':
        return theme.colors.warning || '#FF9800';
      case 'active':
        return theme.colors.success || '#4CAF50';
      case 'error':
        return theme.colors.error || '#F44336';
      case 'idle':
      default:
        return theme.colors.disabled || '#9E9E9E';
    }
  };

  /**
   * Get status text based on tracking status
   */
  const getStatusText = () => {
    switch (trackingStatus) {
      case 'starting':
        return 'Starting GPS...';
      case 'active':
        return 'Tracking Active';
      case 'stopping':
        return 'Stopping...';
      case 'error':
        return 'Tracking Error';
      case 'idle':
      default:
        return 'Not Tracking';
    }
  };

  /**
   * Get GPS accuracy indicator
   */
  const getGPSAccuracyIndicator = () => {
    if (!metrics?.gpsAccuracy) {
      return null;
    }

    const accuracy = metrics.gpsAccuracy;
    let color = theme.colors.success || '#4CAF50';
    let icon = 'cellular';

    if (accuracy > 20) {
      color = theme.colors.error || '#F44336';
      icon = 'cellular-outline';
    } else if (accuracy > 10) {
      color = theme.colors.warning || '#FF9800';
      icon = 'cellular';
    }

    return (
      <View style={styles.accuracyIndicator}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={[styles.accuracyText, { color }]}>
          ±{Math.round(accuracy)}m
        </Text>
      </View>
    );
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.colors.surface }]}>
        <Ionicons 
          name={getStatusIcon()} 
          size={16} 
          color={getStatusColor()} 
        />
        {metrics?.pointsRecorded > 0 && (
          <Text style={[styles.compactText, { color: theme.colors.onSurface }]}>
            {metrics.pointsRecorded}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.statusRow}>
        <Ionicons 
          name={getStatusIcon()} 
          size={16} 
          color={getStatusColor()} 
          style={styles.statusIcon}
        />
        <Text style={[styles.statusText, { color: theme.colors.onSurface }]}>
          {getStatusText()}
        </Text>
        {getGPSAccuracyIndicator()}
      </View>
      
      {metrics && trackingStatus === 'active' && (
        <View style={styles.metricsRow}>
          <Text style={[styles.metricsText, { color: theme.colors.onSurface }]}>
            Points: {metrics.pointsRecorded || 0}
          </Text>
          {metrics.lastUpdate && (
            <Text style={[styles.metricsText, { color: theme.colors.onSurface }]}>
              Updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  compactContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  accuracyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  accuracyText: {
    fontSize: 10,
    marginLeft: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metricsText: {
    fontSize: 10,
    opacity: 0.7,
  },
  compactText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default React.memo(TrackingStatusIndicator);