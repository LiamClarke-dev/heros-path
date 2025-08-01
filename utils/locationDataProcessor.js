/**
 * Location Data Processor - Two-Stream Processing Architecture
 * 
 * Implements the two-stream data processing approach for journey tracking:
 * 1. Journey Stream: Minimal filtering for accurate statistics
 * 2. Display Stream: Heavy processing for beautiful visualization
 * 
 * This separation ensures accurate distance calculations while providing
 * smooth, street-aligned routes for map coverage visualization.
 */

import { calculateDistance } from './distanceUtils';

// Journey Data Processing (Minimal Filtering)
const JOURNEY_ACCURACY_THRESHOLD = 100; // meters - only remove clearly bad GPS
const JOURNEY_MAX_SPEED = 50; // m/s - only remove impossible speeds

// Display Data Processing (Heavy Processing)
const DISPLAY_SMOOTHING_WINDOW = 3; // points to use for smoothing
const DISPLAY_SIMPLIFICATION_TOLERANCE = 2; // meters - Douglas-Peucker tolerance
const DISPLAY_MIN_SEGMENT_LENGTH = 5; // meters - minimum segment for display

/**
 * Process raw GPS coordinates into journey data (minimal filtering)
 * Used for: Distance calculations, statistics, data storage
 * 
 * @param {Array} rawCoordinates - Raw GPS coordinates
 * @returns {Array} - Minimally filtered coordinates for accurate statistics
 */
export const processJourneyData = (rawCoordinates) => {
  if (!rawCoordinates || rawCoordinates.length === 0) {
    return [];
  }

  const journeyData = [];
  let previousPoint = null;

  for (const point of rawCoordinates) {
    // Skip invalid coordinates
    if (!isValidCoordinate(point)) {
      continue;
    }

    // Skip points with very poor accuracy (clearly bad GPS)
    if (point.accuracy && point.accuracy > JOURNEY_ACCURACY_THRESHOLD) {
      continue;
    }

    // Skip points with impossible speeds (only if we have previous point)
    if (previousPoint && hasImpossibleSpeed(previousPoint, point)) {
      continue;
    }

    // Add to journey data with metadata
    journeyData.push({
      ...point,
      dataType: 'journey',
      processedFrom: 'gps'
    });

    previousPoint = point;
  }

  return journeyData;
};

/**
 * Process journey data into display data (heavy processing)
 * Used for: Map visualization, route rendering, coverage display
 * 
 * @param {Array} journeyCoordinates - Minimally filtered journey coordinates
 * @returns {Array} - Heavily processed coordinates for beautiful visualization
 */
export const processDisplayData = (journeyCoordinates) => {
  if (!journeyCoordinates || journeyCoordinates.length < 2) {
    return journeyCoordinates.map(point => ({
      ...point,
      dataType: 'display',
      processedFrom: 'journey'
    }));
  }

  let displayData = [...journeyCoordinates];

  // Step 1: Apply smoothing to reduce GPS noise
  displayData = applySmoothingFilter(displayData);

  // Step 2: Simplify route to remove redundant points
  displayData = applyRouteSimplification(displayData);

  // Step 3: Remove very short segments for cleaner display
  displayData = removeShortSegments(displayData);

  // Mark as display data
  return displayData.map(point => ({
    ...point,
    dataType: 'display',
    processedFrom: 'smoothed'
  }));
};

/**
 * Process raw coordinates through both streams
 * 
 * @param {Array} rawCoordinates - Raw GPS coordinates
 * @returns {Object} - Object with both journey and display data
 */
export const processBothStreams = (rawCoordinates) => {
  const journeyData = processJourneyData(rawCoordinates);
  const displayData = processDisplayData(journeyData);

  return {
    journeyData,
    displayData,
    stats: {
      rawPoints: rawCoordinates.length,
      journeyPoints: journeyData.length,
      displayPoints: displayData.length,
      journeyFilterRatio: journeyData.length / rawCoordinates.length,
      displayProcessRatio: displayData.length / journeyData.length
    }
  };
};

/**
 * Validate coordinate data
 */
const isValidCoordinate = (point) => {
  return point &&
         typeof point.latitude === 'number' &&
         typeof point.longitude === 'number' &&
         point.latitude >= -90 && point.latitude <= 90 &&
         point.longitude >= -180 && point.longitude <= 180 &&
         point.timestamp && point.timestamp > 0;
};

/**
 * Check if speed between two points is impossible
 */
const hasImpossibleSpeed = (prev, curr) => {
  if (!prev.timestamp || !curr.timestamp) {
    return false;
  }

  const distance = calculateDistance(prev, curr);
  const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds

  if (timeDiff <= 0) {
    return true; // Invalid time sequence
  }

  const speed = distance / timeDiff; // m/s
  return speed > JOURNEY_MAX_SPEED;
};

/**
 * Apply smoothing filter to reduce GPS noise
 */
const applySmoothingFilter = (coordinates) => {
  if (coordinates.length <= DISPLAY_SMOOTHING_WINDOW) {
    return coordinates;
  }

  const smoothed = [];
  const halfWindow = Math.floor(DISPLAY_SMOOTHING_WINDOW / 2);

  for (let i = 0; i < coordinates.length; i++) {
    if (i < halfWindow || i >= coordinates.length - halfWindow) {
      // Keep edge points as-is
      smoothed.push(coordinates[i]);
    } else {
      // Apply smoothing to middle points
      const windowStart = i - halfWindow;
      const windowEnd = i + halfWindow + 1;
      const windowPoints = coordinates.slice(windowStart, windowEnd);

      const smoothedPoint = {
        ...coordinates[i],
        latitude: windowPoints.reduce((sum, p) => sum + p.latitude, 0) / windowPoints.length,
        longitude: windowPoints.reduce((sum, p) => sum + p.longitude, 0) / windowPoints.length,
        processedFrom: 'smoothed'
      };

      smoothed.push(smoothedPoint);
    }
  }

  return smoothed;
};

/**
 * Apply Douglas-Peucker algorithm for route simplification
 */
const applyRouteSimplification = (coordinates) => {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  return douglasPeucker(coordinates, DISPLAY_SIMPLIFICATION_TOLERANCE);
};

/**
 * Douglas-Peucker line simplification algorithm
 */
const douglasPeucker = (points, tolerance) => {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with maximum distance from the line between first and last points
  let maxDistance = 0;
  let maxIndex = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = douglasPeucker(points.slice(maxIndex), tolerance);

    // Combine segments (remove duplicate point at junction)
    return leftSegment.slice(0, -1).concat(rightSegment);
  } else {
    // All points are within tolerance, return just the endpoints
    return [firstPoint, lastPoint];
  }
};

/**
 * Calculate perpendicular distance from point to line
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const A = lineEnd.latitude - lineStart.latitude;
  const B = lineStart.longitude - lineEnd.longitude;
  const C = lineEnd.longitude * lineStart.latitude - lineStart.longitude * lineEnd.latitude;

  const distance = Math.abs(A * point.longitude + B * point.latitude + C) / Math.sqrt(A * A + B * B);
  
  // Convert to meters (approximate)
  return distance * 111000; // degrees to meters approximation
};

/**
 * Remove very short segments for cleaner display
 */
const removeShortSegments = (coordinates) => {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  const filtered = [coordinates[0]]; // Always keep first point
  let lastKeptPoint = coordinates[0];

  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = calculateDistance(lastKeptPoint, coordinates[i]);
    
    if (distance >= DISPLAY_MIN_SEGMENT_LENGTH) {
      filtered.push(coordinates[i]);
      lastKeptPoint = coordinates[i];
    }
  }

  // Always keep last point
  if (coordinates.length > 1) {
    filtered.push(coordinates[coordinates.length - 1]);
  }

  return filtered;
};

/**
 * Get processing statistics for debugging
 */
export const getProcessingStats = (rawCoordinates, journeyData, displayData) => {
  const rawDistance = calculateJourneyDistance(rawCoordinates);
  const journeyDistance = calculateJourneyDistance(journeyData);
  const displayDistance = calculateJourneyDistance(displayData);

  return {
    pointCounts: {
      raw: rawCoordinates.length,
      journey: journeyData.length,
      display: displayData.length
    },
    distances: {
      raw: Math.round(rawDistance),
      journey: Math.round(journeyDistance),
      display: Math.round(displayDistance)
    },
    filteringRatios: {
      journeyFilter: journeyData.length / rawCoordinates.length,
      displayProcess: displayData.length / journeyData.length,
      overallReduction: displayData.length / rawCoordinates.length
    },
    recommendation: getProcessingRecommendation(rawCoordinates, journeyData, displayData)
  };
};

/**
 * Calculate journey distance (imported from distanceUtils)
 */
const calculateJourneyDistance = (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += calculateDistance(coordinates[i - 1], coordinates[i]);
  }
  return totalDistance;
};

/**
 * Get processing recommendation based on data quality
 */
const getProcessingRecommendation = (raw, journey, display) => {
  const journeyRatio = journey.length / raw.length;
  const displayRatio = display.length / journey.length;

  if (journeyRatio < 0.5) {
    return 'High GPS noise detected - consider adjusting journey filtering';
  } else if (displayRatio < 0.3) {
    return 'Heavy display processing applied - routes will be very smooth';
  } else if (displayRatio > 0.9) {
    return 'Minimal display processing - routes may appear noisy';
  } else {
    return 'Processing levels are optimal for accuracy and visualization';
  }
};