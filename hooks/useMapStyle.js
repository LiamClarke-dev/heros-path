import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import MapStyleService from '../services/MapStyleService';

// Contexts
import { useTheme } from '../contexts/ThemeContext';

// Utilities
import { MAP_STYLES, getMapStyleConfig } from '../utils/mapProvider';

/**
 * Custom hook for managing map style and theme integration
 * 
 * Handles:
 * - Map style management and theme integration
 * - Style selector modal state and style changes
 * - Style persistence and configuration updates
 * - Theme-aware style configuration
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useMapStyle = () => {
  const { theme, currentTheme } = useTheme();

  // Map style state
  const [mapStyle, setMapStyle] = useState(MAP_STYLES.STANDARD);
  const [mapStyleConfig, setMapStyleConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Style selector modal state
  const [selector, setSelector] = useState({
    visible: false
  });

  /**
   * Initialize map style from saved preferences on mount
   * Implements style persistence as per requirement 3.2
   */
  useEffect(() => {
    initializeMapStyle();
  }, []);

  /**
   * Update map style configuration when theme or style changes
   * Implements theme integration as per requirement 2.1
   */
  useEffect(() => {
    updateMapStyleConfig();
  }, [mapStyle, currentTheme, theme]);

  /**
   * Initialize map style from saved preferences
   * Implements style persistence as per requirement 3.2
   */
  const initializeMapStyle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const savedStyle = await MapStyleService.loadMapStyle();
      setMapStyle(savedStyle);
      
      console.log('Map style initialized:', savedStyle);
    } catch (error) {
      console.error('Error initializing map style:', error);
      setError('Failed to load map style preferences');
      setMapStyle(MAP_STYLES.STANDARD);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update map style configuration based on current style and theme
   * Implements theme integration and configuration updates as per requirement 2.1
   */
  const updateMapStyleConfig = useCallback(() => {
    try {
      const config = MapStyleService.getThemeAwareStyleConfig(mapStyle, {
        currentTheme,
        theme
      });
      
      setMapStyleConfig(config);
      console.log('Map style config updated:', config);
    } catch (error) {
      console.error('Error updating map style config:', error);
      setError('Failed to update map style configuration');
    }
  }, [mapStyle, currentTheme, theme]);

  /**
   * Change map style and persist the change
   * Implements style changes and persistence as per requirement 2.1, 3.2
   */
  const changeStyle = useCallback(async (newStyle) => {
    if (!Object.values(MAP_STYLES).includes(newStyle)) {
      console.error('Invalid map style:', newStyle);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Update local state immediately for responsive UI
      setMapStyle(newStyle);
      
      // Persist the change
      await MapStyleService.saveMapStyle(newStyle);
      
      console.log('Map style changed to:', newStyle);
    } catch (error) {
      console.error('Error changing map style:', error);
      setError('Failed to save map style preference');
      
      Alert.alert(
        'Style Change Error',
        'Failed to change map style. Please try again.',
        [{ text: 'OK' }]
      );
      
      // Revert to previous style on error
      await initializeMapStyle();
    } finally {
      setLoading(false);
    }
  }, [initializeMapStyle]);

  /**
   * Handle map style change from selector
   * Implements style selector integration as per requirement 2.2
   */
  const handleStyleChange = useCallback(async (newStyle) => {
    await changeStyle(newStyle);
    
    // Close selector after successful change
    setSelector({ visible: false });
  }, [changeStyle]);

  /**
   * Toggle map style selector visibility
   * Implements selector modal state as per requirement 2.2
   */
  const toggleSelector = useCallback(() => {
    setSelector(prev => ({ visible: !prev.visible }));
  }, []);

  /**
   * Close style selector modal
   * Implements modal state management as per requirement 2.2
   */
  const closeSelector = useCallback(() => {
    setSelector({ visible: false });
  }, []);

  /**
   * Get available map styles with their display information
   * Implements style management as per requirement 2.1
   */
  const getAvailableStyles = useCallback(() => {
    return Object.entries(MAP_STYLES).map(([key, value]) => ({
      id: value,
      name: key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' '),
      value,
      isSelected: value === mapStyle
    }));
  }, [mapStyle]);

  /**
   * Get current style display name
   * Implements style management as per requirement 2.1
   */
  const getCurrentStyleName = useCallback(() => {
    const styleEntry = Object.entries(MAP_STYLES).find(([key, value]) => value === mapStyle);
    if (styleEntry) {
      return styleEntry[0].charAt(0) + styleEntry[0].slice(1).toLowerCase().replace('_', ' ');
    }
    return 'Standard';
  }, [mapStyle]);

  /**
   * Get theme-aware colors from current style config
   * Implements theme integration as per requirement 2.1
   */
  const getStyleColors = useCallback(() => {
    if (!mapStyleConfig || !mapStyleConfig.colors) {
      // Return default colors if config is not available
      return {
        polylineColor: '#00FF88',
        savedRouteColor: '#4A90E2',
        markerTint: '#4A90E2',
        clusterColor: '#FF6B6B',
        textColor: theme.dark ? '#FFFFFF' : '#000000'
      };
    }
    
    return mapStyleConfig.colors;
  }, [mapStyleConfig, theme]);

  /**
   * Get map configuration for the current style
   * Implements configuration management as per requirement 2.1
   */
  const getMapConfig = useCallback(() => {
    if (!mapStyleConfig) {
      return getMapStyleConfig(mapStyle);
    }
    
    return {
      mapType: mapStyleConfig.mapType,
      customMapStyle: mapStyleConfig.customStyle,
      showsUserLocation: true,
      showsMyLocationButton: false,
      showsCompass: false,
      showsScale: false,
      showsTraffic: false,
      showsBuildings: true,
      showsIndoors: true,
      ...mapStyleConfig.mapConfig
    };
  }, [mapStyleConfig, mapStyle]);

  /**
   * Reset to default style
   * Implements style management as per requirement 2.2
   */
  const resetToDefault = useCallback(async () => {
    await changeStyle(MAP_STYLES.STANDARD);
  }, [changeStyle]);

  /**
   * Clear error state
   * Implements error handling as per requirement 2.2
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if style is currently loading
   * Implements loading state management as per requirement 2.2
   */
  const isLoading = useCallback(() => {
    return loading;
  }, [loading]);

  /**
   * Get style configuration for a specific style (preview)
   * Implements style preview functionality as per requirement 2.1
   */
  const getStylePreview = useCallback((styleId) => {
    try {
      return MapStyleService.getThemeAwareStyleConfig(styleId, {
        currentTheme,
        theme
      });
    } catch (error) {
      console.error('Error getting style preview:', error);
      return null;
    }
  }, [currentTheme, theme]);

  return {
    // Current state
    mapStyle,
    config: mapStyleConfig,
    loading,
    error,
    
    // Selector state
    selector,
    
    // Computed values
    availableStyles: getAvailableStyles(),
    currentStyleName: getCurrentStyleName(),
    styleColors: getStyleColors(),
    mapConfig: getMapConfig(),
    
    // Actions
    changeStyle,
    handleStyleChange,
    toggleSelector,
    closeSelector,
    resetToDefault,
    clearError,
    getStylePreview,
    
    // Utilities
    isLoading,
  };
};

export default useMapStyle;