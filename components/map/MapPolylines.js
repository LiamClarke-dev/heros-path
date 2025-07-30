import React, { useMemo } from 'react';

// Import Polyline from react-native-maps directly
import { Polyline } from 'react-native-maps';

/**
 * MapPolylines Component
 * 
 * Handles rendering of polylines for current path and saved routes with enhanced visualization.
 * Implements glowing effects for active routes and theme-aware styling.
 * 
 * Requirements addressed:
 * - 1.2: Real-time route visualization with glowing polylines
 * - 3.4: Saved routes display with distinct visual styling
 * - 3.5: Route visualization that doesn't interfere with current journey
 * 
 * Features:
 * - Glowing effect for current active route
 * - Distinct styling for saved routes vs active route
 * - Theme-aware color configuration
 * - Optimized rendering with memoization
 * - Support for route centering and zoom controls
 */
const MapPolylines = ({
  currentPath = [],
  savedRoutes = [],
  styleConfig = {},
  showSavedRoutes = false,
  isTracking = false,
}) => {
  // Default style colors with enhanced glowing effect support
  const defaultColors = {
    polylineColor: '#00FF88',
    polylineGlowColor: '#00FF88',
    savedRouteColor: '#4A90E2',
    savedRouteOpacity: 0.6,
    currentRouteOpacity: 0.9,
  };

  // Get theme-aware colors from style config
  const colors = useMemo(() => ({
    ...defaultColors,
    ...(styleConfig.colors || {}),
  }), [styleConfig.colors]);

  /**
   * Memoized saved routes polylines with enhanced styling
   * Implements distinct visual styling for saved routes as per requirement 3.4
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
          strokeWidth={3}
          strokeOpacity={colors.savedRouteOpacity}
          lineCap="round"
          lineJoin="round"
          lineDashPattern={[5, 5]} // Dashed line to distinguish from current route
        />
      ));
  }, [savedRoutes, showSavedRoutes, colors.savedRouteColor, colors.savedRouteOpacity]);

  /**
   * Memoized current path polyline with glowing effect
   * Implements glowing polyline visualization as per requirement 1.2
   */
  const currentPathPolylines = useMemo(() => {
    if (!currentPath.length || currentPath.length < 2 || !Polyline) {
      return null;
    }

    // Create glowing effect with multiple polylines
    // Background glow (wider, more transparent)
    const glowPolyline = (
      <Polyline
        key="current-journey-glow"
        coordinates={currentPath}
        strokeColor={colors.polylineGlowColor}
        strokeWidth={12}
        strokeOpacity={isTracking ? 0.3 : 0.2}
        lineCap="round"
        lineJoin="round"
      />
    );

    // Main route line (narrower, more opaque)
    const mainPolyline = (
      <Polyline
        key="current-journey-main"
        coordinates={currentPath}
        strokeColor={colors.polylineColor}
        strokeWidth={6}
        strokeOpacity={colors.currentRouteOpacity}
        lineCap="round"
        lineJoin="round"
      />
    );

    return [glowPolyline, mainPolyline];
  }, [currentPath, colors.polylineColor, colors.polylineGlowColor, colors.currentRouteOpacity, isTracking]);

  // Return null if no Polyline component is available
  if (!Polyline) {
    console.warn('MapPolylines: No Polyline component available');
    return null;
  }

  return (
    <>
      {/* Render saved routes first (underneath current path) */}
      {savedRoutesPolylines}
      
      {/* Render current path with glowing effect on top */}
      {currentPathPolylines}
    </>
  );
};

export default MapPolylines;