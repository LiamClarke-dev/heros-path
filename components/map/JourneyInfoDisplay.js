/**
 * JourneyInfoDisplay Component
 * 
 * Displays real-time journey information during tracking including duration,
 * distance, and point count. Updates automatically as journey progresses
 * and provides visual feedback for journey state changes.
 * 
 * Requirements addressed:
 * - 4.1: Extract journey information display logic
 * - 4.2: Implement real-time journey stats visualization
 * - 4.4: Handle journey state changes and display updates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// CRITICAL FIX: Use centralized distance calculation
import { calculateJourneyDistance } from '../../utils/distanceUtils';

/**
 * JourneyInfoDisplay Component Props
 * @typedef {Object} JourneyInfoDisplayProps
 * @property {boolean} isTracking - Whether journey tracking is active
 * @property {number} startTime - Journey start timestamp
 * @property {Array} currentPath - Array of coordinate objects for current journey
 * @property {string} theme - Current theme ('light', 'dark', 'adventure')
 */

const JourneyInfoDisplay = ({
  isTracking,
  startTime,
  currentPath = [],
  theme = 'light',
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [fadeAnim] = useState(new Animated.Value(0));

  // Update current time every second for duration calculation
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking]);

  // Fade in animation when tracking starts
  useEffect(() => {
    if (isTracking) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isTracking, fadeAnim]);

  // Don't render if not tracking
  if (!isTracking || !startTime) {
    return null;
  }

  /**
   * Calculate journey duration in human-readable format
   */
  const getDuration = () => {
    const duration = currentTime - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }
  };

  /**
   * Calculate total journey distance using centralized calculation
   * CRITICAL FIX: Use the same calculation as the rest of the app
   */
  const getDistance = () => {
    if (!currentPath || currentPath.length < 2) {
      return 0;
    }

    // Use centralized distance calculation for consistency
    return Math.round(calculateJourneyDistance(currentPath));
  };

  /**
   * Format distance for display
   */
  const formatDistance = (distance) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)}km`;
    }
    return `${distance}m`;
  };

  /**
   * Get container style based on theme
   */
  const getContainerStyle = () => {
    const baseStyle = { ...styles.container };

    switch (theme) {
      case 'dark':
        baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        break;
      case 'adventure':
        baseStyle.backgroundColor = 'rgba(139, 69, 19, 0.8)';
        break;
      default:
        baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.8)';
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
        return '#fff';
    }
  };

  /**
   * Get accent color based on theme
   */
  const getAccentColor = () => {
    switch (theme) {
      case 'dark':
        return '#00FF88';
      case 'adventure':
        return '#FFD700'; // Gold
      default:
        return '#00AA44';
    }
  };

  const distance = getDistance();
  const pointCount = currentPath.length;

  return (
    <Animated.View style={[getContainerStyle(), { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.recordingIndicator}>
          <View style={[styles.recordingDot, { backgroundColor: getAccentColor() }]} />
          <Text style={[styles.titleText, { color: getTextColor() }]}>
            Recording Journey
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons 
            name="time-outline" 
            size={14} 
            color={getTextColor()} 
            style={styles.statIcon}
          />
          <Text style={[styles.statText, { color: getTextColor() }]}>
            {getDuration()}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons 
            name="walk-outline" 
            size={14} 
            color={getTextColor()} 
            style={styles.statIcon}
          />
          <Text style={[styles.statText, { color: getTextColor() }]}>
            {formatDistance(distance)}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons 
            name="location-outline" 
            size={14} 
            color={getTextColor()} 
            style={styles.statIcon}
          />
          <Text style={[styles.statText, { color: getTextColor() }]}>
            {pointCount} pts
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statIcon: {
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
});

export default JourneyInfoDisplay;