/**
 * Place Type Toggle Component
 * 
 * Individual toggle switch for place types with immediate preference updates.
 * Provides visual feedback and smooth animations for state changes.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Place Type Toggle Component
 * Renders individual place type with toggle switch and label
 */
const PlaceTypeToggle = React.memo(({
  placeTypeKey,
  label,
  isEnabled,
  onToggle,
  isLast = false,
}) => {
  const { theme } = useTheme();

  // Handle toggle press
  const handleToggle = useCallback(() => {
    onToggle(placeTypeKey);
  }, [placeTypeKey, onToggle]);

  // Handle container press (toggle when tapping anywhere on the row)
  const handleContainerPress = useCallback(() => {
    onToggle(placeTypeKey);
  }, [placeTypeKey, onToggle]);

  // Animated style for the container background
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      withTiming(isEnabled ? 1 : 0, { duration: 200 }),
      [0, 1],
      [theme.colors.surface, theme.colors.primary + '10'] // 10% opacity
    );

    return {
      backgroundColor,
    };
  });

  // Animated style for the label text
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      withTiming(isEnabled ? 1 : 0, { duration: 200 }),
      [0, 1],
      [theme.colors.textSecondary, theme.colors.text]
    );

    return {
      color,
    };
  });

  return (
    <TouchableOpacity
      onPress={handleContainerPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.container,
          !isLast && styles.containerWithBorder,
          !isLast && { borderBottomColor: theme.colors.border },
          containerAnimatedStyle,
        ]}
      >
        <View style={styles.labelContainer}>
          <Animated.Text
            style={[
              styles.label,
              labelAnimatedStyle,
            ]}
          >
            {label}
          </Animated.Text>
        </View>

        <View style={styles.switchContainer}>
          <Switch
            value={isEnabled}
            onValueChange={handleToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={isEnabled ? theme.colors.background : theme.colors.textSecondary}
            ios_backgroundColor={theme.colors.border}
          />
        </View>
      </Animated.View>
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
    minHeight: 48,
  },
  containerWithBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '400',
  },
  switchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

PlaceTypeToggle.displayName = 'PlaceTypeToggle';

export default PlaceTypeToggle;