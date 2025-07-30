import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Services
import JourneyService from '../services/JourneyService';

// Contexts
import { useUser } from '../contexts/UserContext';

/**
 * Custom hook for managing saved routes loading and display logic
 * 
 * Handles:
 * - Saved routes loading and display logic
 * - Routes visibility toggle and data management
 * - Routes refresh and error states
 * - Route data caching and optimization
 * 
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
 */
const useSavedRoutes = () => {
  const { user, isAuthenticated } = useUser();

  // Routes state
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  /**
   * Load saved routes when user authentication changes
   * Implements routes loading as per requirement 2.1
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedRoutes();
    } else {
      // Clear routes when user logs out
      setSavedRoutes([]);
      setVisible(false);
      setError(null);
    }
  }, [isAuthenticated, user]);

  /**
   * Load saved routes for the current user
   * Implements routes loading and data management as per requirement 2.1
   */
  const loadSavedRoutes = useCallback(async (options = {}) => {
    if (!user) {
      console.warn('Cannot load saved routes: user not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const routes = await JourneyService.getUserJourneys(user.uid, {
        limit: 20, // Load last 20 journeys
        orderBy: 'createdAt',
        orderDirection: 'desc',
        ...options
      });

      setSavedRoutes(routes);
      setLastRefresh(Date.now());
      
      console.log(`Loaded ${routes.length} saved routes`);
    } catch (error) {
      console.error('Error loading saved routes:', error);
      setError('Failed to load your saved routes. Please try again.');
      
      // Show user-friendly error alert
      if (!options.silent) {
        Alert.alert(
          'Load Error',
          'Failed to load your saved routes. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Toggle visibility of saved routes on the map
   * Implements visibility toggle as per requirement 2.1
   */
  const toggleVisibility = useCallback(() => {
    const newVisibility = !visible;
    setVisible(newVisibility);
    
    // Load routes if showing for the first time and not loaded yet
    if (newVisibility && savedRoutes.length === 0 && !loading && isAuthenticated) {
      loadSavedRoutes({ silent: true });
    }
    
    console.log(`Saved routes visibility toggled: ${newVisibility}`);
  }, [visible, savedRoutes.length, loading, isAuthenticated, loadSavedRoutes]);

  /**
   * Refresh saved routes
   * Implements routes refresh as per requirement 2.2
   */
  const refresh = useCallback(async (options = {}) => {
    await loadSavedRoutes({ ...options, forceRefresh: true });
  }, [loadSavedRoutes]);

  /**
   * Get routes that should be displayed on the map
   * Implements display logic as per requirement 2.1
   */
  const getVisibleRoutes = useCallback(() => {
    if (!visible || !isAuthenticated) {
      return [];
    }
    
    return savedRoutes.filter(route => 
      route.route && 
      route.route.length > 1 && 
      route.status === 'completed'
    );
  }, [visible, isAuthenticated, savedRoutes]);

  /**
   * Get route by ID
   * Implements data management as per requirement 2.1
   */
  const getRouteById = useCallback((routeId) => {
    return savedRoutes.find(route => route.id === routeId);
  }, [savedRoutes]);

  /**
   * Delete a saved route
   * Implements route management as per requirement 2.2
   */
  const deleteRoute = useCallback(async (routeId) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      await JourneyService.deleteJourney(user.uid, routeId);
      
      // Remove from local state
      setSavedRoutes(prevRoutes => 
        prevRoutes.filter(route => route.id !== routeId)
      );
      
      console.log(`Route ${routeId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting route:', error);
      setError('Failed to delete route. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Update a saved route
   * Implements route management as per requirement 2.2
   */
  const updateRoute = useCallback(async (routeId, updates) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      const updatedRoute = await JourneyService.updateJourney(user.uid, routeId, updates);
      
      // Update local state
      setSavedRoutes(prevRoutes => 
        prevRoutes.map(route => 
          route.id === routeId ? { ...route, ...updatedRoute } : route
        )
      );
      
      console.log(`Route ${routeId} updated successfully`);
      return updatedRoute;
    } catch (error) {
      console.error('Error updating route:', error);
      setError('Failed to update route. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Clear error state
   * Implements error handling as per requirement 2.2
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get route statistics
   * Implements data management as per requirement 2.1
   */
  const getRouteStats = useCallback(() => {
    const totalRoutes = savedRoutes.length;
    const totalDistance = savedRoutes.reduce((sum, route) => sum + (route.distance || 0), 0);
    const totalDuration = savedRoutes.reduce((sum, route) => sum + (route.duration || 0), 0);
    
    return {
      totalRoutes,
      totalDistance: Math.round(totalDistance),
      totalDuration,
      averageDistance: totalRoutes > 0 ? Math.round(totalDistance / totalRoutes) : 0,
      averageDuration: totalRoutes > 0 ? Math.round(totalDuration / totalRoutes) : 0
    };
  }, [savedRoutes]);

  /**
   * Check if routes need refresh (older than 5 minutes)
   * Implements caching logic as per requirement 2.4
   */
  const needsRefresh = useCallback(() => {
    if (!lastRefresh) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - lastRefresh) > fiveMinutes;
  }, [lastRefresh]);

  /**
   * Auto-refresh routes if needed when visibility is toggled
   */
  useEffect(() => {
    if (visible && isAuthenticated && needsRefresh() && !loading) {
      loadSavedRoutes({ silent: true });
    }
  }, [visible, isAuthenticated, needsRefresh, loading, loadSavedRoutes]);

  return {
    // State
    data: savedRoutes,
    visible,
    loading,
    error,
    lastRefresh,
    
    // Computed
    visibleRoutes: getVisibleRoutes(),
    stats: getRouteStats(),
    needsRefresh: needsRefresh(),
    
    // Actions
    toggleVisibility,
    refresh,
    loadSavedRoutes,
    getRouteById,
    deleteRoute,
    updateRoute,
    clearError,
  };
};

export default useSavedRoutes;