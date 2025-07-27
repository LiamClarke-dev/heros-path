import { useState, useCallback } from 'react';

/**
 * Custom hook for managing map state
 * 
 * Handles:
 * - Current position tracking
 * - Map error states
 * - Camera position management
 * - Map error handling and recovery
 * 
 * Requirements: 2.1, 2.2, 2.4
 */
const useMapState = () => {
  // Core map state
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [cameraPosition, setCameraPosition] = useState(null);

  /**
   * Handle map errors with user-friendly messages
   * Implements proper error handling as per requirement 2.2
   */
  const handleError = useCallback((error) => {
    console.error('Map error:', error);
    setMapError('Map failed to load. Please check your internet connection.');
  }, []);

  /**
   * Update camera position with smooth transitions
   * Implements camera position updates as per requirement 2.1
   */
  const updateCameraPosition = useCallback((position) => {
    if (!position || !position.latitude || !position.longitude) {
      console.warn('Invalid position provided to updateCameraPosition:', position);
      return;
    }

    setCameraPosition({
      center: {
        latitude: position.latitude,
        longitude: position.longitude,
      },
      zoom: 16,
    });
  }, []);

  /**
   * Clear map error state
   */
  const clearError = useCallback(() => {
    setMapError(null);
  }, []);

  /**
   * Get initial camera position based on current position or default
   */
  const getInitialCameraPosition = useCallback(() => {
    if (currentPosition) {
      return {
        center: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        },
        zoom: 16,
      };
    }

    // Default to a reasonable location (San Francisco)
    return {
      center: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      zoom: 12,
    };
  }, [currentPosition]);

  /**
   * Update current position with validation
   */
  const updateCurrentPosition = useCallback((position) => {
    if (!position || typeof position.latitude !== 'number' || typeof position.longitude !== 'number') {
      console.warn('Invalid position provided to updateCurrentPosition:', position);
      return;
    }

    setCurrentPosition({
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: position.timestamp || Date.now(),
      accuracy: position.accuracy || null
    });
  }, []);

  return {
    // State
    currentPosition,
    mapError,
    cameraPosition,
    
    // Actions
    handleError,
    updateCameraPosition,
    clearError,
    getInitialCameraPosition,
    updateCurrentPosition,
    
    // Setters (for direct state updates when needed)
    setCurrentPosition,
    setMapError,
    setCameraPosition,
  };
};

export default useMapState;