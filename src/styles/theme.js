/**
 * Hero's Path MVP Theme Configuration
 * 
 * Single theme file for MVP - can be split into separate files later if needed
 * Follows ADR-004: Single Theme File for MVP
 */

const theme = {
  colors: {
    // Primary colors
    primary: '#007AFF',
    primaryDark: '#0056CC',
    primaryLight: '#4DA2FF',
    secondary: '#5856D6',
    secondaryDark: '#3634A3',
    secondaryLight: '#7B7AE8',

    // Status colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',

    // Background colors
    background: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceSecondary: '#E5E5EA',
    overlay: 'rgba(0, 0, 0, 0.4)',

    // Text colors
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    textInverse: '#FFFFFF',

    // Interactive colors
    border: '#C6C6C8',
    borderLight: '#E5E5EA',
    disabled: '#C7C7CC',
    placeholder: '#8E8E93',

    // Map specific colors
    routeActive: '#007AFF',
    routeCompleted: '#34C759',
    markerDefault: '#FF3B30',
    markerSaved: '#FF9500',
  },

  // Spacing scale - consistent spacing throughout the app
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Typography scale
  typography: {
    // Headers
    h1: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 34,
    },
    h2: {
      fontSize: 22,
      fontWeight: 'bold',
      lineHeight: 28,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 25,
    },

    // Body text
    body: {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: 'normal',
      lineHeight: 20,
    },

    // UI text
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal',
      lineHeight: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
  },

  // Border radius values
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50, // For circular elements
  },

  // Shadow configurations
  shadow: {
    small: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },

  // Animation durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },

  // Component specific configurations
  components: {
    button: {
      height: {
        small: 32,
        medium: 44,
        large: 56,
      },
      paddingHorizontal: {
        small: 12,
        medium: 16,
        large: 24,
      },
    },
    input: {
      height: 44,
      paddingHorizontal: 12,
    },
    header: {
      height: 56,
    },
  },
};

export default theme;