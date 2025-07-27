import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getAvailableMapStyles, MAP_STYLES } from '../../utils/mapProvider';
import MapStyleService from '../../services/MapStyleService';

/**
 * MapStyleSelector Component
 * 
 * Provides a UI for users to select and switch between different map styles.
 * Integrates with the theme system and persists user preferences.
 * 
 * Requirements addressed:
 * - 4.1: Display available map style options
 * - 4.2: Immediately apply selected style
 * - 4.3: Update map colors to match theme
 * - 4.4: Remember previously selected map style
 */

const { width } = Dimensions.get('window');

const MapStyleSelector = ({ 
  visible, 
  onClose, 
  currentStyle, 
  onStyleChange,
  showNightModeOption = true 
}) => {
  const { theme, currentTheme } = useTheme();
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [availableStyles, setAvailableStyles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load available styles on mount
  useEffect(() => {
    const styles = getAvailableMapStyles();
    
    // Filter out night mode if not requested and it's daytime
    let filteredStyles = styles;
    if (!showNightModeOption) {
      const currentHour = new Date().getHours();
      const isDaytime = currentHour >= 6 && currentHour < 20;
      
      if (isDaytime) {
        filteredStyles = styles.filter(style => style.key !== MAP_STYLES.NIGHT);
      }
    }
    
    setAvailableStyles(filteredStyles);
  }, [showNightModeOption]);

  // Update selected style when current style changes
  useEffect(() => {
    setSelectedStyle(currentStyle);
  }, [currentStyle]);

  /**
   * Handle style selection
   */
  const handleStyleSelect = async (styleKey) => {
    try {
      setIsLoading(true);
      setSelectedStyle(styleKey);

      // Save the style preference
      const success = await MapStyleService.saveMapStyle(styleKey);
      
      if (success) {
        // Notify parent component of style change
        onStyleChange(styleKey);
        
        // Close modal after a brief delay to show selection
        setTimeout(() => {
          onClose();
        }, 300);
      } else {
        Alert.alert(
          'Error',
          'Failed to save map style preference. Please try again.',
          [{ text: 'OK' }]
        );
        setSelectedStyle(currentStyle); // Revert selection
      }
    } catch (error) {
      console.error('Error selecting map style:', error);
      Alert.alert(
        'Error',
        'Failed to change map style. Please try again.',
        [{ text: 'OK' }]
      );
      setSelectedStyle(currentStyle); // Revert selection
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get style preview colors based on current theme
   */
  const getStylePreviewColors = (style) => {
    const themeName = currentTheme === 'system' 
      ? (theme.dark ? 'dark' : 'light')
      : currentTheme;

    return style.themes[themeName] || style.themes.light;
  };

  /**
   * Render individual style option
   */
  const renderStyleOption = (style) => {
    const isSelected = selectedStyle === style.key;
    const previewColors = getStylePreviewColors(style);
    
    return (
      <TouchableOpacity
        key={style.key}
        style={[
          styles.styleOption,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => handleStyleSelect(style.key)}
        disabled={isLoading}
      >
        {/* Style preview */}
        <View style={[
          styles.stylePreview,
          { backgroundColor: theme.colors.background }
        ]}>
          {/* Mock map background */}
          <View style={[
            styles.mockMapBackground,
            { 
              backgroundColor: style.key === MAP_STYLES.NIGHT || style.key === MAP_STYLES.ADVENTURE
                ? '#2F4F4F' 
                : '#E8F4FD' 
            }
          ]} />
          
          {/* Mock route line */}
          <View style={[
            styles.mockRouteLine,
            { backgroundColor: previewColors.polylineColor }
          ]} />
          
          {/* Mock marker */}
          <View style={[
            styles.mockMarker,
            { backgroundColor: previewColors.markerTint }
          ]} />
        </View>

        {/* Style info */}
        <View style={styles.styleInfo}>
          <Text style={[
            styles.styleName,
            { color: theme.colors.text }
          ]}>
            {style.name}
          </Text>
          <Text style={[
            styles.styleDescription,
            { color: theme.colors.textSecondary }
          ]}>
            {style.description}
          </Text>
        </View>

        {/* Selection indicator */}
        {isSelected && (
          <View style={[
            styles.selectionIndicator,
            { backgroundColor: theme.colors.primary }
          ]}>
            <Ionicons 
              name="checkmark" 
              size={16} 
              color={theme.colors.background} 
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[
        styles.container,
        { backgroundColor: theme.colors.background }
      ]}>
        {/* Header */}
        <View style={[
          styles.header,
          { borderBottomColor: theme.colors.border }
        ]}>
          <Text style={[
            styles.headerTitle,
            { color: theme.colors.text }
          ]}>
            Map Style
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
        </View>

        {/* Styles list */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {availableStyles.map(renderStyleOption)}
        </ScrollView>

        {/* Footer info */}
        <View style={[
          styles.footer,
          { borderTopColor: theme.colors.border }
        ]}>
          <Text style={[
            styles.footerText,
            { color: theme.colors.textSecondary }
          ]}>
            Map styles adapt to your current theme. Some styles may not be available on all platforms.
          </Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  styleOption: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stylePreview: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  mockMapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mockRouteLine: {
    position: 'absolute',
    top: 30,
    left: 20,
    right: 40,
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  mockMarker: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  styleInfo: {
    padding: 16,
  },
  styleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default MapStyleSelector;