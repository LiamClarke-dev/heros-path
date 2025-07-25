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

// React Navigation theme mapping
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

  const value = {
    theme,
    navigationTheme,
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