/**
 * Theme Context Provider
 * 
 * Provides theme configuration throughout the app
 * Simple implementation for MVP - can be extended with theme switching later
 */

import React, { createContext, useContext, useState } from 'react';
import theme from '../styles/theme';

const ThemeContext = createContext();

/**
 * Theme Provider Component
 * 
 * Wraps the app to provide theme context to all components
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ThemeProvider = ({ children }) => {
  // For MVP, we use a single theme. This can be extended later to support
  // theme switching (light/dark mode, custom themes, etc.)
  const [currentTheme] = useState(theme);

  const contextValue = {
    theme: currentTheme,
    // Future: Add theme switching methods here
    // setTheme: (newTheme) => setCurrentTheme(newTheme),
    // toggleDarkMode: () => {...},
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to access theme context
 * 
 * @returns {Object} Theme context containing theme object and methods
 * @throws {Error} If used outside of ThemeProvider
 * 
 * @example
 * const { theme } = useTheme();
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *     padding: theme.spacing.md,
 *   },
 * });
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext;