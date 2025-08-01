import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import JourneyService from '../services/JourneyService';

// Contexts
import { useUser } from '../contexts/UserContext';

// Constants
import { DEFAULT_JOURNEY_VALUES, VALIDATION_CONSTANTS } from '../constants/JourneyModels';

// Utilities
import { calculateJourneyDistance } from '../utils/distanceUtils';

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
  
  // SIMPLIFIED: Service handles data processing, hook manages UI state
  const [currentJourneyData, setCurrentJourneyData] = useState([]);
  const [currentDisplayData, setCurrentDisplayData] = useState([]);
  
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
  const toggleTracking = useCallback(async (locationTrackingHook, permissionsHook) => {
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
        const result = await startTracking(locationTrackingHook, permissionsHook);
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
  const startTracking = useCallback(async (locationTrackingHook, permissionsHook) => {
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
      
      // Reset data streams
      setCurrentJourneyData([]);
      setCurrentDisplayData([]);
      
      setTrackingMetrics({
        pointsRecorded: 0,
        lastUpdate: Date.now(),
        gpsAccuracy: null
      });

      // Check for background location permissions before starting tracking
      if (permissionsHook) {
        console.log('Checking background location permissions...');
        
        // Check current permission status - need to check background permissions specifically
        const { getLocationPermissionStatus } = require('../utils/locationUtils');
        const backgroundStatus = await getLocationPermissionStatus(true); // Check background permissions
        
        console.log('Background permission status:', backgroundStatus);
        
        if (backgroundStatus !== 'granted') {
          console.log('Background permissions not granted, showing modal...');
          
          // Only show modal if it's not already visible to prevent duplicates
          if (!permissionsHook.backgroundPermissionModal.visible) {
            permissionsHook.showBackgroundPermissionModal();
          }
          
          // Reset state since we can't start tracking without permissions
          resetTrackingState();
          setTrackingStatus('idle');
          return false;
        }
        
        console.log('Background permissions are granted, proceeding with tracking...');
      }

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
        // SERVICE-PROCESSED DATA: Use journey data from BackgroundLocationService
        const distance = calculateJourneyDistance(journeyData.coordinates);
        
        console.log('SERVICE-PROCESSED DATA ANALYSIS:', {
          distance: Math.round(distance),
          processingStats: journeyData.processingStats,
          dataStreams: {
            journeyPoints: journeyData.coordinates.length,
            displayPoints: journeyData.displayCoordinates?.length || 0,
            rawPoints: journeyData.rawCoordinates?.length || 0
          }
        });

        // Update local state with service-processed data
        setCurrentJourneyData(journeyData.coordinates);
        setCurrentDisplayData(journeyData.displayCoordinates || []);
        
        // Distance is already calculated correctly by the service
        journeyData.distance = distance;

        // Update final metrics
        setTrackingMetrics(prev => ({
          ...prev,
          pointsRecorded: journeyData.coordinates.length, // Use service-processed journey data
          lastUpdate: Date.now()
        }));

        // Enhanced journey validation using actual distance
        const validationResult = validateJourneyForSaving(journeyData, distance);
        
        if (!validationResult.isValid) {
          setTrackingStatus('idle');
          
          if (validationResult.type === 'too_short') {
            Alert.alert(
              'Journey Too Short',
              `Your journey is only ${Math.round(distance)} meters. Journeys should be at least ${VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE} meters to be saved.`,
              [
                { text: 'Continue Journey', onPress: () => continueJourney(locationTrackingHook) },
                { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
                { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
              ]
            );
          } else if (validationResult.type === 'too_few_points') {
            Alert.alert(
              'Insufficient Location Data',
              `Your journey has only ${journeyPath.length} location points. More data is needed for a meaningful journey.`,
              [
                { text: 'Continue Journey', onPress: () => continueJourney(locationTrackingHook) },
                { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
                { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
              ]
            );
          } else if (validationResult.type === 'too_short_duration') {
            Alert.alert(
              'Journey Too Brief',
              `Your journey lasted only ${Math.round((Date.now() - journeyStartTime) / 1000)} seconds. Consider longer walks for better tracking.`,
              [
                { text: 'Continue Journey', onPress: () => continueJourney(locationTrackingHook) },
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
  }, [currentJourneyId, journeyStartTime, user, currentJourneyData, validateJourneyForSaving]);

  // Note: calculateJourneyDistance is now imported from utils/distanceUtils.js
  // This ensures consistency across the entire application

  /**
   * Validate journey data before saving
   * Implements comprehensive journey validation as per requirement 2.5, 2.6
   * @param {Object} journeyData - Journey data to validate
   * @param {number} distance - Calculated journey distance
   * @returns {Object} Validation result with isValid flag and type
   */
  const validateJourneyForSaving = useCallback((journeyData, distance) => {
    // Check minimum distance using actual calculated distance
    if (distance < VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE) {
      return {
        isValid: false,
        type: 'too_short',
        message: `Journey distance (${Math.round(distance)}m) is below minimum (${VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE}m)`
      };
    }

    // Use service-processed journey data for coordinate count validation
    const actualCoordinateCount = currentJourneyData.length;
    if (actualCoordinateCount < VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY) {
      return {
        isValid: false,
        type: 'too_few_points',
        message: `Journey has ${actualCoordinateCount} points, minimum is ${VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY}`
      };
    }

    // Check minimum duration using actual journey time
    const actualDuration = Date.now() - journeyStartTime;
    if (actualDuration < 30000) {
      return {
        isValid: false,
        type: 'too_short_duration',
        message: `Journey duration (${Math.round(actualDuration / 1000)}s) is too brief`
      };
    }

    // Check for valid timestamps
    if (!journeyStartTime || journeyStartTime <= 0) {
      return {
        isValid: false,
        type: 'invalid_timestamps',
        message: 'Journey has invalid start time'
      };
    }

    // All validations passed
    return {
      isValid: true,
      type: 'valid',
      message: 'Journey data is valid for saving'
    };
  }, [currentJourneyData, journeyStartTime]);

  // Note: calculateDistance is now imported from utils/distanceUtils.js
  // This ensures consistency across the entire application

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
   * Continue journey after attempting to stop
   * Allows user to resume tracking if journey is too short
   */
  const continueJourney = useCallback(async (locationTrackingHook) => {
    try {
      console.log('Continuing journey tracking...');
      
      // Reset to active tracking state
      setTrackingStatus('active');
      setLastError(null);
      
      // Restart location tracking with the same journey ID
      const success = await locationTrackingHook.startTracking(currentJourneyId, {
        warmup: false, // Skip warmup since we're continuing
        timeInterval: 2000,
        distanceInterval: 5
      });

      if (success) {
        console.log('Journey tracking resumed successfully');
      } else {
        throw new Error('Failed to resume location tracking');
      }
    } catch (error) {
      console.error('Error continuing journey:', error);
      setTrackingStatus('error');
      setLastError(error.message);
      Alert.alert(
        'Resume Error',
        'Failed to resume journey tracking. You may need to start a new journey.',
        [{ text: 'OK' }]
      );
    }
  }, [currentJourneyId]);

  /**
   * Prompt user to save journey with name
   * Implements journey saving modal state as per requirement 2.2
   */
  const promptSaveJourney = useCallback((journeyData, distance) => {
    console.log('promptSaveJourney called with:', {
      distance: Math.round(distance),
      journeyDataLength: currentJourneyData.length,
      displayDataLength: currentDisplayData.length,
      serviceDataLength: journeyData.coordinates?.length || 0
    });

    // Use service-processed journey data for route storage
    const routeData = currentJourneyData;

    // Calculate journey statistics using the actual route data
    const stats = calculateJourneyStatistics(routeData);
    
    // CRITICAL FIX: Override stats distance with the passed distance for consistency
    // This ensures the modal displays the same distance as the tracking display
    const correctedStats = {
      ...stats,
      distance: Math.round(distance) // Use the passed distance, not calculated stats distance
    };
    
    console.log('Journey statistics calculated:', {
      originalStatsDistance: stats.distance,
      correctedStatsDistance: correctedStats.distance,
      passedDistance: Math.round(distance),
      routeDataLength: routeData.length
    });

    // Prepare journey data for saving
    const journeyToSave = {
      ...DEFAULT_JOURNEY_VALUES,
      id: currentJourneyId,
      userId: user.uid,
      startTime: journeyStartTime,
      endTime: Date.now(),
      route: routeData, // Use the more complete route data
      distance: Math.round(distance), // Use the passed distance, not stats.distance
      duration: Date.now() - journeyStartTime,
      status: 'completed',
      stats: correctedStats // Use corrected stats with consistent distance
    };

    console.log('Journey prepared for saving:', {
      journeyDistance: journeyToSave.distance,
      journeyDuration: journeyToSave.duration,
      routeLength: journeyToSave.route.length
    });

    // Set journey data and show naming modal
    setNamingModal({
      visible: true,
      journey: journeyToSave
    });
  }, [currentJourneyId, journeyStartTime, user, currentJourneyData, calculateJourneyStatistics]);

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

    console.log('saveJourney called with journey data:', {
      journeyDistance: namingModal.journey.distance,
      journeyDuration: namingModal.journey.duration,
      routeLength: namingModal.journey.route?.length || 0,
      journeyName: journeyName?.trim()
    });

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

      console.log('About to validate journey with distance:', namingModal.journey.distance);

      // Final validation of journey data before saving
      const finalValidation = validateJourneyForSaving(
        namingModal.journey, 
        namingModal.journey.distance
      );

      console.log('Validation result:', finalValidation);

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
    
    // Reset data streams
    setCurrentJourneyData([]);
    setCurrentDisplayData([]);
    
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
   * Update current journey data from service
   * SERVICE-CENTRIC: BackgroundLocationService handles all data processing
   * Hook only manages UI state and real-time updates
   */
  const updateFromService = useCallback((locationTrackingHook) => {
    if (isTracking && currentJourneyId && locationTrackingHook?.locationService) {
      const processedData = locationTrackingHook.locationService.getCurrentProcessedData();
      
      if (processedData) {
        setCurrentJourneyData(processedData.journeyData);
        setCurrentDisplayData(processedData.displayData);
        
        // Update tracking metrics
        setTrackingMetrics(prev => ({
          pointsRecorded: processedData.journeyData.length,
          lastUpdate: Date.now(),
          gpsAccuracy: prev.gpsAccuracy // Keep last known accuracy
        }));
      }
    }
  }, [isTracking, currentJourneyId]);

  /**
   * Legacy addToPath method - now triggers service data update
   * Maintains backward compatibility with MapScreen
   */
  const addToPath = useCallback((position) => {
    // The BackgroundLocationService handles the actual data processing
    // This method is kept for backward compatibility but doesn't process data
    if (isTracking && currentJourneyId) {
      // Update tracking metrics for UI feedback
      setTrackingMetrics(prev => ({
        pointsRecorded: prev.pointsRecorded + 1,
        lastUpdate: Date.now(),
        gpsAccuracy: position.accuracy || prev.gpsAccuracy
      }));
    }
  }, [isTracking, currentJourneyId]);

  /**
   * Get current journey information for display
   * SERVICE-CENTRIC: Uses service-processed journey data
   */
  const getCurrentJourneyInfo = useCallback(() => {
    if (!isTracking || !journeyStartTime) {
      return null;
    }

    const currentTime = Date.now();
    const duration = currentTime - journeyStartTime;
    const distance = calculateJourneyDistance(currentJourneyData); // Use service-processed data

    return {
      startTime: journeyStartTime,
      duration,
      distance: Math.round(distance),
      pointCount: currentJourneyData.length, // Use service-processed count
      isActive: isTracking
    };
  }, [isTracking, journeyStartTime, currentJourneyData]);

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
    
    // Path data (SERVICE-PROCESSED)
    journeyPath: currentJourneyData,    // Service-processed journey data for statistics
    displayPath: currentDisplayData,    // Service-processed display data for visualization
    
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
    updateFromService,
    resetTrackingState,
    continueJourney,
  };
};

export default useJourneyTracking;