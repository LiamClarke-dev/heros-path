/**
 * LocationFilter handles coordinate filtering, accuracy validation,
 * and location data processing for journey tracking.
 * 
 * NOTE: With TWO-STREAM PROCESSING, this filter is used by BackgroundLocationService
 * for basic filtering, while utils/locationDataProcessor.js handles the main
 * two-stream processing (journey vs display data). The thresholds should be kept
 * in sync between both systems.
 */

// Utilities
import { calculateDistance } from '../../utils/distanceUtils';

// Location filtering and smoothing constants
// CRITICAL FIX: Relaxed filtering to prevent distance calculation discrepancies
const ACCURACY_THRESHOLD = 100; // meters - increased from 50m to be less aggressive
const MIN_DISTANCE_THRESHOLD = 2; // meters - reduced from 5m to capture more movement
const MAX_SPEED_THRESHOLD = 50; // m/s - maximum reasonable walking/running speed (unchanged)
const SMOOTHING_WINDOW_SIZE = 3; // number of points to use for smoothing

class LocationFilter {
  constructor() {
    this.locationHistory = [];
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

  // Note: Distance calculations now use centralized utils/distanceUtils.js
  // This ensures consistency across the entire application

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

    // CRITICAL FIX: Comprehensive validation for coords property
    if (!lastLocation?.coords || !newLocation?.coords) {
      console.error('LocationFilter: Missing coords property', {
        lastLocationHasCoords: !!lastLocation?.coords,
        newLocationHasCoords: !!newLocation?.coords
      });
      return false;
    }

    // CRITICAL FIX: Comprehensive validation for latitude/longitude
    if (typeof lastLocation.coords.latitude !== 'number' || 
        typeof lastLocation.coords.longitude !== 'number' ||
        typeof newLocation.coords.latitude !== 'number' || 
        typeof newLocation.coords.longitude !== 'number') {
      console.error('LocationFilter: Invalid coordinate values', {
        lastCoords: lastLocation.coords,
        newCoords: newLocation.coords
      });
      return false;
    }

    let distance;
    try {
      distance = calculateDistance(lastLocation.coords, newLocation.coords);
    } catch (error) {
      console.error('LocationFilter: Error calculating distance', {
        error: error.message,
        lastCoords: lastLocation.coords,
        newCoords: newLocation.coords
      });
      return false;
    }

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
   * Process and filter a new location reading
   * @param {Object} location - Raw location from expo-location
   * @returns {Object|null} - Processed location or null if rejected
   */
  processLocationReading(location) {
    const totalBefore = this.locationHistory.length;
    
    // Check basic accuracy
    if (!this.isLocationAccurate(location)) {
      console.log(`LocationFilter: Rejected location due to accuracy (${location.coords?.accuracy}m > ${ACCURACY_THRESHOLD}m)`);
      return null;
    }

    // Check movement reasonableness
    const lastLocation = this.locationHistory[this.locationHistory.length - 1];
    if (!this.isReasonableMovement(location, lastLocation)) {
      return null; // Logging is already done in isReasonableMovement
    }

    // Add to history for smoothing
    this.locationHistory.push(location);
    
    // Keep only recent locations for smoothing
    if (this.locationHistory.length > SMOOTHING_WINDOW_SIZE * 2) {
      this.locationHistory = this.locationHistory.slice(-SMOOTHING_WINDOW_SIZE);
    }

    // Apply smoothing
    const smoothedLocation = this.smoothLocation(this.locationHistory);
    
    // Log filtering statistics periodically
    if (this.locationHistory.length % 10 === 0) {
      console.log(`LocationFilter: Accepted ${this.locationHistory.length} locations (${((this.locationHistory.length / (totalBefore + 1)) * 100).toFixed(1)}% acceptance rate)`);
    }
    
    return smoothedLocation;
  }

  /**
   * Get current filter status
   * @returns {Object} - Filter status information
   */
  getFilterStatus() {
    return {
      locationHistoryCount: this.locationHistory.length,
      accuracyThreshold: ACCURACY_THRESHOLD,
      minDistanceThreshold: MIN_DISTANCE_THRESHOLD,
      maxSpeedThreshold: MAX_SPEED_THRESHOLD,
      smoothingWindowSize: SMOOTHING_WINDOW_SIZE
    };
  }

  /**
   * Reset filter state
   */
  reset() {
    this.locationHistory = [];
  }

  /**
   * Get location history for external processing
   * @returns {Array} - Array of location objects
   */
  getLocationHistory() {
    return [...this.locationHistory];
  }
}

export default LocationFilter;