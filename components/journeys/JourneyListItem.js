/**
 * JourneyListItem - Individual journey item in the list
 * 
 * Single Responsibility: Single journey display with metadata and actions
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2
 */

import React, { useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { JourneyCompletionIndicator } from './JourneyCompletionIndicator';

export const JourneyListItem = React.memo(({
  journey,
  metadata,
  completionStatus,
  onPress,
  onDelete,
}) => {
  const { theme } = useTheme();
  const [deleting, setDeleting] = useState(false);

  /**
   * Handle delete confirmation
   */
  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'Delete Journey',
      `Are you sure you want to delete "${metadata.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete();
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [metadata.name, onDelete]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    pressable: {
      opacity: deleting ? 0.5 : 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleContainer: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    dateTime: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: `${theme.colors.error}15`,
    },
    metadata: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    metadataItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metadataIcon: {
      marginRight: 4,
    },
    metadataText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    completionContainer: {
      marginTop: 12,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.container, styles.pressable]}
      onPress={onPress}
      disabled={deleting}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {metadata.name}
          </Text>
          <Text style={styles.dateTime}>
            {metadata.date} at {metadata.time}
          </Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            disabled={deleting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="delete-button"
          >
            <Ionicons
              name={deleting ? "hourglass-outline" : "trash-outline"}
              size={20}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metadata}>
        <View style={styles.metadataItem}>
          <Ionicons
            name="walk-outline"
            size={16}
            color={theme.colors.textSecondary}
            style={styles.metadataIcon}
          />
          <Text style={styles.metadataText}>{metadata.distance}</Text>
        </View>

        <View style={styles.metadataItem}>
          <Ionicons
            name="time-outline"
            size={16}
            color={theme.colors.textSecondary}
            style={styles.metadataIcon}
          />
          <Text style={styles.metadataText}>{metadata.duration}</Text>
        </View>

        <View style={styles.metadataItem}>
          <Ionicons
            name="compass-outline"
            size={16}
            color={theme.colors.textSecondary}
            style={styles.metadataIcon}
          />
          <Text style={styles.metadataText}>
            {completionStatus.hasDiscoveries 
              ? `${completionStatus.reviewedCount}/${completionStatus.totalCount}` 
              : 'No discoveries'
            }
          </Text>
        </View>
      </View>

      {completionStatus.hasDiscoveries && (
        <View style={styles.completionContainer}>
          <JourneyCompletionIndicator
            completionStatus={completionStatus}
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

JourneyListItem.displayName = 'JourneyListItem';