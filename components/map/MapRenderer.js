import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView from 'react-native-maps';

// Map components
import MapPolylines from './MapPolylines';

/**
 * MapRenderer Component
 * 
 * Handles map display, route visualization, and platform-specific rendering logic.
 * Extracted from the main MapScreen to isolate map rendering concerns.
 * 
 * Responsibilities:
 * - Platform-specific MapView rendering
 * - Route visualization with polylines
 * - Map configuration and error handling
 * - Region calculation with safe fallbacks
 * - Map ready callback integration
 * 
 * Props:
 * - mapState: Core map state from useMapState hook
 * - locationTracking: Location tracking state and data
 * - journeyTracking: Journey tracking state and path data
 * - savedRoutes: Saved routes data and visibility state
 * - mapStyle: Map styling configuration
 * - onMapReady: Callback when map is ready for interaction
 * - style: Optional style overrides
 * 
 * Performance:
 * - Memoized with React.memo to prevent unnecessary re-renders
 * - Safe fallback coordinates if position data unavailable
 * - Optimized region calculations and polyline rendering
 * 
 * Requirements Addressed:
 * - 1.2: Real-time route visualization with glowing polylines
 * - 3.4: Saved routes display with distinct visual styling
 * - 3.5: Route visualization that doesn't interfere with current journey
 * - 5.1: Map rendering isolation
 * - 5.2: Platform-specific map view handling
 * - 5.3: Map configuration and error handling
 * 
 * @see hooks/useMapState.js for state management
 * @see components/map/MapPolylines.js for route visualization
 * @see docs/MapScreen-Developer-Guide.md for usage examples
 */
const MapRenderer = ({
  mapState,
  locationTracking,
  journeyTracking,
  savedRoutes,
  mapStyle,
  onMapReady,
  style,
}) => {
  const mapRef = useRef(null);
  const lastAnimatedPosition = useRef(null);

  // Memoize initial region - only set once when component mounts
  // This prevents the map from jumping to San Francisco on every render
  const initialRegion = useMemo(() => {
    // If we have a current position, use it for initial region
    if (mapState?.currentPosition?.latitude && mapState?.currentPosition?.longitude) {
      return {
        latitude: mapState.currentPosition.latitude,
        longitude: mapState.currentPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // Otherwise use a reasonable default that will be quickly replaced
    // when location is detected and auto-centering kicks in
    // Using a moderate zoom level instead of showing the entire globe
    return {
      latitude: 35.6762, // Tokyo center as neutral location
      longitude: 139.6503,
      latitudeDelta: 0.05, // Reasonable city-level zoom
      longitudeDelta: 0.05,
    };
  }, []); // Empty dependency array - only calculate once on mount

  // Calculate distance between two coordinates
  const calculateDistance = useCallback((pos1, pos2) => {
    if (!pos1 || !pos2) return Infinity;
    const R = 6371000; // Earth's radius in meters
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Note: Map animation is handled by the locate function and journey tracking
  // We don't need to animate here to prevent conflicts

  const handleMapReady = useCallback(() => {
    console.log('Map ready');
    if (onMapReady && mapRef.current) {
      onMapReady({ ref: mapRef.current });
    }
  }, [onMapReady]);

  // Check if MapView is available
  if (!MapView) {
    console.error('MapView is not available');
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>Map Library Not Available</Text>
        <Text style={styles.errorSubtext}>
          react-native-maps is not properly installed
        </Text>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={[styles.map, style]}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onMapReady={handleMapReady}
        onError={(error) => {
          console.error('MapView error:', error);
        }}
        // Apply map style configuration
        mapType={mapStyle?.mapConfig?.mapType || 'standard'}
        customMapStyle={mapStyle?.mapConfig?.customMapStyle}
      >
        {/* Route visualization with polylines */}
        <MapPolylines
          currentPath={journeyTracking?.pathToRender || []}
          savedRoutes={savedRoutes?.visibleRoutes || []}
          styleConfig={mapStyle?.styleConfig || {}}
          showSavedRoutes={savedRoutes?.visible || false}
          isTracking={journeyTracking?.state?.isTracking || false}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default React.memo(MapRenderer);