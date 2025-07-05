import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Button, Alert } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [tracking, setTracking] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const locationSubscriber = useRef(null);

  // Ask for location permission once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location access is needed to track your route.');
      }
    })();
    // Cleanup on unmount
    return () => locationSubscriber.current?.remove();
  }, []);

  // Toggle tracking on/off
  const toggleTracking = async () => {
    if (!tracking) {
      setRouteCoords([]);               // reset path
      // start watching position
      locationSubscriber.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 5 },
        ({ coords }) => {
          setRouteCoords((prev) => [...prev, {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }]);
        }
      );
      setTracking(true);
    } else {
      // stop watching position
      locationSubscriber.current?.remove();
      setTracking(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map}
        initialRegion={{
          latitude: 35.6895, longitude: 139.6917,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        }}
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#FF0000"
            strokeWidth={4}
          />
        )}
      </MapView>
      <View style={styles.buttonContainer}>
        <Button
          onPress={toggleTracking}
          title={tracking ? 'Stop Walk' : 'Start Walk'}
        />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
});
