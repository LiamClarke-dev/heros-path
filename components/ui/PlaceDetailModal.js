/**
 * PlaceDetailModal Component
 * 
 * Modal component that displays detailed information about a place using
 * Google Places UI Kit styling and provides navigation, saving, and sharing options.
 * 
 * Requirements addressed:
 * - 6.3: Display detailed information using Google Places UI Kit
 * - 6.6: Theme-aware styling for place details
 * - 6.7: Navigation, saving, and sharing options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SavedPlacesService from '../../services/SavedPlacesService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PlaceDetailModal = ({
  visible,
  place,
  theme = 'light',
  onClose,
  onSave,
  onUnsave,
  onNavigate,
  isAuthenticated = false,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get theme-aware styles
  const themeStyle = SavedPlacesService.getPlaceDetailStyle(theme);

  useEffect(() => {
    if (place) {
      setIsSaved(place.saved || false);
    }
  }, [place]);

  if (!place) return null;

  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to save places.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      
      if (isSaved) {
        // Unsave the place
        if (onUnsave) {
          await onUnsave(place);
        }
        setIsSaved(false);
      } else {
        // Save the place
        if (onSave) {
          await onSave(place);
        }
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling place save status:', error);
      Alert.alert(
        'Error',
        `Failed to ${isSaved ? 'unsave' : 'save'} place. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(place);
    } else {
      // Default navigation using device's default maps app
      const url = `https://maps.google.com/?q=${place.latitude},${place.longitude}`;
      Linking.openURL(url).catch(err => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Could not open maps application.');
      });
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        title: place.name,
        message: `Check out ${place.name}${place.vicinity ? ` at ${place.vicinity}` : ''}`,
        url: `https://maps.google.com/?q=${place.latitude},${place.longitude}`,
      };

      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing place:', error);
      Alert.alert('Error', 'Could not share place.');
    }
  };

  const getPlaceIcon = () => {
    return SavedPlacesService.getPlaceIcon(place);
  };

  const getPlaceCategory = () => {
    return SavedPlacesService.getPlaceCategory(place);
  };

  const formatRating = (rating) => {
    if (!rating) return 'No rating';
    return `${rating.toFixed(1)} ★`;
  };

  const formatPriceLevel = (priceLevel) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: themeStyle.backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeStyle.borderColor }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close place details"
          >
            <Ionicons name="close" size={24} color={themeStyle.textColor} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.placeIconContainer}>
              <Ionicons
                name={getPlaceIcon()}
                size={24}
                color={themeStyle.buttonColor}
              />
            </View>
            <Text style={[styles.headerTitle, { color: themeStyle.textColor }]} numberOfLines={1}>
              {place.name}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: isSaved ? themeStyle.buttonColor : 'transparent' }]}
            onPress={handleSave}
            disabled={loading}
            accessibilityLabel={isSaved ? 'Unsave place' : 'Save place'}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isSaved ? themeStyle.buttonTextColor : themeStyle.buttonColor}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[styles.placeName, { color: themeStyle.textColor }]}>
              {place.name}
            </Text>
            
            {place.vicinity && (
              <Text style={[styles.placeAddress, { color: themeStyle.secondaryTextColor }]}>
                {place.vicinity}
              </Text>
            )}
            
            <Text style={[styles.placeCategory, { color: themeStyle.secondaryTextColor }]}>
              {getPlaceCategory()}
            </Text>
          </View>

          {/* Rating and Price */}
          {(place.rating || place.priceLevel) && (
            <View style={[styles.section, styles.ratingSection]}>
              {place.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={[styles.ratingText, { color: themeStyle.textColor }]}>
                    {formatRating(place.rating)}
                  </Text>
                </View>
              )}
              
              {place.priceLevel && (
                <View style={styles.priceContainer}>
                  <Text style={[styles.priceText, { color: themeStyle.textColor }]}>
                    {formatPriceLevel(place.priceLevel)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Opening Hours */}
          {place.openingHours && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeStyle.textColor }]}>
                Hours
              </Text>
              <Text style={[styles.hoursText, { color: themeStyle.secondaryTextColor }]}>
                {place.openingHours.open_now ? 'Open now' : 'Closed'}
              </Text>
            </View>
          )}

          {/* Place Types */}
          {place.types && place.types.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeStyle.textColor }]}>
                Categories
              </Text>
              <View style={styles.typesContainer}>
                {place.types.slice(0, 5).map((type, index) => (
                  <View
                    key={index}
                    style={[styles.typeTag, { backgroundColor: themeStyle.borderColor }]}
                  >
                    <Text style={[styles.typeText, { color: themeStyle.secondaryTextColor }]}>
                      {type.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Coordinates (for debugging/development) */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeStyle.textColor }]}>
                Coordinates
              </Text>
              <Text style={[styles.coordinatesText, { color: themeStyle.secondaryTextColor }]}>
                {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { borderTopColor: themeStyle.borderColor }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeStyle.buttonColor }]}
            onPress={handleNavigate}
            accessibilityLabel="Navigate to place"
          >
            <Ionicons name="navigate" size={20} color={themeStyle.buttonTextColor} />
            <Text style={[styles.actionButtonText, { color: themeStyle.buttonTextColor }]}>
              Navigate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeStyle.buttonColor }]}
            onPress={handleShare}
            accessibilityLabel="Share place"
          >
            <Ionicons name="share" size={20} color={themeStyle.buttonTextColor} />
            <Text style={[styles.actionButtonText, { color: themeStyle.buttonTextColor }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  placeIconContainer: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  saveButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 16,
  },
  placeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 16,
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ratingText: {
    fontSize: 16,
    marginLeft: 4,
  },
  priceContainer: {
    marginLeft: 16,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 16,
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  coordinatesText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PlaceDetailModal;