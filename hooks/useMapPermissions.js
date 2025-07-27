import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';

// Utilities
import { requestLocationPermissions } from '../utils/locationUtils';

/**
 * Custom hook for managing location permissions
 * 
 * Handles:
 * - Permission handling logic
 * - Permission request and status management
 * - Permission error states and user prompts
 * - Settings navigation and permission recovery
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useMapPermissions = () => {
  // Permission state
  const [granted, setGranted] = useState(false);
  const [status, setStatus] = useState('unknown'); // 'unknown', 'granted', 'denied', 'restricted'
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  /**
   * Check permissions on mount
   * Implements permission status management as per requirement 2.1
   */
  useEffect(() => {
    checkPermissions();
  }, []);

  /**
   * Check current permission status
   * Implements permission status management as per requirement 2.1
   */
  const checkPermissions = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const result = await requestLocationPermissions(false); // Check only, don't request
      
      setGranted(result.granted);
      setStatus(result.status || (result.granted ? 'granted' : 'denied'));
      setCanAskAgain(result.canAskAgain !== false);
      setLastChecked(Date.now());
      
      if (!silent) {
        console.log('Permission status checked:', {
          granted: result.granted,
          status: result.status,
          canAskAgain: result.canAskAgain
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error checking permissions:', error);
      setError('Failed to check location permissions');
      setStatus('unknown');
      
      if (!silent) {
        setGranted(false);
      }
      
      return { granted: false, error: error.message };
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Request location permissions from user
   * Implements permission request as per requirement 2.1
   */
  const requestPermissions = useCallback(async (showRationale = true) => {
    try {
      setLoading(true);
      setError(null);

      // Check if we can ask for permissions
      if (!canAskAgain && status === 'denied') {
        // User has permanently denied permissions
        showSettingsPrompt();
        return { granted: false, error: 'Permissions permanently denied' };
      }

      const result = await requestLocationPermissions(true); // Request permissions
      
      setGranted(result.granted);
      setStatus(result.status || (result.granted ? 'granted' : 'denied'));
      setCanAskAgain(result.canAskAgain !== false);
      setLastChecked(Date.now());
      
      if (!result.granted && showRationale) {
        handlePermissionDenied(result);
      }
      
      console.log('Permission request result:', result);
      return result;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setError('Failed to request location permissions');
      
      Alert.alert(
        'Permission Error',
        'Failed to request location permissions. Please try again.',
        [{ text: 'OK' }]
      );
      
      return { granted: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [canAskAgain, status]);

  /**
   * Handle permission denied scenarios
   * Implements permission error states and user prompts as per requirement 2.2
   */
  const handlePermissionDenied = useCallback((result) => {
    const { canAskAgain, error } = result;
    
    if (canAskAgain === false) {
      // User has permanently denied permissions
      showSettingsPrompt();
    } else {
      // User denied but can ask again
      Alert.alert(
        'Location Permission Required',
        error || 'Location access is needed to show your position on the map and track your journeys.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => requestPermissions(false) }
        ]
      );
    }
  }, [requestPermissions]);

  /**
   * Show prompt to open device settings
   * Implements settings navigation as per requirement 3.2
   */
  const showSettingsPrompt = useCallback(() => {
    Alert.alert(
      'Location Permission Required',
      'Location access has been disabled. Please enable it in your device settings to use map features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings }
      ]
    );
  }, []);

  /**
   * Open device settings for the app
   * Implements settings navigation as per requirement 3.2
   */
  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert(
        'Settings Error',
        'Unable to open settings. Please manually enable location permissions for this app.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  /**
   * Handle app state change to recheck permissions
   * Implements permission recovery as per requirement 2.2
   */
  const handleAppStateChange = useCallback(async (nextAppState) => {
    if (nextAppState === 'active' && !granted) {
      // App became active and permissions were not granted
      // Check if user enabled permissions in settings
      const result = await checkPermissions(true);
      
      if (result.granted && !granted) {
        console.log('Permissions were enabled in settings');
        // Permissions were granted while app was in background
      }
    }
  }, [granted, checkPermissions]);

  /**
   * Get permission status message for UI display
   * Implements permission error states as per requirement 2.2
   */
  const getStatusMessage = useCallback(() => {
    switch (status) {
      case 'granted':
        return 'Location access granted';
      case 'denied':
        return canAskAgain 
          ? 'Location access denied. Tap to request again.'
          : 'Location access permanently denied. Please enable in settings.';
      case 'restricted':
        return 'Location access is restricted on this device';
      case 'unknown':
      default:
        return 'Location permission status unknown';
    }
  }, [status, canAskAgain]);

  /**
   * Get permission status color for UI display
   * Implements permission error states as per requirement 2.2
   */
  const getStatusColor = useCallback(() => {
    switch (status) {
      case 'granted':
        return '#4CAF50'; // Green
      case 'denied':
        return '#F44336'; // Red
      case 'restricted':
        return '#FF9800'; // Orange
      case 'unknown':
      default:
        return '#9E9E9E'; // Gray
    }
  }, [status]);

  /**
   * Check if permissions need to be refreshed
   * Implements permission status management as per requirement 2.4
   */
  const needsRefresh = useCallback(() => {
    if (!lastChecked) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - lastChecked) > fiveMinutes;
  }, [lastChecked]);

  /**
   * Clear error state
   * Implements error handling as per requirement 2.2
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset permission state (for testing or debugging)
   * Implements permission status management as per requirement 2.1
   */
  const reset = useCallback(() => {
    setGranted(false);
    setStatus('unknown');
    setCanAskAgain(true);
    setError(null);
    setLastChecked(null);
  }, []);

  /**
   * Get permission summary for debugging
   * Implements permission status management as per requirement 2.1
   */
  const getPermissionSummary = useCallback(() => {
    return {
      granted,
      status,
      canAskAgain,
      loading,
      error,
      lastChecked,
      needsRefresh: needsRefresh(),
      statusMessage: getStatusMessage(),
      statusColor: getStatusColor()
    };
  }, [granted, status, canAskAgain, loading, error, lastChecked, needsRefresh, getStatusMessage, getStatusColor]);

  return {
    // State
    granted,
    status,
    canAskAgain,
    loading,
    error,
    lastChecked,
    
    // Computed
    statusMessage: getStatusMessage(),
    statusColor: getStatusColor(),
    needsRefresh: needsRefresh(),
    
    // Actions
    checkPermissions,
    requestPermissions,
    openSettings,
    showSettingsPrompt,
    handleAppStateChange,
    clearError,
    reset,
    
    // Utilities
    getPermissionSummary,
  };
};

export default useMapPermissions;