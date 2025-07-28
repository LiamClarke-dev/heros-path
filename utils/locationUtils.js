import * as Location from 'expo-location';

/**
 * Location Utilities
 * 
 * Utility functions for handling location-related operations including
 * permission requests, location acquisition, and error handling.
 */

/**
 * Location accuracy levels
 */
export const LOCATION_ACCURACY = {
  LOW: Location.Accuracy.Low,
  BALANCED: Location.Accuracy.Balanced,
  HIGH: Location.Accuracy.High,
  HIGHEST: Location.Accuracy.Highest,
};

/**
 * Default location options for different use cases
 */
export const LOCATION_OPTIONS = {
  // For locate me functionality - high accuracy, reasonable timeout
  LOCATE_ME: {
    accuracy: LOCATION_ACCURACY.HIGH,
    timeout: 10000,
    maximumAge: 5000,
  },
  // For tracking - balanced accuracy, longer timeout
  TRACKING: {
    accuracy: LOCATION_ACCURACY.BALANCED,
    timeout: 15000,
    maximumAge: 10000,
  },
  // For quick location checks - lower accuracy, fast timeout
  QUICK_CHECK: {
    accuracy: LOCATION_ACCURACY.BALANCED,
    timeout: 5000,
    maximumAge: 30000,
  },
};

/**
 * Requests location permissions with proper error handling
 * 
 * @param {boolean} background - Whether to request background location permission
 * @returns {Promise<{granted: boolean, status: string, error?: string}>}
 */
export async function requestLocationPermissions(background = false) {
  try {
    // Check current permissions first to avoid duplicate requests
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    
    // Only request if not already granted
    let foregroundResult = foregroundStatus;
    if (foregroundStatus.status !== 'granted') {
      foregroundResult = await Location.requestForegroundPermissionsAsync();
    }
    
    if (foregroundResult.status !== 'granted') {
      return {
        granted: false,
        status: foregroundResult.status,
        canAskAgain: foregroundResult.canAskAgain,
        error: 'Location permission is required to use this feature. Please enable location access in your device settings.',
      };
    }

    // If background permission is requested
    if (background) {
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      
      // Only request if not already granted
      let backgroundResult = backgroundStatus;
      if (backgroundStatus.status !== 'granted') {
        backgroundResult = await Location.requestBackgroundPermissionsAsync();
      }
      
      if (backgroundResult.status !== 'granted') {
        return {
          granted: false,
          status: backgroundResult.status,
          canAskAgain: backgroundResult.canAskAgain,
          error: 'Background location permission is required to track your journey when the app is not active. Please enable "Always" location access in your device settings.',
        };
      }
    }

    return {
      granted: true,
      status: 'granted',
    };
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return {
      granted: false,
      status: 'error',
      error: 'Unable to request location permissions. Please try again.',
    };
  }
}

/**
 * Gets the current location with specified options
 * 
 * @param {object} options - Location options (accuracy, timeout, etc.)
 * @returns {Promise<{success: boolean, location?: object, error?: string}>}
 */
export async function getCurrentLocation(options = LOCATION_OPTIONS.LOCATE_ME) {
  try {
    // Check permissions first
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return {
        success: false,
        error: 'Location permission not granted. Please enable location access in settings.',
      };
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync(options);

    return {
      success: true,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      },
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Unable to get your location. ';
    
    if (error.code === 'E_LOCATION_TIMEOUT') {
      errorMessage += 'Location request timed out. Please try again.';
    } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
      errorMessage += 'Location services are not available.';
    } else if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
      errorMessage += 'Please enable location services in your device settings.';
    } else {
      errorMessage += 'Please check your location settings and try again.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Animates map to a specific location
 * This function provides the animation logic for centering the map
 * 
 * @param {object} mapRef - Reference to the map component
 * @param {object} location - Location to animate to {latitude, longitude}
 * @param {number} duration - Animation duration in milliseconds
 * @returns {Promise<void>}
 */
export async function animateToLocation(mapRef, location, duration = 1000) {
  // Handle both mapRef.current and direct mapRef cases
  const actualMapRef = mapRef?.current || mapRef;
  
  if (!actualMapRef) {
    console.warn('Map reference not available for animation');
    return;
  }

  try {
    // For expo-maps, we use the camera position
    const cameraPosition = {
      center: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      zoom: 16, // Good zoom level for user location
    };

    // Animate to the new position
    if (actualMapRef.animateCamera) {
      console.log('Using animateCamera for map animation');
      await actualMapRef.animateCamera(cameraPosition, { duration });
    } else if (actualMapRef.animateToRegion) {
      // Fallback for different map implementations
      console.log('Using animateToRegion for map animation');
      const region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      await actualMapRef.animateToRegion(region, duration);
    } else {
      console.warn('Map reference does not support animation methods');
    }
  } catch (error) {
    console.error('Error animating to location:', error);
    // Don't throw error - animation failure shouldn't break the app
  }
}

/**
 * Checks if location services are enabled
 * 
 * @returns {Promise<boolean>}
 */
export async function isLocationEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('Error checking location services:', error);
    return false;
  }
}

/**
 * Gets location permission status without requesting
 * 
 * @param {boolean} background - Whether to check background permission
 * @returns {Promise<string>} Permission status
 */
export async function getLocationPermissionStatus(background = false) {
  try {
    if (background) {
      const result = await Location.getBackgroundPermissionsAsync();
      return result.status;
    } else {
      const result = await Location.getForegroundPermissionsAsync();
      return result.status;
    }
  } catch (error) {
    console.error('Error getting location permission status:', error);
    return 'undetermined';
  }
}