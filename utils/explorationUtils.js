/**
 * Exploration Utilities
 * 
 * Utility functions for segment operations and exploration data management.
 * These functions support the ExplorationContext and provide common operations
 * for working with route segments and exploration data.
 * 
 * Requirements: 3.4, 5.2
 */

import { calculateDistance } from './distanceUtils';
import Logger from './Logger';

/**
 * Create route segments from a series of coordinates
 * @param {Array} coordinates - Array of LocationCoordinates
 * @param {Object} options - Segmentation options
 * @returns {Array} Array of RouteSegment objects
 */
export const createRouteSegments = (coordinates, options = {}) => {
  try {
    if (!coordinates || coordinates.length < 2) {
      return [];
    }

    const {
      minSegmentLength = 50, // meters
      maxSegmentLength = 500, // meters
      journeyId = null,
      metadata = {}
    } = options;

    const segments = [];
    let segmentStart = coordinates[0];
    let currentDistance = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const currentPoint = coordinates[i];
      const segmentDistance = calculateDistance(segmentStart, currentPoint);
      currentDistance += calculateDistance(coordinates[i - 1], currentPoint);

      // Create segment if we've reached minimum length and either:
      // 1. We've reached maximum length, or
      // 2. We're at the end of the route
      const shouldCreateSegment = 
        currentDistance >= minSegmentLength && 
        (currentDistance >= maxSegmentLength || i === coordinates.length - 1);

      if (shouldCreateSegment) {
        const segment = {
          start: segmentStart,
          end: currentPoint,
          timestamp: currentPoint.timestamp || Date.now(),
          distance: currentDistance,
          metadata: {
            ...metadata,
            journeyId,
            startIndex: coordinates.indexOf(segmentStart),
            endIndex: i,
            coordinateCount: i - coordinates.indexOf(segmentStart) + 1
          }
        };

        segments.push(segment);
        segmentStart = currentPoint;
        currentDistance = 0;
      }
    }

    Logger.info(`Created ${segments.length} route segments from ${coordinates.length} coordinates`);
    return segments;

  } catch (error) {
    Logger.error('Failed to create route segments:', error);
    return [];
  }
};

/**
 * Merge overlapping or adjacent segments
 * @param {Array} segments - Array of RouteSegment objects
 * @param {number} tolerance - Distance tolerance for merging (meters)
 * @returns {Array} Array of merged segments
 */
export const mergeSegments = (segments, tolerance = 10) => {
  try {
    if (!segments || segments.length <= 1) {
      return segments || [];
    }

    // Sort segments by timestamp
    const sortedSegments = [...segments].sort((a, b) => a.timestamp - b.timestamp);
    const merged = [sortedSegments[0]];

    for (let i = 1; i < sortedSegments.length; i++) {
      const currentSegment = sortedSegments[i];
      const lastMerged = merged[merged.length - 1];

      // Check if segments are adjacent or overlapping
      const distanceToStart = calculateDistance(lastMerged.end, currentSegment.start);
      const distanceToEnd = calculateDistance(lastMerged.start, currentSegment.end);

      if (distanceToStart <= tolerance) {
        // Merge segments by extending the end point
        lastMerged.end = currentSegment.end;
        lastMerged.distance = calculateDistance(lastMerged.start, lastMerged.end);
        
        // Merge metadata
        if (currentSegment.metadata) {
          lastMerged.metadata = {
            ...lastMerged.metadata,
            ...currentSegment.metadata,
            mergedSegments: (lastMerged.metadata?.mergedSegments || 1) + 1
          };
        }
      } else {
        // Add as separate segment
        merged.push(currentSegment);
      }
    }

    Logger.info(`Merged ${segments.length} segments into ${merged.length} segments`);
    return merged;

  } catch (error) {
    Logger.error('Failed to merge segments:', error);
    return segments;
  }
};

/**
 * Find segments that intersect with a given area
 * @param {Array} segments - Array of RouteSegment objects
 * @param {Object} area - Geographic area { center: {lat, lng}, radius: meters }
 * @returns {Array} Array of intersecting segments
 */
export const findSegmentsInArea = (segments, area) => {
  try {
    if (!segments || !area || !area.center) {
      return [];
    }

    const { center, radius = 100 } = area;
    
    return segments.filter(segment => {
      // Check if either start or end point is within the radius
      const startDistance = calculateDistance(center, segment.start);
      const endDistance = calculateDistance(center, segment.end);
      
      return startDistance <= radius || endDistance <= radius;
    });

  } catch (error) {
    Logger.error('Failed to find segments in area:', error);
    return [];
  }
};

/**
 * Calculate total distance covered by segments
 * @param {Array} segments - Array of RouteSegment objects
 * @returns {number} Total distance in meters
 */
export const calculateSegmentsTotalDistance = (segments) => {
  try {
    if (!segments || segments.length === 0) {
      return 0;
    }

    return segments.reduce((total, segment) => {
      const segmentDistance = segment.distance || calculateDistance(segment.start, segment.end);
      return total + segmentDistance;
    }, 0);

  } catch (error) {
    Logger.error('Failed to calculate segments total distance:', error);
    return 0;
  }
};

/**
 * Get segment statistics
 * @param {Array} segments - Array of RouteSegment objects
 * @returns {Object} Segment statistics
 */
export const getSegmentStatistics = (segments) => {
  try {
    if (!segments || segments.length === 0) {
      return {
        count: 0,
        totalDistance: 0,
        averageDistance: 0,
        minDistance: 0,
        maxDistance: 0,
        timeSpan: 0
      };
    }

    const distances = segments.map(segment => 
      segment.distance || calculateDistance(segment.start, segment.end)
    );
    
    const timestamps = segments.map(segment => segment.timestamp).filter(Boolean);
    
    const totalDistance = distances.reduce((sum, distance) => sum + distance, 0);
    const averageDistance = totalDistance / distances.length;
    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);
    
    const timeSpan = timestamps.length > 1 
      ? Math.max(...timestamps) - Math.min(...timestamps)
      : 0;

    return {
      count: segments.length,
      totalDistance: Math.round(totalDistance),
      averageDistance: Math.round(averageDistance),
      minDistance: Math.round(minDistance),
      maxDistance: Math.round(maxDistance),
      timeSpan
    };

  } catch (error) {
    Logger.error('Failed to calculate segment statistics:', error);
    return {
      count: 0,
      totalDistance: 0,
      averageDistance: 0,
      minDistance: 0,
      maxDistance: 0,
      timeSpan: 0
    };
  }
};

/**
 * Filter segments by time range
 * @param {Array} segments - Array of RouteSegment objects
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @returns {Array} Filtered segments
 */
export const filterSegmentsByTimeRange = (segments, startTime, endTime) => {
  try {
    if (!segments || !startTime || !endTime) {
      return segments || [];
    }

    return segments.filter(segment => {
      const segmentTime = segment.timestamp;
      return segmentTime >= startTime && segmentTime <= endTime;
    });

  } catch (error) {
    Logger.error('Failed to filter segments by time range:', error);
    return segments || [];
  }
};

/**
 * Group segments by journey ID
 * @param {Array} segments - Array of RouteSegment objects
 * @returns {Object} Segments grouped by journey ID
 */
export const groupSegmentsByJourney = (segments) => {
  try {
    if (!segments || segments.length === 0) {
      return {};
    }

    return segments.reduce((groups, segment) => {
      const journeyId = segment.metadata?.journeyId || 'unknown';
      
      if (!groups[journeyId]) {
        groups[journeyId] = [];
      }
      
      groups[journeyId].push(segment);
      return groups;
    }, {});

  } catch (error) {
    Logger.error('Failed to group segments by journey:', error);
    return {};
  }
};

/**
 * Validate segment data
 * @param {Object} segment - RouteSegment object to validate
 * @returns {boolean} Whether segment is valid
 */
export const validateSegment = (segment) => {
  try {
    if (!segment || typeof segment !== 'object') {
      return false;
    }

    // Check required fields
    if (!segment.start || !segment.end) {
      return false;
    }

    // Validate coordinates
    const isValidCoordinate = (coord) => {
      return coord &&
        typeof coord.latitude === 'number' &&
        typeof coord.longitude === 'number' &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180;
    };

    if (!isValidCoordinate(segment.start) || !isValidCoordinate(segment.end)) {
      return false;
    }

    // Check timestamp
    if (segment.timestamp && (typeof segment.timestamp !== 'number' || segment.timestamp <= 0)) {
      return false;
    }

    return true;

  } catch (error) {
    Logger.error('Failed to validate segment:', error);
    return false;
  }
};

/**
 * Create exploration history entry
 * @param {string} type - Type of history entry
 * @param {Object} data - Entry data
 * @returns {Object} History entry object
 */
export const createExplorationHistoryEntry = (type, data = {}) => {
  try {
    return {
      id: `history_${type}_${Date.now()}`,
      type,
      timestamp: Date.now(),
      data,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.error('Failed to create exploration history entry:', error);
    return null;
  }
};

/**
 * Clean up old exploration data
 * @param {Array} segments - Array of segments to clean
 * @param {Array} history - Array of history entries to clean
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {Object} Cleaned data { segments, history }
 */
export const cleanupOldExplorationData = (segments, history, maxAge = 30 * 24 * 60 * 60 * 1000) => {
  try {
    const cutoffTime = Date.now() - maxAge;

    const cleanedSegments = segments?.filter(segment => 
      segment.timestamp > cutoffTime
    ) || [];

    const cleanedHistory = history?.filter(entry => 
      entry.timestamp > cutoffTime
    ) || [];

    Logger.info(`Cleaned exploration data: ${segments?.length || 0} -> ${cleanedSegments.length} segments, ${history?.length || 0} -> ${cleanedHistory.length} history entries`);

    return {
      segments: cleanedSegments,
      history: cleanedHistory
    };

  } catch (error) {
    Logger.error('Failed to cleanup old exploration data:', error);
    return {
      segments: segments || [],
      history: history || []
    };
  }
};

export default {
  createRouteSegments,
  mergeSegments,
  findSegmentsInArea,
  calculateSegmentsTotalDistance,
  getSegmentStatistics,
  filterSegmentsByTimeRange,
  groupSegmentsByJourney,
  validateSegment,
  createExplorationHistoryEntry,
  cleanupOldExplorationData
};