import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import BackgroundLocationService from '../services/BackgroundLocationService';

// Utilities
import { 
  getCurrentLocation, 
  animateToLocation, 
  requestLocationPermissions,
  LOCATION_OPTIONS 
} from '../utils/locationUtils';

/**
 * Custom hook for managing location tracking and GPS status
 * 
 * Handles:
 * - Location service initialization and management
 * - Location update callbacks and GPS status tracking
 * - Location permissions and service cleanup
 * - Current position and path tracking
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useLocationTracking = () => {
  // Location state
  const [currentPosition, setCurrentPosition] = useState(null);
  const [recentPositions, setRecentPositions] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Service reference
  const locationServiceRef = useRef(null);

  /**
   * Initialize location service on mount
   * Implements service initialization as per requirement 3.1
   */
  useEffect(() => {
    initializeLocationService();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initialize the BackgroundLocationService
   * Implements location service management as per requirement 2.1
   */
  const initializeLocationService = useCallback(async () => {
    try {
      if (!locationServiceRef.current) {
        locationServiceRef.current = BackgroundLocationService; // Use singleton instance
      }

      const result = await locationServiceRef.current.initialize({
        onPermissionPrompt: handlePermissionPrompt
      });

      if (result.success) {
        console.log('BackgroundLocationService initialized successfully');
        
        // Set up location update callback
        locationServiceRef.current.setLocationUpdateCallback(handleLocationUpdate);
        
        // Request initial permissions
        await requestInitialPermissions();
      } else {
        console.error('Failed to initialize BackgroundLocationService:', result.error);
        setGpsStatus({
          indicator: 'ERROR',
          message: 'Location service initialization failed'
        });
      }
    } catch (error) {
      console.error('Error initializing location service:', error);
      setGpsStatus({
        indicator: 'ERROR',
        message: 'Failed to initialize location tracking'
      });
    }
  }, []);

  /**
   * Request initial location permissions
   * Implements permission handling as per requirement 3.2
   */
  const requestInitialPermissions = useCallback(async () => {
    try {
      const permissionResult = await requestLocationPermissions(true);
      
      if (permissionResult.granted) {
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
          
          setGpsStatus({
            indicator: 'GOOD',
            message: 'GPS signal is strong'
          });
        } else {
          console.warn('Could not get initial location:', locationResult.error);
          setGpsStatus({
            indicator: 'POOR',
            message: 'Unable to get current location'
          });
        }
      } else {
        setPermissionsGranted(false);
        setGpsStatus({
          indicator: 'ERROR',
          message: 'Location permission denied'
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionsGranted(false);
      setGpsStatus({
        indicator: 'ERROR',
        message: 'Permission request failed'
      });
    }
  }, []);

  /**
   * Handle permission prompts from BackgroundLocationService
   * Implements permission error handling as per requirement 3.2
   */
  const handlePermissionPrompt = useCallback((promptData) => {
    const { type, title, message } = promptData;

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settings', 
          onPress: () => {
            // TODO: Open device settings
            console.log('Open settings for permissions');
          }
        },
      ]
    );
  }, []);

  /**
   * Handle location updates from BackgroundLocationService
   * Implements location update callbacks as per requirement 2.1
   */
  const handleLocationUpdate = useCallback((location) => {
    if (location.type === 'error' || location.type === 'warning') {
      console.warn('Location update warning/error:', location.message);
      
      // Update GPS status based on error type
      if (location.type === 'error') {
        setGpsStatus({
          indicator: 'LOST',
          message: location.message || 'GPS signal lost'
        });
      } else {
        setGpsStatus({
          indicator: 'POOR',
          message: location.message || 'GPS signal is weak'
        });
      }
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

    // Update recent positions for direction calculation (keep last 5 positions)
    setRecentPositions(prevPositions => {
      const updated = [...prevPositions, newPosition];
      return updated.slice(-5);
    });

    // Update GPS status based on accuracy
    const accuracy = location.coords.accuracy;
    if (accuracy <= 10) {
      setGpsStatus({
        indicator: 'GOOD',
        message: 'GPS signal is strong',
        accuracy
      });
    } else if (accuracy <= 50) {
      setGpsStatus({
        indicator: 'FAIR',
        message: 'GPS signal is fair',
        accuracy
      });
    } else {
      setGpsStatus({
        indicator: 'POOR',
        message: 'GPS signal is weak',
        accuracy
      });
    }
  }, []);

  /**
   * Handle locate me button press
   * Implements locate functionality as per requirement 2.1
   */
  const locateMe = useCallback(async (mapRef) => {
    if (!permissionsGranted) {
      Alert.alert(
        'Location Permission Required',
        'Location access is needed to show your position on the map.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings', 
            onPress: () => {
              // TODO: Open device settings
              console.log('Open settings');
            }
          },
        ]
      );
      return;
    }

    try {
      setIsLocating(true);
      
      const locationResult = await getCurrentLocation(LOCATION_OPTIONS.LOCATE_ME);
      
      if (locationResult.success) {
        const newPosition = {
          ...locationResult.location,
          timestamp: Date.now()
        };

        setCurrentPosition(newPosition);

        // Update recent positions
        setRecentPositions(prevPositions => {
          const updated = [...prevPositions, newPosition];
          return updated.slice(-5);
        });

        // Animate map to the new location if mapRef is provided
        if (mapRef && mapRef.current) {
          await animateToLocation(mapRef.current, locationResult.location);
        }

        setGpsStatus({
          indicator: 'GOOD',
          message: 'Location found successfully'
        });
      } else {
        throw new Error(locationResult.error || 'Failed to get current location');
      }
    } catch (error) {
      console.error('Error in locateMe:', error);
      Alert.alert(
        'Location Error',
        error.message || 'Failed to get your current location. Please try again.',
        [{ text: 'OK' }]
      );
      
      setGpsStatus({
        indicator: 'ERROR',
        message: 'Failed to get location'
      });
    } finally {
      setIsLocating(false);
    }
  }, [permissionsGranted]);

  /**
   * Start location tracking for journey recording
   * Implements GPS status tracking as per requirement 2.2
   */
  const startTracking = useCallback(async (journeyId, options = {}) => {
    if (!locationServiceRef.current) {
      throw new Error('Location service not initialized');
    }

    if (!permissionsGranted) {
      throw new Error('Location permissions not granted');
    }

    try {
      const success = await locationServiceRef.current.startTracking(journeyId, {
        warmup: true,
        timeInterval: 2000, // 2 seconds
        distanceInterval: 5, // 5 meters
        ...options
      });

      if (success) {
        setCurrentPath([]);
        setGpsStatus({
          indicator: 'TRACKING',
          message: 'Tracking your journey'
        });
        return true;
      } else {
        throw new Error('Failed to start location tracking');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      setGpsStatus({
        indicator: 'ERROR',
        message: 'Failed to start tracking'
      });
      throw error;
    }
  }, [permissionsGranted]);

  /**
   * Stop location tracking
   * Implements service cleanup as per requirement 3.2
   */
  const stopTracking = useCallback(async () => {
    if (!locationServiceRef.current) {
      throw new Error('Location service not initialized');
    }

    try {
      const journeyData = await locationServiceRef.current.stopTracking();
      
      setGpsStatus({
        indicator: 'GOOD',
        message: 'Tracking stopped'
      });
      
      return journeyData;
    } catch (error) {
      console.error('Error stopping tracking:', error);
      setGpsStatus({
        indicator: 'ERROR',
        message: 'Failed to stop tracking'
      });
      throw error;
    }
  }, []);

  /**
   * Add position to current path (for journey tracking)
   */
  const addToPath = useCallback((position) => {
    setCurrentPath(prevPath => [...prevPath, position]);
  }, []);

  /**
   * Clear current path
   */
  const clearPath = useCallback(() => {
    setCurrentPath([]);
  }, []);

  /**
   * Cleanup function for service and listeners
   * Implements proper cleanup as per requirement 3.2
   */
  const cleanup = useCallback(() => {
    if (locationServiceRef.current) {
      locationServiceRef.current.cleanup();
      locationServiceRef.current = null;
    }
  }, []);

  return {
    // State
    currentPosition,
    recentPositions,
    currentPath,
    gpsStatus,
    permissionsGranted,
    isLocating,
    
    // Actions
    locateMe,
    startTracking,
    stopTracking,
    addToPath,
    clearPath,
    
    // Service reference (for advanced usage)
    locationService: locationServiceRef.current,
  };
};

export default useLocationTracking;