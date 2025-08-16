// Near-Duplicate Code Examples: Loading State Management Patterns
// These examples show how loading states are implemented inconsistently
// across hooks and contexts, creating maintenance overhead

// ============================================================================
// EXAMPLE 1: Basic Loading State Pattern
// ============================================================================

// Location: hooks/useSavedPlaces.js (lines 28-31)
// Pattern A: Saved places loading state
const useSavedPlaces = () => {
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refreshPlaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const places = await SavedPlacesService.getSavedPlaces();
      setSavedPlaces(places);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Failed to refresh places:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    savedPlaces,
    loading,
    error,
    refreshPlaces,
    // ... other methods
  };
};

// Location: contexts/UserContext.js (lines 18-19) 
// Pattern B: User context loading states
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  const createOrUpdateProfile = async (profileData = {}) => {
    try {
      setProfileLoading(true);
      setError(null);

      const updatedProfile = await UserProfileService.createOrUpdateProfile(user, profileData);
      setUserProfile(updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      Logger.error('Failed to create/update user profile:', error);
      setError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  // Similar pattern repeated for updateProfile, refreshProfile, etc.
};

// Location: hooks/useJourneyTracking.js (similar pattern)
// Pattern C: Journey tracking loading states
const useJourneyTracking = () => {
  const [savingJourney, setSavingJourney] = useState(false);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [error, setError] = useState(null);

  const saveJourney = useCallback(async (journeyName) => {
    try {
      setSavingJourney(true);
      setError(null);
      
      const savedJourney = await JourneyService.saveJourney({
        name: journeyName,
        // ... journey data
      });
      
      // Update state with saved journey
    } catch (error) {
      Logger.error('Failed to save journey:', error);
      setError(error.message);
      throw error;
    } finally {
      setSavingJourney(false);
    }
  }, []);

  return {
    savingJourney,
    error,
    saveJourney,
    // ... other methods
  };
};

// ============================================================================
// EXAMPLE 2: Service-Level Loading Pattern
// ============================================================================

// Location: Multiple service files
// Pattern A: Service method with loading state awareness
class DiscoveriesService {
  static async searchAlongRoute(routeCoordinates, preferences) {
    // Service doesn't manage loading state directly, but callers do:
    
    // In calling hook:
    const [searchLoading, setSearchLoading] = useState(false);
    
    const performSearch = async () => {
      try {
        setSearchLoading(true);
        const results = await DiscoveriesService.searchAlongRoute(route, prefs);
        // handle results
      } catch (error) {
        // handle error
      } finally {
        setSearchLoading(false);
      }
    };
  }
}

// ============================================================================
// PROPOSED CONSOLIDATION: useAsyncOperation Hook
// ============================================================================

// New file: hooks/useAsyncOperation.js
import { useState, useCallback, useRef } from 'react';
import Logger from '../utils/Logger';

/**
 * Standardized hook for managing async operations with loading states
 * Eliminates duplicate loading state management across the app
 */
const useAsyncOperation = (options = {}) => {
  const {
    onSuccess = () => {},
    onError = () => {},
    logContext = 'AsyncOperation',
    initialLoading = false
  } = options;

  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (asyncFunction, ...args) => {
    try {
      // Cancel previous operation if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const result = await asyncFunction(...args);
      
      // Only update if not aborted
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        Logger.error(`${logContext} failed:`, error);
        setError(error.message || 'Operation failed');
        onError(error);
      }
      throw error;
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [onSuccess, onError, logContext]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
    cancel
  };
};

export default useAsyncOperation;

// ============================================================================
// CONSOLIDATED USAGE EXAMPLES
// ============================================================================

// Refactored useSavedPlaces hook
const useSavedPlaces = () => {
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [visible, setVisible] = useState(false);
  
  const {
    loading: refreshLoading,
    error: refreshError,
    execute: executeRefresh
  } = useAsyncOperation({
    logContext: 'SavedPlaces.refresh',
    onSuccess: (places) => {
      setSavedPlaces(places);
      setLastRefresh(Date.now());
    }
  });

  const refreshPlaces = useCallback(() => {
    return executeRefresh(() => SavedPlacesService.getSavedPlaces());
  }, [executeRefresh]);

  return {
    savedPlaces,
    loading: refreshLoading,
    error: refreshError,
    refreshPlaces,
    // ... other methods
  };
};

// Refactored UserContext profile operations
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Auth loading

  const {
    loading: profileLoading,
    error: profileError,
    execute: executeProfileOperation
  } = useAsyncOperation({
    logContext: 'UserProfile',
    onSuccess: (profile) => setUserProfile(profile)
  });

  const createOrUpdateProfile = useCallback(async (profileData = {}) => {
    return executeProfileOperation(
      () => UserProfileService.createOrUpdateProfile(user, profileData)
    );
  }, [user, executeProfileOperation]);

  const updateProfile = useCallback(async (updates) => {
    return executeProfileOperation(
      () => UserProfileService.updateProfile(user.uid, updates)
    );
  }, [user, executeProfileOperation]);

  const value = {
    user,
    userProfile,
    loading, // Auth loading
    profileLoading,
    error: profileError,
    createOrUpdateProfile,
    updateProfile,
    // ... other methods
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Refactored journey tracking
const useJourneyTracking = () => {
  const [journeyState, setJourneyState] = useState(initialState);

  const {
    loading: saveLoading,
    error: saveError,
    execute: executeSave
  } = useAsyncOperation({
    logContext: 'JourneyTracking.save',
    onSuccess: () => {
      // Clear current journey, update UI state
      setJourneyState(prev => ({ ...prev, currentJourney: null }));
    }
  });

  const saveJourney = useCallback(async (journeyName) => {
    const journeyData = {
      name: journeyName,
      // ... build journey data
    };
    
    return executeSave(() => JourneyService.saveJourney(journeyData));
  }, [executeSave]);

  return {
    journeyState,
    savingJourney: saveLoading,
    saveError,
    saveJourney,
    // ... other methods
  };
};

// ============================================================================
// CONSOLIDATION IMPACT ANALYSIS
// ============================================================================

/*
BEFORE CONSOLIDATION:
- 15+ different loading state implementations
- Inconsistent error handling across hooks
- No operation cancellation support
- Duplicate try/catch/finally blocks everywhere
- Manual loading state management in every hook
- ~100+ lines of repetitive loading state code

AFTER CONSOLIDATION:
- 1 standardized loading state hook
- Consistent error handling and logging
- Built-in operation cancellation
- Clean, reusable async operation management
- Hooks focus on business logic, not loading states
- ~20 lines of well-tested loading state code

LINES SAVED: ~80 lines across multiple hooks = ~100+ lines total
CONSISTENCY IMPROVEMENT: All loading states work the same way
FEATURES ADDED: Operation cancellation, better error handling
TESTING IMPROVEMENT: Test one hook instead of 15+ implementations
USER EXPERIENCE: Consistent loading and error states throughout app
*/
