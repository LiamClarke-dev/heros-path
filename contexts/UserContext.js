import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, signOutUser } from '../firebase';
import UserProfileService from '../services/UserProfileService';
import Logger from '../utils/Logger';

const UserContext = createContext();

/**
 * UserContext provides authentication state management and user profile functionality
 * throughout the application. It manages Firebase authentication state, user profiles
 * stored in Firestore, and provides methods for profile management.
 */

export function UserProvider({ children }) {
  // Core state variables as specified in requirements 4.4, 4.5
  const [user, setUser] = useState(null); // Firebase user object
  const [userProfile, setUserProfile] = useState(null); // Firestore user profile
  const [loading, setLoading] = useState(true); // Authentication loading state
  const [profileLoading, setProfileLoading] = useState(false); // Profile loading state
  const [error, setError] = useState(null); // Error state for user feedback

  // Derived state for convenience
  const isAuthenticated = !!user;

  /**
   * Create or update user profile in Firestore
   * @param {Object} profileData - Partial profile data to create/update
   * @returns {Promise<Object>} - Updated user profile
   */
  const createOrUpdateProfile = async (profileData = {}) => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      setProfileLoading(true);
      setError(null);

      Logger.info('Creating or updating user profile via UserProfileService');
      const updatedProfile = await UserProfileService.createOrUpdateProfile(user, profileData);
      
      setUserProfile(updatedProfile);
      Logger.info('User profile created/updated successfully via service');
      
      return updatedProfile;

    } catch (error) {
      Logger.error('Failed to create/update user profile:', error);
      setError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Update user profile with partial data
   * @param {Object} updates - Partial profile updates
   */
  const updateProfile = async (updates) => {
    try {
      if (!user || !userProfile) {
        throw new Error('No authenticated user or profile');
      }

      setProfileLoading(true);
      setError(null);

      Logger.info('Updating user profile via UserProfileService');
      const updatedProfile = await UserProfileService.updateProfile(user.uid, updates);
      
      setUserProfile(updatedProfile);
      Logger.info('User profile updated successfully via service');

    } catch (error) {
      Logger.error('Failed to update user profile:', error);
      setError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Sign out the current user and clear all state
   * Implements proper token cleanup as per requirement 2.1, 2.3, 2.4, 6.4
   */
  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setUserProfile(null);
      
      // Sign out from Firebase (this will clear tokens from AsyncStorage)
      await signOutUser();
      
      Logger.info('User signed out successfully with token cleanup');
    } catch (error) {
      Logger.error('Failed to sign out:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle authentication token refresh
   * Firebase handles token refresh automatically, but this provides manual refresh capability
   */
  const refreshAuthToken = async () => {
    try {
      if (!user) {
        throw new Error('No authenticated user to refresh token for');
      }

      setError(null);
      
      // Force token refresh
      const token = await user.getIdToken(true);
      Logger.info('Authentication token refreshed successfully');
      
      return token;
    } catch (error) {
      Logger.error('Failed to refresh authentication token:', error);
      setError(error.message);
      
      // If token refresh fails, user might need to re-authenticate
      if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
        Logger.warn('Token expired, user needs to re-authenticate');
        await signOut();
      }
      
      throw error;
    }
  };

  /**
   * Check if current session is valid
   * Verifies both Firebase auth state and token validity
   */
  const validateSession = async () => {
    try {
      if (!user) {
        return false;
      }

      // Check if token is still valid by trying to get a fresh one
      await user.getIdToken(false); // Don't force refresh, just validate
      return true;
      
    } catch (error) {
      Logger.warn('Session validation failed:', error);
      return false;
    }
  };

  /**
   * Initialize session on app start
   * Handles session persistence across app restarts as per requirement 2.2
   */
  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Firebase automatically restores session from AsyncStorage
      // The onAuthStateChange listener will handle the rest
      Logger.info('Session initialization started');
      
    } catch (error) {
      Logger.error('Session initialization failed:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  /**
   * Update specific profile section
   * @param {string} section - Section name (preferences, stats, socialProfile, gamification)
   * @param {Object} sectionData - Section data to update
   */
  const updateProfileSection = async (section, sectionData) => {
    try {
      if (!user || !userProfile) {
        throw new Error('No authenticated user or profile');
      }

      setProfileLoading(true);
      setError(null);

      Logger.info(`Updating profile section '${section}' via UserProfileService`);
      const updatedProfile = await UserProfileService.updateProfileSection(user.uid, section, sectionData);
      
      setUserProfile(updatedProfile);
      Logger.info(`Profile section '${section}' updated successfully`);

    } catch (error) {
      Logger.error(`Failed to update profile section '${section}':`, error);
      setError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Check if user profile exists
   * @returns {Promise<boolean>} True if profile exists
   */
  const profileExists = async () => {
    try {
      if (!user) {
        return false;
      }

      return await UserProfileService.profileExists(user.uid);
    } catch (error) {
      Logger.error('Failed to check if profile exists:', error);
      return false;
    }
  };

  /**
   * Handle profile creation for new users
   * This is called automatically when a new user signs in
   * @param {Object} firebaseUser - Firebase user object
   */
  const handleNewUserProfile = async (firebaseUser) => {
    try {
      if (!firebaseUser) {
        throw new Error('Firebase user is required');
      }

      setProfileLoading(true);
      setError(null);

      Logger.info('Handling new user profile creation for:', firebaseUser.uid);
      
      // Check if profile already exists
      const exists = await UserProfileService.profileExists(firebaseUser.uid);
      
      if (!exists) {
        // Create new profile with default values
        const newProfile = await UserProfileService.createProfile(firebaseUser);
        setUserProfile(newProfile);
        Logger.info('New user profile created successfully');
      } else {
        // Profile exists, just load it
        const existingProfile = await UserProfileService.readProfile(firebaseUser.uid);
        setUserProfile(existingProfile);
        Logger.info('Existing profile loaded for user');
      }

    } catch (error) {
      Logger.error('Failed to handle new user profile:', error);
      setError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Handle profile loading errors with retry logic
   * @param {Object} firebaseUser - Firebase user object
   * @param {number} retryCount - Current retry attempt
   */
  const handleProfileLoadingError = async (firebaseUser, retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      if (retryCount >= maxRetries) {
        throw new Error('Maximum retry attempts reached for profile loading');
      }

      Logger.warn(`Profile loading failed, attempting retry ${retryCount + 1}/${maxRetries}`);
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Attempt to load profile again
      await loadUserProfile(firebaseUser);
      
    } catch (error) {
      Logger.error('Profile loading retry failed:', error);
      
      if (retryCount < maxRetries - 1) {
        // Try again
        await handleProfileLoadingError(firebaseUser, retryCount + 1);
      } else {
        // Final failure - set appropriate error message
        setError('Unable to load your profile after multiple attempts. Please check your connection and try again.');
        throw error;
      }
    }
  };

  /**
   * Refresh user profile from Firestore
   */
  const refreshProfile = async () => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      setProfileLoading(true);
      setError(null);

      Logger.info('Refreshing user profile via UserProfileService');
      const profile = await UserProfileService.readProfile(user.uid);

      if (profile) {
        setUserProfile(profile);
        Logger.info('User profile refreshed successfully via service');
      } else {
        // Profile doesn't exist, create default one
        Logger.info('Profile not found, creating default profile');
        await createOrUpdateProfile();
      }

    } catch (error) {
      Logger.error('Failed to refresh user profile:', error);
      setError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Load user profile from Firestore
   * @param {Object} firebaseUser - Firebase user object
   */
  const loadUserProfile = async (firebaseUser) => {
    try {
      if (!firebaseUser) {
        setUserProfile(null);
        return;
      }

      setProfileLoading(true);
      setError(null);

      Logger.info('Loading user profile via UserProfileService for:', firebaseUser.uid);
      const profile = await UserProfileService.readProfile(firebaseUser.uid);

      if (profile) {
        setUserProfile(profile);
        Logger.info('User profile loaded successfully via service');
      } else {
        // New user - create default profile
        Logger.info('New user detected, creating default profile via service');
        const newProfile = await UserProfileService.createOrUpdateProfile(firebaseUser);
        setUserProfile(newProfile);
      }

    } catch (error) {
      Logger.error('Failed to load user profile:', error);
      setError(error.message);
      
      // Handle profile loading errors gracefully
      if (error.message.includes('permission-denied')) {
        Logger.error('Permission denied - user may not have access to their profile');
        setError('Unable to access your profile. Please try signing in again.');
      } else if (error.message.includes('unavailable')) {
        Logger.error('Firestore service unavailable');
        setError('Profile service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to load your profile. Please try again.');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Set up authentication state listener and session initialization (requirement 2.2, 2.5, 4.3)
  useEffect(() => {
    // Initialize session on app start
    initializeSession();

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        setError(null);

        if (firebaseUser) {
          Logger.info('User authenticated:', firebaseUser.uid);
          
          // Validate session by trying to get token
          try {
            await firebaseUser.getIdToken(false);
            
            // Load user profile with error handling
            try {
              await loadUserProfile(firebaseUser);
            } catch (profileError) {
              Logger.warn('Profile loading failed, attempting error handling:', profileError);
              
              // Try to handle the error with retry logic
              try {
                await handleProfileLoadingError(firebaseUser);
              } catch (retryError) {
                Logger.error('Profile loading failed after retries:', retryError);
                // Don't sign out the user, just show error
                // They can still use the app with limited functionality
              }
            }
          } catch (tokenError) {
            Logger.warn('Invalid session detected, signing out:', tokenError);
            await signOut();
          }
        } else {
          Logger.info('User signed out');
          setUserProfile(null);
        }

      } catch (error) {
        Logger.error('Auth state change error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup listener on unmount
    return unsubscribe;
  }, []);

  // Context value object with all state and methods
  const value = {
    // Core state
    user,
    userProfile,
    loading,
    profileLoading,
    error,
    isAuthenticated,

    // Core methods
    createOrUpdateProfile,
    updateProfile,
    signOut,
    refreshProfile,

    // Session management methods
    refreshAuthToken,
    validateSession,
    initializeSession,

    // Enhanced profile management methods
    updateProfileSection,
    profileExists,
    handleNewUserProfile,
    handleProfileLoadingError,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Custom hook for consuming UserContext
 * Provides type-safe access to user context with proper error handling
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};