import React, { useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView from 'react-native-maps';

/**
 * MapRenderer Component - Minimal version to fix the ref error
 */
const MapRenderer = ({
  mapState,
  onMapReady,
  style,
}) => {
  const mapRef = useRef(null);

  // Simple region calculation with safe fallbacks
  const region = {
    latitude: mapState?.currentPosition?.latitude || 37.7749,
    longitude: mapState?.currentPosition?.longitude || -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const handleMapReady = () => {
    console.log('Map ready, mapRef.current:', mapRef.current);
    if (onMapReady && mapRef.current) {
      onMapReady({ ref: mapRef.current });
    }
  };

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

  console.log('Rendering MapView with region:', region);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={[styles.map, style]}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onMapReady={handleMapReady}
        onError={(error) => {
          console.error('MapView error:', error);
        }}
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