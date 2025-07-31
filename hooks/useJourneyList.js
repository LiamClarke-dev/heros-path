/**
 * useJourneyList - Custom hook for journey list state management
 * 
 * Single Responsibility: Journey list data and operations
 * Requirements: 3.1, 3.2, 3.3, 3.6, 4.1, 4.2, 4.5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import JourneyService from '../services/JourneyService';

export const useJourneyList = () => {
  // State management
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'distance', 'duration'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  // User context
  const { user, isAuthenticated } = useUser();
  
  // Service reference
  const journeyServiceRef = useRef(JourneyService);

  /**
   * Load journeys from service
   */
  const loadJourneys = useCallback(async (forceRefresh = false) => {
    try {
      if (!isAuthenticated || !user) {
        setJourneys([]);
        setLoading(false);
        return;
      }

      setError(null);
      
      if (!forceRefresh) {
        setLoading(true);
      }

      const userJourneys = await journeyServiceRef.current.getUserJourneys(
        user.uid, 
        { forceRefresh }
      );

      // Sort journeys based on current sort settings
      const sortedJourneys = sortJourneys(userJourneys, sortBy, sortOrder);
      setJourneys(sortedJourneys);

    } catch (error) {
      console.error('Failed to load journeys:', error);
      setError(error.message || 'Failed to load journeys');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user, sortBy, sortOrder]);

  /**
   * Refresh journeys (pull-to-refresh)
   */
  const refreshJourneys = useCallback(async () => {
    setRefreshing(true);
    await loadJourneys(true);
  }, [loadJourneys]);

  /**
   * Delete a journey with confirmation
   */
  const deleteJourney = useCallback(async (journeyId) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setError(null);
      
      // Delete from service
      await journeyServiceRef.current.deleteJourney(user.uid, journeyId);
      
      // Update local state
      setJourneys(prevJourneys => 
        prevJourneys.filter(journey => journey.id !== journeyId)
      );

      return true;
    } catch (error) {
      console.error('Failed to delete journey:', error);
      setError(error.message || 'Failed to delete journey');
      return false;
    }
  }, [user]);

  /**
   * Sort journeys array
   */
  const sortJourneys = useCallback((journeysArray, sortField, order) => {
    return [...journeysArray].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'distance':
          aValue = a.distance || 0;
          bValue = b.distance || 0;
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'date':
        default:
          aValue = a.createdAt ? a.createdAt.getTime() : 0;
          bValue = b.createdAt ? b.createdAt.getTime() : 0;
          break;
      }

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, []);

  /**
   * Update sort settings
   */
  const updateSort = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
    
    // Re-sort existing journeys
    setJourneys(prevJourneys => sortJourneys(prevJourneys, field, order));
  }, [sortJourneys]);

  /**
   * Get journey completion status
   */
  const getJourneyCompletionStatus = useCallback((journey) => {
    if (!journey) return { isCompleted: false, completionPercentage: 0 };

    const isCompleted = journey.isCompleted || false;
    const completionPercentage = journey.completionPercentage || 0;
    const reviewedCount = journey.reviewedDiscoveriesCount || 0;
    const totalCount = journey.totalDiscoveriesCount || 0;

    return {
      isCompleted,
      completionPercentage,
      reviewedCount,
      totalCount,
      hasDiscoveries: totalCount > 0
    };
  }, []);

  /**
   * Format journey metadata for display
   */
  const formatJourneyMetadata = useCallback((journey) => {
    if (!journey) return {};

    const date = journey.createdAt ? journey.createdAt.toLocaleDateString() : 'Unknown date';
    const time = journey.createdAt ? journey.createdAt.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';
    
    const distance = journey.distance ? `${(journey.distance / 1000).toFixed(2)} km` : '0 km';
    
    const duration = journey.duration ? formatDuration(journey.duration) : '0 min';

    return {
      date,
      time,
      distance,
      duration,
      name: journey.name || 'Unnamed Journey'
    };
  }, []);

  /**
   * Format duration in milliseconds to readable string
   */
  const formatDuration = useCallback((durationMs) => {
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    
    return `${minutes}m`;
  }, []);

  // Load journeys on mount and when user changes
  useEffect(() => {
    loadJourneys();
  }, [loadJourneys]);

  // Return hook interface
  return {
    // Data
    journeys,
    loading,
    refreshing,
    error,
    sortBy,
    sortOrder,
    
    // Actions
    refreshJourneys,
    deleteJourney,
    updateSort,
    
    // Utilities
    getJourneyCompletionStatus,
    formatJourneyMetadata,
    formatDuration,
    
    // Computed
    hasJourneys: journeys.length > 0,
    isEmpty: !loading && journeys.length === 0,
  };
};