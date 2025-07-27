import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Try to import expo-maps, fallback to react-native-maps if not available
let AppleMaps, GoogleMaps, MapView, Polyline;
try {
  const expoMaps = require('expo-maps');
  AppleMaps = expoMaps.AppleMaps;
  GoogleMaps = expoMaps.GoogleMaps;
  Polyline = expoMaps.Polyline;
} catch (error) {
  console.log('expo-maps not available, falling back to react-native-maps');
  try {
    const reactNativeMaps = require('react-native-maps');
    MapView = reactNativeMaps.default;
    Polyline = reactNativeMaps.Polyline;
  } catch (fallbackError) {
    console.log('react-native-maps also not available');
  }
}

// Components
import LocateButton from '../components/ui/LocateButton';
import JourneyNamingModal from '../components/ui/JourneyNamingModal';
import MapSprite from '../components/ui/MapSprite';
import GPSStatusDisplay from '../components/ui/GPSStatusDisplay';
import SavedPlaceMarker from '../components/ui/SavedPlaceMarker';
import PlaceDetailModal from '../components/ui/PlaceDetailModal';
import ClusterMarker from '../components/ui/ClusterMarker';

// Services
import BackgroundLocationService from '../services/BackgroundLocationService';
import JourneyService from '../services/JourneyService';
import SavedPlacesService from '../services/SavedPlacesService';

// Contexts
import { useUser } from '../contexts/UserContext';

// Utilities
import { getMapProvider, getMapConfig, MAP_STYLES } from '../utils/mapProvider';
import {
  getCurrentLocation,
  animateToLocation,
  requestLocationPermissions,
  LOCATION_OPTIONS,
} from '../utils/locationUtils';
import { MarkerClusterer } from '../utils/markerClustering';

// Constants
import { DEFAULT_JOURNEY_VALUES, VALIDATION_CONSTANTS } from '../constants/JourneyModels';
import { DEFAULT_SPRITE_STATE } from '../constants/SpriteConstants';

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
  // User context
  const { user, isAuthenticated } = useUser();

  // State management
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES.STANDARD);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Journey tracking state
  const [tracking, setTracking] = useState(false);
  const [currentJourneyId, setCurrentJourneyId] = useState(null);
  const [pathToRender, setPathToRender] = useState([]);
  const [journeyStartTime, setJourneyStartTime] = useState(null);

  // Journey saving state
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [journeyToSave, setJourneyToSave] = useState(null);
  const [savingJourney, setSavingJourney] = useState(false);

  // Saved routes state
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Saved places state
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showPlaceDetail, setShowPlaceDetail] = useState(false);
  
  // Clustering state
  const [mapZoom, setMapZoom] = useState(16);
  const [markerClusterer] = useState(() => new MarkerClusterer({
    gridSize: 60,
    maxZoom: 15,
    minClusterSize: 2,
    theme: 'light' // TODO: Make this dynamic based on app theme
  }));

  // Sprite state
  const [spriteState, setSpriteState] = useState(DEFAULT_SPRITE_STATE);
  const [recentPositions, setRecentPositions] = useState([]);
  
  // GPS status display
  const [showGPSStatus, setShowGPSStatus] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const locationServiceRef = useRef(null);

  // Get platform-specific map configuration
  const mapProvider = getMapProvider(mapStyle);
  const mapConfig = getMapConfig();

  /**
   * Initialize the map and request permissions
   */
  useEffect(() => {
    initializeMap();
    initializeLocationService();

    // Cleanup function
    return () => {
      if (locationServiceRef.current) {
        locationServiceRef.current.cleanup();
      }
    };
  }, []);

  /**
   * Load saved routes and places when user is authenticated
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedRoutes();
      loadSavedPlaces();
    } else {
      setSavedRoutes([]);
      setSavedPlaces([]);
    }
  }, [isAuthenticated, user]);

  /**
   * Initialize the BackgroundLocationService
   */
  const initializeLocationService = async () => {
    try {
      if (!locationServiceRef.current) {
        locationServiceRef.current = new BackgroundLocationService();
      }

      const result = await locationServiceRef.current.initialize({
        onPermissionPrompt: handlePermissionPrompt
      });

      if (result.success) {
        console.log('BackgroundLocationService initialized successfully');
        
        // Set up location update callback
        locationServiceRef.current.setLocationUpdateCallback(handleLocationUpdate);
      } else {
        console.error('Failed to initialize BackgroundLocationService:', result.error);
      }
    } catch (error) {
      console.error('Error initializing location service:', error);
    }
  };

  /**
   * Handle permission prompts from BackgroundLocationService
   */
  const handlePermissionPrompt = (promptData) => {
    const { type, title, message } = promptData;
    
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => {
          // TODO: Open device settings
          console.log('Open settings for permissions');
        }},
      ]
    );
  };

  /**
   * Handle location updates from BackgroundLocationService
   */
  const handleLocationUpdate = (location) => {
    if (location.type === 'error' || location.type === 'warning') {
      console.warn('Location update warning/error:', location.message);
      return;
    }

    const newPosition = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || null
    };

    // Update current position
    setCurrentPosition(newPosition);

    // Update sprite state with GPS accuracy
    setSpriteState(prevState => ({
      ...prevState,
      gpsAccuracy: location.coords.accuracy || null,
      position: newPosition,
    }));

    // Update recent positions for sprite direction calculation (keep last 5 positions)
    setRecentPositions(prevPositions => {
      const updated = [...prevPositions, newPosition];
      return updated.slice(-5); // Keep only last 5 positions
    });

    // Add to path if tracking
    if (tracking && currentJourneyId) {
      setPathToRender(prevPath => [
        ...prevPath,
        newPosition
      ]);
    }
  };

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
        const initialPosition = {
          ...locationResult.location,
          timestamp: Date.now()
        };
        setCurrentPosition(initialPosition);
        setRecentPositions([initialPosition]);
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
    const newPosition = {
      ...location,
      timestamp: Date.now()
    };
    
    setCurrentPosition(newPosition);
    
    // Update recent positions for sprite
    setRecentPositions(prevPositions => {
      const updated = [...prevPositions, newPosition];
      return updated.slice(-5);
    });
    
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
   * Toggle journey tracking on/off
   * Implements requirements 2.1, 2.2
   */
  const toggleTracking = async () => {
    try {
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to track your journeys.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!locationServiceRef.current) {
        Alert.alert(
          'Service Error',
          'Location service is not available. Please restart the app.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (tracking) {
        // Stop tracking
        await stopTracking();
      } else {
        // Start tracking
        await startTracking();
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      Alert.alert(
        'Tracking Error',
        'Failed to toggle tracking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Start journey tracking
   */
  const startTracking = async () => {
    try {
      // Generate unique journey ID
      const journeyId = `journey_${user.uid}_${Date.now()}`;
      
      // Start location tracking
      const success = await locationServiceRef.current.startTracking(journeyId, {
        warmup: true,
        timeInterval: 2000, // 2 seconds
        distanceInterval: 5 // 5 meters
      });

      if (success) {
        setTracking(true);
        setCurrentJourneyId(journeyId);
        setJourneyStartTime(Date.now());
        setPathToRender([]);
        
        console.log('Journey tracking started:', journeyId);
      } else {
        throw new Error('Failed to start location tracking');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert(
        'Start Tracking Error',
        'Failed to start journey tracking. Please check your location permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Stop journey tracking
   */
  const stopTracking = async () => {
    try {
      // Stop location tracking and get journey data
      const journeyData = await locationServiceRef.current.stopTracking();
      
      if (journeyData && journeyData.coordinates && journeyData.coordinates.length > 0) {
        // Calculate journey distance
        const distance = calculateJourneyDistance(journeyData.coordinates);
        
        // Check minimum distance requirement
        if (distance < VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE) {
          Alert.alert(
            'Journey Too Short',
            `Your journey is only ${Math.round(distance)} meters. Journeys should be at least ${VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE} meters to be saved.`,
            [
              { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
              { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
            ]
          );
        } else {
          // Journey is long enough, prompt to save
          promptSaveJourney(journeyData, distance);
        }
      } else {
        // No valid journey data
        Alert.alert(
          'No Journey Data',
          'No location data was recorded during this journey.',
          [{ text: 'OK', onPress: () => discardJourney() }]
        );
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert(
        'Stop Tracking Error',
        'Failed to stop journey tracking properly.',
        [{ text: 'OK', onPress: () => discardJourney() }]
      );
    }
  };

  /**
   * Calculate total distance of a journey
   */
  const calculateJourneyDistance = (coordinates) => {
    if (!coordinates || coordinates.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const distance = calculateDistance(coordinates[i - 1], coordinates[i]);
      totalDistance += distance;
    }

    return totalDistance;
  };

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  const calculateDistance = (coord1, coord2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(coord2.latitude - coord1.latitude);
    const dLon = toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(coord1.latitude)) * 
      Math.cos(toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Convert degrees to radians
   */
  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  /**
   * Prompt user to save journey with name
   */
  const promptSaveJourney = (journeyData, distance) => {
    // Calculate journey statistics
    const stats = JourneyService.calculateJourneyStats(journeyData.coordinates);
    
    // Prepare journey data for saving
    const journeyToSave = {
      ...DEFAULT_JOURNEY_VALUES,
      id: currentJourneyId,
      userId: user.uid,
      startTime: journeyStartTime,
      endTime: Date.now(),
      route: journeyData.coordinates,
      distance: Math.round(distance),
      duration: Date.now() - journeyStartTime,
      status: 'completed',
      stats
    };

    // Set journey data and show naming modal
    setJourneyToSave(journeyToSave);
    setShowNamingModal(true);
  };

  /**
   * Handle journey save from naming modal
   */
  const handleSaveJourney = async (journeyName) => {
    try {
      setSavingJourney(true);

      // Generate unique name if needed
      const uniqueName = await JourneyService.generateUniqueJourneyName(
        user.uid,
        journeyName
      );

      // Save journey with the provided name
      const journeyData = {
        ...journeyToSave,
        name: uniqueName
      };

      const savedJourney = await JourneyService.saveJourney(journeyData);
      
      // Close modal and reset state
      setShowNamingModal(false);
      setJourneyToSave(null);
      discardJourney();

      // Refresh saved routes to include the new journey
      await refreshSavedRoutes();

      Alert.alert(
        'Journey Saved',
        `Your journey "${savedJourney.name}" has been saved successfully!`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error saving journey:', error);
      Alert.alert(
        'Save Error',
        'Failed to save your journey. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSavingJourney(false);
    }
  };

  /**
   * Handle journey save cancellation
   */
  const handleCancelSave = () => {
    setShowNamingModal(false);
    setJourneyToSave(null);
    
    // Ask user if they want to discard the journey
    Alert.alert(
      'Discard Journey',
      'Are you sure you want to discard this journey? This action cannot be undone.',
      [
        { text: 'Keep', style: 'cancel', onPress: () => setShowNamingModal(true) },
        { text: 'Discard', style: 'destructive', onPress: () => discardJourney() }
      ]
    );
  };

  /**
   * Discard current journey and reset state
   */
  const discardJourney = () => {
    setTracking(false);
    setCurrentJourneyId(null);
    setJourneyStartTime(null);
    setPathToRender([]);
  };

  /**
   * Load saved routes for the current user
   * Implements requirement 2.5
   */
  const loadSavedRoutes = async () => {
    if (!user) return;

    try {
      setLoadingRoutes(true);
      
      const routes = await JourneyService.loadUserJourneys(user.uid, {
        limit: 20, // Load last 20 journeys
        orderBy: 'createdAt',
        orderDirection: 'desc'
      });

      setSavedRoutes(routes);
      console.log(`Loaded ${routes.length} saved routes`);

    } catch (error) {
      console.error('Error loading saved routes:', error);
      Alert.alert(
        'Load Error',
        'Failed to load your saved routes. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingRoutes(false);
    }
  };

  /**
   * Toggle visibility of saved routes on the map
   */
  const toggleSavedRoutes = () => {
    setShowSavedRoutes(!showSavedRoutes);
  };

  /**
   * Refresh saved routes
   */
  const refreshSavedRoutes = async () => {
    await loadSavedRoutes();
  };

  /**
   * Load saved places for the current user
   * Implements requirement 6.1
   */
  const loadSavedPlaces = async () => {
    if (!user) return;

    try {
      setLoadingPlaces(true);
      
      const places = await SavedPlacesService.loadSavedPlaces(user.uid, {
        limit: 50, // Load up to 50 saved places
        orderBy: 'createdAt',
        orderDirection: 'desc'
      });

      setSavedPlaces(places);
      
      // Update marker clusterer with new places
      markerClusterer.setMarkers(places);
      
      console.log(`Loaded ${places.length} saved places`);

    } catch (error) {
      console.error('Error loading saved places:', error);
      Alert.alert(
        'Load Error',
        'Failed to load your saved places. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingPlaces(false);
    }
  };

  /**
   * Toggle visibility of saved places on the map
   * Implements requirement 6.1
   */
  const toggleSavedPlaces = () => {
    setShowSavedPlaces(!showSavedPlaces);
  };

  /**
   * Handle saved place marker tap
   * Implements requirement 6.3
   */
  const handlePlaceMarkerPress = (place) => {
    setSelectedPlace(place);
    setShowPlaceDetail(true);
  };

  /**
   * Handle cluster marker tap - zoom in to expand cluster
   * Implements requirement 6.5
   */
  const handleClusterPress = (cluster) => {
    if (mapRef.current && cluster.center) {
      // Zoom in and center on cluster
      const newZoom = Math.min(mapZoom + 2, 20);
      setMapZoom(newZoom);
      markerClusterer.setZoom(newZoom);
      
      // Animate to cluster center
      animateToLocation(mapRef.current, cluster.center);
    }
  };

  /**
   * Handle map zoom change
   */
  const handleMapZoomChange = (zoom) => {
    setMapZoom(zoom);
    markerClusterer.setZoom(zoom);
  };

  /**
   * Handle saving a place
   * Implements requirement 6.7
   */
  const handleSavePlace = async (place) => {
    try {
      await SavedPlacesService.savePlace(user.uid, place);
      
      // Refresh saved places to include the new place
      await loadSavedPlaces();
      
      Alert.alert(
        'Place Saved',
        `${place.name} has been saved to your places.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error saving place:', error);
      throw error; // Re-throw to be handled by PlaceDetailModal
    }
  };

  /**
   * Handle unsaving a place
   * Implements requirement 6.7
   */
  const handleUnsavePlace = async (place) => {
    try {
      await SavedPlacesService.unsavePlace(user.uid, place.placeId || place.id);
      
      // Refresh saved places to remove the unsaved place
      await loadSavedPlaces();
      
      Alert.alert(
        'Place Removed',
        `${place.name} has been removed from your saved places.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error unsaving place:', error);
      throw error; // Re-throw to be handled by PlaceDetailModal
    }
  };

  /**
   * Handle navigation to a place
   * Implements requirement 6.7
   */
  const handleNavigateToPlace = (place) => {
    // Close the place detail modal first
    setShowPlaceDetail(false);
    
    // Center map on the place
    if (mapRef.current && place.latitude && place.longitude) {
      const placeLocation = {
        latitude: place.latitude,
        longitude: place.longitude
      };
      
      animateToLocation(mapRef.current, placeLocation);
    }
  };

  /**
   * Refresh saved places
   */
  const refreshSavedPlaces = async () => {
    await loadSavedPlaces();
  };

  /**
   * Update clusterer when saved places or theme changes
   */
  useEffect(() => {
    if (savedPlaces.length > 0) {
      markerClusterer.setMarkers(savedPlaces);
      markerClusterer.setZoom(mapZoom);
      // TODO: Update theme when theme context is available
      // markerClusterer.setTheme(currentTheme);
    }
  }, [savedPlaces, mapZoom]);

  /**
   * Handle sprite state changes
   */
  const handleSpriteStateChange = (newSpriteState) => {
    setSpriteState(newSpriteState);
    
    // Show GPS status display when GPS signal is poor or lost
    const shouldShowGPSStatus = newSpriteState.gpsState?.indicator === 'POOR' || 
                               newSpriteState.gpsState?.indicator === 'LOST';
    setShowGPSStatus(shouldShowGPSStatus);
    
    // Log sprite state changes for debugging
    if (__DEV__) {
      console.log('Sprite state changed:', {
        state: newSpriteState.state,
        gpsState: newSpriteState.gpsState,
        accuracy: newSpriteState.gpsAccuracy,
        signalStrength: newSpriteState.signalStrength,
      });
    }
  };

  /**
   * Keep map centered on user position when tracking
   */
  useEffect(() => {
    if (tracking && currentPosition && mapRef.current) {
      // Smoothly animate map to follow user position
      const animateToCurrentPosition = async () => {
        try {
          await animateToLocation(mapRef.current, currentPosition);
        } catch (error) {
          console.warn('Failed to animate map to current position:', error);
        }
      };
      
      // Throttle map animations to avoid too frequent updates
      const timeoutId = setTimeout(animateToCurrentPosition, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentPosition, tracking]);

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
    if (AppleMaps && GoogleMaps && Polyline) {
      const cameraPosition = getInitialCameraPosition();
      const commonProps = {
        ref: mapRef,
        style: styles.map,
        cameraPosition,
        onError: handleMapError,
        ...mapConfig,
      };

      // Prepare polylines data
      const polylines = [];
      
      // Add saved routes if visible
      if (showSavedRoutes && savedRoutes.length > 0) {
        savedRoutes.forEach((route, index) => {
          if (route.route && route.route.length > 1) {
            polylines.push({
              coordinates: route.route,
              strokeColor: '#4A90E2', // Blue color for saved routes
              strokeWidth: 4,
              strokeOpacity: 0.6,
              lineCap: 'round',
              lineJoin: 'round',
              key: `saved-route-${route.id}` // Unique key for each route
            });
          }
        });
      }
      
      // Add current journey path (should be on top)
      if (pathToRender.length > 1) {
        polylines.push({
          coordinates: pathToRender,
          strokeColor: '#00FF88', // Glowing green color for current journey
          strokeWidth: 6,
          strokeOpacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
          key: 'current-journey'
        });
      }

      // Prepare markers data (for sprite and saved places)
      const markers = [];
      
      // Add user position marker (transparent, sprite will be overlaid)
      if (currentPosition) {
        markers.push({
          coordinate: {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
          },
          key: 'user-position',
          alpha: 0, // Transparent since sprite will be overlaid
        });
      }

      // Add saved places markers if visible
      if (showSavedPlaces && savedPlaces.length > 0) {
        savedPlaces.forEach((place) => {
          if (place.latitude && place.longitude) {
            markers.push({
              coordinate: {
                latitude: place.latitude,
                longitude: place.longitude,
              },
              key: `saved-place-${place.id}`,
              title: place.name,
              description: place.vicinity || '',
              // We'll render custom markers as overlays
              alpha: 0, // Transparent, custom marker will be overlaid
            });
          }
        });
      }

      // Platform-specific map rendering with expo-maps
      if (Platform.OS === 'ios') {
        return (
          <View style={styles.mapContainer}>
            <AppleMaps
              {...commonProps}
              mapType="standard" // TODO: Make this dynamic based on mapStyle
              polylines={polylines}
              markers={markers}
            />
            {/* Render sprite as overlay */}
            {currentPosition && (
              <MapSprite
                position={currentPosition}
                recentPositions={recentPositions}
                gpsAccuracy={spriteState.gpsAccuracy}
                size={32}
                theme="light" // TODO: Make this dynamic based on app theme
                onStateChange={handleSpriteStateChange}
              />
            )}
            
            {/* Render saved places markers and clusters as overlays */}
            {showSavedPlaces && (
              <>
                {/* Render individual markers */}
                {markerClusterer.getMarkers().map((place) => (
                  place.latitude && place.longitude && (
                    <View
                      key={`saved-place-overlay-ios-${place.id}`}
                      style={[
                        styles.markerOverlay,
                        {
                          // Note: In a real implementation, this would need proper
                          // coordinate-to-screen conversion. For now, this is a placeholder.
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          zIndex: 1000,
                        }
                      ]}
                    >
                      <SavedPlaceMarker
                        place={place}
                        theme="light" // TODO: Make this dynamic based on app theme
                        size={32}
                        onPress={handlePlaceMarkerPress}
                      />
                    </View>
                  )
                ))}
                
                {/* Render clusters */}
                {markerClusterer.getClusters().map((cluster) => (
                  <View
                    key={`cluster-overlay-ios-${cluster.id}`}
                    style={[
                      styles.markerOverlay,
                      {
                        // Note: In a real implementation, this would need proper
                        // coordinate-to-screen conversion. For now, this is a placeholder.
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        zIndex: 1001, // Higher than individual markers
                      }
                    ]}
                  >
                    <ClusterMarker
                      cluster={cluster}
                      onPress={handleClusterPress}
                    />
                  </View>
                ))}
              </>
            )}
          </View>
        );
      } else {
        return (
          <View style={styles.mapContainer}>
            <GoogleMaps
              {...commonProps}
              mapType="standard" // TODO: Make this dynamic based on mapStyle
              polylines={polylines}
              markers={markers}
            />
            {/* Render sprite as overlay */}
            {currentPosition && (
              <MapSprite
                position={currentPosition}
                recentPositions={recentPositions}
                gpsAccuracy={spriteState.gpsAccuracy}
                size={32}
                theme="light" // TODO: Make this dynamic based on app theme
                onStateChange={handleSpriteStateChange}
              />
            )}
            
            {/* Render saved places markers and clusters as overlays */}
            {showSavedPlaces && (
              <>
                {/* Render individual markers */}
                {markerClusterer.getMarkers().map((place) => (
                  place.latitude && place.longitude && (
                    <View
                      key={`saved-place-overlay-android-${place.id}`}
                      style={[
                        styles.markerOverlay,
                        {
                          // Note: In a real implementation, this would need proper
                          // coordinate-to-screen conversion. For now, this is a placeholder.
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          zIndex: 1000,
                        }
                      ]}
                    >
                      <SavedPlaceMarker
                        place={place}
                        theme="light" // TODO: Make this dynamic based on app theme
                        size={32}
                        onPress={handlePlaceMarkerPress}
                      />
                    </View>
                  )
                ))}
                
                {/* Render clusters */}
                {markerClusterer.getClusters().map((cluster) => (
                  <View
                    key={`cluster-overlay-android-${cluster.id}`}
                    style={[
                      styles.markerOverlay,
                      {
                        // Note: In a real implementation, this would need proper
                        // coordinate-to-screen conversion. For now, this is a placeholder.
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        zIndex: 1001, // Higher than individual markers
                      }
                    ]}
                  >
                    <ClusterMarker
                      cluster={cluster}
                      onPress={handleClusterPress}
                    />
                  </View>
                ))}
              </>
            )}
          </View>
        );
      }
    }

    // Fallback to react-native-maps if available
    if (MapView && Polyline) {
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
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onError={handleMapError}
            {...mapConfig}
            mapType="standard"
          >
            {/* Render saved routes */}
            {showSavedRoutes && savedRoutes.map((route) => (
              route.route && route.route.length > 1 && (
                <Polyline
                  key={`saved-route-${route.id}`}
                  coordinates={route.route}
                  strokeColor="#4A90E2" // Blue color for saved routes
                  strokeWidth={4}
                  strokeOpacity={0.6}
                  lineCap="round"
                  lineJoin="round"
                />
              )
            ))}
            
            {/* Render current journey path (on top) */}
            {pathToRender.length > 1 && (
              <Polyline
                coordinates={pathToRender}
                strokeColor="#00FF88" // Glowing green color
                strokeWidth={6}
                strokeOpacity={0.8}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>
          
          {/* Render sprite as overlay */}
          {currentPosition && (
            <MapSprite
              position={currentPosition}
              recentPositions={recentPositions}
              gpsAccuracy={spriteState.gpsAccuracy}
              size={32}
              theme="light" // TODO: Make this dynamic based on app theme
              onStateChange={handleSpriteStateChange}
            />
          )}
        </View>
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

      {/* Saved Routes Toggle Button */}
      {permissionsGranted && isAuthenticated && savedRoutes.length > 0 && (
        <View style={styles.savedRoutesButtonContainer}>
          <TouchableOpacity
            style={[
              styles.savedRoutesButton,
              showSavedRoutes ? styles.savedRoutesButtonActive : styles.savedRoutesButtonInactive
            ]}
            onPress={toggleSavedRoutes}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showSavedRoutes ? 'eye-off' : 'eye'}
              size={20}
              color={showSavedRoutes ? '#4A90E2' : '#666'}
            />
            <Text style={[
              styles.savedRoutesButtonText,
              showSavedRoutes ? styles.savedRoutesButtonTextActive : styles.savedRoutesButtonTextInactive
            ]}>
              {showSavedRoutes ? 'Hide' : 'Show'} Routes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Saved Places Toggle Button */}
      {permissionsGranted && isAuthenticated && savedPlaces.length > 0 && (
        <View style={styles.savedPlacesButtonContainer}>
          <TouchableOpacity
            style={[
              styles.savedPlacesButton,
              showSavedPlaces ? styles.savedPlacesButtonActive : styles.savedPlacesButtonInactive
            ]}
            onPress={toggleSavedPlaces}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showSavedPlaces ? 'bookmark-off' : 'bookmark'}
              size={20}
              color={showSavedPlaces ? '#4A90E2' : '#666'}
            />
            <Text style={[
              styles.savedPlacesButtonText,
              showSavedPlaces ? styles.savedPlacesButtonTextActive : styles.savedPlacesButtonTextInactive
            ]}>
              {showSavedPlaces ? 'Hide' : 'Show'} Places
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tracking Control Button */}
      {permissionsGranted && isAuthenticated && (
        <View style={styles.trackingButtonContainer}>
          <TouchableOpacity
            style={[
              styles.trackingButton,
              tracking ? styles.trackingButtonActive : styles.trackingButtonInactive
            ]}
            onPress={toggleTracking}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tracking ? 'stop' : 'play'}
              size={24}
              color={tracking ? '#FF4444' : '#00FF88'}
            />
            <Text style={[
              styles.trackingButtonText,
              tracking ? styles.trackingButtonTextActive : styles.trackingButtonTextInactive
            ]}>
              {tracking ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Journey Info Display */}
      {tracking && (
        <View style={styles.journeyInfoContainer}>
          <View style={styles.journeyInfo}>
            <Text style={styles.journeyInfoText}>
              Recording Journey
            </Text>
            <Text style={styles.journeyInfoSubtext}>
              {pathToRender.length} points • {Math.round(calculateJourneyDistance(pathToRender))}m
            </Text>
          </View>
        </View>
      )}

      {/* GPS Status Display */}
      {showGPSStatus && spriteState.gpsState && (
        <View style={styles.gpsStatusContainer}>
          <GPSStatusDisplay
            gpsState={spriteState.gpsState}
            signalStrength={spriteState.signalStrength || 0}
            visible={showGPSStatus}
            theme="light" // TODO: Make this dynamic based on app theme
            onPress={() => setShowGPSStatus(false)}
          />
        </View>
      )}

      {/* Journey Naming Modal */}
      <JourneyNamingModal
        visible={showNamingModal}
        onSave={handleSaveJourney}
        onCancel={handleCancelSave}
        defaultName={JourneyService.generateDefaultJourneyName()}
        journeyStats={journeyToSave?.stats || {}}
        loading={savingJourney}
      />

      {/* Place Detail Modal */}
      <PlaceDetailModal
        visible={showPlaceDetail}
        place={selectedPlace}
        theme="light" // TODO: Make this dynamic based on app theme
        onClose={() => {
          setShowPlaceDetail(false);
          setSelectedPlace(null);
        }}
        onSave={handleSavePlace}
        onUnsave={handleUnsavePlace}
        onNavigate={handleNavigateToPlace}
        isAuthenticated={isAuthenticated}
      />

      {/* TODO: Add other UI elements */}
      {/* - Map style selector */}
      {/* - Sprite animation */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
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
  trackingButtonContainer: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trackingButtonActive: {
    backgroundColor: '#FFE5E5',
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  trackingButtonInactive: {
    backgroundColor: '#E5FFE5',
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trackingButtonTextActive: {
    color: '#FF4444',
  },
  trackingButtonTextInactive: {
    color: '#00AA44',
  },
  journeyInfoContainer: {
    position: 'absolute',
    top: 120, // Below locate button
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  journeyInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  journeyInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  journeyInfoSubtext: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  savedRoutesButtonContainer: {
    position: 'absolute',
    top: 120, // Below locate button
    right: 20,
    zIndex: 1000,
  },
  savedRoutesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  savedRoutesButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  savedRoutesButtonInactive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  savedRoutesButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  savedRoutesButtonTextActive: {
    color: '#4A90E2',
  },
  savedRoutesButtonTextInactive: {
    color: '#666',
  },
  savedPlacesButtonContainer: {
    position: 'absolute',
    top: 170, // Below saved routes button
    right: 20,
    zIndex: 1000,
  },
  savedPlacesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  savedPlacesButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  savedPlacesButtonInactive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  savedPlacesButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  savedPlacesButtonTextActive: {
    color: '#4A90E2',
  },
  savedPlacesButtonTextInactive: {
    color: '#666',
  },
  markerOverlay: {
    position: 'absolute',
    zIndex: 1000,
  },
  gpsStatusContainer: {
    position: 'absolute',
    top: 180, // Below journey info
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});

export default MapScreen;