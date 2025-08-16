import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JOURNEY_STORAGE_KEYS } from '../constants/StorageKeys';
import Logger from '../utils/Logger';

const ExplorationContext = createContext();

/**
 * ExplorationContext provides exploration state management and segment tracking
 * for the journey tracking system. It manages explored route segments, current
 * journey state, and provides persistence for exploration data.
 * 
 * Requirements: 3.4, 5.2
 */

export function ExplorationProvider({ children }) {
  // Core state variables for exploration tracking
  const [segments, setSegments] = useState([]); // Array of RouteSegment objects
  const [currentJourney, setCurrentJourney] = useState(null); // Current active journey
  const [explorationHistory, setExplorationHistory] = useState([]); // Historical exploration data
  const [loading, setLoading] = useState(true); // Loading state for initialization
  const [error, setError] = useState(null); // Error state for user feedback

  // Refs for performance optimization
  const segmentCacheRef = useRef(new Map());
  const persistenceTimeoutRef = useRef(null);

  /**
   * Initialize exploration context by loading persisted data
   */
  const initializeExploration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('Initializing ExplorationContext');

      // Load persisted segments
      const persistedSegments = await loadPersistedSegments();
      if (persistedSegments) {
        setSegments(persistedSegments);
        Logger.info(`Loaded ${persistedSegments.length} persisted segments`);
      }

      // Load current journey state
      const persistedJourney = await loadPersistedCurrentJourney();
      if (persistedJourney) {
        setCurrentJourney(persistedJourney);
        Logger.info('Loaded persisted current journey state');
      }

      // Load exploration history
      const persistedHistory = await loadPersistedExplorationHistory();
      if (persistedHistory) {
        setExplorationHistory(persistedHistory);
        Logger.info(`Loaded ${persistedHistory.length} exploration history entries`);
      }

    } catch (error) {
      Logger.error('Failed to initialize exploration context:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new route segment to the exploration tracking
   * @param {Object} segment - RouteSegment object
   */
  const addSegment = useCallback(async (segment) => {
    try {
      if (!segment || !segment.start || !segment.end) {
        throw new Error('Invalid segment data');
      }

      const newSegment = {
        ...segment,
        id: generateSegmentId(segment),
        timestamp: segment.timestamp || Date.now(),
        metadata: segment.metadata || {}
      };

      setSegments(prevSegments => {
        const updatedSegments = [...prevSegments, newSegment];
        
        // Cache the segment for quick lookup
        segmentCacheRef.current.set(newSegment.id, newSegment);
        
        // Persist changes with debouncing
        debouncedPersistSegments(updatedSegments);
        
        return updatedSegments;
      });

      Logger.info(`Added exploration segment: ${newSegment.id}`);

    } catch (error) {
      Logger.error('Failed to add segment:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Remove a segment from exploration tracking
   * @param {string} segmentId - ID of segment to remove
   */
  const removeSegment = useCallback(async (segmentId) => {
    try {
      if (!segmentId) {
        throw new Error('Segment ID is required');
      }

      setSegments(prevSegments => {
        const updatedSegments = prevSegments.filter(segment => segment.id !== segmentId);
        
        // Remove from cache
        segmentCacheRef.current.delete(segmentId);
        
        // Persist changes
        debouncedPersistSegments(updatedSegments);
        
        return updatedSegments;
      });

      Logger.info(`Removed exploration segment: ${segmentId}`);

    } catch (error) {
      Logger.error('Failed to remove segment:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Update current journey state
   * @param {Object} journey - Journey object or null to clear
   */
  const updateCurrentJourney = useCallback(async (journey) => {
    try {
      setCurrentJourney(journey);
      
      // Persist current journey state
      await persistCurrentJourney(journey);
      
      // Add to exploration history
      if (journey) {
        await addToExplorationHistory({
          type: journey.status === 'in_progress' ? 'journey_start' : 'journey_update',
          data: {
            journeyId: journey.id,
            journeyName: journey.name,
            status: journey.status
          }
        });
      } else {
        await addToExplorationHistory({
          type: 'journey_clear',
          data: {}
        });
      }
      
      Logger.info(journey ? `Updated current journey: ${journey.id}` : 'Cleared current journey');

    } catch (error) {
      Logger.error('Failed to update current journey:', error);
      setError(error.message);
      throw error;
    }
  }, [addToExplorationHistory]);

  /**
   * Get segments within a specific area
   * @param {Object} bounds - Geographic bounds { north, south, east, west }
   * @returns {Array} Segments within the bounds
   */
  const getSegmentsInBounds = useCallback((bounds) => {
    if (!bounds || typeof bounds !== 'object') {
      return [];
    }

    return segments.filter(segment => {
      const { start, end } = segment;
      
      // Check if either start or end point is within bounds
      const startInBounds = isPointInBounds(start, bounds);
      const endInBounds = isPointInBounds(end, bounds);
      
      return startInBounds || endInBounds;
    });
  }, [segments]);

  /**
   * Get segments for a specific journey
   * @param {string} journeyId - Journey ID
   * @returns {Array} Segments associated with the journey
   */
  const getSegmentsForJourney = useCallback((journeyId) => {
    if (!journeyId) {
      return [];
    }

    return segments.filter(segment => 
      segment.metadata?.journeyId === journeyId
    );
  }, [segments]);

  /**
   * Clear all exploration data
   */
  const clearExplorationData = useCallback(async () => {
    try {
      setSegments([]);
      setCurrentJourney(null);
      setExplorationHistory([]);
      
      // Clear cache
      segmentCacheRef.current.clear();
      
      // Clear persisted data
      await clearPersistedData();
      
      Logger.info('Cleared all exploration data');

    } catch (error) {
      Logger.error('Failed to clear exploration data:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Add entry to exploration history
   * @param {Object} historyEntry - History entry object
   */
  const addToExplorationHistory = useCallback(async (historyEntry) => {
    try {
      if (!historyEntry) {
        throw new Error('History entry is required');
      }

      const newEntry = {
        ...historyEntry,
        id: generateHistoryId(historyEntry),
        timestamp: historyEntry.timestamp || Date.now()
      };

      setExplorationHistory(prevHistory => {
        const updatedHistory = [newEntry, ...prevHistory].slice(0, 100); // Keep last 100 entries
        
        // Persist changes
        debouncedPersistExplorationHistory(updatedHistory);
        
        return updatedHistory;
      });

      Logger.info(`Added exploration history entry: ${newEntry.id}`);

    } catch (error) {
      Logger.error('Failed to add exploration history:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Create segments from journey coordinates
   * @param {string} journeyId - Journey ID
   * @param {Array} coordinates - Array of LocationCoordinates
   * @param {Object} options - Segmentation options
   */
  const createSegmentsFromJourney = useCallback(async (journeyId, coordinates, options = {}) => {
    try {
      if (!journeyId || !coordinates || coordinates.length < 2) {
        Logger.warn('Insufficient data to create segments from journey');
        return [];
      }

      // Import utility function dynamically to avoid circular dependencies
      const { createRouteSegments } = await import('../utils/explorationUtils');
      
      const segmentOptions = {
        minSegmentLength: 50, // meters
        maxSegmentLength: 500, // meters
        journeyId,
        ...options
      };

      const newSegments = createRouteSegments(coordinates, segmentOptions);
      
      // Add all segments
      for (const segment of newSegments) {
        await addSegment(segment);
      }

      // Add to exploration history
      await addToExplorationHistory({
        type: 'segments_created',
        data: {
          journeyId,
          segmentCount: newSegments.length,
          coordinateCount: coordinates.length
        }
      });

      Logger.info(`Created ${newSegments.length} segments from journey ${journeyId}`);
      return newSegments;

    } catch (error) {
      Logger.error('Failed to create segments from journey:', error);
      setError(error.message);
      throw error;
    }
  }, [addSegment, addToExplorationHistory]);

  // Utility functions for segment operations

  /**
   * Generate unique segment ID
   * @param {Object} segment - Segment object
   * @returns {string} Unique segment ID
   */
  const generateSegmentId = (segment) => {
    const { start, end, timestamp } = segment;
    const startStr = `${start.latitude.toFixed(6)},${start.longitude.toFixed(6)}`;
    const endStr = `${end.latitude.toFixed(6)},${end.longitude.toFixed(6)}`;
    return `segment_${startStr}_${endStr}_${timestamp || Date.now()}`;
  };

  /**
   * Generate unique history entry ID
   * @param {Object} entry - History entry object
   * @returns {string} Unique history ID
   */
  const generateHistoryId = (entry) => {
    const timestamp = entry.timestamp || Date.now();
    const type = entry.type || 'unknown';
    return `history_${type}_${timestamp}`;
  };

  /**
   * Check if a point is within geographic bounds
   * @param {Object} point - Point with latitude and longitude
   * @param {Object} bounds - Geographic bounds
   * @returns {boolean} Whether point is within bounds
   */
  const isPointInBounds = (point, bounds) => {
    return (
      point.latitude >= bounds.south &&
      point.latitude <= bounds.north &&
      point.longitude >= bounds.west &&
      point.longitude <= bounds.east
    );
  };

  // Persistence functions

  /**
   * Load persisted segments from AsyncStorage
   * @returns {Promise<Array|null>} Persisted segments or null
   */
  const loadPersistedSegments = async () => {
    try {
      const segmentsJson = await AsyncStorage.getItem(JOURNEY_STORAGE_KEYS.EXPLORATION_SEGMENTS);
      if (segmentsJson) {
        const segments = JSON.parse(segmentsJson);
        
        // Populate cache
        segments.forEach(segment => {
          segmentCacheRef.current.set(segment.id, segment);
        });
        
        return segments;
      }
      return null;
    } catch (error) {
      Logger.error('Failed to load persisted segments:', error);
      return null;
    }
  };

  /**
   * Load persisted current journey from AsyncStorage
   * @returns {Promise<Object|null>} Persisted current journey or null
   */
  const loadPersistedCurrentJourney = async () => {
    try {
      const journeyJson = await AsyncStorage.getItem(JOURNEY_STORAGE_KEYS.CURRENT_JOURNEY_DATA);
      if (journeyJson) {
        return JSON.parse(journeyJson);
      }
      return null;
    } catch (error) {
      Logger.error('Failed to load persisted current journey:', error);
      return null;
    }
  };

  /**
   * Load persisted exploration history from AsyncStorage
   * @returns {Promise<Array|null>} Persisted exploration history or null
   */
  const loadPersistedExplorationHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(JOURNEY_STORAGE_KEYS.EXPLORATION_HISTORY);
      if (historyJson) {
        return JSON.parse(historyJson);
      }
      return null;
    } catch (error) {
      Logger.error('Failed to load persisted exploration history:', error);
      return null;
    }
  };

  /**
   * Persist segments to AsyncStorage
   * @param {Array} segmentsToSave - Segments to persist
   */
  const persistSegments = async (segmentsToSave) => {
    try {
      await AsyncStorage.setItem(
        JOURNEY_STORAGE_KEYS.EXPLORATION_SEGMENTS,
        JSON.stringify(segmentsToSave)
      );
    } catch (error) {
      Logger.error('Failed to persist segments:', error);
    }
  };

  /**
   * Persist current journey to AsyncStorage
   * @param {Object} journey - Journey to persist
   */
  const persistCurrentJourney = async (journey) => {
    try {
      if (journey) {
        await AsyncStorage.setItem(
          JOURNEY_STORAGE_KEYS.CURRENT_JOURNEY_DATA,
          JSON.stringify(journey)
        );
      } else {
        await AsyncStorage.removeItem(JOURNEY_STORAGE_KEYS.CURRENT_JOURNEY_DATA);
      }
    } catch (error) {
      Logger.error('Failed to persist current journey:', error);
    }
  };

  /**
   * Persist exploration history to AsyncStorage
   * @param {Array} history - History to persist
   */
  const persistExplorationHistory = async (history) => {
    try {
      await AsyncStorage.setItem(
        JOURNEY_STORAGE_KEYS.EXPLORATION_HISTORY,
        JSON.stringify(history)
      );
    } catch (error) {
      Logger.error('Failed to persist exploration history:', error);
    }
  };

  /**
   * Clear all persisted data
   */
  const clearPersistedData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(JOURNEY_STORAGE_KEYS.EXPLORATION_SEGMENTS),
        AsyncStorage.removeItem(JOURNEY_STORAGE_KEYS.CURRENT_JOURNEY_DATA),
        AsyncStorage.removeItem(JOURNEY_STORAGE_KEYS.EXPLORATION_HISTORY)
      ]);
    } catch (error) {
      Logger.error('Failed to clear persisted data:', error);
    }
  };

  // Debounced persistence functions for performance
  const debouncedPersistSegments = useCallback((segments) => {
    if (persistenceTimeoutRef.current) {
      clearTimeout(persistenceTimeoutRef.current);
    }
    
    persistenceTimeoutRef.current = setTimeout(() => {
      persistSegments(segments);
    }, 1000); // 1 second debounce
  }, []);

  const debouncedPersistExplorationHistory = useCallback((history) => {
    if (persistenceTimeoutRef.current) {
      clearTimeout(persistenceTimeoutRef.current);
    }
    
    persistenceTimeoutRef.current = setTimeout(() => {
      persistExplorationHistory(history);
    }, 1000); // 1 second debounce
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeExploration();
    
    // Cleanup timeout on unmount
    return () => {
      if (persistenceTimeoutRef.current) {
        clearTimeout(persistenceTimeoutRef.current);
      }
    };
  }, [initializeExploration]);

  // Context value object with all state and methods
  const value = {
    // Core state
    segments,
    currentJourney,
    explorationHistory,
    loading,
    error,

    // Segment management methods
    addSegment,
    removeSegment,
    getSegmentsInBounds,
    getSegmentsForJourney,
    createSegmentsFromJourney,

    // Journey state management
    updateCurrentJourney,

    // History management
    addToExplorationHistory,

    // Utility methods
    clearExplorationData,
    initializeExploration,

    // Computed properties
    segmentCount: segments.length,
    hasCurrentJourney: !!currentJourney,
    historyCount: explorationHistory.length,
  };

  return (
    <ExplorationContext.Provider value={value}>
      {children}
    </ExplorationContext.Provider>
  );
}

/**
 * Custom hook for consuming ExplorationContext
 * Provides type-safe access to exploration context with proper error handling
 */
export const useExploration = () => {
  const context = useContext(ExplorationContext);
  if (!context) {
    throw new Error('useExploration must be used within an ExplorationProvider');
  }
  return context;
};