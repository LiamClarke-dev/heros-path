/**
 * Hero's Path MVP - Main App Component
 * 
 * Root component that sets up theme provider and navigation
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </ThemeProvider>
  );
}
