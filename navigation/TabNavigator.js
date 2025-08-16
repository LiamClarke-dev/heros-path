import React, { useMemo, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeAwareIcons } from '../hooks/useThemeTransition';
// Temporarily disabled: import { ThemeAwareNavigationWrapper } from '../components/navigation/ThemeAwareNavigationWrapper';
import { MapStack } from './stacks/MapStack';
import { JourneysStack } from './stacks/JourneysStack';
import { DiscoveriesStack } from './stacks/DiscoveriesStack';
import { SavedPlacesStack } from './stacks/SavedPlacesStack';
// Performance utilities temporarily disabled
// import { 
//   useOptimizedNavigation,
//   withNavigationPerformance 
// } from '../utils/navigationPerformance';
// import { useNavigationTiming } from '../utils/navigationTimingMonitor';
// import { useAdaptiveScreenSize } from '../utils/responsivePerformanceHandler';

const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigation for core app features
 * Enables quick switching between primary functions with badge support
 */
export function TabNavigator() {
  const { theme, navigationStyles } = useTheme();
  const { getNavigationIcons } = useThemeAwareIcons();
  const insets = useSafeAreaInsets();
  // Performance utilities temporarily disabled
  // const { navigate } = useOptimizedNavigation();
  // const { markPhase } = useNavigationTiming('TabNavigator');
  // const { config, isSmallScreen, isLowEndDevice } = useAdaptiveScreenSize();
  
  const navigationIcons = getNavigationIcons();
  
  // Performance utilities temporarily disabled
  // React.useEffect(() => {
  //   markPhase('tabNavigatorReady');
  // }, [markPhase]);
  
  // Mock badge data - in real implementation, this would come from context/state
  const tabBadges = useMemo(() => ({
    Map: null,
    Journeys: null,
    Discoveries: 3, // Example: 3 new discoveries
    SavedPlaces: null,
  }), []);
  
  // Memoized icon mapping for performance
  const getTabIcon = useCallback((routeName, focused) => {
    const iconMap = {
      Map: focused ? navigationIcons.map : 'map-outline',
      Journeys: focused ? navigationIcons.journeys : 'trail-sign-outline',
      Discoveries: focused ? navigationIcons.discoveries : 'compass-outline',
      SavedPlaces: focused ? navigationIcons.savedPlaces : 'bookmark-outline',
    };
    return iconMap[routeName] || 'help-circle-outline';
  }, [navigationIcons]);
  
  // Memoized tab icon component for performance
  const TabIconWithBadge = React.memo(({ routeName, focused, color, size }) => {
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
  });
  
  // Mark tab navigator as interactive - temporarily disabled
  // React.useEffect(() => {
  //   if (config) {
  //     markPhase('tabNavigatorReady');
  //   }
  // }, [markPhase, config]);

  // Memoized styles for performance
  const styles = useMemo(() => StyleSheet.create({
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
  }), [theme.colors.notification]);
  
  // Performance config temporarily disabled - render immediately
  // if (!config) return null;
  
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
        tabBarActiveTintColor: navigationStyles.tabBarActive,
        tabBarInactiveTintColor: navigationStyles.tabBarInactive,
        tabBarStyle: {
          ...navigationStyles.tabBar,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 5,
          height: 60 + Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: {
          ...navigationStyles.tabBarLabel,
          fontSize: 12,
          display: 'flex',
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        // Enhanced animation and interaction
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            activeOpacity={0.7}
            style={[
              props.style,
              {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          />
        ),
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