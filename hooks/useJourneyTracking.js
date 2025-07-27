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

  // Journey saving state
  const [namingModal, setNamingModal] = useState({ 
    visible: false, 
    journey: null 
  });
  const [savingJourney, setSavingJourney] = useState(false);

  /**
   * Toggle journey tracking on/off
   * Implements journey start/stop functionality as per requirement 2.1
   */
  const toggleTracking = useCallback(async (locationTrackingHook) => {
    try {
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to track your journeys.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!locationTrackingHook) {
        Alert.alert(
          'Service Error',
          'Location service is not available. Please restart the app.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (isTracking) {
        // Stop tracking
        await stopTracking(locationTrackingHook);
      } else {
        // Start tracking
        await startTracking(locationTrackingHook);
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      Alert.alert(
        'Tracking Error',
        'Failed to toggle tracking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [isAuthenticated, isTracking]);

  /**
   * Start journey tracking
   * Implements journey start functionality as per requirement 2.1
   */
  const startTracking = useCallback(async (locationTrackingHook) => {
    try {
      // Generate unique journey ID
      const journeyId = `journey_${user.uid}_${Date.now()}`;

      // Start location tracking
      const success = await locationTrackingHook.startTracking(journeyId, {
        warmup: true,
        timeInterval: 2000, // 2 seconds
        distanceInterval: 5 // 5 meters
      });

      if (success) {
        setIsTracking(true);
        setCurrentJourneyId(journeyId);
        setJourneyStartTime(Date.now());
        setPathToRender([]);

        console.log('Journey tracking started:', journeyId);
      } else {
        throw new Error('Failed to start location tracking');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert(
        'Start Tracking Error',
        'Failed to start journey tracking. Please check your location permissions.',
        [{ text: 'OK' }]
      );
      throw error;
    }
  }, [user]);

  /**
   * Stop journey tracking
   * Implements journey stop functionality and path management as per requirement 2.1
   */
  const stopTracking = useCallback(async (locationTrackingHook) => {
    try {
      // Stop location tracking and get journey data
      const journeyData = await locationTrackingHook.stopTracking();

      if (journeyData && journeyData.coordinates && journeyData.coordinates.length > 0) {
        // Calculate journey distance
        const distance = calculateJourneyDistance(journeyData.coordinates);

        // Check minimum distance requirement
        if (distance < VALIDATION_CONSTANTS.MIN_JOURNEY_DISTANCE) {
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
          promptSaveJourney(journeyData, distance);
        }
      } else {
        // No valid journey data
        Alert.alert(
          'No Journey Data',
          'No location data was recorded during this journey.',
          [{ text: 'OK', onPress: () => discardJourney() }]
        );
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert(
        'Stop Tracking Error',
        'Failed to stop journey tracking properly.',
        [{ text: 'OK', onPress: () => discardJourney() }]
      );
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
   * Discard current journey and reset state
   * Implements journey state cleanup as per requirement 2.2
   */
  const discardJourney = useCallback(() => {
    setIsTracking(false);
    setCurrentJourneyId(null);
    setJourneyStartTime(null);
    setPathToRender([]);
    setNamingModal({ visible: false, journey: null });
  }, []);

  /**
   * Add position to current journey path
   * Implements path management as per requirement 2.1
   */
  const addToPath = useCallback((position) => {
    if (isTracking && currentJourneyId) {
      setPathToRender(prevPath => [...prevPath, position]);
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
    },
    
    // Current journey info
    currentJourney: getCurrentJourneyInfo(),
    
    // Path data
    pathToRender,
    
    // Modal state
    namingModal,
    savingJourney,
    
    // Actions
    toggleTracking,
    saveJourney,
    cancelSave,
    discardJourney,
    addToPath,
  };
};

export default useJourneyTracking;