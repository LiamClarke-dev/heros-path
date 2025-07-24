import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Location filtering and smoothing constants
const ACCURACY_THRESHOLD = 50; // meters - reject readings with accuracy worse than this
const MIN_DISTANCE_THRESHOLD = 5; // meters - minimum distance between points
const MAX_SPEED_THRESHOLD = 50; // m/s - maximum reasonable walking/running speed
const SMOOTHING_WINDOW_SIZE = 3; // number of points to use for smoothing
const GPS_WARMUP_DURATION = 30000; // 30 seconds
const GPS_WARMUP_READINGS = 5; // minimum readings during warmup

// Background task name
const BACKGROUND_LOCATION_TASK = 'background-location';

/**
 * BackgroundLocationService handles all location-related functionality
 * including permissions, tracking, filtering, and background operation.
 */
class BackgroundLocationService {
  constructor() {
    this.isInitialized = false;
    this.isTracking = false;
    this.currentJourneyId = null;
    this.locationUpdateCallback = null;
    this.locationHistory = [];
    this.isWarmingUp = false;
    this.warmupStartTime = null;
    this.warmupReadings = 0;
    
    // Bind methods to preserve context
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.handleLocationUpdate = this.handleLocationUpdate.bind(this);
  }

  /**
   * Initialize the service and set up background task
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Define background location task
      TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
        if (error) {
          console.error('Background location task error:', error);
          return;
        }
        if (data) {
          const { locations } = data;
          this.handleLocationUpdate(locations);
        }
      });

      // Set up app state listener
      AppState.addEventListener('change', this.handleAppStateChange);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize BackgroundLocationService:', error);
      return false;
    }
  }

  /**
   * Check if a location reading is accurate enough to use
   * @param {Object} location - Location object from expo-location
   * @returns {boolean} - True if location is accurate enough
   */
  isLocationAccurate(location) {
    if (!location || !location.coords) {
      return false;
    }

    const { accuracy, latitude, longitude } = location.coords;

    // Check accuracy threshold
    if (accuracy && accuracy > ACCURACY_THRESHOLD) {
      console.log(`Location rejected: accuracy ${accuracy}m > ${ACCURACY_THRESHOLD}m threshold`);
      return false;
    }

    // Check for valid coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      console.log('Location rejected: invalid coordinates');
      return false;
    }

    return true;
  }

  /**
   * Validate that coordinates are within reasonable bounds
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {boolean} - True if coordinates are valid
   */
  isValidCoordinate(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Apply smoothing algorithm to reduce GPS noise
   * @param {Array} locations - Array of recent location objects
   * @returns {Object} - Smoothed location object
   */
  smoothLocation(locations) {
    if (!locations || locations.length === 0) {
      return null;
    }

    // If we only have one location, return it as-is
    if (locations.length === 1) {
      return locations[0];
    }

    // Use the most recent location as base
    const baseLocation = locations[locations.length - 1];
    
    // If we have fewer locations than the smoothing window, use all available
    const smoothingLocations = locations.slice(-Math.min(SMOOTHING_WINDOW_SIZE, locations.length));
    
    // Calculate weighted average (more recent locations have higher weight)
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;

    smoothingLocations.forEach((location, index) => {
      // Weight increases with recency (index 0 is oldest, last index is newest)
      const weight = index + 1;
      totalWeight += weight;
      weightedLat += location.coords.latitude * weight;
      weightedLng += location.coords.longitude * weight;
    });

    // Create smoothed location
    const smoothedLocation = {
      ...baseLocation,
      coords: {
        ...baseLocation.coords,
        latitude: weightedLat / totalWeight,
        longitude: weightedLng / totalWeight
      }
    };

    return smoothedLocation;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {Object} coord1 - First coordinate {latitude, longitude}
   * @param {Object} coord2 - Second coordinate {latitude, longitude}
   * @returns {number} - Distance in meters
   */
  calculateDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} - Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if location update represents reasonable movement
   * @param {Object} newLocation - New location reading
   * @param {Object} lastLocation - Previous location reading
   * @returns {boolean} - True if movement is reasonable
   */
  isReasonableMovement(newLocation, lastLocation) {
    if (!lastLocation) {
      return true; // First location is always reasonable
    }

    const distance = this.calculateDistance(lastLocation.coords, newLocation.coords);
    const timeDiff = (newLocation.timestamp - lastLocation.timestamp) / 1000; // seconds
    
    // Check minimum distance threshold
    if (distance < MIN_DISTANCE_THRESHOLD) {
      console.log(`Location rejected: distance ${distance.toFixed(2)}m < ${MIN_DISTANCE_THRESHOLD}m threshold`);
      return false;
    }

    // Check maximum speed threshold
    if (timeDiff > 0) {
      const speed = distance / timeDiff; // m/s
      if (speed > MAX_SPEED_THRESHOLD) {
        console.log(`Location rejected: speed ${speed.toFixed(2)}m/s > ${MAX_SPEED_THRESHOLD}m/s threshold`);
        return false;
      }
    }

    return true;
  }

  /**
   * Process and filter a new location reading
   * @param {Object} location - Raw location from expo-location
   * @returns {Object|null} - Processed location or null if rejected
   */
  processLocationReading(location) {
    // Check basic accuracy
    if (!this.isLocationAccurate(location)) {
      return null;
    }

    // Check movement reasonableness
    const lastLocation = this.locationHistory[this.locationHistory.length - 1];
    if (!this.isReasonableMovement(location, lastLocation)) {
      return null;
    }

    // Add to history for smoothing
    this.locationHistory.push(location);
    
    // Keep only recent locations for smoothing
    if (this.locationHistory.length > SMOOTHING_WINDOW_SIZE * 2) {
      this.locationHistory = this.locationHistory.slice(-SMOOTHING_WINDOW_SIZE);
    }

    // Apply smoothing
    const smoothedLocation = this.smoothLocation(this.locationHistory);
    
    return smoothedLocation;
  }

  /**
   * Start GPS warm-up process to improve initial accuracy
   * @returns {Promise<boolean>} - True when warm-up is complete
   */
  async startGPSWarmup() {
    if (this.isWarmingUp) {
      console.log('GPS warm-up already in progress');
      return false;
    }

    console.log('Starting GPS warm-up...');
    this.isWarmingUp = true;
    this.warmupStartTime = Date.now();
    this.warmupReadings = 0;

    try {
      // Start location updates during warm-up
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // 1 second intervals during warm-up
          distanceInterval: 0, // Get all updates
        },
        (location) => {
          this.handleWarmupLocation(location);
        }
      );

      // Wait for warm-up to complete
      return new Promise((resolve) => {
        const checkWarmupComplete = () => {
          if (this.isWarmupComplete()) {
            subscription.remove();
            this.isWarmingUp = false;
            console.log(`GPS warm-up complete after ${this.warmupReadings} readings in ${Date.now() - this.warmupStartTime}ms`);
            resolve(true);
          } else {
            setTimeout(checkWarmupComplete, 1000);
          }
        };
        checkWarmupComplete();
      });
    } catch (error) {
      console.error('GPS warm-up failed:', error);
      this.isWarmingUp = false;
      return false;
    }
  }

  /**
   * Handle location updates during GPS warm-up
   * @param {Object} location - Location reading during warm-up
   */
  handleWarmupLocation(location) {
    if (!this.isWarmingUp) {
      return;
    }

    // Count accurate readings during warm-up
    if (this.isLocationAccurate(location)) {
      this.warmupReadings++;
      console.log(`GPS warm-up reading ${this.warmupReadings}/${GPS_WARMUP_READINGS} - accuracy: ${location.coords.accuracy}m`);
    }
  }

  /**
   * Check if GPS warm-up is complete
   * @returns {boolean} - True if warm-up conditions are met
   */
  isWarmupComplete() {
    if (!this.isWarmingUp) {
      return true;
    }

    const timeElapsed = Date.now() - this.warmupStartTime;
    
    // Warm-up is complete if we have enough accurate readings OR time limit reached
    return (
      this.warmupReadings >= GPS_WARMUP_READINGS ||
      timeElapsed >= GPS_WARMUP_DURATION
    );
  }

  /**
   * Get current GPS warm-up status
   * @returns {Object} - Warm-up status information
   */
  getWarmupStatus() {
    if (!this.isWarmingUp) {
      return {
        isWarmingUp: false,
        progress: 1.0,
        readingsCount: 0,
        timeElapsed: 0
      };
    }

    const timeElapsed = Date.now() - this.warmupStartTime;
    const timeProgress = Math.min(timeElapsed / GPS_WARMUP_DURATION, 1.0);
    const readingsProgress = Math.min(this.warmupReadings / GPS_WARMUP_READINGS, 1.0);
    
    // Use the maximum of time or readings progress
    const overallProgress = Math.max(timeProgress, readingsProgress);

    return {
      isWarmingUp: true,
      progress: overallProgress,
      readingsCount: this.warmupReadings,
      timeElapsed: timeElapsed
    };
  }

  /**
   * Check location permissions status
   * @returns {Promise<Object>} - Permission status object
   */
  async checkPermissions() {
    try {
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundStatus.status === 'granted',
        background: backgroundStatus.status === 'granted',
        canAskAgain: foregroundStatus.canAskAgain,
        foregroundStatus: foregroundStatus.status,
        backgroundStatus: backgroundStatus.status
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return {
        foreground: false,
        background: false,
        canAskAgain: false,
        error: error.message
      };
    }
  }

  /**
   * Request location permissions with proper workflow
   * @returns {Promise<Object>} - Permission request result
   */
  async requestPermissions() {
    try {
      // First request foreground permission
      const foregroundResult = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundResult.status !== 'granted') {
        return {
          success: false,
          foreground: false,
          background: false,
          message: 'Foreground location permission is required for tracking'
        };
      }

      // Then request background permission
      const backgroundResult = await Location.requestBackgroundPermissionsAsync();
      
      return {
        success: backgroundResult.status === 'granted',
        foreground: true,
        background: backgroundResult.status === 'granted',
        message: backgroundResult.status === 'granted' 
          ? 'All permissions granted' 
          : 'Background permission denied - tracking will pause when app is backgrounded'
      };
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return {
        success: false,
        foreground: false,
        background: false,
        error: error.message
      };
    }
  }

  /**
   * Start location tracking for a journey
   * @param {string} journeyId - Unique identifier for the journey
   * @param {Object} options - Tracking options
   * @returns {Promise<boolean>} - True if tracking started successfully
   */
  async startTracking(journeyId, options = {}) {
    try {
      if (this.isTracking) {
        console.log('Tracking already active');
        return false;
      }

      // Check permissions
      const permissions = await this.checkPermissions();
      if (!permissions.foreground) {
        console.error('Foreground location permission not granted');
        return false;
      }

      // Start GPS warm-up if requested
      if (options.warmup !== false) {
        console.log('Starting GPS warm-up before tracking...');
        await this.startGPSWarmup();
      }

      // Configure tracking options
      const trackingOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: options.timeInterval || 2000, // 2 seconds default
        distanceInterval: options.distanceInterval || 5, // 5 meters default
        ...options
      };

      // Start foreground location updates
      this.locationSubscription = await Location.watchPositionAsync(
        trackingOptions,
        (location) => {
          const processedLocation = this.processLocationReading(location);
          if (processedLocation && this.locationUpdateCallback) {
            this.locationUpdateCallback(processedLocation);
          }
        }
      );

      // Configure background tracking if permission is available
      if (permissions.background) {
        await this.configureBackgroundTracking(journeyId);
      }

      this.isTracking = true;
      this.currentJourneyId = journeyId;
      
      console.log(`Location tracking started for journey: ${journeyId}`);
      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      return false;
    }
  }

  /**
   * Stop location tracking
   * @returns {Promise<Object|null>} - Journey data if available
   */
  async stopTracking() {
    try {
      if (!this.isTracking) {
        console.log('No active tracking to stop');
        return null;
      }

      // Stop foreground location updates
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop background tracking
      await this.stopBackgroundTracking();

      // Prepare journey data
      const journeyData = {
        id: this.currentJourneyId,
        endTime: Date.now(),
        coordinates: this.locationHistory.map(loc => ({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy
        })),
        isActive: false
      };

      // Reset tracking state
      this.isTracking = false;
      this.currentJourneyId = null;
      this.locationHistory = [];

      console.log('Location tracking stopped');
      return journeyData;
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      return null;
    }
  }

  /**
   * Pause location tracking temporarily
   */
  async pauseTracking() {
    try {
      if (!this.isTracking) {
        return;
      }

      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      console.log('Location tracking paused');
    } catch (error) {
      console.error('Failed to pause tracking:', error);
    }
  }

  /**
   * Resume location tracking after pause
   * @returns {Promise<boolean>} - True if resumed successfully
   */
  async resumeTracking() {
    try {
      if (!this.isTracking || this.locationSubscription) {
        return false;
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5
        },
        (location) => {
          const processedLocation = this.processLocationReading(location);
          if (processedLocation && this.locationUpdateCallback) {
            this.locationUpdateCallback(processedLocation);
          }
        }
      );

      console.log('Location tracking resumed');
      return true;
    } catch (error) {
      console.error('Failed to resume tracking:', error);
      return false;
    }
  }

  /**
   * Get current location once
   * @param {Object} options - Location options
   * @returns {Promise<Object|null>} - Current location or null
   */
  async getCurrentLocation(options = {}) {
    try {
      const locationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        maximumAge: 10000, // 10 seconds
        timeout: 15000, // 15 seconds
        ...options
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      return this.processLocationReading(location);
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  /**
   * Get current service status
   * @returns {Object} - Service status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isTracking: this.isTracking,
      currentJourneyId: this.currentJourneyId,
      locationHistoryCount: this.locationHistory.length,
      isWarmingUp: this.isWarmingUp,
      warmupStatus: this.getWarmupStatus()
    };
  }

  setLocationUpdateCallback(callback) {
    this.locationUpdateCallback = callback;
  }

  handleLocationUpdate(locations) {
    // Process each location
    locations.forEach(location => {
      const processedLocation = this.processLocationReading(location);
      if (processedLocation && this.locationUpdateCallback) {
        this.locationUpdateCallback(processedLocation);
      }
    });
  }

  /**
   * Handle app state changes for background/foreground transitions
   * @param {string} nextAppState - The next app state ('active', 'background', 'inactive')
   */
  handleAppStateChange(nextAppState) {
    console.log('App state changed to:', nextAppState);
    
    if (nextAppState === 'background' && this.isTracking) {
      this.handleAppBackground();
    } else if (nextAppState === 'active' && this.isTracking) {
      this.handleAppForeground();
    }
  }

  /**
   * Handle app going to background while tracking
   */
  async handleAppBackground() {
    console.log('App going to background - maintaining location tracking');
    
    try {
      // Ensure background location is still active
      const { status } = await Location.getBackgroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Background location permission not granted');
        // Notify user that tracking may be interrupted
        if (this.locationUpdateCallback) {
          this.locationUpdateCallback({
            type: 'warning',
            message: 'Background location permission required for continuous tracking'
          });
        }
        return;
      }

      // Store current tracking state
      await this.saveTrackingState();
      
      console.log('Background tracking configured successfully');
    } catch (error) {
      console.error('Error configuring background tracking:', error);
    }
  }

  /**
   * Handle app returning to foreground while tracking
   */
  async handleAppForeground() {
    console.log('App returning to foreground - resuming foreground tracking');
    
    try {
      // Restore tracking state if needed
      await this.restoreTrackingState();
      
      // Update UI with any locations captured while in background
      if (this.locationUpdateCallback) {
        this.locationUpdateCallback({
          type: 'info',
          message: 'Tracking resumed in foreground'
        });
      }
      
      console.log('Foreground tracking resumed successfully');
    } catch (error) {
      console.error('Error resuming foreground tracking:', error);
    }
  }

  /**
   * Save current tracking state to persistent storage
   */
  async saveTrackingState() {
    try {
      const trackingState = {
        isTracking: this.isTracking,
        currentJourneyId: this.currentJourneyId,
        startTime: Date.now(),
        locationHistoryCount: this.locationHistory.length
      };
      
      await AsyncStorage.setItem('trackingState', JSON.stringify(trackingState));
      console.log('Tracking state saved');
    } catch (error) {
      console.error('Failed to save tracking state:', error);
    }
  }

  /**
   * Restore tracking state from persistent storage
   */
  async restoreTrackingState() {
    try {
      const trackingStateJson = await AsyncStorage.getItem('trackingState');
      
      if (trackingStateJson) {
        const trackingState = JSON.parse(trackingStateJson);
        console.log('Restored tracking state:', trackingState);
        
        // Verify state is still valid
        if (trackingState.isTracking && trackingState.currentJourneyId) {
          this.isTracking = trackingState.isTracking;
          this.currentJourneyId = trackingState.currentJourneyId;
        }
      }
    } catch (error) {
      console.error('Failed to restore tracking state:', error);
    }
  }

  /**
   * Configure background location tracking
   * @param {string} journeyId - Journey identifier for background tracking
   */
  async configureBackgroundTracking(journeyId) {
    try {
      // Check if background location is already running
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      
      if (isRegistered) {
        console.log('Background location task already registered');
        return true;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000, // 5 seconds in background (less frequent to save battery)
        distanceInterval: 10, // 10 meters minimum distance
        deferredUpdatesInterval: 10000, // 10 seconds deferred updates
        foregroundService: {
          notificationTitle: 'Hero\'s Path is tracking your journey',
          notificationBody: 'Tap to return to the app',
          notificationColor: '#4A90E2',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      console.log('Background location tracking started');
      return true;
    } catch (error) {
      console.error('Failed to configure background tracking:', error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundTracking() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('Background location tracking stopped');
      }
      
      // Clear saved tracking state
      await AsyncStorage.removeItem('trackingState');
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
    }
  }

  /**
   * Check if background tracking is currently active
   * @returns {Promise<boolean>} - True if background tracking is active
   */
  async isBackgroundTrackingActive() {
    try {
      return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    } catch (error) {
      console.error('Failed to check background tracking status:', error);
      return false;
    }
  }

  /**
   * Clean up service resources and stop all tracking
   */
  async cleanup() {
    try {
      // Stop tracking if active
      if (this.isTracking) {
        await this.stopTracking();
      }

      // Remove event listeners
      AppState.removeEventListener('change', this.handleAppStateChange);

      // Clear location subscription
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop background tracking
      await this.stopBackgroundTracking();

      // Clear state
      this.locationHistory = [];
      this.locationUpdateCallback = null;
      this.isInitialized = false;
      this.isTracking = false;
      this.currentJourneyId = null;
      this.isWarmingUp = false;
      this.warmupStartTime = null;
      this.warmupReadings = 0;

      console.log('BackgroundLocationService cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export default new BackgroundLocationService();