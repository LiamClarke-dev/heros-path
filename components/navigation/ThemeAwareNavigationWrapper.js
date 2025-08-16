import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeTransition, useThemeAwareIcons } from '../../hooks/useThemeTransition';

/**
 * Wrapper component that provides smooth theme transitions for navigation elements
 * Handles real-time theme updates and animations
 */
export function ThemeAwareNavigationWrapper({ 
  children, 
  style, 
  enableTransitions = true,
  transitionDuration = 300,
}) {
  const { theme, currentTheme } = useTheme();
  const { isTransitioning, getAnimatedStyle } = useThemeTransition();
  const previousThemeRef = useRef(currentTheme);
  
  // Animated values for background color transitions
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (enableTransitions && previousThemeRef.current !== currentTheme) {
      // Animate background color change
      Animated.timing(backgroundColorAnim, {
        toValue: 1,
        duration: transitionDuration,
        useNativeDriver: false,
      }).start(() => {
        backgroundColorAnim.setValue(0);
      });
    }
    previousThemeRef.current = currentTheme;
  }, [currentTheme, enableTransitions, transitionDuration]);
  
  const animatedBackgroundColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, theme.colors.surface],
  });
  
  if (!enableTransitions) {
    return (
      <View style={[{ backgroundColor: theme.colors.surface }, style]}>
        {children}
      </View>
    );
  }
  
  return (
    <Animated.View
      style={[
        {
          backgroundColor: animatedBackgroundColor,
        },
        getAnimatedStyle(),
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Theme-aware text component that updates colors dynamically
 */
export function ThemeAwareText({ 
  children, 
  style, 
  colorKey = 'text',
  enableTransitions = true,
  ...props 
}) {
  const { theme } = useTheme();
  const { getInterpolatedColor } = useThemeTransition();
  
  const textColor = enableTransitions 
    ? getInterpolatedColor(colorKey)
    : theme.colors[colorKey];
  
  return (
    <Animated.Text
      style={[
        { color: textColor },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.Text>
  );
}

/**
 * Theme-aware icon component with dynamic color updates
 */
export function ThemeAwareIcon({ 
  name, 
  size = 24, 
  colorKey = 'text',
  enableTransitions = true,
  style,
  ...props 
}) {
  const { theme } = useTheme();
  const { getInterpolatedColor } = useThemeTransition();
  const { getThemeIcon } = useThemeAwareIcons();
  
  const iconColor = enableTransitions 
    ? getInterpolatedColor(colorKey)
    : theme.colors[colorKey];
  
  const iconName = getThemeIcon(name);
  
  return (
    <Ionicons
      name={iconName}
      size={size}
      color={iconColor}
      style={style}
      {...props}
    />
  );
}