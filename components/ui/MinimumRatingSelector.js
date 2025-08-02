/**
 * Minimum Rating Selector Component
 * 
 * UI component for selecting minimum rating threshold with visual indicators
 * and immediate preference updates. Displays rating options from 1.0 to 4.5
 * with star indicators.
 * 
 * Requirements: 2.1, 2.2, 2.3
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
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

// Rating options from 1.0 to 4.5 in 0.5 increments
const RATING_OPTIONS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];

/**
 * Minimum Rating Selector Component
 * Allows users to select minimum rating threshold for discoveries
 */
const MinimumRatingSelector = React.memo(({
  value,
  onValueChange,
}) => {
  const { theme } = useTheme();

  // Handle rating selection
  const handleRatingSelect = useCallback((rating) => {
    onValueChange(rating);
  }, [onValueChange]);

  // Render star indicators for a rating
  const renderStars = useCallback((rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    const stars = [];

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <MaterialIcons
          key={`full-${i}`}
          name="star"
          size={16}
          color={theme.colors.warning}
        />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <MaterialIcons
          key="half"
          name="star-half"
          size={16}
          color={theme.colors.warning}
        />
      );
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <MaterialIcons
          key={`empty-${i}`}
          name="star-border"
          size={16}
          color={theme.colors.textSecondary}
        />
      );
    }

    return stars;
  }, [theme.colors.warning, theme.colors.textSecondary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Minimum Rating
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Only show places with at least this rating
        </Text>
      </View>

      {/* Rating Options */}
      <View style={styles.ratingsContainer}>
        {RATING_OPTIONS.map((rating) => (
          <RatingOption
            key={rating}
            rating={rating}
            isSelected={value === rating}
            onSelect={handleRatingSelect}
            renderStars={renderStars}
          />
        ))}
      </View>
    </View>
  );
});

/**
 * Individual Rating Option Component
 * Renders a single rating option with selection state
 */
const RatingOption = React.memo(({
  rating,
  isSelected,
  onSelect,
  renderStars,
}) => {
  const { theme } = useTheme();

  const handlePress = useCallback(() => {
    onSelect(rating);
  }, [rating, onSelect]);

  // Animated style for selection state
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      withTiming(isSelected ? 1 : 0, { duration: 200 }),
      [0, 1],
      [theme.colors.background, theme.colors.primary + '20'] // 20% opacity
    );

    const borderColor = interpolateColor(
      withTiming(isSelected ? 1 : 0, { duration: 200 }),
      [0, 1],
      [theme.colors.border, theme.colors.primary]
    );

    return {
      backgroundColor,
      borderColor,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      withTiming(isSelected ? 1 : 0, { duration: 200 }),
      [0, 1],
      [theme.colors.textSecondary, theme.colors.primary]
    );

    return {
      color,
    };
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.ratingOption,
          containerAnimatedStyle,
        ]}
      >
        <View style={styles.ratingContent}>
          <Animated.Text style={[styles.ratingText, textAnimatedStyle]}>
            {rating.toFixed(1)}
          </Animated.Text>
          <View style={styles.starsContainer}>
            {renderStars(rating)}
          </View>
        </View>
        
        {isSelected && (
          <MaterialIcons
            name="check-circle"
            size={20}
            color={theme.colors.primary}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  ratingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 80,
    flex: 1,
    maxWidth: '48%', // Two columns on most screens
  },
  ratingContent: {
    alignItems: 'center',
    flex: 1,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

MinimumRatingSelector.displayName = 'MinimumRatingSelector';
RatingOption.displayName = 'RatingOption';

export default MinimumRatingSelector;