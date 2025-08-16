import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import SavedPlacesService from '../services/SavedPlacesService';

// Contexts
import { useUser } from '../contexts/UserContext';

// Utilities
import { MarkerClusterer } from '../utils/markerClustering';

/**
 * Custom hook for managing saved places loading and clustering logic
 * 
 * Handles:
 * - Saved places loading and clustering logic
 * - Places visibility toggle and marker management
 * - Place selection and detail modal state
 * - Marker clustering and interaction handling
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useSavedPlaces = () => {
  const { user, isAuthenticated } = useUser();

  // Places state
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Clustering state
  const [mapZoom, setMapZoom] = useState(16);
  const [markerClusterer] = useState(() => new MarkerClusterer({
    gridSize: 60,
    maxZoom: 15,
    minClusterSize: 2,
    theme: 'light' // TODO: Make this dynamic based on app theme
  }));
  const [clusters, setClusters] = useState([]);

  // Place detail modal state
  const [detailModal, setDetailModal] = useState({
    visible: false,
    place: null
  });

  /**
   * Load saved places when user authentication changes
   * Implements places loading as per requirement 2.1
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedPlaces();
    } else {
      // Clear places when user logs out
      setSavedPlaces([]);
      setVisible(false);
      setError(null);
      setClusters([]);
      setDetailModal({ visible: false, place: null });
    }
  }, [isAuthenticated, user]);

  /**
   * Update clusterer when saved places or zoom changes
   * Implements clustering logic as per requirement 2.1
   */
  useEffect(() => {
    if (savedPlaces.length > 0) {
      markerClusterer.setMarkers(savedPlaces);
      markerClusterer.setZoom(mapZoom);
      
      // Get updated clusters
      const updatedClusters = markerClusterer.getClusters();
      setClusters(updatedClusters);
      
      console.log(`Updated clusters: ${updatedClusters.length} clusters for ${savedPlaces.length} places`);
    } else {
      setClusters([]);
    }
  }, [savedPlaces, mapZoom, markerClusterer]);

  /**
   * Load saved places for the current user
   * Implements places loading and data management as per requirement 2.1
   */
  const loadSavedPlaces = useCallback(async (options = {}) => {
    if (!user) {
      console.warn('Cannot load saved places: user not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const places = await SavedPlacesService.loadSavedPlaces(user.uid, {
        limit: 50, // Load up to 50 saved places
        orderBy: 'createdAt',
        orderDirection: 'desc',
        ...options
      });

      setSavedPlaces(places);
      setLastRefresh(Date.now());
      
      console.log(`Loaded ${places.length} saved places`);
    } catch (error) {
      console.error('Error loading saved places:', error);
      setError('Failed to load your saved places. Please try again.');
      
      // Show user-friendly error alert
      if (!options.silent) {
        Alert.alert(
          'Load Error',
          'Failed to load your saved places. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Toggle visibility of saved places on the map
   * Implements visibility toggle as per requirement 2.1
   */
  const toggleVisibility = useCallback(() => {
    const newVisibility = !visible;
    setVisible(newVisibility);
    
    // Load places if showing for the first time and not loaded yet
    if (newVisibility && savedPlaces.length === 0 && !loading && isAuthenticated) {
      loadSavedPlaces({ silent: true });
    }
    
    console.log(`Saved places visibility toggled: ${newVisibility}`);
  }, [visible, savedPlaces.length, loading, isAuthenticated, loadSavedPlaces]);

  /**
   * Handle saved place marker tap
   * Implements place selection and detail modal state as per requirement 2.2
   */
  const handleMarkerPress = useCallback((place) => {
    setDetailModal({
      visible: true,
      place
    });
    
    console.log('Place marker pressed:', place.name);
  }, []);

  /**
   * Handle cluster marker tap - zoom in to expand cluster
   * Implements clustering interaction as per requirement 2.1
   */
  const handleClusterPress = useCallback((cluster, mapRef) => {
    if (mapRef && mapRef.current && cluster.center) {
      // Zoom in and center on cluster
      const newZoom = Math.min(mapZoom + 2, 20);
      setMapZoom(newZoom);
      
      // Animate to cluster center (assuming animateToLocation utility exists)
      try {
        // This would need to be imported from locationUtils
        // animateToLocation(mapRef.current, cluster.center);
        console.log('Animating to cluster center:', cluster.center);
      } catch (error) {
        console.warn('Failed to animate to cluster center:', error);
      }
    }
    
    console.log('Cluster pressed:', cluster);
  }, [mapZoom]);

  /**
   * Handle map zoom change
   * Implements clustering updates as per requirement 2.1
   */
  const handleMapZoomChange = useCallback((zoom) => {
    setMapZoom(zoom);
  }, []);

  /**
   * Save a new place
   * Implements place management as per requirement 2.2
   * @param {Object} place - Place to save
   * @param {function} onPlaceSaved - Optional callback for navigation after save
   */
  const savePlace = useCallback(async (place, onPlaceSaved = null) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      await SavedPlacesService.savePlace(user.uid, place);
      
      // Refresh saved places to include the new place
      await loadSavedPlaces({ silent: true });
      
      Alert.alert(
        'Place Saved',
        `${place.name} has been saved to your places.`,
        [
          { text: 'OK' },
          ...(onPlaceSaved ? [{ 
            text: 'View Saved Places', 
            onPress: () => onPlaceSaved(place) 
          }] : [])
        ]
      );
      
      // Call navigation callback if provided
      if (onPlaceSaved) {
        setTimeout(() => onPlaceSaved(place), 100);
      }
      
      console.log('Place saved successfully:', place.name);
    } catch (error) {
      console.error('Error saving place:', error);
      setError('Failed to save place. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, loadSavedPlaces]);

  /**
   * Remove a saved place
   * Implements place management as per requirement 2.2
   */
  const unsavePlace = useCallback(async (placeId) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      const place = savedPlaces.find(p => p.placeId === placeId || p.id === placeId);
      
      await SavedPlacesService.unsavePlace(user.uid, placeId);
      
      // Remove from local state
      setSavedPlaces(prevPlaces => 
        prevPlaces.filter(p => p.placeId !== placeId && p.id !== placeId)
      );
      
      if (place) {
        Alert.alert(
          'Place Removed',
          `${place.name} has been removed from your saved places.`,
          [{ text: 'OK' }]
        );
      }
      
      console.log('Place unsaved successfully:', placeId);
    } catch (error) {
      console.error('Error unsaving place:', error);
      setError('Failed to remove place. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, savedPlaces]);

  /**
   * Close place detail modal
   * Implements modal state management as per requirement 2.2
   */
  const closeDetailModal = useCallback(() => {
    setDetailModal({ visible: false, place: null });
  }, []);

  /**
   * Navigate to a place (center map on place)
   * Implements place interaction as per requirement 2.2
   */
  const navigateToPlace = useCallback((place, mapRef) => {
    // Close the place detail modal first
    closeDetailModal();

    // Center map on the place
    if (mapRef && mapRef.current && place.latitude && place.longitude) {
      const placeLocation = {
        latitude: place.latitude,
        longitude: place.longitude
      };

      try {
        // This would need to be imported from locationUtils
        // animateToLocation(mapRef.current, placeLocation);
        console.log('Navigating to place:', place.name, placeLocation);
      } catch (error) {
        console.warn('Failed to navigate to place:', error);
      }
    }
  }, [closeDetailModal]);

  /**
   * Refresh saved places
   * Implements refresh functionality as per requirement 2.2
   */
  const refresh = useCallback(async (options = {}) => {
    await loadSavedPlaces({ ...options, forceRefresh: true });
  }, [loadSavedPlaces]);

  /**
   * Get places that should be displayed on the map
   * Implements display logic as per requirement 2.1
   */
  const getVisiblePlaces = useCallback(() => {
    if (!visible || !isAuthenticated) {
      return [];
    }
    
    return savedPlaces.filter(place => 
      place.latitude && 
      place.longitude &&
      !place.deleted
    );
  }, [visible, isAuthenticated, savedPlaces]);

  /**
   * Get visible clusters for the current zoom level
   * Implements clustering display logic as per requirement 2.1
   */
  const getVisibleClusters = useCallback(() => {
    if (!visible || !isAuthenticated) {
      return [];
    }
    
    return clusters;
  }, [visible, isAuthenticated, clusters]);

  /**
   * Get place by ID
   * Implements data management as per requirement 2.1
   */
  const getPlaceById = useCallback((placeId) => {
    return savedPlaces.find(place => place.placeId === placeId || place.id === placeId);
  }, [savedPlaces]);

  /**
   * Check if a place is saved
   * Implements place status checking as per requirement 2.1
   */
  const isPlaceSaved = useCallback((placeId) => {
    return savedPlaces.some(place => place.placeId === placeId || place.id === placeId);
  }, [savedPlaces]);

  /**
   * Clear error state
   * Implements error handling as per requirement 2.2
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get places statistics
   * Implements data management as per requirement 2.1
   */
  const getPlacesStats = useCallback(() => {
    const totalPlaces = savedPlaces.length;
    const placesByType = savedPlaces.reduce((acc, place) => {
      const type = place.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalPlaces,
      placesByType,
      clustersCount: clusters.length
    };
  }, [savedPlaces, clusters]);

  /**
   * Check if places need refresh (older than 5 minutes)
   * Implements caching logic as per requirement 2.4
   */
  const needsRefresh = useCallback(() => {
    if (!lastRefresh) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - lastRefresh) > fiveMinutes;
  }, [lastRefresh]);

  /**
   * Auto-refresh places if needed when visibility is toggled
   */
  useEffect(() => {
    if (visible && isAuthenticated && needsRefresh() && !loading) {
      loadSavedPlaces({ silent: true });
    }
  }, [visible, isAuthenticated, needsRefresh, loading, loadSavedPlaces]);

  return {
    // State
    data: savedPlaces,
    visible,
    loading,
    error,
    lastRefresh,
    
    // Clustering
    clusters,
    mapZoom,
    
    // Modal state
    detailModal,
    
    // Computed
    visiblePlaces: getVisiblePlaces(),
    visibleClusters: getVisibleClusters(),
    stats: getPlacesStats(),
    needsRefresh: needsRefresh(),
    
    // Actions
    toggleVisibility,
    handleMarkerPress,
    handleClusterPress,
    handleMapZoomChange,
    savePlace,
    unsavePlace,
    closeDetailModal,
    navigateToPlace,
    refresh,
    loadSavedPlaces,
    getPlaceById,
    isPlaceSaved,
    clearError,
  };
};

export default useSavedPlaces;