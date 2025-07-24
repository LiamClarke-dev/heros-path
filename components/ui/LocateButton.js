import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

/**
 * LocateButton Component
 * 
 * A button that centers the map on the user's current location with animation.
 * Includes loading indicator during location acquisition and error handling.
 * 
 * Requirements addressed:
 * - 1.5: Add UI button for centering map on current location
 * - 1.5: Create locateMe function with animation to current position
 * - 1.5: Add loading indicator during location acquisition
 */

const LocateButton = ({ onLocationFound, onError, style, theme = 'light' }) => {
  const [isLocating, setIsLocating] = useState(false);

  /**
   * Handles the locate me functionality
   * Gets current location and calls onLocationFound callback
   */
  const handleLocateMe = async () => {
    if (isLocating) return; // Prevent multiple simultaneous requests

    setIsLocating(true);

    try {
      // Check if location services are enabled
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        onError?.('Location permission not granted. Please enable location access in settings.');
        return;
      }

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000, // 10 second timeout
        maximumAge: 5000, // Accept location up to 5 seconds old
      });

      const { latitude, longitude } = location.coords;

      // Call the callback with the location data
      onLocationFound?.({
        latitude,
        longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      });

    } catch (error) {
      console.error('Error getting location:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Unable to get your location. ';
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage += 'Location request timed out. Please try again.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage += 'Location services are not available.';
      } else if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorMessage += 'Please enable location services in your device settings.';
      } else {
        errorMessage += 'Please check your location settings and try again.';
      }
      
      onError?.(errorMessage);
    } finally {
      setIsLocating(false);
    }
  };

  // Theme-based styling
  const buttonStyle = [
    styles.button,
    theme === 'dark' ? styles.buttonDark : styles.buttonLight,
    style
  ];

  const iconColor = theme === 'dark' ? '#FFFFFF' : '#333333';

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handleLocateMe}
      disabled={isLocating}
      activeOpacity={0.7}
      accessibilityLabel="Center map on my location"
      accessibilityHint="Tap to center the map on your current location"
    >
      {isLocating ? (
        <ActivityIndicator 
          size="small" 
          color={iconColor}
          accessibilityLabel="Finding your location"
        />
      ) : (
        <Ionicons 
          name="locate" 
          size={24} 
          color={iconColor}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonDark: {
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#404040',
  },
});

export default LocateButton;