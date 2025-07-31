/**
 * JourneyListHeader - Header component with sorting controls
 * 
 * Single Responsibility: Journey list sorting and filtering controls
 * Requirements: 3.1, 3.2
 */

import React, { useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export const JourneyListHeader = React.memo(({
  sortBy,
  sortOrder,
  onSortChange,
  journeyCount,
}) => {
  const { theme } = useTheme();

  const sortOptions = [
    { key: 'date', label: 'Date', icon: 'calendar-outline' },
    { key: 'name', label: 'Name', icon: 'text-outline' },
    { key: 'distance', label: 'Distance', icon: 'walk-outline' },
    { key: 'duration', label: 'Duration', icon: 'time-outline' },
  ];

  /**
   * Handle sort option press
   */
  const handleSortPress = useCallback((sortKey) => {
    if (sortBy === sortKey) {
      // Toggle order if same field
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      onSortChange(sortKey, newOrder);
    } else {
      // New field, default to desc for date/distance/duration, asc for name
      const defaultOrder = sortKey === 'name' ? 'asc' : 'desc';
      onSortChange(sortKey, defaultOrder);
    }
  }, [sortBy, sortOrder, onSortChange]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    countText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    sortContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flex: 1,
      marginHorizontal: 2,
    },
    sortButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sortIcon: {
      marginRight: 4,
    },
    sortText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      flex: 1,
    },
    sortTextActive: {
      color: '#FFFFFF',
    },
    sortOrderIcon: {
      marginLeft: 4,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Past Journeys</Text>
        <Text style={styles.countText}>
          {journeyCount} {journeyCount === 1 ? 'journey' : 'journeys'}
        </Text>
      </View>
      
      <View style={styles.sortContainer}>
        {sortOptions.map((option) => {
          const isActive = sortBy === option.key;
          const orderIcon = sortOrder === 'asc' ? 'chevron-up' : 'chevron-down';
          
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                isActive && styles.sortButtonActive,
              ]}
              onPress={() => handleSortPress(option.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={isActive ? '#FFFFFF' : theme.colors.textSecondary}
                style={styles.sortIcon}
              />
              <Text
                style={[
                  styles.sortText,
                  isActive && styles.sortTextActive,
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {isActive && (
                <Ionicons
                  name={orderIcon}
                  size={12}
                  color="#FFFFFF"
                  style={styles.sortOrderIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

JourneyListHeader.displayName = 'JourneyListHeader';