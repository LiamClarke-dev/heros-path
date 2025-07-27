import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';

// Import react-native-maps directly since it's available
import MapView from 'react-native-maps';

// Try to import expo-maps as fallback
let AppleMaps, GoogleMaps;
try {
  const expoMaps = require('expo-maps');
  AppleMaps = expoMaps.AppleMaps;
  GoogleMaps = expoMaps.GoogleMaps;
  console.log('expo-maps loaded successfully');
} catch (error) {
  console.log('expo-maps not available, using react-native-maps:', error.message);
}

// Sub-components
import MapPolylines from './MapPolylines';
import MapOverlays from './MapOverlays';

// Utilities
import { getMapProvider, getMapConfig } from '../../utils/mapProvider';
import { animateToLocation } from '../../utils/locationUtils';

/**
 * MapRenderer Component
 * 
 * Handles map rendering and platform-specific logic.
 * Provides a unified interface for map display across different platforms.
 * 
 * Requirements addressed:
 * - 5.1: Extract map rendering logic into dedicated component
 * - 5.2: Implement platform-specific map view handling
 * - 5.3: Accept props for map state and styling configuration
 */
const MapRenderer = ({
  mapState,
  locationTracking,
  savedRoutes,
  savedPlaces,
  mapStyle,
  children,
  onMapReady,
  onRegionChange,
  onPress,
  style,
}) => {
  const mapRef = useRef(null);

  // Get platform-specific map configuration
  const mapProvider = getMapProvider(mapStyle.current);
  const mapConfig = getMapConfig();

  /**
   * Get initial camera position based on current location or default
   */
  const getInitialCameraPosition = () => {
    if (mapState.currentPosition) {
      return {
        center: {
          latitude: mapState.currentPosition.latitude,
          longitude: mapState.currentPosition.longitude,
        },
        zoom: 16,
      };
    }

    // Default to a reasonable location (San Francisco)
    return {
      center: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      zoom: 12,
    };
  };

  /**
   * Handle map ready event
   */
  const handleMapReady = () => {
    if (onMapReady) {
      onMapReady(mapRef.current);
    }
  };

  /**
   * Handle region change events
   */
  const handleRegionChange = (region) => {
    if (onRegionChange) {
      onRegionChange(region);
    }
  };

  /**
   * Handle map press events
   */
  const handleMapPress = (event) => {
    if (onPress) {
      onPress(event);
    }
  };

  /**
   * Animate map to a specific location
   */
  const animateToLocation = async (location) => {
    if (mapRef.current) {
      try {
        await animateToLocation(mapRef.current, location);
      } catch (error) {
        console.warn('Failed to animate map to location:', error);
      }
    }
  };

  /**
   * Expose map reference and methods to parent
   */
  useEffect(() => {
    if (mapRef.current && onMapReady) {
      // Provide map reference and utility methods to parent
      const mapInterface = {
        ref: mapRef.current,
        animateToLocation,
      };
      onMapReady(mapInterface);
    }
  }, [onMapReady]);

  /**
   * Render the appropriate map component based on platform and availability
   */
  const renderMapView = () => {
    const cameraPosition = mapState.cameraPosition || getInitialCameraPosition();

    // Simplified props to avoid potential issues
    const commonProps = {
      ref: mapRef,
      style: [styles.map, style],
      showsUserLocation: true,
      showsMyLocationButton: false,
    };

    // Prepare map children (polylines and overlays) - temporarily simplified
    const mapChildren = null; // Temporarily remove children to isolate the error

    // Use react-native-maps as primary since it's working
    if (MapView) {
      console.log('Using react-native-maps');
      // Use react-native-maps with safe region
      const region = {
        latitude: mapState?.currentPosition?.latitude || 37.7749,
        longitude: mapState?.currentPosition?.longitude || -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      return (
        <MapView
          {...commonProps}
          initialRegion={region}
          mapType="standard"
        />
      );
    } else if (AppleMaps && GoogleMaps) {
      console.log('Using expo-maps, platform:', Platform.OS, 'provider:', mapProvider);
      // Fallback to expo-maps if available
      if (Platform.OS === 'ios' && mapProvider === 'apple') {
        return (
          <AppleMaps
            {...commonProps}
            cameraPosition={cameraPosition}
          >
            {mapChildren}
          </AppleMaps>
        );
      } else {
        return (
          <GoogleMaps
            {...commonProps}
            cameraPosition={cameraPosition}
          >
            {mapChildren}
          </GoogleMaps>
        );
      }
    } else {
      // No map library available - show error message
      console.error('No map library available - AppleMaps:', !!AppleMaps, 'GoogleMaps:', !!GoogleMaps, 'MapView:', !!MapView);
      return (
        <View style={[styles.map, styles.errorContainer, style]}>
          <Text style={styles.errorText}>Map Library Not Available</Text>
          <Text style={styles.errorSubtext}>
            This requires expo-maps or react-native-maps to be installed
          </Text>
          <Text style={styles.errorSubtext}>
            Run: expo install expo-maps
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {renderMapView()}

      {/* Render overlays on top of the map */}
      <MapOverlays
        currentPosition={locationTracking?.currentPosition}
        recentPositions={locationTracking?.recentPositions || []}
        spriteState={locationTracking?.spriteState}
        onSpriteStateChange={locationTracking?.onSpriteStateChange}
        savedPlaces={savedPlaces?.data || []}
        showSavedPlaces={savedPlaces?.visible || false}
        clusters={savedPlaces?.clusters || []}
        onPlacePress={savedPlaces?.onPlacePress}
        onClusterPress={savedPlaces?.onClusterPress}
        styleConfig={mapStyle?.config || {}}
        theme={mapStyle?.theme}
      />
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

export default MapRenderer;