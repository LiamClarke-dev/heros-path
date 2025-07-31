import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import BackgroundLocationService from '../services/BackgroundLocationService';

// Utilities
import {
    getCurrentLocation,
    getCurrentLocationFast,
    animateToLocation,
    requestLocationPermissions,
    LOCATION_OPTIONS
} from '../utils/locationUtils';

/**
 * Custom hook for managing location tracking and GPS status
 * 
 * Handles:
 * - Location service initialization and management
 * - Location update callbacks and GPS status tracking
 * - Location permissions and service cleanup
 * - Current position and path tracking
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useLocationTracking = () => {
    // Location state
    const [currentPosition, setCurrentPosition] = useState(null);
    const [recentPositions, setRecentPositions] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [gpsStatus, setGpsStatus] = useState(null);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Service reference
    const locationServiceRef = useRef(null);

    /**
     * Initialize location service on mount
     * Implements service initialization as per requirement 3.1
     */
    useEffect(() => {
        initializeLocationService();

        // Cleanup on unmount
        return () => {
            cleanup();
        };
    }, []);

    /**
     * Initialize the BackgroundLocationService
     * Implements location service management as per requirement 2.1
     */
    const initializeLocationService = useCallback(async () => {
        try {
            if (!locationServiceRef.current) {
                locationServiceRef.current = BackgroundLocationService; // Use singleton instance
            }

            const result = await locationServiceRef.current.initialize({
                onPermissionPrompt: handlePermissionPrompt
            });

            if (result.success) {
                console.log('BackgroundLocationService initialized successfully');

                // Set up location update callback
                locationServiceRef.current.setLocationUpdateCallback(handleLocationUpdate);

                // Request initial permissions
                await requestInitialPermissions();
            } else {
                console.error('Failed to initialize BackgroundLocationService:', result.error);
                setGpsStatus({
                    indicator: 'ERROR',
                    level: 'ERROR',
                    message: 'Location service initialization failed',
                    accuracy: null,
                    signalStrength: 0
                });
            }
        } catch (error) {
            console.error('Error initializing location service:', error);
            setGpsStatus({
                indicator: 'ERROR',
                level: 'ERROR',
                message: 'Failed to initialize location tracking',
                accuracy: null,
                signalStrength: 0
            });
        }
    }, []);

    /**
     * Request initial location permissions
     * Implements permission handling as per requirement 3.2
     */
    const requestInitialPermissions = useCallback(async () => {
        try {
            const permissionResult = await requestLocationPermissions(true);

            if (permissionResult.granted) {
                setPermissionsGranted(true);

                // Get initial location with faster options for app startup
                const locationResult = await getCurrentLocation(LOCATION_OPTIONS.INITIAL_LOAD);

                if (locationResult.success) {
                    const initialPosition = {
                        ...locationResult.location,
                        timestamp: Date.now()
                    };
                    setCurrentPosition(initialPosition);
                    setRecentPositions([initialPosition]);

                    setGpsStatus({
                        indicator: 'GOOD',
                        level: 'GOOD',
                        message: 'GPS signal is strong',
                        accuracy: locationResult.location.accuracy,
                        signalStrength: 85
                    });
                } else {
                    console.warn('Could not get initial location:', locationResult.error);
                    setGpsStatus({
                        indicator: 'POOR',
                        level: 'POOR',
                        message: 'Getting GPS location...',
                        accuracy: null,
                        signalStrength: 20
                    });

                    // If initial location fails, start continuous location updates
                    // to get location as soon as GPS is ready
                    startContinuousLocationUpdates();
                }
            } else {
                setPermissionsGranted(false);
                setGpsStatus({
                    indicator: 'ERROR',
                    message: 'Location permission denied'
                });

                // Set up a retry mechanism to check for permissions periodically
                // This helps if user grants permissions later through settings
                const retryInterval = setInterval(async () => {
                    try {
                        const retryResult = await requestLocationPermissions(false); // Just foreground for retry
                        if (retryResult.granted) {
                            clearInterval(retryInterval);
                            setPermissionsGranted(true);

                            // Get location now that we have permissions
                            const locationResult = await getCurrentLocation(LOCATION_OPTIONS.INITIAL_LOAD);
                            if (locationResult.success) {
                                const initialPosition = {
                                    ...locationResult.location,
                                    timestamp: Date.now()
                                };
                                setCurrentPosition(initialPosition);
                                setRecentPositions([initialPosition]);

                                setGpsStatus({
                                    indicator: 'GOOD',
                                    message: 'GPS signal is strong'
                                });
                            }
                        }
                    } catch (error) {
                        // Ignore retry errors
                    }
                }, 5000); // Check every 5 seconds

                // Clear retry after 2 minutes to avoid infinite retries
                setTimeout(() => clearInterval(retryInterval), 120000);
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            setPermissionsGranted(false);
            setGpsStatus({
                indicator: 'ERROR',
                message: 'Permission request failed'
            });
        }
    }, []);

    /**
     * Handle permission prompts from BackgroundLocationService
     * Implements permission error handling as per requirement 3.2
     */
    const handlePermissionPrompt = useCallback((promptData) => {
        const { type, title, message } = promptData;

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Settings',
                    onPress: () => {
                        // TODO: Open device settings
                        console.log('Open settings for permissions');
                    }
                },
            ]
        );
    }, []);

    /**
     * Handle location updates from BackgroundLocationService
     * Implements location update callbacks as per requirement 2.1
     */
    const handleLocationUpdate = useCallback((location) => {
        if (location.type === 'error' || location.type === 'warning') {
            console.warn('Location update warning/error:', location.message);

            // Update GPS status based on error type
            if (location.type === 'error') {
                setGpsStatus({
                    indicator: 'LOST',
                    level: 'LOST',
                    message: location.message || 'GPS signal lost',
                    accuracy: null,
                    signalStrength: 0
                });
            } else {
                setGpsStatus({
                    indicator: 'POOR',
                    level: 'POOR',
                    message: location.message || 'GPS signal is weak',
                    accuracy: null,
                    signalStrength: 15
                });
            }
            return;
        }

        const newPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || null
        };

        // Update current position
        setCurrentPosition(newPosition);

        // Update recent positions for direction calculation (keep last 5 positions)
        setRecentPositions(prevPositions => {
            const updated = [...prevPositions, newPosition];
            return updated.slice(-5);
        });

        // Update GPS status based on accuracy
        const accuracy = location.coords.accuracy;
        if (accuracy <= 10) {
            setGpsStatus({
                indicator: 'GOOD',
                level: 'GOOD',
                message: 'GPS signal is strong',
                accuracy,
                signalStrength: Math.max(0, Math.min(100, 100 - (accuracy * 2)))
            });
        } else if (accuracy <= 50) {
            setGpsStatus({
                indicator: 'FAIR',
                level: 'FAIR', 
                message: 'GPS signal is fair',
                accuracy,
                signalStrength: Math.max(0, Math.min(100, 100 - (accuracy * 2)))
            });
        } else {
            setGpsStatus({
                indicator: 'POOR',
                level: 'POOR',
                message: 'GPS signal is weak',
                accuracy,
                signalStrength: Math.max(0, Math.min(100, 100 - (accuracy * 2)))
            });
        }
    }, []);

    /**
     * Handle locate me button press - optimized for fast response
     * Implements locate functionality as per requirement 2.1
     */
    const locateMe = useCallback(async (mapRef) => {
        // Permission handling is now centralized through useMapPermissions hook
        // This function assumes permissions are already granted when called
        if (!permissionsGranted) {
            console.warn('locateMe called without permissions - should be handled by useMapPermissions');
            return;
        }

        try {
            setIsLocating(true);
            console.log('Starting optimized locate me...');

            // Use the optimized fast location function
            const locationResult = await getCurrentLocationFast();

            if (locationResult.success) {
                const newPosition = {
                    ...locationResult.location,
                    timestamp: Date.now()
                };

                setCurrentPosition(newPosition);

                // Update recent positions
                setRecentPositions(prevPositions => {
                    const updated = [...prevPositions, newPosition];
                    return updated.slice(-5);
                });

                // Animate map to the new location if mapRef is provided
                // Handle both mapRef.current and direct mapRef cases
                const mapReference = mapRef?.current || mapRef;
                if (mapReference) {
                    console.log('Animating to location with map reference');
                    await animateToLocation(mapReference, locationResult.location);
                } else {
                    console.warn('Map reference not available for animation');
                }

                setGpsStatus({
                    indicator: 'GOOD',
                    message: 'Location found successfully',
                    accuracy: locationResult.location.accuracy
                });

                console.log('Locate me completed successfully');
            } else {
                throw new Error(locationResult.error || 'Failed to get current location');
            }
        } catch (error) {
            console.error('Error in locateMe:', error);
            Alert.alert(
                'Location Error',
                error.message || 'Failed to get your current location. Please try again.',
                [{ text: 'OK' }]
            );

            setGpsStatus({
                indicator: 'ERROR',
                message: 'Failed to get location'
            });
        } finally {
            setIsLocating(false);
        }
    }, [permissionsGranted]);

    /**
     * Start location tracking for journey recording
     * Implements GPS status tracking as per requirement 2.2
     */
    const startTracking = useCallback(async (journeyId, options = {}) => {
        if (!locationServiceRef.current) {
            throw new Error('Location service not initialized');
        }

        if (!permissionsGranted) {
            throw new Error('Location permissions not granted');
        }

        try {
            const success = await locationServiceRef.current.startTracking(journeyId, {
                warmup: true,
                timeInterval: 2000, // 2 seconds
                distanceInterval: 5, // 5 meters
                ...options
            });

            if (success) {
                setCurrentPath([]);
                setGpsStatus({
                    indicator: 'TRACKING',
                    message: 'Tracking your journey'
                });
                return true;
            } else {
                throw new Error('Failed to start location tracking');
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            setGpsStatus({
                indicator: 'ERROR',
                message: 'Failed to start tracking'
            });
            throw error;
        }
    }, [permissionsGranted]);

    /**
     * Stop location tracking
     * Implements service cleanup as per requirement 3.2
     */
    const stopTracking = useCallback(async () => {
        if (!locationServiceRef.current) {
            throw new Error('Location service not initialized');
        }

        try {
            const journeyData = await locationServiceRef.current.stopTracking();

            setGpsStatus({
                indicator: 'GOOD',
                message: 'Tracking stopped'
            });

            return journeyData;
        } catch (error) {
            console.error('Error stopping tracking:', error);
            setGpsStatus({
                indicator: 'ERROR',
                message: 'Failed to stop tracking'
            });
            throw error;
        }
    }, []);

    /**
     * Add position to current path (for journey tracking)
     */
    const addToPath = useCallback((position) => {
        setCurrentPath(prevPath => [...prevPath, position]);
    }, []);

    /**
     * Clear current path
     */
    const clearPath = useCallback(() => {
        setCurrentPath([]);
    }, []);

    /**
     * Start continuous location updates to get location as soon as GPS is ready
     * Used when initial location detection fails
     */
    const startContinuousLocationUpdates = useCallback(async () => {
        if (!locationServiceRef.current) {
            return;
        }

        try {
            // Start a temporary tracking session just to get location updates
            const tempJourneyId = `temp_location_${Date.now()}`;
            const success = await locationServiceRef.current.startTracking(tempJourneyId, {
                warmup: false, // Skip warmup for faster initial location
                timeInterval: 2000, // Check every 2 seconds
                distanceInterval: 0 // Get all updates
            });

            if (success) {
                console.log('Started continuous location updates for initial positioning');

                // Stop the temporary tracking after we get a location or after 30 seconds
                const stopTimeout = setTimeout(async () => {
                    try {
                        await locationServiceRef.current.stopTracking();
                        console.log('Stopped temporary location tracking after timeout');
                    } catch (error) {
                        console.warn('Error stopping temporary tracking:', error);
                    }
                }, 30000);

                // Clear timeout if we get a location
                const originalCallback = locationServiceRef.current.locationUpdateCallback;
                locationServiceRef.current.setLocationUpdateCallback((location) => {
                    // Call original callback
                    if (originalCallback) {
                        originalCallback(location);
                    }

                    // If we got a valid location, stop the temporary tracking
                    if (location && location.coords && location.coords.latitude) {
                        clearTimeout(stopTimeout);
                        locationServiceRef.current.stopTracking().then(() => {
                            console.log('Stopped temporary location tracking after getting location');
                        }).catch(error => {
                            console.warn('Error stopping temporary tracking:', error);
                        });

                        // Restore original callback
                        locationServiceRef.current.setLocationUpdateCallback(originalCallback);
                    }
                });
            }
        } catch (error) {
            console.error('Error starting continuous location updates:', error);
        }
    }, []);

    /**
     * Cleanup function for service and listeners
     * Implements proper cleanup as per requirement 3.2
     */
    const cleanup = useCallback(() => {
        if (locationServiceRef.current) {
            locationServiceRef.current.cleanup();
            locationServiceRef.current = null;
        }
    }, []);

    return {
        // State
        currentPosition,
        recentPositions,
        currentPath,
        gpsStatus,
        permissionsGranted,
        isLocating,

        // Actions
        locateMe,
        startTracking,
        stopTracking,
        addToPath,
        clearPath,

        // Service reference (for advanced usage)
        locationService: locationServiceRef.current,
    };
};

export default useLocationTracking;