import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';

// Try to import expo-maps, fallback to react-native-maps if not available
let AppleMaps, GoogleMaps, MapView;
try {
  const expoMaps = require('expo-maps');
  AppleMaps = expoMaps.AppleMaps;
  GoogleMaps = expoMaps.GoogleMaps;
} catch (error) {
  console.log('expo-maps not available, falling back to react-native-maps');
  try {
    const reactNativeMaps = require('react-native-maps');
    MapView = reactNativeMaps.default;
  } catch (fallbackError) {
    console.log('react-native-maps also not available');
  }
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
    
    const commonProps = {
      ref: mapRef,
      style: [styles.map, style],
      cameraPosition,
      onError: mapState.handleError,
      onMapReady: handleMapReady,
      onRegionChange: handleRegionChange,
      onPress: handleMapPress,
      ...mapConfig,
    };

    // Apply map style configuration if available
    if (mapStyle.config) {
      if (mapStyle.config.mapType) {
        commonProps.mapType = mapStyle.config.mapType;
      }
      if (mapStyle.config.customStyle) {
        commonProps.customMapStyle = mapStyle.config.customStyle;
      }
    }

    // Prepare map children (polylines and overlays)
    const mapChildren = (
      <>
        {/* Render polylines */}
        <MapPolylines
          currentPath={locationTracking?.currentPath || []}
          savedRoutes={savedRoutes?.data || []}
          styleConfig={mapStyle?.config || {}}
          showSavedRoutes={savedRoutes?.visible || false}
        />
        
        {/* Render other children passed from parent */}
        {children}
      </>
    );

    // Check if we have expo-maps available
    if (AppleMaps && GoogleMaps) {
      // Use platform-specific map provider
      if (Platform.OS === 'ios' && mapProvider === 'apple') {
        return <AppleMaps {...commonProps}>{mapChildren}</AppleMaps>;
      } else {
        return <GoogleMaps {...commonProps}>{mapChildren}</GoogleMaps>;
      }
    } else if (MapView) {
      // Fallback to react-native-maps
      return <MapView {...commonProps}>{mapChildren}</MapView>;
    } else {
      // No map library available
      console.error('No map library available');
      return (
        <View style={[styles.map, styles.errorContainer, style]}>
          <Text style={styles.errorText}>Map not available</Text>
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
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default MapRenderer;