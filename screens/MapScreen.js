import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Try to import expo-maps, fallback to react-native-maps if not available
let AppleMaps, GoogleMaps, MapView;
try {
  const expoMaps = require('expo-maps');
  AppleMaps = expoMaps.AppleMaps;
  GoogleMaps = expoMaps.GoogleMaps;
} catch (error) {
  console.log('expo-maps not available, falling back to react-native-maps');
  try {
    MapView = require('react-native-maps').default;
  } catch (fallbackError) {
    console.log('react-native-maps also not available');
  }
}

// Components
import LocateButton from '../components/ui/LocateButton';

// Utilities
import { getMapProvider, getMapConfig, MAP_STYLES } from '../utils/mapProvider';
import {
  getCurrentLocation,
  animateToLocation,
  requestLocationPermissions,
  LOCATION_OPTIONS,
} from '../utils/locationUtils';

/**
 * MapScreen Component
 * 
 * The main map interface that provides:
 * - Interactive map with Google Maps integration
 * - Basic location permission handling
 * - Initial map configuration with default styling
 * - "Locate me" functionality with animation
 * 
 * Requirements addressed:
 * - 1.1: Display map centered on user's current location
 * - 1.5: Locate me button functionality
 * - 4.1: Initial map configuration with default styling
 * - 1.6, 4.2: Platform-specific map provider logic
 */

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }) => {
  // State management
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES.STANDARD);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Refs
  const mapRef = useRef(null);

  // Get platform-specific map configuration
  const mapProvider = getMapProvider(mapStyle);
  const mapConfig = getMapConfig();

  /**
   * Initialize the map and request permissions
   */
  useEffect(() => {
    initializeMap();
  }, []);

  /**
   * Initialize map with permissions and initial location
   */
  const initializeMap = async () => {
    try {
      // Request location permissions
      const permissionResult = await requestLocationPermissions(false);
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Location Permission Required',
          permissionResult.error || 'Location access is needed to show your position on the map.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // TODO: Open device settings
              console.log('Open settings');
            }},
          ]
        );
        return;
      }

      setPermissionsGranted(true);

      // Get initial location
      const locationResult = await getCurrentLocation(LOCATION_OPTIONS.LOCATE_ME);
      
      if (locationResult.success) {
        setCurrentPosition(locationResult.location);
      } else {
        console.warn('Could not get initial location:', locationResult.error);
        // Don't show error alert for initial location failure
        // User can manually use locate button
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Please try again.');
    }
  };

  /**
   * Handle locate me button press
   */
  const handleLocateMe = async (location) => {
    setCurrentPosition(location);
    
    // Animate map to the new location
    if (mapRef.current) {
      await animateToLocation(mapRef.current, location);
    }
  };

  /**
   * Handle locate me errors
   */
  const handleLocateError = (error) => {
    Alert.alert(
      'Location Error',
      error,
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle map errors
   */
  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError('Map failed to load. Please check your internet connection.');
  };

  /**
   * Get initial camera position
   */
  const getInitialCameraPosition = () => {
    if (currentPosition) {
      return {
        center: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
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
   * Render the appropriate map component based on platform
   */
  const renderMap = () => {
    // Check if we have expo-maps available
    if (AppleMaps && GoogleMaps) {
      const cameraPosition = getInitialCameraPosition();
      const commonProps = {
        ref: mapRef,
        style: styles.map,
        cameraPosition,
        onError: handleMapError,
        ...mapConfig,
      };

      // Platform-specific map rendering with expo-maps
      if (Platform.OS === 'ios') {
        return (
          <AppleMaps
            {...commonProps}
            mapType="standard" // TODO: Make this dynamic based on mapStyle
          />
        );
      } else {
        return (
          <GoogleMaps
            {...commonProps}
            mapType="standard" // TODO: Make this dynamic based on mapStyle
          />
        );
      }
    }

    // Fallback to react-native-maps if available
    if (MapView) {
      const region = currentPosition ? {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      } : {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      return (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onError={handleMapError}
          {...mapConfig}
          mapType="standard"
        />
      );
    }

    // No map library available - show placeholder
    return (
      <View style={[styles.map, styles.mapPlaceholder]}>
        <Text style={styles.placeholderText}>Map Not Available</Text>
        <Text style={styles.placeholderSubtext}>
          This requires a development build with expo-maps.
        </Text>
        <Text style={styles.placeholderSubtext}>
          Run: eas build --profile development
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Map */}
      {renderMap()}

      {/* Locate Me Button */}
      {permissionsGranted && (
        <View style={styles.locateButtonContainer}>
          <LocateButton
            onLocationFound={handleLocateMe}
            onError={handleLocateError}
            theme="light" // TODO: Make this dynamic based on app theme
          />
        </View>
      )}

      {/* TODO: Add other UI elements */}
      {/* - Tracking controls */}
      {/* - Map style selector */}
      {/* - Journey information */}
      {/* - Sprite animation */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
  },
  mapPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  locateButtonContainer: {
    position: 'absolute',
    top: 60, // Below status bar
    right: 20,
    zIndex: 1000,
  },
});

export default MapScreen;