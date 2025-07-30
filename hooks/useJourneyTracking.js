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

        // Check minimum distance requirement
        if (distance < VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE) {
          setTrackingStatus('idle');
          Alert.alert(
            'Journey Too Short',
            `Your journey is only ${Math.round(distance)} meters. Journeys should be at least ${VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE} meters to be saved.`,
            [
              { text: 'Discard', style: 'destructive', onPress: () => discardJourney() },
              { text: 'Save Anyway', onPress: () => promptSaveJourney(journeyData, distance) }
            ]
          );
        } else {
          // Journey is long enough, prompt to save
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
   * Prompt user to save journey with name
   * Implements journey saving modal state as per requirement 2.2
   */
  const promptSaveJourney = useCallback((journeyData, distance) => {
    // Calculate journey statistics
    const stats = JourneyService.calculateJourneyStats(journeyData.coordinates);

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
   * Implements journey saving functionality as per requirement 2.2
   */
  const saveJourney = useCallback(async (journeyName) => {
    if (!namingModal.journey) {
      console.error('No journey data to save');
      return;
    }

    try {
      setSavingJourney(true);

      // Generate unique name if needed
      const uniqueName = await JourneyService.generateUniqueJourneyName(
        user.uid,
        journeyName
      );

      // Save journey with the provided name
      const journeyData = {
        ...namingModal.journey,
        name: uniqueName
      };

      const savedJourney = await JourneyService.saveJourney(journeyData);

      // Close modal and reset state
      setNamingModal({ visible: false, journey: null });
      discardJourney();

      Alert.alert(
        'Journey Saved',
        `Your journey "${savedJourney.name}" has been saved successfully!`,
        [{ text: 'OK' }]
      );

      return savedJourney;
    } catch (error) {
      console.error('Error saving journey:', error);
      Alert.alert(
        'Save Error',
        'Failed to save your journey. Please try again.',
        [{ text: 'OK' }]
      );
      throw error;
    } finally {
      setSavingJourney(false);
    }
  }, [namingModal.journey, user]);

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