import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TabNavigator } from './TabNavigator';
import { SocialStack } from './stacks/SocialStack';
import { SettingsStack } from './stacks/SettingsStack';
import { CustomDrawerContent } from '../components/navigation/CustomDrawerContent';
// Performance utilities temporarily disabled
// import { getAdaptiveAnimationConfig } from '../utils/navigationPerformance';
// import { useResponsivePerformance } from '../utils/responsivePerformanceHandler';

const Drawer = createDrawerNavigator();

/**
 * Main drawer navigation for authenticated users
 * Provides access to all major app features
 */
export function MainNavigator() {
  const { theme, navigationStyles } = useTheme();
  // Performance utilities temporarily disabled
  // const { config, getAnimationConfig } = useResponsivePerformance();
  // const adaptiveAnimationConfig = getAnimationConfig();
  
  // Don't render until responsive config is ready
  // if (!config) return null;
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: navigationStyles.overlayColor,
        drawerStyle: {
          ...navigationStyles.drawer,
          width: 280,
        },
        drawerActiveTintColor: navigationStyles.drawerActive,
        drawerInactiveTintColor: navigationStyles.drawerInactive,
        drawerActiveBackgroundColor: navigationStyles.drawerActiveBackground,
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 2,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
          marginLeft: -16,
        },
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