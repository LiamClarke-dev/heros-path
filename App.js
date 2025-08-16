import React from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';

// Context Providers
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ExplorationProvider } from './contexts/ExplorationContext';

// Navigation
import { NavigationContainer } from './navigation/NavigationContainer';

/**
 * Main App component with navigation infrastructure
 * 
 * Features implemented:
 * - React Navigation v7 with drawer, tab, and stack navigators
 * - Theme integration with light, dark, and adventure themes
 * - Authentication-based navigation routing
 * - Deep linking support
 * - Navigation state management
 * - Accessibility support
 * 
 * Navigation Structure:
 * - AuthNavigator: Routes between authenticated and unauthenticated flows
 * - MainNavigator: Drawer navigation for authenticated users
 * - TabNavigator: Bottom tabs for core features (Map, Journeys, Discoveries, Saved Places)
 * - Various stacks for different feature areas
 */

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ExplorationProvider>
          <NavigationProvider>
            <StatusBar style="auto" />
            <NavigationContainer />
          </NavigationProvider>
        </ExplorationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
