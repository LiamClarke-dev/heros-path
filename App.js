import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Screens
import MapScreen from './screens/MapScreen';

/**
 * TEMPORARY APP STRUCTURE FOR MAP TESTING
 * 
 * This is a temporary App.js to test the MapScreen implementation.
 * This will be replaced with full navigation structure later.
 * 
 * NEXT STEPS:
 * 1. Complete Map Navigation & GPS implementation
 * 2. Add User Authentication
 * 3. Add full navigation structure with contexts
 * 4. Add other screens and features
 */

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <MapScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
