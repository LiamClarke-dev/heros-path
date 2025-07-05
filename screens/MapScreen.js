// screens/MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';

const ROUTES_STORAGE_KEY = '@saved_routes';
const SPRITES = {
  idle:  require('../assets/link_sprites/link_idle.gif'),
  up:    require('../assets/link_sprites/link_walk_up.gif'),
  down:  require('../assets/link_sprites/link_walk_down.gif'),
  left:  require('../assets/link_sprites/link_walk_left.gif'),
  right: require('../assets/link_sprites/link_walk_right.gif'),
};

function getDirection([prev, curr]) {
  const dx = curr.longitude - prev.longitude;
  const dy = curr.latitude  - prev.latitude;
  return Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'up'   : 'down');
}

export default function MapScreen({ navigation, route }) {
  const [tracking, setTracking]       = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [previewRoute, setPreviewRoute] = useState(null);

  const locationSubscriber = useRef(null);
  const mapRef              = useRef(null);
  const isFocused           = useIsFocused();

  // Reload saved routes on focus
  useEffect(() => {
    if (isFocused) {
      AsyncStorage.getItem(ROUTES_STORAGE_KEY)
        .then(stored => {
          const raw = stored ? JSON.parse(stored) : [];
          // Normalize any legacy array entries
          const normalized = raw.map(entry =>
            Array.isArray(entry)
              ? { id: String(Date.now()), coords: entry, date: new Date().toISOString() }
              : entry
          );
          setSavedRoutes(normalized);
        })
        .catch(err => console.error('Failed to load journeys', err));
    }
  }, [isFocused]);

  // Preview a journey when navigated here
  useEffect(() => {
    const journey = route.params?.routeToDisplay;
    if (journey?.coords) {
      setPreviewRoute(journey.coords);
      mapRef.current?.animateToRegion({
        ...journey.coords[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      navigation.setParams({ routeToDisplay: null });
    }
  }, [route.params?.routeToDisplay]);

  // Request location permission once
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location access is needed.');
      }
    });
    return () => locationSubscriber.current?.remove();
  }, []);

  const locateMe = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync();
      setCurrentPosition(coords);
      mapRef.current?.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    } catch {
      Alert.alert('Error', 'Unable to fetch location.');
    }
  };

  const toggleTracking = async () => {
    if (!tracking) {
      setPreviewRoute(null);
      setRouteCoords([]);
      locationSubscriber.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 5 },
        ({ coords }) => {
          const pos = { latitude: coords.latitude, longitude: coords.longitude };
          setRouteCoords(prev => [...prev, pos]);
          setCurrentPosition(pos);
        }
      );
      setTracking(true);

    } else {
      locationSubscriber.current?.remove();
      setTracking(false);

      try {
        // Reload existing journeys
        const stored = await AsyncStorage.getItem(ROUTES_STORAGE_KEY);
        const base   = stored ? JSON.parse(stored) : [];
        const normalized = base.map(e =>
          Array.isArray(e)
            ? { id: String(Date.now()), coords: e, date: new Date().toISOString() }
            : e
        );

        // Create new journey entry
        const newEntry = {
          id: String(Date.now()),
          coords: routeCoords,
          date: new Date().toISOString(),
        };
        const newSaved = [...normalized, newEntry];

        await AsyncStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(newSaved));
        setSavedRoutes(newSaved);
        Alert.alert('Saved', `Route with ${routeCoords.length} points saved.`);
      } catch (err) {
        console.error('Error saving journey', err);
        Alert.alert('Save failed', err.message || 'Unknown error');
      }
    }
  };

  const renderSavedRoutes = () =>
    savedRoutes.map(journey => (
      <Polyline
        key={journey.id}
        coordinates={journey.coords}
        strokeColor="rgba(0,0,255,0.3)"
        strokeWidth={4}
      />
    ));

 // Sprite logic: only animate when actively tracking
 let spriteSource = SPRITES.idle;
 if (tracking) {
   if (routeCoords.length >= 2) {
     const len = routeCoords.length;
     spriteSource = SPRITES[getDirection([routeCoords[len-2], routeCoords[len-1]])];
   } else {
     // just started walking, show a default walk frame
     spriteSource = SPRITES.down;
   }
 }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 35.6895,
          longitude: 139.6917,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {renderSavedRoutes()}

        {previewRoute && (
          <Polyline
            coordinates={previewRoute}
            strokeColor="purple"
            strokeWidth={4}
          />
        )}

        {routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor="rgba(0,150,255,0.3)"
              strokeWidth={12}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor="#0096ff"
              strokeWidth={6}
            />
          </>
        )}

        {currentPosition && (
          <Marker coordinate={currentPosition} anchor={{ x: 0.5, y: 0.9 }}>
            <Image source={spriteSource} style={styles.sprite} />
          </Marker>
        )}
      </MapView>

      <TouchableOpacity style={styles.locateButton} onPress={locateMe}>
        <Text style={styles.locateText}>📍</Text>
      </TouchableOpacity>

      <View style={styles.trackButtonContainer}>
        <TouchableOpacity
          style={[
            styles.trackButton,
            tracking ? styles.trackButtonActive : styles.trackButtonInactive,
          ]}
          onPress={toggleTracking}
        >
          <Text style={styles.trackButtonText}>
            {tracking ? 'Stop & Save Walk' : 'Start Walk'}
          </Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  map:                 { flex: 1 },
  sprite:              { width: 16, height: 32 },
  locateButton:        {
    position:          'absolute',
    top:               50,
    right:             20,
    backgroundColor:   'white',
    padding:           10,
    borderRadius:      30,
    elevation:         4,
  },
  locateText:          { fontSize: 20 },
  trackButtonContainer:{ position: 'absolute', bottom: 100, alignSelf: 'center' },
  trackButton:         {
    paddingVertical:   12,
    paddingHorizontal: 24,
    borderRadius:      25,
    elevation:         4,
  },
  trackButtonInactive: { backgroundColor: '#0096ff' },
  trackButtonActive:   { backgroundColor: '#ff3b30' },
  trackButtonText:     {
    color:             'white',
    fontSize:          16,
    fontWeight:        'bold',
  },
});
