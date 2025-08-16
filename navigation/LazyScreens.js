/**
 * Lazy-loaded navigation screens for performance optimization
 * Implements code splitting and lazy loading for all navigation screens
 */

import React from 'react';
import { createLazyScreen } from '../utils/navigationPerformance';

// Lazy load all screen components
export const LazyMapScreen = createLazyScreen(
  () => import('../screens/MapScreen'),
  <MapScreenSkeleton />
);

export const LazyPastJourneysScreen = createLazyScreen(
  () => import('../screens/PastJourneysScreen'),
  <JourneysScreenSkeleton />
);

export const LazyDiscoveryPreferencesScreen = createLazyScreen(
  () => import('../screens/DiscoveryPreferencesScreen'),
  <DiscoveryScreenSkeleton />
);

export const LazySettingsScreen = createLazyScreen(
  () => import('../screens/SettingsScreen'),
  <SettingsScreenSkeleton />
);

export const LazySignInScreen = createLazyScreen(
  () => import('../screens/SignInScreen'),
  <AuthScreenSkeleton />
);

export const LazyEmailAuthScreen = createLazyScreen(
  () => import('../screens/EmailAuthScreen'),
  <AuthScreenSkeleton />
);

export const LazyLoadingScreen = createLazyScreen(
  () => import('../screens/LoadingScreen'),
  <LoadingScreenSkeleton />
);

export const LazyPlaceholderScreen = createLazyScreen(
  () => import('../screens/PlaceholderScreen'),
  <PlaceholderScreenSkeleton />
);

export const LazySimpleMapScreen = createLazyScreen(
  () => import('../screens/SimpleMapScreen'),
  <MapScreenSkeleton />
);

// Skeleton loading components for better UX
const MapScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.mapPlaceholder}>
      <View style={skeletonStyles.shimmer} />
      <Text style={skeletonStyles.loadingText}>Loading Map...</Text>
    </View>
    <View style={skeletonStyles.controlsPlaceholder}>
      <View style={[skeletonStyles.button, skeletonStyles.shimmer]} />
      <View style={[skeletonStyles.button, skeletonStyles.shimmer]} />
      <View style={[skeletonStyles.button, skeletonStyles.shimmer]} />
    </View>
  </View>
));

const JourneysScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.header}>
      <View style={[skeletonStyles.title, skeletonStyles.shimmer]} />
    </View>
    <View style={skeletonStyles.listContainer}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={skeletonStyles.listItem}>
          <View style={[skeletonStyles.listItemImage, skeletonStyles.shimmer]} />
          <View style={skeletonStyles.listItemContent}>
            <View style={[skeletonStyles.listItemTitle, skeletonStyles.shimmer]} />
            <View style={[skeletonStyles.listItemSubtitle, skeletonStyles.shimmer]} />
          </View>
        </View>
      ))}
    </View>
  </View>
));

const DiscoveryScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.header}>
      <View style={[skeletonStyles.title, skeletonStyles.shimmer]} />
    </View>
    <View style={skeletonStyles.gridContainer}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} style={skeletonStyles.gridItem}>
          <View style={[skeletonStyles.gridItemImage, skeletonStyles.shimmer]} />
          <View style={[skeletonStyles.gridItemTitle, skeletonStyles.shimmer]} />
        </View>
      ))}
    </View>
  </View>
));

const SettingsScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.header}>
      <View style={[skeletonStyles.title, skeletonStyles.shimmer]} />
    </View>
    <View style={skeletonStyles.settingsContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={skeletonStyles.settingsItem}>
          <View style={[skeletonStyles.settingsIcon, skeletonStyles.shimmer]} />
          <View style={skeletonStyles.settingsContent}>
            <View style={[skeletonStyles.settingsTitle, skeletonStyles.shimmer]} />
            <View style={[skeletonStyles.settingsSubtitle, skeletonStyles.shimmer]} />
          </View>
          <View style={[skeletonStyles.settingsArrow, skeletonStyles.shimmer]} />
        </View>
      ))}
    </View>
  </View>
));

const AuthScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.authContainer}>
      <View style={[skeletonStyles.logo, skeletonStyles.shimmer]} />
      <View style={[skeletonStyles.authTitle, skeletonStyles.shimmer]} />
      <View style={skeletonStyles.authForm}>
        <View style={[skeletonStyles.input, skeletonStyles.shimmer]} />
        <View style={[skeletonStyles.input, skeletonStyles.shimmer]} />
        <View style={[skeletonStyles.authButton, skeletonStyles.shimmer]} />
      </View>
    </View>
  </View>
));

const LoadingScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.loadingContainer}>
    <View style={[skeletonStyles.loadingSpinner, skeletonStyles.shimmer]} />
    <View style={[skeletonStyles.loadingText, skeletonStyles.shimmer]} />
  </View>
));

const PlaceholderScreenSkeleton = React.memo(() => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.placeholderContainer}>
      <View style={[skeletonStyles.placeholderIcon, skeletonStyles.shimmer]} />
      <View style={[skeletonStyles.placeholderTitle, skeletonStyles.shimmer]} />
      <View style={[skeletonStyles.placeholderText, skeletonStyles.shimmer]} />
    </View>
  </View>
));

// Skeleton styles with shimmer animation
const skeletonStyles = {
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Shimmer effect
  shimmer: {
    backgroundColor: '#E1E9EE',
    opacity: 0.7,
  },
  
  // Map screen skeleton
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  controlsPlaceholder: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E1E9EE',
  },
  
  // List screen skeleton
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    height: 28,
    width: 200,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  listItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E1E9EE',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listItemTitle: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginBottom: 8,
  },
  listItemSubtitle: {
    height: 12,
    width: '60%',
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  
  // Grid screen skeleton
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  gridItemImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E1E9EE',
    marginBottom: 8,
  },
  gridItemTitle: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  
  // Settings screen skeleton
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  settingsContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingsTitle: {
    height: 16,
    width: '60%',
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginBottom: 4,
  },
  settingsSubtitle: {
    height: 12,
    width: '40%',
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  settingsArrow: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  
  // Auth screen skeleton
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E1E9EE',
    marginBottom: 32,
  },
  authTitle: {
    height: 24,
    width: 200,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginBottom: 32,
  },
  authForm: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E1E9EE',
    marginBottom: 16,
  },
  authButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E1E9EE',
    marginTop: 16,
  },
  
  // Loading screen skeleton
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1E9EE',
    marginBottom: 16,
  },
  loadingText: {
    height: 16,
    width: 100,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  
  // Placeholder screen skeleton
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E1E9EE',
    marginBottom: 24,
  },
  placeholderTitle: {
    height: 20,
    width: 180,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginBottom: 16,
  },
  placeholderText: {
    height: 14,
    width: 240,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
};

// Screen preloading configuration
export const SCREEN_PRELOAD_CONFIG = {
  // Screens to preload on app start
  CRITICAL_SCREENS: [
    'MapScreen',
    'PastJourneysScreen',
  ],
  
  // Screens to preload when user is authenticated
  AUTHENTICATED_SCREENS: [
    'DiscoveryPreferencesScreen',
    'SettingsScreen',
  ],
  
  // Screens to preload based on user behavior
  CONTEXTUAL_SCREENS: {
    // Preload when user opens map
    MAP_CONTEXT: ['PastJourneysScreen'],
    // Preload when user opens journeys
    JOURNEYS_CONTEXT: ['DiscoveryPreferencesScreen'],
    // Preload when user opens settings
    SETTINGS_CONTEXT: ['SignInScreen'],
  },
};

/**
 * Preload screens based on context
 */
export const preloadScreensForContext = (context) => {
  const screensToPreload = SCREEN_PRELOAD_CONFIG.CONTEXTUAL_SCREENS[context] || [];
  
  screensToPreload.forEach(screenName => {
    // Import the screen component to trigger preloading
    switch (screenName) {
      case 'MapScreen':
        import('../screens/MapScreen');
        break;
      case 'PastJourneysScreen':
        import('../screens/PastJourneysScreen');
        break;
      case 'DiscoveryPreferencesScreen':
        import('../screens/DiscoveryPreferencesScreen');
        break;
      case 'SettingsScreen':
        import('../screens/SettingsScreen');
        break;
      case 'SignInScreen':
        import('../screens/SignInScreen');
        break;
      default:
        console.warn(`Unknown screen for preloading: ${screenName}`);
    }
  });
  
  console.log(`⚡ Preloading screens for context: ${context}`, screensToPreload);
};

export default {
  LazyMapScreen,
  LazyPastJourneysScreen,
  LazyDiscoveryPreferencesScreen,
  LazySettingsScreen,
  LazySignInScreen,
  LazyEmailAuthScreen,
  LazyLoadingScreen,
  LazyPlaceholderScreen,
  LazySimpleMapScreen,
  preloadScreensForContext,
  SCREEN_PRELOAD_CONFIG,
};