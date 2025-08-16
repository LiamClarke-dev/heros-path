import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Hook for managing smooth theme transitions in navigation components
 * Provides animated values for theme changes and transition states
 */
export function useThemeTransition() {
  const { theme, currentTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousTheme, setPreviousTheme] = useState(null);
  
  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Track theme changes
  useEffect(() => {
    if (previousTheme && previousTheme !== currentTheme) {
      performThemeTransition();
    }
    setPreviousTheme(currentTheme);
  }, [currentTheme]);
  
  const performThemeTransition = () => {
    setIsTransitioning(true);
    
    // Fade out, then fade in with new theme
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 150,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      setIsTransitioning(false);
    });
  };
  
  // Get animated style for components
  const getAnimatedStyle = () => ({
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }],
  });
  
  // Get interpolated colors for smooth color transitions
  const getInterpolatedColor = (colorKey) => {
    if (!previousTheme || !isTransitioning) {
      return theme.colors[colorKey];
    }
    
    // In a real implementation, you'd interpolate between colors
    // For now, return the current theme color
    return theme.colors[colorKey];
  };
  
  return {
    isTransitioning,
    getAnimatedStyle,
    getInterpolatedColor,
    fadeAnim,
    scaleAnim,
  };
}

/**
 * Hook for theme-aware icon selection
 * Automatically selects appropriate icons based on current theme
 */
export function useThemeAwareIcons() {
  const { currentTheme } = useTheme();
  
  const getThemeIcon = (baseIcon, themedIcons = {}) => {
    // Return theme-specific icon if available, otherwise use base icon
    return themedIcons[currentTheme] || baseIcon;
  };
  
  const getNavigationIcons = () => {
    const iconSets = {
      light: {
        map: 'map-outline',
        journeys: 'trail-sign-outline',
        discoveries: 'compass-outline',
        savedPlaces: 'bookmark-outline',
        social: 'people-outline',
        settings: 'settings-outline',
        menu: 'menu-outline',
        back: 'arrow-back-outline',
        close: 'close-outline',
      },
      dark: {
        map: 'map',
        journeys: 'trail-sign',
        discoveries: 'compass',
        savedPlaces: 'bookmark',
        social: 'people',
        settings: 'settings',
        menu: 'menu',
        back: 'arrow-back',
        close: 'close',
      },
      adventure: {
        map: 'map',
        journeys: 'trail-sign',
        discoveries: 'compass',
        savedPlaces: 'bookmark',
        social: 'people',
        settings: 'settings',
        menu: 'menu',
        back: 'arrow-back',
        close: 'close',
      },
    };
    
    return iconSets[currentTheme] || iconSets.light;
  };
  
  return {
    getThemeIcon,
    getNavigationIcons,
  };
}