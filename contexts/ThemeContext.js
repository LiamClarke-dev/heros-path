import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

// Theme definitions
const themes = {
  light: {
    colors: {
      primary: '#4A90E2',
      primaryDark: '#357ABD',
      secondary: '#50C878',
      background: '#FFFFFF',
      surface: '#F8F9FA',
      card: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#666666',
      border: '#E1E5E9',
      notification: '#FF6B6B',
      success: '#50C878',
      warning: '#FFB347',
      error: '#FF6B6B',
    },
    dark: false,
  },
  dark: {
    colors: {
      primary: '#5AA3F0',
      primaryDark: '#4A90E2',
      secondary: '#60D888',
      background: '#121212',
      surface: '#1E1E1E',
      card: '#2D2D2D',
      text: '#FFFFFF',
      textSecondary: '#B3B3B3',
      border: '#404040',
      notification: '#FF7B7B',
      success: '#60D888',
      warning: '#FFD700',
      error: '#FF7B7B',
    },
    dark: true,
  },
  adventure: {
    colors: {
      primary: '#8B4513',
      primaryDark: '#654321',
      secondary: '#228B22',
      background: '#2F4F2F',
      surface: '#3C5C3C',
      card: '#4A6A4A',
      text: '#F5DEB3',
      textSecondary: '#DEB887',
      border: '#556B2F',
      notification: '#DC143C',
      success: '#32CD32',
      warning: '#FFD700',
      error: '#DC143C',
    },
    dark: true,
  },
};

// React Navigation theme mapping with enhanced styling
const createNavigationTheme = (theme) => ({
  dark: theme.dark,
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.notification,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '900',
    },
  },
});

// Enhanced navigation styling configurations
const createNavigationStyles = (theme) => ({
  // Header styles
  header: {
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.3 : 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  headerTint: theme.colors.text,
  
  // Tab bar styles
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: theme.dark ? 0.3 : 0.1,
    shadowRadius: 8,
  },
  tabBarActive: theme.colors.primary,
  tabBarInactive: theme.colors.textSecondary,
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Drawer styles
  drawer: {
    backgroundColor: theme.colors.surface,
    width: 280,
  },
  drawerActive: theme.colors.primary,
  drawerInactive: theme.colors.textSecondary,
  drawerActiveBackground: `${theme.colors.primary}20`,
  drawerHeader: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Animation and transition styles
  cardStyle: {
    backgroundColor: theme.colors.background,
  },
  overlayColor: theme.dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
  
  // Accessibility contrast ratios
  contrastRatios: {
    primaryOnBackground: getContrastRatio(theme.colors.primary, theme.colors.background),
    textOnSurface: getContrastRatio(theme.colors.text, theme.colors.surface),
    textOnPrimary: getContrastRatio('#FFFFFF', theme.colors.primary),
  },
});

// Helper function to calculate contrast ratio for accessibility
const getContrastRatio = (foreground, background) => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  const getLuminance = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme && themes[savedTheme]) {
          setCurrentTheme(savedTheme);
        } else if (savedTheme === 'system') {
          setCurrentTheme('system');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Save theme preference
  const setTheme = async (themeName) => {
    try {
      await AsyncStorage.setItem('theme', themeName);
      setCurrentTheme(themeName);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Get effective theme based on current selection
  const getEffectiveTheme = () => {
    if (currentTheme === 'system') {
      return systemColorScheme === 'dark' ? themes.dark : themes.light;
    }
    return themes[currentTheme] || themes.light;
  };

  const theme = getEffectiveTheme();
  const navigationTheme = createNavigationTheme(theme);
  const navigationStyles = createNavigationStyles(theme);

  const value = {
    theme,
    navigationTheme,
    navigationStyles,
    currentTheme,
    setTheme,
    isLoading,
    availableThemes: Object.keys(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};