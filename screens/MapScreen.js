import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Custom Hooks
import useMapPermissions from '../hooks/useMapPermissions';

// Components
import MapRenderer from '../components/map/MapRenderer';

// Contexts
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Simplified MapScreen for testing - removing complex hooks to isolate the error
 */
const MapScreen = ({ navigation }) => {
  // Context
  const { user, isAuthenticated } = useUser();
  const { theme, currentTheme } = useTheme();

  // Refs
  const mapRef = useRef(null);

  // Add back hooks gradually - starting with permissions
  const permissions = useMapPermissions();

  // Simple state for testing
  const mapState = { currentPosition: null };

  // Manual permission request function
  const handleRequestPermissions = async () => {
    try {
      console.log('Manually requesting location permissions...');
      await permissions.requestPermissions();
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const handleMapReady = (mapInterface) => {
    mapRef.current = mapInterface.ref;
    console.log('Map ready:', mapInterface);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <MapRenderer
        mapState={mapState}
        onMapReady={handleMapReady}
      />

      {/* Permission prompt overlay */}
      {!permissions.granted && (
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionPrompt}>
            <Text style={styles.permissionTitle}>Location Access Required</Text>
            <Text style={styles.permissionText}>
              Location access is needed to show your position on the map and track your journeys.
            </Text>
            <Text style={styles.permissionSubtext}>
              Status: {permissions.statusMessage}
            </Text>
            <Text style={styles.permissionSubtext}>
              User: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
            </Text>
            {permissions.canAskAgain && (
              <>
                <Text style={styles.permissionSubtext}>
                  Tap the button below to request location access.
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={handleRequestPermissions}
                >
                  <Text style={styles.permissionButtonText}>
                    Request Location Access
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  permissionPrompt: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MapScreen;