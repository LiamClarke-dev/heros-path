import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import JourneyService from '../services/JourneyService';

// Contexts
import { useUser } from '../contexts/UserContext';

// Constants
import { DEFAULT_JOURNEY_VALUES, VALIDATION_CONSTANTS } from '../constants/JourneyModels';

/**
 * Custom hook for managing journey tracking state and logic
 * 
 * Handles:
 * - Journey tracking state and logic
 * - Journey start/stop functionality and path management
 * - Journey saving and naming modal state
 * - Journey validation and statistics calculation
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useJourneyTracking = () => {
  const { user, isAuthenticated } = useUser();

  // Journey tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentJourneyId, setCurrentJourneyId] = useState(null);
  const [journeyStartTime, setJourneyStartTime] = useState(null);
  const [pathToRender, setPathToRender] = useState([]);
  
  // Enhanced tracking state indicators
  const [trackingStatus, setTrackingStatus] = useState('idle'); // 'idle', 'starting', 'active', 'stopping', 'error'
  const [lastError, setLastError] = useState(null);
  const [trackingMetrics, setTrackingMetrics] = useState({
    pointsRecorded: 0,
    lastUpdate: null,
    gpsAccuracy: null
  });

  // Journey saving state
  const [namingModal, setNamingModal] = useState({ 
    visible: false, 
    journey: null 
  });
  const [savingJourney, setSavingJourney] = useState(false);

  /**
   * Toggle journey tracking on/off
   * Implements journey start/stop functionality as per requirement 2.1
   * Enhanced with better state management and error handling
   */
  const toggleTracking = useCallback(async (locationTrackingHook) => {
    try {
      // Authentication check
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to track your journeys.',
          [{ text: 'OK' }]
        );
        return { success: false, reason: 'not_authenticated' };
      }

      // Service availability check
      if (!locationTrackingHook) {
        Alert.alert(
          'Service Error',
          'Location service is not available. Please restart the app.',
          [{ text: 'OK' }]
        );
        return { success: false, reason: 'service_unavailable' };
      }

      // Prevent double-tap issues
      if (isTracking) {
        // Stop tracking
        const result = await stopTracking(locationTrackingHook);
        return { success: true, action: 'stopped', result };
      } else {
        // Start tracking
        const result = await startTracking(locationTrackingHook);
        return { success: result, action: 'started' };
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      Alert.alert(
        'Tracking Error',
        'Failed to toggle tracking. Please try again.',
        [{ text: 'OK' }]
      );
      return { success: false, reason: 'error', error: error.message };
    }
  }, [isAuthenticated, isTracking]);

  /**
   * Start journey tracking
   * Implements journey start functionality as per requirement 2.1
   * Enhanced with better state management and error handling
   */
  const startTracking = useCallback(async (locationTrackingHook) => {
    try {
      // Set starting state
      setTrackingStatus('starting');
      setLastError(null);

      // Generate unique journey ID
      const journeyId = `journey_${user.uid}_${Date.now()}`;

      console.log('Journey state:', { 
        isTracking, 
        currentJourneyId, 
        journeyId,
        readyToStart: !isTracking && !currentJourneyId 
      });

      // Set tracking state immediately to prevent double-tap
      setIsTracking(true);
      setCurrentJourneyId(journeyId);
      setJourneyStartTime(Date.now());
      setPathToRender([]);
      setTrackingMetrics({
        pointsRecorded: 0,
        lastUpdate: Date.now(),
        gpsAccuracy: null
      });

      // Start location tracking with warm-up
      const success = await locationTrackingHook.startTracking(journeyId, {
        warmup: true,
        timeInterval: 2000, // 2 seconds
        distanceInterval: 5 // 5 meters
      });

      if (success) {
        setTrackingStatus('active');
        console.log('Journey tracking started:', journeyId);
        return true;
      } else {
        // Reset state if tracking failed
        resetTrackingState();
        throw new Error('Failed to start location tracking');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      
      // Reset state on error
      resetTrackingState();
      setTrackingStatus('error');
      setLastError(error.message);
      
      Alert.alert(
        'Start Tracking Error',
        'Failed to start journey tracking. Please check your location permissions.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }, [user, isTracking, currentJourneyId]);

  /**
   * Stop journey tracking
   * Implements journey stop functionality and path management as per requirement 2.1
   * Enhanced with better state management and error handling
   */
  const stopTracking = useCallback(async (locationTrackingHook) => {
    try {
      // Set stopping state
      setTrackingStatus('stopping');
      setLastError(null);

      // Stop location tracking and get journey data
      const journeyData = await locationTrackingHook.stopTracking();

      if (journeyData && journeyData.coordinates && journeyData.coordinates.length > 0) {
        // Calculate journey distance
        const distance = calculateJourneyDistance(journeyData.coordinates);

        // Update final metrics
        setTrackingMetrics(prev => ({
          ...prev,
          pointsRecorded: journeyData.coordinates.length,
          lastUpdate: Date.now()
        }));

        // Enhanced journey validation
        const validationResult = validateJourneyForSaving(journeyData, distance);
        
        if (!validationResult.isValid) {
          setTrackingStatus('idle');
          
          if (validationResult.type === 'too_short') {
            Alert.alert(
              'Journey Too Short',
              `Your journey is only ${Math.round(distance)} meters. Journeys should be at least ${VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE} meters to be saved.`,
              [
                { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
                { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
              ]
            );
          } else if (validationResult.type === 'too_few_points') {
            Alert.alert(
              'Insufficient Location Data',
              `Your journey has only ${journeyData.coordinates.length} location points. More data is needed for a meaningful journey.`,
              [
                { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
                { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
              ]
            );
          } else if (validationResult.type === 'too_short_duration') {
            Alert.alert(
              'Journey Too Brief',
              `Your journey lasted only ${Math.round((journeyData.endTime - journeyData.startTime) / 1000)} seconds. Consider longer walks for better tracking.`,
              [
                { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
                { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
              ]
            );
          }
        } else {
          // Journey is valid, prompt to save
          setTrackingStatus('idle');
          promptSaveJourney(journeyData, distance);
        }
        return journeyData;
      } else {
        // No valid journey data
        setTrackingStatus('error');
        setLastError('No location data recorded');
        Alert.alert(
          'No Journey Data',
          'No location data was recorded during this journey.',
          [{ text: 'OK', onPress: () => discardJourney() }]
        );
        return null;
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      setTrackingStatus('error');
      setLastError(error.message);
      Alert.alert(
        'Stop Tracking Error',
        'Failed to stop journey tracking properly.',
        [{ text: 'OK', onPress: () => discardJourney() }]
      );
      return null;
    }
  }, [currentJourneyId, journeyStartTime, user]);

  /**
   * Calculate total distance of a journey
   * Implements path management as per requirement 2.1
   */
  const calculateJourneyDistance = useCallback((coordinates) => {
    if (!coordinates || coordinates.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const distance = calculateDistance(coordinates[i - 1], coordinates[i]);
      totalDistance += distance;
    }

    return totalDistance;
  }, []);

  /**
   * Validate journey data before saving
   * Implements comprehensive journey validation as per requirement 2.5, 2.6
   * @param {Object} journeyData - Journey data to validate
   * @param {number} distance - Calculated journey distance
   * @returns {Object} Validation result with isValid flag and type
   */
  const validateJourneyForSaving = useCallback((journeyData, distance) => {
    // Check minimum distance
    if (distance < VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE) {
      return {
        isValid: false,
        type: 'too_short',
        message: `Journey distance (${Math.round(distance)}m) is below minimum (${VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE}m)`
      };
    }

    // Check minimum coordinate count
    if (!journeyData.coordinates || journeyData.coordinates.length < VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY) {
      return {
        isValid: false,
        type: 'too_few_points',
        message: `Journey has ${journeyData.coordinates?.length || 0} points, minimum is ${VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY}`
      };
    }

    // Check minimum duration (30 seconds)
    const duration = journeyData.endTime - journeyData.startTime;
    if (duration < 30000) {
      return {
        isValid: false,
        type: 'too_short_duration',
        message: `Journey duration (${Math.round(duration / 1000)}s) is too brief`
      };
    }

    // Check for valid timestamps
    if (!journeyData.startTime || !journeyData.endTime || journeyData.endTime <= journeyData.startTime) {
      return {
        isValid: false,
        type: 'invalid_timestamps',
        message: 'Journey has invalid start or end times'
      };
    }

    // All validations passed
    return {
      isValid: true,
      type: 'valid',
      message: 'Journey data is valid for saving'
    };
  }, []);

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  const calculateDistance = useCallback((coord1, coord2) => {
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
  }, []);

  /**
   * Convert degrees to radians
   */
  const toRadians = useCallback((degrees) => {
    return degrees * (Math.PI / 180);
  }, []);

  /**
   * Calculate journey statistics from coordinates
   * @param {Array} coordinates - Array of location coordinates
   * @returns {Object} Journey statistics
   */
  const calculateJourneyStatistics = useCallback((coordinates) => {
    if (!coordinates || coordinates.length < 2) {
      return {
        distance: 0,
        duration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        pointCount: coordinates?.length || 0
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let elevationGain = 0;
    let previousElevation = null;

    // Calculate distance and other metrics
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];

      // Calculate distance between points
      const distance = calculateDistance(prev, curr);
      totalDistance += distance;

      // Track max speed
      if (curr.speed && curr.speed > maxSpeed) {
        maxSpeed = curr.speed;
      }

      // Calculate elevation gain
      if (curr.altitude && previousElevation !== null) {
        const elevationDiff = curr.altitude - previousElevation;
        if (elevationDiff > 0) {
          elevationGain += elevationDiff;
        }
      }
      previousElevation = curr.altitude;
    }

    // Calculate duration
    const startTime = coordinates[0].timestamp;
    const endTime = coordinates[coordinates.length - 1].timestamp;
    const duration = endTime - startTime;

    // Calculate average speed
    const averageSpeed = duration > 0 ? (totalDistance / (duration / 1000)) : 0;

    return {
      distance: Math.round(totalDistance),
      duration: duration,
      averageSpeed: Math.round(averageSpeed * 100) / 100,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      elevationGain: Math.round(elevationGain),
      pointCount: coordinates.length
    };
  }, [calculateDistance]);

  /**
   * Prompt user to save journey with name
   * Implements journey saving modal state as per requirement 2.2
   */
  const promptSaveJourney = useCallback((journeyData, distance) => {
    // Calculate journey statistics using the static method
    const stats = calculateJourneyStatistics(journeyData.coordinates);

    // Prepare journey data for saving
    const journeyToSave = {
      ...DEFAULT_JOURNEY_VALUES,
      id: currentJourneyId,
      userId: user.uid,
      startTime: journeyStartTime,
      endTime: Date.now(),
      route: journeyData.coordinates,
      distance: Math.round(distance),
      duration: Date.now() - journeyStartTime,
      status: 'completed',
      stats
    };

    // Set journey data and show naming modal
    setNamingModal({
      visible: true,
      journey: journeyToSave
    });
  }, [currentJourneyId, journeyStartTime, user]);

  /**
   * Handle journey save from naming modal
   * Implements journey saving functionality with enhanced error handling as per requirement 2.2
   */
  const saveJourney = useCallback(async (journeyName) => {
    if (!namingModal.journey) {
      console.error('No journey data to save');
      Alert.alert(
        'Save Error',
        'No journey data available to save. Please try tracking a new journey.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSavingJourney(true);

      // Validate journey name
      const trimmedName = journeyName?.trim();
      if (!trimmedName || trimmedName.length === 0) {
        throw new Error('Journey name cannot be empty');
      }

      if (trimmedName.length > VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH) {
        throw new Error(`Journey name must be less than ${VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH} characters`);
      }

      // Generate unique name if needed
      const uniqueName = await JourneyService.generateUniqueJourneyName(
        user.uid,
        trimmedName
      );

      // Final validation of journey data before saving
      const finalValidation = validateJourneyForSaving(
        namingModal.journey, 
        namingModal.journey.distance
      );

      if (!finalValidation.isValid) {
        throw new Error(`Journey validation failed: ${finalValidation.message}`);
      }

      // Save journey with the provided name
      const journeyData = {
        ...namingModal.journey,
        name: uniqueName
      };

      const savedJourney = await JourneyService.createJourney(user.uid, journeyData);

      // Close modal and reset state
      setNamingModal({ visible: false, journey: null });
      discardJourney();

      // Show success message with journey details
      const distanceText = savedJourney.distance >= 1000 
        ? `${(savedJourney.distance / 1000).toFixed(1)}km`
        : `${Math.round(savedJourney.distance)}m`;

      Alert.alert(
        'Journey Saved Successfully!',
        `"${savedJourney.name}" has been saved.\n\nDistance: ${distanceText}\nDuration: ${Math.round(savedJourney.duration / 60000)} minutes`,
        [{ text: 'Great!' }]
      );

      return savedJourney;
    } catch (error) {
      console.error('Error saving journey:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to save your journey. Please try again.';
      
      if (error.message.includes('name')) {
        errorMessage = error.message;
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('permission') || error.message.includes('auth')) {
        errorMessage = 'Authentication error. Please sign in again and try saving.';
      } else if (error.message.includes('validation')) {
        errorMessage = error.message;
      }

      Alert.alert(
        'Save Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      throw error;
    } finally {
      setSavingJourney(false);
    }
  }, [namingModal.journey, user, validateJourneyForSaving]);

  /**
   * Handle journey save cancellation
   * Implements naming modal state management as per requirement 2.2
   */
  const cancelSave = useCallback(() => {
    setNamingModal({ visible: false, journey: null });

    // Ask user if they want to discard the journey
    Alert.alert(
      'Discard Journey',
      'Are you sure you want to discard this journey? This action cannot be undone.',
      [
        { 
          text: 'Keep', 
          style: 'cancel', 
          onPress: () => setNamingModal(prev => ({ ...prev, visible: true }))
        },
        { 
          text: 'Discard', 
          style: 'destructive', 
          onPress: () => discardJourney() 
        }
      ]
    );
  }, []);

  /**
   * Reset tracking state to initial values
   * Helper function for consistent state cleanup
   */
  const resetTrackingState = useCallback(() => {
    setIsTracking(false);
    setCurrentJourneyId(null);
    setJourneyStartTime(null);
    setPathToRender([]);
    setTrackingStatus('idle');
    setLastError(null);
    setTrackingMetrics({
      pointsRecorded: 0,
      lastUpdate: null,
      gpsAccuracy: null
    });
  }, []);

  /**
   * Discard current journey and reset state
   * Implements journey state cleanup as per requirement 2.2
   */
  const discardJourney = useCallback(() => {
    resetTrackingState();
    setNamingModal({ visible: false, journey: null });
  }, [resetTrackingState]);

  /**
   * Add position to current journey path
   * Implements path management as per requirement 2.1
   * Enhanced with metrics tracking
   */
  const addToPath = useCallback((position) => {
    if (isTracking && currentJourneyId) {
      setPathToRender(prevPath => [...prevPath, position]);
      
      // Update tracking metrics
      setTrackingMetrics(prev => ({
        pointsRecorded: prev.pointsRecorded + 1,
        lastUpdate: Date.now(),
        gpsAccuracy: position.accuracy || prev.gpsAccuracy
      }));
    }
  }, [isTracking, currentJourneyId]);

  /**
   * Get current journey information for display
   * Implements journey state management as per requirement 2.1
   */
  const getCurrentJourneyInfo = useCallback(() => {
    if (!isTracking || !journeyStartTime) {
      return null;
    }

    const currentTime = Date.now();
    const duration = currentTime - journeyStartTime;
    const distance = calculateJourneyDistance(pathToRender);

    return {
      startTime: journeyStartTime,
      duration,
      distance: Math.round(distance),
      pointCount: pathToRender.length,
      isActive: isTracking
    };
  }, [isTracking, journeyStartTime, pathToRender, calculateJourneyDistance]);

  return {
    // State
    state: {
      isTracking,
      currentJourneyId,
      isAuthenticated,
      trackingStatus,
      lastError,
    },
    
    // Current journey info
    currentJourney: getCurrentJourneyInfo(),
    
    // Path data
    pathToRender,
    
    // Tracking metrics
    metrics: trackingMetrics,
    
    // Modal state
    namingModal,
    savingJourney,
    
    // Actions
    toggleTracking,
    saveJourney,
    cancelSave,
    discardJourney,
    addToPath,
    resetTrackingState,
  };
};

export default useJourneyTracking;