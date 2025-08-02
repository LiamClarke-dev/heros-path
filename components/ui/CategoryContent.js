/**
 * Category Content Component
 * 
 * Displays the expanded content of a category including all place type toggles.
 * Renders individual place type switches with smooth animations and proper
 * state management.
 * 
 * Requirements: 3.1, 3.2, 1.1, 1.2, 1.3
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { PlaceTypeUtils } from '../../constants/PlaceTypes';
import PlaceTypeToggle from './PlaceTypeToggle';

/**
 * Category Content Component
 * Renders expanded category content with place type toggles
 */
const CategoryContent = React.memo(({
  categoryTitle,
  preferences,
  onTogglePlaceType,
}) => {
  const { theme } = useTheme();

  // Get place types for this category
  const placeTypes = PlaceTypeUtils.getPlaceTypesInCategory(categoryTitle);

  // Animated container style
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 200 }),
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        },
        containerAnimatedStyle,
      ]}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.content}>
        {placeTypes.map((placeTypeKey, index) => {
          const placeType = PlaceTypeUtils.getPlaceTypeLabel(placeTypeKey);
          const isEnabled = preferences[placeTypeKey] || false;

          return (
            <PlaceTypeToggle
              key={placeTypeKey}
              placeTypeKey={placeTypeKey}
              label={placeType}
              isEnabled={isEnabled}
              onToggle={onTogglePlaceType}
              isLast={index === placeTypes.length - 1}
            />
          );
        })}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    paddingVertical: 8,
  },
});

CategoryContent.displayName = 'CategoryContent';

export default CategoryContent;