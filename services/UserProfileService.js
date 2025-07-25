import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Logger from '../utils/Logger';

/**
 * UserProfileService
 * 
 * Provides comprehensive user profile management functionality for Firestore.
 * Handles profile creation, reading, updating, and validation with proper error handling.
 * Implements data validation and Firestore security rule compliance.
 * 
 * Requirements: 3.1, 3.2, 3.3, 6.3
 */

class UserProfileService {
  constructor() {
    this.COLLECTION_NAME = 'users';
    this.SCHEMA_VERSION = 2.0;
  }

  /**
   * Get the default user profile structure
   * @param {Object} firebaseUser - Firebase user object
   * @returns {Object} Default user profile
   */
  getDefaultProfile(firebaseUser) {
    if (!firebaseUser) {
      throw new Error('Firebase user is required to create default profile');
    }

    return {
      // Core user data
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || null,
      emailVerified: firebaseUser.emailVerified || false,
      lastSignInAt: new Date().toISOString(),
      isNewUser: true,
      bio: '',
      location: '',
      
      // Migration framework support
      schemaVersion: this.SCHEMA_VERSION,
      lastMigrationAt: new Date().toISOString(),
      migrationHistory: [],
      
      // Performance optimization
      lastUpdated: new Date().toISOString(),
      cacheKey: this.generateCacheKey(firebaseUser.uid),
      
      // Social features extension points
      socialProfile: {
        username: '',
        socialLinks: {
          instagram: '',
          twitter: '',
          website: '',
        },
        followers: [],
        following: [],
        isPublicProfile: true,
      },
      
      // Gamification extension points
      gamification: {
        level: 1,
        experience: 0,
        achievements: [],
        badges: [],
        totalPings: 0,
        totalDiscoveries: 0,
        streakDays: 0,
      },
      
      // Enhanced preferences with extension points
      preferences: {
        notifications: true,
        privacy: 'public',
        units: 'metric',
        // Discovery preferences for future features
        discoveryPreferences: {
          categories: [],
          radius: 1000,
          autoPing: false,
        },
        // Theme preferences for Theme & Map Style
        theme: 'light',
        mapStyle: 'default',
      },
      
      // Enhanced stats with gamification support
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
      
      // Extension points for future features
      metadata: {},
      extensions: {},
    };
  }

  /**
   * Generate a cache key for the user profile
   * @param {string} uid - User ID
   * @returns {string} Cache key
   */
  generateCacheKey(uid) {
    return `profile_${uid}_${Date.now()}`;
  }

  /**
   * Validate user profile data
   * @param {Object} profileData - Profile data to validate
   * @throws {Error} If validation fails
   */
  validateProfileData(profileData) {
    if (!profileData) {
      throw new Error('Profile data is required');
    }

    if (!profileData.uid || typeof profileData.uid !== 'string') {
      throw new Error('Valid UID is required');
    }

    if (profileData.email && typeof profileData.email !== 'string') {
      throw new Error('Email must be a string');
    }

    if (profileData.displayName && typeof profileData.displayName !== 'string') {
      throw new Error('Display name must be a string');
    }

    // Validate preferences structure
    if (profileData.preferences) {
      const { preferences } = profileData;
      
      if (preferences.privacy && !['public', 'friends', 'private'].includes(preferences.privacy)) {
        throw new Error('Privacy setting must be public, friends, or private');
      }

      if (preferences.units && !['metric', 'imperial'].includes(preferences.units)) {
        throw new Error('Units must be metric or imperial');
      }

      if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
        throw new Error('Theme must be light, dark, or auto');
      }

      if (preferences.mapStyle && !['default', 'satellite', 'terrain'].includes(preferences.mapStyle)) {
        throw new Error('Map style must be default, satellite, or terrain');
      }
    }

    // Validate stats structure
    if (profileData.stats) {
      const numericFields = ['totalWalks', 'totalDistance', 'totalTime', 'discoveries', 'totalPings', 'averageWalkDistance', 'longestWalk'];
      
      for (const field of numericFields) {
        if (profileData.stats[field] !== undefined && typeof profileData.stats[field] !== 'number') {
          throw new Error(`${field} must be a number`);
        }
      }
    }

    // Validate social profile structure
    if (profileData.socialProfile) {
      const { socialProfile } = profileData;
      
      if (socialProfile.username && typeof socialProfile.username !== 'string') {
        throw new Error('Social username must be a string');
      }

      if (socialProfile.followers && !Array.isArray(socialProfile.followers)) {
        throw new Error('Followers must be an array');
      }

      if (socialProfile.following && !Array.isArray(socialProfile.following)) {
        throw new Error('Following must be an array');
      }
    }

    // Validate gamification structure
    if (profileData.gamification) {
      const { gamification } = profileData;
      const numericFields = ['level', 'experience', 'totalPings', 'totalDiscoveries', 'streakDays'];
      
      for (const field of numericFields) {
        if (gamification[field] !== undefined && typeof gamification[field] !== 'number') {
          throw new Error(`Gamification ${field} must be a number`);
        }
      }

      if (gamification.achievements && !Array.isArray(gamification.achievements)) {
        throw new Error('Achievements must be an array');
      }

      if (gamification.badges && !Array.isArray(gamification.badges)) {
        throw new Error('Badges must be an array');
      }
    }

    Logger.debug('Profile data validation passed');
  }

  /**
   * Create a new user profile in Firestore
   * @param {Object} firebaseUser - Firebase user object
   * @param {Object} additionalData - Additional profile data
   * @returns {Promise<Object>} Created user profile
   */
  async createProfile(firebaseUser, additionalData = {}) {
    try {
      if (!firebaseUser) {
        throw new Error('Firebase user is required to create profile');
      }

      Logger.info('Creating new user profile for:', firebaseUser.uid);

      const defaultProfile = this.getDefaultProfile(firebaseUser);
      const profileData = {
        ...defaultProfile,
        ...additionalData,
        uid: firebaseUser.uid, // Ensure UID is always correct
        lastUpdated: new Date().toISOString(),
      };

      // Validate the profile data
      this.validateProfileData(profileData);

      const userRef = doc(db, this.COLLECTION_NAME, firebaseUser.uid);
      
      // Check if profile already exists
      const existingDoc = await getDoc(userRef);
      if (existingDoc.exists()) {
        throw new Error('User profile already exists');
      }

      await setDoc(userRef, profileData);
      Logger.info('User profile created successfully:', firebaseUser.uid);

      return profileData;

    } catch (error) {
      Logger.error('Failed to create user profile:', error);
      throw error;
    }
  }

  /**
   * Read user profile from Firestore
   * @param {string} uid - User ID
   * @returns {Promise<Object|null>} User profile or null if not found
   */
  async readProfile(uid) {
    try {
      if (!uid) {
        throw new Error('User ID is required to read profile');
      }

      Logger.debug('Reading user profile for:', uid);

      const userRef = doc(db, this.COLLECTION_NAME, uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        Logger.info('User profile not found:', uid);
        return null;
      }

      const profileData = userDoc.data();
      Logger.debug('User profile loaded successfully:', uid);

      return profileData;

    } catch (error) {
      Logger.error('Failed to read user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile in Firestore
   * @param {string} uid - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile data
   */
  async updateProfile(uid, updates) {
    try {
      if (!uid) {
        throw new Error('User ID is required to update profile');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('Updates are required');
      }

      Logger.info('Updating user profile for:', uid);

      // Prepare update data
      const updateData = {
        ...updates,
        lastUpdated: new Date().toISOString(),
        cacheKey: this.generateCacheKey(uid),
      };

      // Don't allow UID to be changed
      delete updateData.uid;

      // Validate the update data by creating a temporary profile
      const currentProfile = await this.readProfile(uid);
      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      const updatedProfile = { ...currentProfile, ...updateData };
      this.validateProfileData(updatedProfile);

      const userRef = doc(db, this.COLLECTION_NAME, uid);
      await updateDoc(userRef, updateData);

      Logger.info('User profile updated successfully:', uid);

      return updatedProfile;

    } catch (error) {
      Logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Delete user profile from Firestore
   * @param {string} uid - User ID
   * @returns {Promise<void>}
   */
  async deleteProfile(uid) {
    try {
      if (!uid) {
        throw new Error('User ID is required to delete profile');
      }

      Logger.info('Deleting user profile for:', uid);

      const userRef = doc(db, this.COLLECTION_NAME, uid);
      
      // Check if profile exists
      const existingDoc = await getDoc(userRef);
      if (!existingDoc.exists()) {
        Logger.warn('Attempted to delete non-existent profile:', uid);
        return;
      }

      await deleteDoc(userRef);
      Logger.info('User profile deleted successfully:', uid);

    } catch (error) {
      Logger.error('Failed to delete user profile:', error);
      throw error;
    }
  }

  /**
   * Create or update user profile (upsert operation)
   * @param {Object} firebaseUser - Firebase user object
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created or updated profile
   */
  async createOrUpdateProfile(firebaseUser, profileData = {}) {
    try {
      if (!firebaseUser) {
        throw new Error('Firebase user is required');
      }

      Logger.info('Creating or updating user profile for:', firebaseUser.uid);

      const existingProfile = await this.readProfile(firebaseUser.uid);

      if (existingProfile) {
        // Update existing profile
        const updates = {
          ...profileData,
          email: firebaseUser.email || existingProfile.email,
          displayName: firebaseUser.displayName || existingProfile.displayName,
          photoURL: firebaseUser.photoURL || existingProfile.photoURL,
          emailVerified: firebaseUser.emailVerified,
          lastSignInAt: new Date().toISOString(),
          isNewUser: false,
        };

        return await this.updateProfile(firebaseUser.uid, updates);
      } else {
        // Create new profile
        return await this.createProfile(firebaseUser, profileData);
      }

    } catch (error) {
      Logger.error('Failed to create or update user profile:', error);
      throw error;
    }
  }

  /**
   * Check if user profile exists
   * @param {string} uid - User ID
   * @returns {Promise<boolean>} True if profile exists
   */
  async profileExists(uid) {
    try {
      if (!uid) {
        throw new Error('User ID is required');
      }

      const userRef = doc(db, this.COLLECTION_NAME, uid);
      const userDoc = await getDoc(userRef);

      return userDoc.exists();

    } catch (error) {
      Logger.error('Failed to check if profile exists:', error);
      throw error;
    }
  }

  /**
   * Update specific profile sections
   * @param {string} uid - User ID
   * @param {string} section - Section name (preferences, stats, socialProfile, gamification)
   * @param {Object} sectionData - Section data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfileSection(uid, section, sectionData) {
    try {
      if (!uid) {
        throw new Error('User ID is required');
      }

      if (!section) {
        throw new Error('Section name is required');
      }

      if (!sectionData) {
        throw new Error('Section data is required');
      }

      Logger.info(`Updating profile section '${section}' for:`, uid);

      const currentProfile = await this.readProfile(uid);
      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      // Merge section data with existing data
      const updatedSection = {
        ...currentProfile[section],
        ...sectionData,
      };

      const updates = {
        [section]: updatedSection,
      };

      return await this.updateProfile(uid, updates);

    } catch (error) {
      Logger.error(`Failed to update profile section '${section}':`, error);
      throw error;
    }
  }
}

// Export singleton instance
export default new UserProfileService();