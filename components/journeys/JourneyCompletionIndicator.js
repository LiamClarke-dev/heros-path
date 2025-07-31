/**
 * JourneyCompletionIndicator - Shows journey completion status
 * 
 * Single Responsibility: Visual completion status display
 * Requirements: 3.3, 3.6
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export const JourneyCompletionIndicator = React.memo(({ completionStatus }) => {
  const { theme } = useTheme();
  
  const {
    isCompleted,
    completionPercentage,
    reviewedCount,
    totalCount,
    hasDiscoveries
  } = completionStatus;

  if (!hasDiscoveries) {
    return null;
  }

  const getStatusColor = () => {
    if (isCompleted) return theme.colors.success;
    if (completionPercentage > 50) return theme.colors.warning;
    return theme.colors.textSecondary;
  };

  const getStatusIcon = () => {
    if (isCompleted) return 'checkmark-circle';
    if (completionPercentage > 0) return 'time';
    return 'ellipse-outline';
  };

  const getStatusText = () => {
    if (isCompleted) return 'Discoveries reviewed';
    if (completionPercentage > 0) return 'Partially reviewed';
    return 'Discoveries pending';
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    statusIcon: {
      marginRight: 6,
    },
    statusText: {
      fontSize: 13,
      color: statusColor,
      fontWeight: '500',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressBar: {
      width: 60,
      height: 4,
      backgroundColor: `${statusColor}20`,
      borderRadius: 2,
      marginRight: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: statusColor,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Ionicons
          name={statusIcon}
          size={16}
          color={statusColor}
          style={styles.statusIcon}
        />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${completionPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(completionPercentage)}%
        </Text>
      </View>
    </View>
  );
});

JourneyCompletionIndicator.displayName = 'JourneyCompletionIndicator';