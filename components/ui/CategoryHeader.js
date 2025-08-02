/**
 * Category Header Component
 * 
 * Expandable header for place type categories showing category name, icon,
 * enabled count, and expansion state. Includes smooth animations for
 * expansion/collapse functionality.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Category Header Component
 * Displays category information with expansion controls and animations
 */
const CategoryHeader = React.memo(({
  title,
  icon,
  isExpanded,
  enabledCount,
  totalCount,
  onToggle,
}) => {
  const { theme } = useTheme();

  // Handle header press
  const handlePress = useCallback(() => {
    onToggle();
  }, [onToggle]);

  // Animated style for chevron rotation
  const chevronAnimatedStyle = useAnimatedStyle(() => {
    const rotation = withTiming(isExpanded ? 180 : 0, {
      duration: 200,
    });

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  // Determine if category has any enabled types
  const hasEnabledTypes = enabledCount > 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
          <MaterialIcons
            name={icon}
            size={20}
            color={theme.colors.background}
          />
        </View>

        {/* Category Title and Count */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
            {enabledCount} of {totalCount} enabled
          </Text>
        </View>
      </View>

      <View style={styles.rightContent}>
        {/* Enabled Indicator */}
        {hasEnabledTypes && (
          <View style={[styles.enabledIndicator, { backgroundColor: theme.colors.success }]} />
        )}

        {/* Expansion Chevron */}
        <Animated.View style={chevronAnimatedStyle}>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={24}
            color={theme.colors.textSecondary}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  count: {
    fontSize: 13,
    fontWeight: '400',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enabledIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});

CategoryHeader.displayName = 'CategoryHeader';

export default CategoryHeader;