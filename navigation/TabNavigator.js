import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { MapStack } from './stacks/MapStack';
import { JourneysStack } from './stacks/JourneysStack';
import { DiscoveriesStack } from './stacks/DiscoveriesStack';
import { SavedPlacesStack } from './stacks/SavedPlacesStack';

const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigation for core app features
 * Enables quick switching between primary functions with badge support
 */
export function TabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Mock badge data - in real implementation, this would come from context/state
  const tabBadges = {
    Map: null,
    Journeys: null,
    Discoveries: 3, // Example: 3 new discoveries
    SavedPlaces: null,
  };
  
  const getTabIcon = (routeName, focused) => {
    const iconMap = {
      Map: focused ? 'map' : 'map-outline',
      Journeys: focused ? 'trail-sign' : 'trail-sign-outline',
      Discoveries: focused ? 'compass' : 'compass-outline',
      SavedPlaces: focused ? 'bookmark' : 'bookmark-outline',
    };
    return iconMap[routeName] || 'help-circle-outline';
  };
  
  const TabIconWithBadge = ({ routeName, focused, color, size }) => {
    const iconName = getTabIcon(routeName, focused);
    const badgeCount = tabBadges[routeName];
    
    return (
      <View style={{ position: 'relative' }}>
        <Ionicons name={iconName} size={size} color={color} />
        {badgeCount && badgeCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.colors.notification }]}>
            <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
              {badgeCount > 99 ? '99+' : badgeCount.toString()}
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    badge: {
      position: 'absolute',
      right: -8,
      top: -4,
      backgroundColor: theme.colors.notification,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
  });
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          return (
            <TabIconWithBadge 
              routeName={route.name}
              focused={focused}
              color={color}
              size={size}
            />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 10), // Ensure minimum 10pt buffer
          paddingTop: 5,
          height: 60 + Math.max(insets.bottom, 10), // Adjust height for safe area
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
          tabBarAccessibilityLabel: 'Map Screen - Navigate to map view',
          tabBarAccessibilityHint: 'Double tap to view the map and start tracking your journey',
        }}
      />
      <Tab.Screen 
        name="Journeys" 
        component={JourneysStack}
        options={{ 
          title: 'Journeys',
          tabBarAccessibilityLabel: 'Past Journeys - View your journey history',
          tabBarAccessibilityHint: 'Double tap to view your past journeys and routes',
        }}
      />
      <Tab.Screen 
        name="Discoveries" 
        component={DiscoveriesStack}
        options={{ 
          title: 'Discoveries',
          tabBarAccessibilityLabel: 'Discoveries - View discovered places',
          tabBarAccessibilityHint: 'Double tap to view places you have discovered',
          tabBarBadge: tabBadges.Discoveries > 0 ? tabBadges.Discoveries : undefined,
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