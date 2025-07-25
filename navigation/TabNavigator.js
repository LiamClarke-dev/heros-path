import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MapStack } from './stacks/MapStack';
import { JourneysStack } from './stacks/JourneysStack';
import { DiscoveriesStack } from './stacks/DiscoveriesStack';
import { SavedPlacesStack } from './stacks/SavedPlacesStack';

const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigation for core app features
 * Enables quick switching between primary functions
 */
export function TabNavigator() {
  const { theme } = useTheme();
  
  const getTabIcon = (routeName, focused) => {
    const iconMap = {
      Map: focused ? 'map' : 'map-outline',
      Journeys: focused ? 'trail-sign' : 'trail-sign-outline',
      Discoveries: focused ? 'compass' : 'compass-outline',
      SavedPlaces: focused ? 'bookmark' : 'bookmark-outline',
    };
    return iconMap[routeName] || 'help-circle-outline';
  };
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapStack}
        options={{ 
          title: 'Map',
          tabBarAccessibilityLabel: 'Map Screen',
        }}
      />
      <Tab.Screen 
        name="Journeys" 
        component={JourneysStack}
        options={{ 
          title: 'Journeys',
          tabBarAccessibilityLabel: 'Past Journeys',
        }}
      />
      <Tab.Screen 
        name="Discoveries" 
        component={DiscoveriesStack}
        options={{ 
          title: 'Discoveries',
          tabBarAccessibilityLabel: 'Discoveries',
        }}
      />
      <Tab.Screen 
        name="SavedPlaces" 
        component={SavedPlacesStack}
        options={{ 
          title: 'Saved',
          tabBarAccessibilityLabel: 'Saved Places',
        }}
      />
    </Tab.Navigator>
  );
}