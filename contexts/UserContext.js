import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChange, signOutUser, db } from '../firebase';
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

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      const defaultProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || profileData.displayName || '',
        photoURL: user.photoURL || null,
        emailVerified: user.emailVerified || false,
        lastSignInAt: new Date().toISOString(),
        isNewUser: !userDoc.exists(),
        bio: '',
        location: '',
        schemaVersion: 2.0,
        lastUpdated: new Date().toISOString(),
        preferences: {
          notifications: true,
          privacy: 'public',
          units: 'metric',
          discoveryPreferences: {
            categories: [],
            radius: 1000,
            autoPing: false,
          },
          theme: 'light',
          mapStyle: 'default',
        },
        stats: {
          totalWalks: 0,
          totalDistance: 0,
          totalTime: 0,
          discoveries: 0,
          totalPings: 0,
          averageWalkDistance: 0,
          longestWalk: 0,
          favoriteDiscoveryTypes: [],
        },
        friends: [],
        metadata: {},
        extensions: {},
      };

      const profileToSave = {
        ...defaultProfile,
        ...profileData,
        uid: user.uid, // Ensure UID is always correct
        lastUpdated: new Date().toISOString(),
      };

      if (userDoc.exists()) {
        // Update existing profile
        await updateDoc(userRef, profileToSave);
        Logger.info('User profile updated successfully');
      } else {
        // Create new profile
        await setDoc(userRef, profileToSave);
        Logger.info('New user profile created successfully');
      }

      setUserProfile(profileToSave);
      return profileToSave;

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

      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      await updateDoc(userRef, updatedData);
      
      const updatedProfile = {
        ...userProfile,
        ...updatedData,
      };
      
      setUserProfile(updatedProfile);
      Logger.info('User profile updated successfully');

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
   * Refresh user profile from Firestore
   */
  const refreshProfile = async () => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      setProfileLoading(true);
      setError(null);

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        Logger.info('User profile refreshed successfully');
      } else {
        // Profile doesn't exist, create default one
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
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        Logger.info('User profile loaded successfully');
      } else {
        // New user - create default profile
        Logger.info('New user detected, creating default profile');
        await createOrUpdateProfile();
      }

    } catch (error) {
      Logger.error('Failed to load user profile:', error);
      setError(error.message);
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
            await loadUserProfile(firebaseUser);
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