/**
 * SavedPlaceMarker Component
 * 
 * Renders a marker for a saved place with appropriate Google Place Icon
 * and theme-aware styling. Handles tap events to show place details.
 * 
 * Requirements addressed:
 * - 6.2: Display markers with Google Place Icons appropriate to place type
 * - 6.6: Theme-aware styling for markers
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SavedPlacesService from '../../services/SavedPlacesService';

const SavedPlaceMarker = ({ 
  place, 
  theme = 'light', 
  size = 32, 
  onPress,
  style 
}) => {
  // Get appropriate icon for the place type
  const iconName = SavedPlacesService.getPlaceIcon(place);
  
  // Get theme-aware marker style
  const markerStyle = SavedPlacesService.getMarkerStyle(place, theme);
  
  // Get icon color based on theme
  const getIconColor = () => {
    switch (theme) {
      case 'dark':
        return '#64B5F6';
      case 'adventure':
        return '#FFD700';
      default:
        return '#4A90E2';
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(place);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, markerStyle, { width: size, height: size, borderRadius: size / 2 }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Saved place: ${place.name}`}
      accessibilityHint="Tap to view place details"
    >
      <Ionicons
        name={iconName}
        size={size * 0.6}
        color={getIconColor()}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SavedPlaceMarker;