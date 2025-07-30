/**
 * LocationOptimizer handles battery optimization and movement detection
 * for location tracking services.
 */

// Battery optimization constants
const BATTERY_OPTIMIZATION_LEVELS = {
  HIGH_ACCURACY: {
    timeInterval: 2000, // 2 seconds
    distanceInterval: 5, // 5 meters
    accuracy: 'BestForNavigation',
    backgroundTimeInterval: 5000, // 5 seconds in background
    backgroundDistanceInterval: 10 // 10 meters in background
  },
  BALANCED: {
    timeInterval: 5000, // 5 seconds
    distanceInterval: 10, // 10 meters
    accuracy: 'High',
    backgroundTimeInterval: 10000, // 10 seconds in background
    backgroundDistanceInterval: 20 // 20 meters in background
  },
  BATTERY_SAVER: {
    timeInterval: 10000, // 10 seconds
    distanceInterval: 20, // 20 meters
    accuracy: 'Balanced',
    backgroundTimeInterval: 30000, // 30 seconds in background
    backgroundDistanceInterval: 50 // 50 meters in background
  }
};

// Movement detection constants
const STATIONARY_THRESHOLD = 3; // meters - consider user stationary if within this distance
const STATIONARY_TIME_THRESHOLD = 60000; // 1 minute - time to consider user stationary
const MOVEMENT_DETECTION_WINDOW = 5; // number of recent locations to analyze for movement

class LocationOptimizer {
  constructor() {
    this.batteryOptimizationLevel = 'BALANCED';
    this.isStationary = false;
    this.stationaryStartTime = null;
    this.lastMovementTime = Date.now();
    this.movementHistory = [];
    this.adaptiveTrackingEnabled = true;
    this.batteryLevel = 1.0; // Default to full battery
    this.lowBatteryThreshold = 0.2; // 20% battery
    this.onOptimizationChange = null;
  }

  /**
   * Set callback for optimization changes
   * @param {Function} callback - Callback function
   */
  setOptimizationChangeCallback(callback) {
    this.onOptimizationChange = callback;
  }

  /**
   * Set battery optimization level (Requirement 6.2)
   * @param {string} level - 'HIGH_ACCURACY', 'BALANCED', or 'BATTERY_SAVER'
   */
  setBatteryOptimizationLevel(level) {
    if (!BATTERY_OPTIMIZATION_LEVELS[level]) {
      console.warn(`Invalid battery optimization level: ${level}`);
      return;
    }

    this.batteryOptimizationLevel = level;
    console.log(`Battery optimization level set to: ${level}`);

    if (this.onOptimizationChange) {
      this.onOptimizationChange({
        type: 'level_changed',
        level: level,
        options: this.getCurrentTrackingOptions()
      });
    }
  }

  /**
   * Get current battery optimization level
   * @returns {string} - Current optimization level
   */
  getBatteryOptimizationLevel() {
    return this.batteryOptimizationLevel;
  }

  /**
   * Update battery level for optimization decisions (Requirement 6.2)
   * @param {number} batteryLevel - Battery level from 0.0 to 1.0
   */
  updateBatteryLevel(batteryLevel) {
    const previousLevel = this.batteryLevel;
    this.batteryLevel = Math.max(0, Math.min(1, batteryLevel));

    // Check if we've crossed the low battery threshold
    if (previousLevel > this.lowBatteryThreshold && this.batteryLevel <= this.lowBatteryThreshold) {
      console.log(`Low battery detected (${Math.round(this.batteryLevel * 100)}%) - switching to battery saver mode`);
      this.adaptTrackingForBattery();
    }
  }

  /**
   * Adapt tracking parameters based on battery level (Requirement 6.2)
   */
  adaptTrackingForBattery() {
    if (!this.adaptiveTrackingEnabled) {
      return;
    }

    let targetLevel = this.batteryOptimizationLevel;

    // Force battery saver mode if battery is low
    if (this.batteryLevel <= this.lowBatteryThreshold) {
      targetLevel = 'BATTERY_SAVER';
      console.log('Forcing battery saver mode due to low battery');
    }

    // Update tracking options
    this.setBatteryOptimizationLevel(targetLevel);

    if (this.onOptimizationChange) {
      this.onOptimizationChange({
        type: 'battery_optimization',
        message: `Tracking optimized for battery level: ${Math.round(this.batteryLevel * 100)}%`,
        batteryLevel: this.batteryLevel,
        optimizationLevel: targetLevel,
        options: this.getCurrentTrackingOptions()
      });
    }
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
   * Detect if user is stationary to reduce location updates (Requirement 6.1)
   * @param {Object} location - Current location reading
   */
  detectMovement(location) {
    if (!location || !location.coords) {
      return;
    }

    // Add to movement history
    this.movementHistory.push({
      coords: location.coords,
      timestamp: location.timestamp
    });

    // Keep only recent locations for movement analysis
    if (this.movementHistory.length > MOVEMENT_DETECTION_WINDOW) {
      this.movementHistory = this.movementHistory.slice(-MOVEMENT_DETECTION_WINDOW);
    }

    // Need at least 2 points to detect movement
    if (this.movementHistory.length < 2) {
      return;
    }

    // Calculate movement in the recent window
    const recentLocations = this.movementHistory.slice(-3); // Last 3 locations
    let totalMovement = 0;
    
    for (let i = 1; i < recentLocations.length; i++) {
      const distance = this.calculateDistance(
        recentLocations[i - 1].coords,
        recentLocations[i].coords
      );
      totalMovement += distance;
    }

    const averageMovement = totalMovement / (recentLocations.length - 1);
    const currentTime = Date.now();

    // Check if user is stationary
    if (averageMovement < STATIONARY_THRESHOLD) {
      if (!this.isStationary) {
        this.isStationary = true;
        this.stationaryStartTime = currentTime;
        console.log('User appears to be stationary - reducing location update frequency');
        this.notifyMovementChange();
      }
    } else {
      if (this.isStationary) {
        this.isStationary = false;
        this.stationaryStartTime = null;
        this.lastMovementTime = currentTime;
        console.log('User movement detected - resuming normal location update frequency');
        this.notifyMovementChange();
      } else {
        this.lastMovementTime = currentTime;
      }
    }

    // Check for extended stationary period
    if (this.isStationary && this.stationaryStartTime) {
      const stationaryDuration = currentTime - this.stationaryStartTime;
      if (stationaryDuration > STATIONARY_TIME_THRESHOLD) {
        // User has been stationary for a while - further reduce updates
        this.notifyExtendedStationary();
      }
    }
  }

  /**
   * Notify about movement state changes
   */
  notifyMovementChange() {
    if (this.onOptimizationChange) {
      this.onOptimizationChange({
        type: 'movement_change',
        isStationary: this.isStationary,
        options: this.getCurrentTrackingOptions()
      });
    }
  }

  /**
   * Notify about extended stationary periods
   */
  notifyExtendedStationary() {
    if (this.onOptimizationChange) {
      this.onOptimizationChange({
        type: 'extended_stationary',
        stationaryDuration: Date.now() - this.stationaryStartTime,
        options: this.getCurrentTrackingOptionsForExtendedStationary()
      });
    }
  }

  /**
   * Get current tracking options based on optimization settings
   * @returns {Object} - Tracking options
   */
  getCurrentTrackingOptions() {
    const baseOptions = BATTERY_OPTIMIZATION_LEVELS[this.batteryOptimizationLevel];
    let adjustedOptions = { ...baseOptions };

    if (this.isStationary) {
      // Reduce frequency when stationary
      adjustedOptions.timeInterval = Math.max(baseOptions.timeInterval * 2, 10000); // At least 10 seconds
      adjustedOptions.distanceInterval = Math.max(baseOptions.distanceInterval * 2, 20); // At least 20 meters
    }

    return adjustedOptions;
  }

  /**
   * Get tracking options for extended stationary periods
   * @returns {Object} - Extended stationary tracking options
   */
  getCurrentTrackingOptionsForExtendedStationary() {
    const baseOptions = BATTERY_OPTIMIZATION_LEVELS[this.batteryOptimizationLevel];
    
    // Further reduce frequency for extended stationary periods
    return {
      ...baseOptions,
      timeInterval: Math.max(baseOptions.timeInterval * 4, 30000), // At least 30 seconds
      distanceInterval: Math.max(baseOptions.distanceInterval * 3, 50), // At least 50 meters
      accuracy: 'Balanced' // Use less accurate but more battery-friendly mode
    };
  }

  /**
   * Enable or disable adaptive tracking based on movement and battery
   * @param {boolean} enabled - Whether to enable adaptive tracking
   */
  setAdaptiveTrackingEnabled(enabled) {
    this.adaptiveTrackingEnabled = enabled;
    console.log(`Adaptive tracking ${enabled ? 'enabled' : 'disabled'}`);
    
    if (this.onOptimizationChange) {
      this.onOptimizationChange({
        type: 'adaptive_tracking_changed',
        enabled: enabled,
        options: this.getCurrentTrackingOptions()
      });
    }
  }

  /**
   * Get current movement and battery optimization status
   * @returns {Object} - Status information
   */
  getOptimizationStatus() {
    return {
      batteryOptimizationLevel: this.batteryOptimizationLevel,
      batteryLevel: this.batteryLevel,
      isStationary: this.isStationary,
      stationaryDuration: this.stationaryStartTime ? Date.now() - this.stationaryStartTime : 0,
      lastMovementTime: this.lastMovementTime,
      adaptiveTrackingEnabled: this.adaptiveTrackingEnabled,
      currentTrackingOptions: this.getCurrentTrackingOptions(),
      movementHistoryCount: this.movementHistory.length
    };
  }

  /**
   * Reset movement detection state
   */
  reset() {
    this.isStationary = false;
    this.stationaryStartTime = null;
    this.lastMovementTime = Date.now();
    this.movementHistory = [];
  }
}

export default LocationOptimizer;