/**
 * Basic usage example and test for MapRenderer components
 * This file demonstrates how the MapRenderer component should be used
 */

import React from 'react';
import { View } from 'react-native';
import MapRenderer from './MapRenderer';

// Example usage of MapRenderer component
const MapRendererExample = () => {
  // Mock data for testing
  const mockMapState = {
    currentPosition: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
    cameraPosition: null,
    handleError: (error) => console.error('Map error:', error),
  };

  const mockLocationTracking = {
    currentPosition: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
    currentPath: [
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 37.7750, longitude: -122.4195 },
    ],
    recentPositions: [
      { latitude: 37.7749, longitude: -122.4194 },
    ],
    spriteState: {
      gpsAccuracy: 10,
    },
    onSpriteStateChange: (state) => console.log('Sprite state changed:', state),
  };

  const mockSavedRoutes = {
    data: [],
    visible: false,
  };

  const mockSavedPlaces = {
    data: [],
    visible: false,
    clusters: [],
    onPlacePress: (place) => console.log('Place pressed:', place),
    onClusterPress: (cluster) => console.log('Cluster pressed:', cluster),
  };

  const mockMapStyle = {
    current: 'standard',
    config: {
      colors: {
        polylineColor: '#00FF88',
        savedRouteColor: '#4A90E2',
      },
    },
    theme: 'light',
  };

  return (
    <View style={{ flex: 1 }}>
      <MapRenderer
        mapState={mockMapState}
        locationTracking={mockLocationTracking}
        savedRoutes={mockSavedRoutes}
        savedPlaces={mockSavedPlaces}
        mapStyle={mockMapStyle}
        onMapReady={(mapInterface) => console.log('Map ready:', mapInterface)}
        onRegionChange={(region) => console.log('Region changed:', region)}
        onPress={(event) => console.log('Map pressed:', event)}
      />
    </View>
  );
};

export default MapRendererExample;