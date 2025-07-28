import React, { useRef, useEffect, useMemo, useCallback } from 'react';
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
  const lastAnimatedPosition = useRef(null);

  // Memoize region calculation with safe fallbacks
  const region = useMemo(() => ({
    latitude: mapState?.currentPosition?.latitude || 37.7749,
    longitude: mapState?.currentPosition?.longitude || -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }), [mapState?.currentPosition?.latitude, mapState?.currentPosition?.longitude]);

  // Calculate distance between two coordinates
  const calculateDistance = useCallback((pos1, pos2) => {
    if (!pos1 || !pos2) return Infinity;
    const R = 6371000; // Earth's radius in meters
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

export default React.memo(MapRenderer);