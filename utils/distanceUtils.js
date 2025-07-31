/**
 * Centralized Distance Calculation Utilities
 * 
 * This module provides the single source of truth for all distance calculations
 * in the Hero's Path application. All other modules should import from here
 * to ensure consistency across the entire codebase.
 */

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} - Radians
 */
export const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * This is the SINGLE SOURCE OF TRUTH for distance calculations
 * 
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (coord1, coord2) => {
  // Validate inputs
  if (!coord1 || !coord2) {
    return 0;
  }
  
  if (typeof coord1.latitude !== 'number' || typeof coord1.longitude !== 'number' ||
      typeof coord2.latitude !== 'number' || typeof coord2.longitude !== 'number') {
    return 0;
  }

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
 * Calculate total distance for an array of coordinates
 * This is the SINGLE SOURCE OF TRUTH for journey distance calculations
 * 
 * @param {Array} coordinates - Array of coordinate objects
 * @returns {number} Total distance in meters
 */
export const calculateJourneyDistance = (coordinates) => {
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
 * Format distance for display
 * @param {number} distanceInMeters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceInMeters) => {
  if (distanceInMeters >= 1000) {
    return `${(distanceInMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceInMeters)} m`;
};