import React, { useMemo } from 'react';

// Try to import expo-maps, fallback to react-native-maps if not available
let Polyline;
try {
  const expoMaps = require('expo-maps');
  Polyline = expoMaps.Polyline;
} catch (error) {
  console.log('expo-maps not available, falling back to react-native-maps');
  try {
    const reactNativeMaps = require('react-native-maps');
    Polyline = reactNativeMaps.Polyline;
  } catch (fallbackError) {
    console.log('react-native-maps also not available');
  }
}

/**
 * MapPolylines Component
 * 
 * Handles rendering of polylines for current path and saved routes.
 * Implements theme-aware styling and optimized rendering.
 * 
 * Requirements addressed:
 * - 5.1: Extract polyline rendering for current path and saved routes
 * - 5.2: Implement theme-aware polyline styling
 * - 5.3: Handle polyline data updates and rendering optimization
 */
const MapPolylines = ({
  currentPath = [],
  savedRoutes = [],
  styleConfig = {},
  showSavedRoutes = false,
}) => {
  // Default style colors
  const defaultColors = {
    polylineColor: '#00FF88',
    savedRouteColor: '#4A90E2',
  };

  // Get theme-aware colors from style config
  const colors = useMemo(() => ({
    ...defaultColors,
    ...(styleConfig.colors || {}),
  }), [styleConfig.colors]);

  /**
   * Memoized saved routes polylines to optimize rendering
   */
  const savedRoutesPolylines = useMemo(() => {
    if (!showSavedRoutes || !savedRoutes.length || !Polyline) {
      return [];
    }

    return savedRoutes
      .filter(route => route.route && route.route.length > 1)
      .map((route, index) => (
        <Polyline
          key={`saved-route-${route.id || index}`}
          coordinates={route.route}
          strokeColor={colors.savedRouteColor}
          strokeWidth={4}
          strokeOpacity={0.6}
          lineCap="round"
          lineJoin="round"
        />
      ));
  }, [savedRoutes, showSavedRoutes, colors.savedRouteColor]);

  /**
   * Memoized current path polyline to optimize rendering
   */
  const currentPathPolyline = useMemo(() => {
    if (!currentPath.length || currentPath.length < 2 || !Polyline) {
      return null;
    }

    return (
      <Polyline
        key="current-journey"
        coordinates={currentPath}
        strokeColor={colors.polylineColor}
        strokeWidth={6}
        strokeOpacity={0.8}
        lineCap="round"
        lineJoin="round"
      />
    );
  }, [currentPath, colors.polylineColor]);

  // Return null if no Polyline component is available
  if (!Polyline) {
    console.warn('MapPolylines: No Polyline component available');
    return null;
  }

  return (
    <>
      {/* Render saved routes first (underneath current path) */}
      {savedRoutesPolylines}
      
      {/* Render current path on top */}
      {currentPathPolyline}
    </>
  );
};

export default MapPolylines;