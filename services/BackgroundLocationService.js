import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationOptimizer from './location/LocationOptimizer';
import LocationFilter from './location/LocationFilter';
import LocationBackupManager from './location/LocationBackupManager';

// TWO-STREAM PROCESSING: Import the consolidated data processor
import { processBothStreams, getProcessingStats } from '../utils/locationDataProcessor';

// GPS warmup constants
const GPS_WARMUP_DURATION = 10000; // 10 seconds
const GPS_WARMUP_READINGS = 3; // minimum readings during warmup

// Background task name
const BACKGROUND_LOCATION_TASK = 'background-location';

// Define the background location task at module level to ensure it's available immediately
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    // Get the singleton instance to call the callback
    const instance = BackgroundLocationService.getInstance();
    if (instance && instance.locationUpdateCallback) {
      instance.locationUpdateCallback({
        type: 'error',
        message: 'Background location tracking error',
        error: error.message
      });
    }
    return;
  }
  if (data) {
    const { locations } = data;
    // Get the singleton instance to handle the location update
    const instance = BackgroundLocationService.getInstance();
    if (instance && instance.handleLocationUpdate) {
      instance.handleLocationUpdate(locations);
    }
  }
});

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

    // TWO-STREAM PROCESSING: Store raw GPS data for processing
    this.rawLocationHistory = [];
    this.currentJourneyData = null;
    this.currentDisplayData = null;
    this.isWarmingUp = false;
    this.warmupStartTime = null;
    this.warmupReadings = 0;
    this.permissionPromptCallback = null;
    this.appStateSubscription = null;
    this.locationSubscription = null;

    // Initialize modular components
    this.locationOptimizer = new LocationOptimizer();
    this.locationFilter = new LocationFilter();
    this.backupManager = new LocationBackupManager();

    // Set up component callbacks
    this.locationOptimizer.setOptimizationChangeCallback(this.handleOptimizationChange.bind(this));
    this.backupManager.setBackupStatusCallback(this.handleBackupStatusChange.bind(this));

    // Bind methods to preserve context
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.handleLocationUpdate = this.handleLocationUpdate.bind(this);
    this.handleOptimizationChange = this.handleOptimizationChange.bind(this);
    this.handleBackupStatusChange = this.handleBackupStatusChange.bind(this);

    // Set singleton instance
    BackgroundLocationService._instance = this;
  }

  // Singleton pattern to ensure we can access the instance from the task
  static getInstance() {
    return BackgroundLocationService._instance;
  }

  /**
   * Initialize the service and set up background task
   * @param {Object} options - Initialization options
   * @param {Function} options.onPermissionPrompt - Callback for permission prompts
   * @returns {Promise<Object>} - Initialization result with status and permissions
   */
  async initialize(options = {}) {
    try {
      if (this.isInitialized) {
        const permissions = await this.checkPermissions();
        return {
          success: true,
          alreadyInitialized: true,
          permissions
        };
      }

      // Store permission prompt callback
      if (options.onPermissionPrompt) {
        this.permissionPromptCallback = options.onPermissionPrompt;
      }

      // Background task is now defined at module level

      // Set up app state listener (modern subscription pattern)
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

      // Check initial permissions and prompt if needed
      const permissions = await this.checkPermissions();

      // Requirement 1.5: Prompt user with clear explanation if background permission not granted
      if (!permissions.background && this.permissionPromptCallback) {
        this.permissionPromptCallback({
          type: 'background_permission_needed',
          title: 'Background Location Required',
          message: 'Hero\'s Path needs background location access to continue tracking your journey even when the app is minimized or your device is locked. This ensures your complete route is recorded without interruption.',
          permissions: permissions
        });
      }

      this.isInitialized = true;

      return {
        success: true,
        permissions,
        backgroundPermissionAvailable: permissions.background
      };
    } catch (error) {
      console.error('Failed to initialize BackgroundLocationService:', error);
      return {
        success: false,
        error: error.message,
        permissions: null
      };
    }
  }

  /**
   * Handle optimization changes from LocationOptimizer
   * @param {Object} change - Optimization change event
   */
  handleOptimizationChange(change) {
    if (change.type === 'movement_change' || change.type === 'level_changed') {
      this.updateTrackingWithOptions(change.options);
    }

    // Forward to location update callback
    if (this.locationUpdateCallback) {
      this.locationUpdateCallback(change);
    }
  }

  /**
   * Handle backup status changes from LocationBackupManager
   * @param {Object} status - Backup status event
   */
  handleBackupStatusChange(status) {
    // Forward to location update callback
    if (this.locationUpdateCallback) {
      this.locationUpdateCallback(status);
    }
  }

  /**
   * Update tracking with new options
   * @param {Object} options - New tracking options
   */
  async updateTrackingWithOptions(options) {
    if (!this.isTracking || !options) {
      return;
    }

    try {
      // Stop current subscription
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Convert string accuracy to Location constant
      let accuracy = Location.Accuracy.BestForNavigation;
      if (options.accuracy === 'High') {
        accuracy = Location.Accuracy.High;
      } else if (options.accuracy === 'Balanced') {
        accuracy = Location.Accuracy.Balanced;
      }

      // Start with new options
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: accuracy,
          timeInterval: options.timeInterval,
          distanceInterval: options.distanceInterval
        },
        (location) => {
          // CRITICAL FIX: Use consistent data processing path
          this.handleLocationUpdate([location]);
        }
      );

      console.log('Location tracking updated with new options:', options);
    } catch (error) {
      console.error('Failed to update location tracking:', error);
    }
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
   * Check if location reading is accurate enough
   * @param {Object} location - Location reading to check
   * @returns {boolean} - True if location is accurate enough
   */
  isLocationAccurate(location) {
    if (!location || !location.coords) {
      return false;
    }

    // Consider location accurate if accuracy is better than 20 meters
    const accuracy = location.coords.accuracy;
    return accuracy && accuracy <= 20;
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
   * Request location permissions with proper workflow and user prompts
   * @param {Object} options - Request options
   * @param {boolean} options.showPrompts - Whether to show user prompts
   * @returns {Promise<Object>} - Permission request result
   */
  async requestPermissions(options = { showPrompts: true }) {
    try {
      // Use the centralized permission utility to avoid duplicate dialogs
      const { requestLocationPermissions } = require('../utils/locationUtils');

      // Check current permissions first
      const currentPermissions = await this.checkPermissions();

      // If permissions are already granted, return success
      if (currentPermissions.foreground && currentPermissions.background) {
        return {
          success: true,
          foreground: true,
          background: true,
          message: 'All location permissions are already granted'
        };
      }

      // Use centralized permission request
      const permissionResult = await requestLocationPermissions(true); // Request background permission

      if (permissionResult.granted) {
        return {
          success: true,
          foreground: true,
          background: true,
          message: 'All location permissions granted successfully'
        };
      } else {
        const result = {
          success: false,
          foreground: currentPermissions.foreground,
          background: false,
          message: permissionResult.error || 'Location permission is required for journey tracking',
          canAskAgain: permissionResult.canAskAgain
        };

        // Show user prompt if enabled
        if (options.showPrompts && this.permissionPromptCallback) {
          this.permissionPromptCallback({
            type: 'permission_denied',
            title: 'Permission Required',
            message: permissionResult.error || 'Location access is essential for tracking your journeys. Please enable it in your device settings.',
            result: result
          });
        }

        return result;
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      const errorResult = {
        success: false,
        foreground: false,
        background: false,
        error: error.message
      };

      if (options.showPrompts && this.permissionPromptCallback) {
        this.permissionPromptCallback({
          type: 'permission_error',
          title: 'Permission Error',
          message: 'An error occurred while requesting location permissions. Please try again.',
          error: error.message
        });
      }

      return errorResult;
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

      // Get initial tracking options from optimizer
      const optimizedOptions = this.locationOptimizer.getCurrentTrackingOptions();
      const trackingOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: optimizedOptions.timeInterval,
        distanceInterval: optimizedOptions.distanceInterval,
        ...options
      };

      // Start foreground location updates
      this.locationSubscription = await Location.watchPositionAsync(
        trackingOptions,
        (location) => {
          // Let optimizer detect movement for adaptive tracking
          this.locationOptimizer.detectMovement(location);

          // CRITICAL FIX: Use consistent data processing path
          // Both foreground and background should use handleLocationUpdate
          this.handleLocationUpdate([location]);
        }
      );

      // Configure background tracking if permission is available
      if (permissions.background) {
        await this.configureBackgroundTracking(journeyId);
      } else {
        // Requirement 1.5: Prompt user about background permission impact
        if (this.permissionPromptCallback) {
          this.permissionPromptCallback({
            type: 'background_tracking_limited',
            title: 'Limited Background Tracking',
            message: 'Journey tracking will pause when the app is minimized. For continuous tracking, please enable background location access in your device settings.',
            permissions: permissions
          });
        }
      }

      this.isTracking = true;
      this.currentJourneyId = journeyId;

      // TWO-STREAM PROCESSING: Reset data streams for new journey
      this.rawLocationHistory = [];
      this.currentJourneyData = [];
      this.currentDisplayData = [];

      // Requirement 5.4: Start periodic saving to prevent data loss
      this.backupManager.startPeriodicSave(journeyId);

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

      // TWO-STREAM PROCESSING: Return processed data streams
      const processingStats = getProcessingStats(
        this.rawLocationHistory,
        this.currentJourneyData || [],
        this.currentDisplayData || []
      );

      console.log('BackgroundLocationService two-stream processing complete:', processingStats);

      // Prepare journey data with both streams
      const journeyData = {
        id: this.currentJourneyId,
        endTime: Date.now(),

        // TWO-STREAM DATA: Provide both processed streams
        coordinates: this.currentJourneyData || [], // Journey data for statistics
        displayCoordinates: this.currentDisplayData || [], // Display data for visualization
        rawCoordinates: this.rawLocationHistory || [], // Raw data for debugging

        // Processing statistics for debugging
        processingStats,

        isActive: false
      };

      // Requirement 5.4: Stop periodic saving
      this.backupManager.stopPeriodicSave();

      // Reset tracking state
      this.isTracking = false;
      const journeyIdToClean = this.currentJourneyId;
      this.currentJourneyId = null;

      // Reset modular components
      this.locationFilter.reset();
      this.locationOptimizer.reset();

      // TWO-STREAM PROCESSING: Reset data streams
      this.rawLocationHistory = [];
      this.currentJourneyData = null;
      this.currentDisplayData = null;

      // Clean up backup data
      await this.backupManager.clearJourneyBackup(journeyIdToClean);

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
          // CRITICAL FIX: Use consistent data processing path
          this.handleLocationUpdate([location]);
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
   * Set battery optimization level (Requirement 6.2)
   * @param {string} level - 'HIGH_ACCURACY', 'BALANCED', or 'BATTERY_SAVER'
   */
  setBatteryOptimizationLevel(level) {
    this.locationOptimizer.setBatteryOptimizationLevel(level);
  }

  /**
   * Update battery level for optimization decisions (Requirement 6.2)
   * @param {number} batteryLevel - Battery level from 0.0 to 1.0
   */
  updateBatteryLevel(batteryLevel) {
    this.locationOptimizer.updateBatteryLevel(batteryLevel);
  }

  /**
   * Enable or disable adaptive tracking based on movement and battery
   * @param {boolean} enabled - Whether to enable adaptive tracking
   */
  setAdaptiveTrackingEnabled(enabled) {
    this.locationOptimizer.setAdaptiveTrackingEnabled(enabled);
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
      locationHistoryCount: this.locationFilter.getLocationHistory().length,
      isWarmingUp: this.isWarmingUp,
      warmupStatus: this.getWarmupStatus(),
      backupStatus: this.backupManager.getBackupStatus(),
      optimizationStatus: this.locationOptimizer.getOptimizationStatus(),
      filterStatus: this.locationFilter.getFilterStatus(),
      hasPermissionPromptCallback: !!this.permissionPromptCallback
    };
  }

  setLocationUpdateCallback(callback) {
    this.locationUpdateCallback = callback;
  }

  handleLocationUpdate(locations) {
    try {
      // Validate locations array
      if (!Array.isArray(locations) || locations.length === 0) {
        console.warn('Invalid locations array received:', locations);
        return;
      }

      // Process each location
      locations.forEach(location => {
        try {
          // CRITICAL FIX: Add validation for location structure
          if (!location || !location.coords) {
            console.error('BackgroundLocationService: Invalid location structure', location);
            return;
          }

          // Let optimizer detect movement for adaptive tracking
          this.locationOptimizer.detectMovement(location);

          // TWO-STREAM PROCESSING: Add to raw location history
          const rawLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp || Date.now(),
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed
          };

          this.rawLocationHistory.push(rawLocation);

          // Process both streams when we have new data
          const processed = processBothStreams(this.rawLocationHistory);

          // Update current journey and display data
          this.currentJourneyData = processed.journeyData;
          this.currentDisplayData = processed.displayData;

          // Process location through filter for real-time callback
          const processedLocation = this.locationFilter.processLocationReading(location);
          if (processedLocation && this.locationUpdateCallback) {
            this.locationUpdateCallback(processedLocation);
          }
        } catch (error) {
          console.error('Error processing location:', error.message);
          // Continue processing other locations
        }
      });

      // Trigger periodic save with properly formatted data for backup manager
      if (this.currentJourneyData && this.currentJourneyData.length > 0) {
        // DEBUG: Check what's in the journey data
        console.log('Journey data for backup:', {
          length: this.currentJourneyData.length,
          firstPoint: this.currentJourneyData[0],
          hasLatitude: this.currentJourneyData[0]?.latitude !== undefined,
          hasLongitude: this.currentJourneyData[0]?.longitude !== undefined
        });
        
        // Convert journey data back to the format expected by backup manager
        const backupData = this.currentJourneyData.map((point, index) => {
          if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
            console.warn(`Invalid journey data point at index ${index}:`, point);
            return null;
          }
          
          return {
            coords: {
              latitude: point.latitude,
              longitude: point.longitude,
              accuracy: point.accuracy,
              altitude: point.altitude,
              heading: point.heading,
              speed: point.speed
            },
            timestamp: point.timestamp
          };
        }).filter(point => point !== null);
        
        console.log('Backup data formatted:', {
          originalLength: this.currentJourneyData.length,
          backupLength: backupData.length,
          firstBackupPoint: backupData[0]
        });
        
        this.backupManager.performPeriodicSave(backupData);
      }
    } catch (error) {
      console.error('Error in handleLocationUpdate:', error);
      if (this.locationUpdateCallback) {
        this.locationUpdateCallback({
          type: 'error',
          message: 'Failed to process location update',
          error: error.message
        });
      }
    }
  }

  /**
   * Get current processed data streams for real-time updates
   * @returns {Object} Current journey and display data
   */
  getCurrentProcessedData() {
    return {
      journeyData: this.currentJourneyData || [],
      displayData: this.currentDisplayData || [],
      rawData: this.rawLocationHistory || [],
      processingStats: this.rawLocationHistory.length > 0 ?
        getProcessingStats(this.rawLocationHistory, this.currentJourneyData || [], this.currentDisplayData || []) :
        null
    };
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
      // Check permissions first
      const permissions = await this.checkPermissions();
      if (!permissions.foreground || !permissions.background) {
        console.error('Background location permissions not granted');
        return false;
      }

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
   * Recover journey data from backup after app crash (Requirement 5.4)
   * @param {string} journeyId - Journey ID to recover
   * @returns {Promise<Object|null>} - Recovered journey data or null
   */
  async recoverJourneyFromBackup(journeyId) {
    return await this.backupManager.recoverJourneyFromBackup(journeyId);
  }

  /**
   * Get all available journey backups
   * @returns {Promise<Array>} - Array of backup journey IDs
   */
  async getAvailableBackups() {
    return await this.backupManager.getAvailableBackups();
  }

  /**
   * Set callback for permission prompts (Requirement 1.5)
   * @param {Function} callback - Callback function for permission prompts
   */
  setPermissionPromptCallback(callback) {
    this.permissionPromptCallback = callback;
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

      // Remove event listeners (modern subscription pattern)
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      // Clear location subscription
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop background tracking
      await this.stopBackgroundTracking();

      // Clean up modular components
      this.backupManager.cleanup();
      this.locationFilter.reset();
      this.locationOptimizer.reset();

      // Clear state
      this.locationUpdateCallback = null;
      this.permissionPromptCallback = null;
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