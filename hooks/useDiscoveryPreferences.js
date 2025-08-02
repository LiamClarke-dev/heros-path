/**
 * Discovery Preferences Hook
 * 
 * Custom hook for managing discovery preferences state including place types,
 * minimum rating, and category expansion. Abstracts all business logic from
 * the UI components following modular architecture patterns.
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import discoveriesService from '../services/DiscoveriesService';
import { PlaceTypeUtils } from '../constants/PlaceTypes';

/**
 * Custom hook for discovery preferences management
 * Handles all state management and service integration for preferences
 */
export const useDiscoveryPreferences = () => {
  // State declarations
  const [preferences, setPreferences] = useState({});
  const [minRating, setMinRating] = useState(4.0);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Service reference
  const serviceRef = useRef(discoveriesService);

  /**
   * Load initial preferences from service with cloud sync
   */
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the new initialization method that handles cloud sync
      const initialized = await serviceRef.current.initializePreferences();

      setPreferences(initialized.preferences);
      setMinRating(initialized.minRating);

      // Initialize expanded categories based on enabled preferences
      const initialExpandedCategories = {};
      PlaceTypeUtils.getAllCategoryTitles().forEach(categoryTitle => {
        const hasEnabledTypes = PlaceTypeUtils.isCategoryEnabled(categoryTitle, initialized.preferences);
        // Expand categories that have enabled types by default
        initialExpandedCategories[categoryTitle] = hasEnabledTypes;
      });
      setExpandedCategories(initialExpandedCategories);

      // Process any pending changes from offline usage
      await serviceRef.current.processPendingChanges();

      console.log('useDiscoveryPreferences: Successfully loaded preferences with cloud sync');
    } catch (error) {
      console.error('useDiscoveryPreferences: Error loading preferences:', error);
      setError(error);
      
      // Set fallback values
      const defaultPreferences = PlaceTypeUtils.createDefaultPreferences();
      setPreferences(defaultPreferences);
      setMinRating(4.0);
      setExpandedCategories({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle category expansion state
   */
  const toggleCategory = useCallback((categoryTitle) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle],
    }));
    console.log(`useDiscoveryPreferences: Toggled category ${categoryTitle}`);
  }, []);

  /**
   * Toggle individual place type preference
   */
  const togglePlaceType = useCallback(async (placeTypeKey) => {
    try {
      const currentValue = preferences[placeTypeKey] || false;
      const newValue = !currentValue;

      // Optimistically update UI
      setPreferences(prev => ({
        ...prev,
        [placeTypeKey]: newValue,
      }));

      // Update through service
      const updatedPreferences = await serviceRef.current.updatePlaceTypePreference(
        placeTypeKey,
        newValue
      );

      // Update state with service response
      setPreferences(updatedPreferences);

      console.log(`useDiscoveryPreferences: Toggled ${placeTypeKey} to ${newValue}`);
    } catch (error) {
      console.error('useDiscoveryPreferences: Error toggling place type:', error);
      
      // Revert optimistic update on error
      setPreferences(prev => ({
        ...prev,
        [placeTypeKey]: !prev[placeTypeKey],
      }));
      
      setError(error);
    }
  }, [preferences]);

  /**
   * Update minimum rating preference
   */
  const updateMinRating = useCallback(async (newMinRating) => {
    try {
      // Optimistically update UI
      setMinRating(newMinRating);

      // Update through service
      const updatedMinRating = await serviceRef.current.updateMinRatingPreference(newMinRating);

      // Update state with service response
      setMinRating(updatedMinRating);

      console.log(`useDiscoveryPreferences: Updated minimum rating to ${newMinRating}`);
    } catch (error) {
      console.error('useDiscoveryPreferences: Error updating minimum rating:', error);
      
      // Revert optimistic update on error
      setMinRating(prev => prev);
      
      setError(error);
    }
  }, []);

  /**
   * Reset all preferences to defaults
   */
  const resetPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Reset through service
      const defaultPreferences = await serviceRef.current.resetDiscoveryPreferences();
      const defaultMinRating = await serviceRef.current.getMinRatingPreference();

      // Update state
      setPreferences(defaultPreferences);
      setMinRating(defaultMinRating);

      // Reset expanded categories to show enabled ones
      const resetExpandedCategories = {};
      PlaceTypeUtils.getAllCategoryTitles().forEach(categoryTitle => {
        const hasEnabledTypes = PlaceTypeUtils.isCategoryEnabled(categoryTitle, defaultPreferences);
        resetExpandedCategories[categoryTitle] = hasEnabledTypes;
      });
      setExpandedCategories(resetExpandedCategories);

      console.log('useDiscoveryPreferences: Successfully reset preferences to defaults');
    } catch (error) {
      console.error('useDiscoveryPreferences: Error resetting preferences:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get category statistics
   */
  const getCategoryStats = useCallback((categoryTitle) => {
    return PlaceTypeUtils.getCategoryEnabledCount(categoryTitle, preferences);
  }, [preferences]);

  /**
   * Check if category has any enabled types
   */
  const isCategoryEnabled = useCallback((categoryTitle) => {
    return PlaceTypeUtils.isCategoryEnabled(categoryTitle, preferences);
  }, [preferences]);

  /**
   * Toggle all place types in a category
   */
  const toggleCategoryEnabled = useCallback(async (categoryTitle, enabled) => {
    try {
      // Get all place types in the category
      const categoryTypes = PlaceTypeUtils.getPlaceTypesInCategory(categoryTitle);
      
      // Optimistically update UI
      const updatedPreferences = { ...preferences };
      categoryTypes.forEach(placeType => {
        updatedPreferences[placeType] = enabled;
      });
      setPreferences(updatedPreferences);

      // Update each place type through service
      const updatePromises = categoryTypes.map(placeType =>
        serviceRef.current.updatePlaceTypePreference(placeType, enabled)
      );

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Reload preferences to ensure consistency
      const finalPreferences = await serviceRef.current.getUserDiscoveryPreferences();
      setPreferences(finalPreferences);

      console.log(`useDiscoveryPreferences: Toggled category ${categoryTitle} to ${enabled}`);
    } catch (error) {
      console.error('useDiscoveryPreferences: Error toggling category:', error);
      
      // Reload preferences on error to ensure consistency
      await loadPreferences();
      
      setError(error);
    }
  }, [preferences, loadPreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Force sync preferences to cloud
   */
  const forceSyncToCloud = useCallback(async () => {
    try {
      setError(null);
      const success = await serviceRef.current.forceSyncToCloud();
      
      if (!success) {
        setError(new Error('Failed to sync preferences to cloud'));
      }
      
      return success;
    } catch (error) {
      console.error('useDiscoveryPreferences: Error forcing sync to cloud:', error);
      setError(error);
      return false;
    }
  }, []);

  /**
   * Get sync status information
   */
  const getSyncStatus = useCallback(async () => {
    try {
      return await serviceRef.current.getSyncStatus();
    } catch (error) {
      console.error('useDiscoveryPreferences: Error getting sync status:', error);
      return {
        syncStatus: 'error',
        lastCloudSync: null,
        lastLocalUpdate: null,
        hasPendingChanges: false,
        isUserAuthenticated: false,
        error: error.message,
      };
    }
  }, []);

  // Return hook interface
  return {
    // State
    preferences,
    minRating,
    expandedCategories,
    isLoading,
    error,
    
    // Actions
    toggleCategory,
    togglePlaceType,
    updateMinRating,
    resetPreferences,
    toggleCategoryEnabled,
    
    // Computed values
    getCategoryStats,
    isCategoryEnabled,
    
    // Utilities
    reload: loadPreferences,
    forceSyncToCloud,
    getSyncStatus,
  };
};

export default useDiscoveryPreferences;