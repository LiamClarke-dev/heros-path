/**
 * Utility helper functions for the Hero's Path MVP
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate total distance of a route path
 * @param {Array} path - Array of coordinates
 * @returns {number} Total distance in meters
 */
export const calculateRouteDistance = path => {
  if (!path || path.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += calculateDistance(path[i - 1], path[i]);
  }
  return totalDistance;
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = meters => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = seconds => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

/**
 * Format timestamp for display
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted date string
 */
export const formatTimestamp = timestamp => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Generate a default journey name based on timestamp
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Default journey name
 */
export const generateJourneyName = timestamp => {
  const date = new Date(timestamp);
  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateString = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `Journey ${dateString} ${timeString}`;
};

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate coordinate object
 * @param {Object} coordinate - Coordinate to validate
 * @returns {boolean} True if valid coordinate
 */
export const isValidCoordinate = coordinate => {
  if (!coordinate || typeof coordinate !== 'object') {
    return false;
  }

  return (
    typeof coordinate.latitude === 'number' &&
    typeof coordinate.longitude === 'number' &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
};

/**
 * Simplify route path by removing redundant points
 * @param {Array} path - Array of coordinates
 * @param {number} tolerance - Tolerance in meters
 * @returns {Array} Simplified path
 */
export const simplifyPath = (path, tolerance = 10) => {
  if (!path || path.length <= 2) return path;

  const simplified = [path[0]];
  let lastPoint = path[0];

  for (let i = 1; i < path.length - 1; i++) {
    const distance = calculateDistance(lastPoint, path[i]);
    if (distance >= tolerance) {
      simplified.push(path[i]);
      lastPoint = path[i];
    }
  }

  // Always include the last point
  simplified.push(path[path.length - 1]);
  return simplified;
};

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};
