/**
 * Sprite Utilities
 * 
 * Utility functions for sprite animation and direction calculation.
 * Handles movement analysis, direction determination, and GPS state management.
 * 
 * Requirements addressed:
 * - 1.2: Character sprite that shows movement direction
 * - 1.3: Sprite animation based on movement direction
 * - 1.4: Visual indicators for GPS signal strength
 * - 5.4: Sprite state for GPS signal loss
 */

import {
  SPRITE_STATES,
  DIRECTION_CONSTANTS,
  SPRITE_CONFIG,
  GPS_STATE_INDICATORS,
} from '../constants/SpriteConstants';

/**
 * Calculate the bearing (angle) between two coordinates
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (coord1, coord2) => {
  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  let bearing = toDegrees(Math.atan2(x, y));
  
  // Normalize to 0-360 degrees
  return (bearing + 360) % 360;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (coord1, coord2) => {
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
 * Determine sprite direction based on movement between two points
 * @param {Array} points - Array of two coordinate objects [{latitude, longitude, timestamp}, ...]
 * @returns {string} Sprite state from SPRITE_STATES
 */
export const getDirection = (points) => {
  if (!points || points.length < 2) {
    return SPRITE_STATES.IDLE;
  }

  const [prevPoint, currentPoint] = points;
  
  // Validate coordinates
  if (!isValidCoordinate(prevPoint) || !isValidCoordinate(currentPoint)) {
    return SPRITE_STATES.IDLE;
  }

  // Calculate distance to determine if there's significant movement
  const distance = calculateDistance(prevPoint, currentPoint);
  
  if (distance < SPRITE_CONFIG.MIN_MOVEMENT_DISTANCE) {
    return SPRITE_STATES.IDLE;
  }

  // Calculate time difference to determine speed
  const timeDiff = (currentPoint.timestamp - prevPoint.timestamp) / 1000; // seconds
  const speed = distance / timeDiff; // m/s

  // If movement is too slow, consider it idle
  if (speed < DIRECTION_CONSTANTS.MIN_MOVEMENT_SPEED) {
    return SPRITE_STATES.IDLE;
  }

  // Calculate bearing (direction of movement)
  const bearing = calculateBearing(prevPoint, currentPoint);
  
  // Convert bearing to sprite direction
  return bearingToSpriteDirection(bearing);
};

/**
 * Convert bearing angle to sprite direction
 * @param {number} bearing - Bearing in degrees (0-360)
 * @returns {string} Sprite state from SPRITE_STATES
 */
export const bearingToSpriteDirection = (bearing) => {
  const { ANGLE_RANGES } = DIRECTION_CONSTANTS;
  
  // Normalize bearing to 0-360
  const normalizedBearing = (bearing + 360) % 360;
  
  // Check each direction range
  if (isInRange(normalizedBearing, ANGLE_RANGES.NORTH)) {
    return SPRITE_STATES.WALK_UP;
  } else if (isInRange(normalizedBearing, ANGLE_RANGES.EAST)) {
    return SPRITE_STATES.WALK_RIGHT;
  } else if (isInRange(normalizedBearing, ANGLE_RANGES.SOUTH)) {
    return SPRITE_STATES.WALK_DOWN;
  } else if (isInRange(normalizedBearing, ANGLE_RANGES.WEST)) {
    return SPRITE_STATES.WALK_LEFT;
  }
  
  // Default to idle if no clear direction
  return SPRITE_STATES.IDLE;
};

/**
 * Check if an angle is within a range (handles wraparound at 0/360)
 * @param {number} angle - Angle to check
 * @param {Object} range - Range object with min and max properties
 * @returns {boolean} True if angle is in range
 */
const isInRange = (angle, range) => {
  if (range.min <= range.max) {
    // Normal range (e.g., 45-135)
    return angle >= range.min && angle <= range.max;
  } else {
    // Wraparound range (e.g., 315-45)
    return angle >= range.min || angle <= range.max;
  }
};

/**
 * Determine GPS state based on accuracy with detailed signal levels
 * @param {number|null} accuracy - GPS accuracy in meters (null if unavailable)
 * @returns {Object} GPS state object with level, indicator, and description
 */
export const getGPSState = (accuracy) => {
  // Import GPS_SIGNAL_LEVELS here to avoid circular dependency
  const { GPS_SIGNAL_LEVELS } = require('../constants/SpriteConstants');
  
  if (accuracy === null || accuracy === undefined) {
    return {
      level: 'LOST',
      indicator: 'LOST',
      description: 'GPS signal lost',
      accuracy: null,
    };
  }
  
  // Find the appropriate signal level
  for (const [level, config] of Object.entries(GPS_SIGNAL_LEVELS)) {
    if (accuracy <= config.threshold) {
      return {
        level,
        indicator: config.indicator,
        description: config.description,
        accuracy,
      };
    }
  }
  
  // Fallback (should not reach here)
  return {
    level: 'LOST',
    indicator: 'LOST',
    description: 'GPS signal lost',
    accuracy,
  };
};

/**
 * Get GPS signal strength as a percentage (0-100)
 * @param {number|null} accuracy - GPS accuracy in meters
 * @returns {number} Signal strength percentage
 */
export const getGPSSignalStrength = (accuracy) => {
  if (accuracy === null || accuracy === undefined) {
    return 0;
  }
  
  // Convert accuracy to signal strength (lower accuracy = higher strength)
  // Excellent (5m) = 100%, Good (10m) = 80%, Fair (20m) = 60%, Poor (50m) = 40%, Very Poor (100m) = 20%
  if (accuracy <= 5) return 100;
  if (accuracy <= 10) return 80;
  if (accuracy <= 20) return 60;
  if (accuracy <= 50) return 40;
  if (accuracy <= 100) return 20;
  return 0;
};

/**
 * Get sprite state based on movement and GPS accuracy
 * @param {Array} recentPoints - Array of recent coordinate points
 * @param {number|null} gpsAccuracy - Current GPS accuracy in meters
 * @returns {Object} Sprite state object with state, gpsState, and indicators
 */
export const getSpriteState = (recentPoints, gpsAccuracy) => {
  const gpsStateData = getGPSState(gpsAccuracy);
  const signalStrength = getGPSSignalStrength(gpsAccuracy);
  
  // If GPS is lost, show GPS lost state regardless of movement
  if (gpsStateData.indicator === 'LOST') {
    return {
      state: SPRITE_STATES.GPS_LOST,
      gpsState: gpsStateData,
      indicators: GPS_STATE_INDICATORS.LOST,
      signalStrength,
    };
  }
  
  // Determine movement direction
  const movementState = getDirection(recentPoints);
  
  return {
    state: movementState,
    gpsState: gpsStateData,
    indicators: GPS_STATE_INDICATORS[gpsStateData.indicator],
    signalStrength,
  };
};

/**
 * Smooth direction changes to prevent rapid sprite state switching
 * @param {string} newDirection - New sprite direction
 * @param {string} currentDirection - Current sprite direction
 * @param {number} lastUpdateTime - Timestamp of last direction update
 * @returns {Object} Object with shouldUpdate boolean and direction
 */
export const smoothDirectionChange = (newDirection, currentDirection, lastUpdateTime) => {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  
  // Always allow updates to/from idle state
  if (currentDirection === SPRITE_STATES.IDLE || newDirection === SPRITE_STATES.IDLE) {
    return {
      shouldUpdate: true,
      direction: newDirection,
      timestamp: now,
    };
  }
  
  // Throttle rapid direction changes
  if (timeSinceLastUpdate < SPRITE_CONFIG.DIRECTION_UPDATE_THROTTLE) {
    return {
      shouldUpdate: false,
      direction: currentDirection,
      timestamp: lastUpdateTime,
    };
  }
  
  // Allow direction change if enough time has passed
  return {
    shouldUpdate: true,
    direction: newDirection,
    timestamp: now,
  };
};

/**
 * Validate coordinate object
 * @param {Object} coord - Coordinate object to validate
 * @returns {boolean} True if coordinate is valid
 */
const isValidCoordinate = (coord) => {
  return coord &&
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number' &&
    !isNaN(coord.latitude) &&
    !isNaN(coord.longitude) &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Create a throttled version of a function
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};