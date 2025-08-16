import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import MapScreen from '../../screens/MapScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for map-related screens
 * Provides navigation controls and header configuration for map functionality
 */
export function MapStack() {
  const { theme, navigationStyles } = useTheme();
  const navigation = useNavigation();

  // Header button component for drawer toggle
  const DrawerToggleButton = React.useCallback(() => (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ 
        padding: 8, 
        marginLeft: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.1)'
      }}
      accessibilityLabel="Open navigation menu"
      accessibilityHint="Double tap to open the navigation drawer"
    >
      <Ionicons 
        name="menu" 
        size={24} 
        color={theme.colors.onSurface} 
      />
    </TouchableOpacity>
  ), [navigation, theme.colors.onSurface]);
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: navigationStyles.header,
        headerTintColor: navigationStyles.headerTint,
        headerTitleStyle: navigationStyles.headerTitle,
        headerBackTitleVisible: false,
        cardStyle: navigationStyles.cardStyle,
        // Enhanced transition animations
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 250,
            },
          },
        },
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen 
        name="MapMain" 
        component={MapScreen}
        options={{ 
          title: "Hero's Path",
          headerShown: true,
          headerLeft: () => <DrawerToggleButton />,
          headerStyle: {
            ...navigationStyles.header,
            backgroundColor: 'rgba(255,255,255,0.95)',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            ...navigationStyles.headerTitle,
            fontWeight: '600',
            fontSize: 18,
          },
          headerTintColor: navigationStyles.headerTint,
          headerTransparent: true,
          headerBackground: () => (
            <BlurView 
              intensity={80} 
              tint="light" 
              style={{ flex: 1 }}
            />
          ),
        }}
      />
    </Stack.Navigator>
  );
}