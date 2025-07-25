import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TabNavigator } from './TabNavigator';
import { SocialStack } from './stacks/SocialStack';
import { SettingsStack } from './stacks/SettingsStack';
import { CustomDrawerContent } from '../components/navigation/CustomDrawerContent';

const Drawer = createDrawerNavigator();

/**
 * Main drawer navigation for authenticated users
 * Provides access to all major app features
 */
export function MainNavigator() {
  const { theme } = useTheme();
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.5)',
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 280,
        },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textSecondary,
        drawerActiveBackgroundColor: `${theme.colors.primary}20`,
      }}
    >
      <Drawer.Screen 
        name="CoreFeatures" 
        component={TabNavigator}
        options={{ 
          title: "Hero's Path",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Social" 
        component={SocialStack}
        options={{ 
          title: 'Social',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{ 
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}