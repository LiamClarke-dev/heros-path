/**
 * LocationFilter handles coordinate filtering, accuracy validation,
 * and location data processing for journey tracking.
 */

// Location filtering and smoothing constants
const ACCURACY_THRESHOLD = 50; // meters - reject readings with accuracy worse than this
const MIN_DISTANCE_THRESHOLD = 5; // meters - minimum distance between points
const MAX_SPEED_THRESHOLD = 50; // m/s - maximum reasonable walking/running speed
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