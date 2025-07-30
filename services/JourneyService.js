/**
 * JourneyService - Core service for journey data management
 * 
 * Single Responsibility: Journey CRUD operations and data management
 * Requirements: 2.2, 2.3, 3.1, 4.3, 5.1
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { DOCUMENT_PATHS } from '../constants/FirestoreSchema';
import { 
  DEFAULT_JOURNEY_VALUES, 
  JOURNEY_SCHEMA_VERSION
} from '../constants/JourneyModels';

// Modular services
import JourneyValidationService from './journey/JourneyValidationService';
import JourneyStatsService from './journey/JourneyStatsService';
import JourneyDiscoveryService from './journey/JourneyDiscoveryService';
import JourneyCacheService from './journey/JourneyCacheService';

/**
 * JourneyService class handles core journey CRUD operations
 */
class JourneyService {

  /**
   * Create a new journey record
   * @param {string} userId - User ID
   * @param {Object} journeyData - Journey data from tracking session
   * @returns {Promise<Object>} Created journey with ID
   */
  async createJourney(userId, journeyData) {
    try {
      if (!userId || !journeyData) {
        throw new Error('User ID and journey data are required');
      }

      // Validate journey data
      JourneyValidationService.validateJourneyData(journeyData);

      // Calculate distance and duration if not provided
      const distance = journeyData.distance || JourneyStatsService.calculateDistance(journeyData.coordinates);
      const duration = journeyData.duration || (journeyData.endTime - journeyData.startTime);

      // Prepare journey document
      const journeyDoc = {
        ...DEFAULT_JOURNEY_VALUES,
        userId,
        name: journeyData.name || this.generateDefaultName(journeyData.startTime),
        startTime: journeyData.startTime,
        endTime: journeyData.endTime,
        route: journeyData.coordinates || [],
        distance,
        duration,
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString(),
        schemaVersion: JOURNEY_SCHEMA_VERSION
      };

      // Add to Firestore
      const journeysCollection = collection(db, DOCUMENT_PATHS.userJourneys(userId));
      const docRef = await addDoc(journeysCollection, journeyDoc);

      // Update document with its ID
      await updateDoc(docRef, { id: docRef.id });

      const createdJourney = {
        ...journeyDoc,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Cache the created journey
      JourneyCacheService.setCacheItem(`journey_${userId}_${docRef.id}`, createdJourney);

      console.log(`Journey created successfully: ${docRef.id}`);
      return createdJourney;

    } catch (error) {
      console.error('Failed to create journey:', error);
      throw new Error(`Failed to create journey: ${error.message}`);
    }
  }

  /**
   * Get a specific journey by ID
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Object|null>} Journey data or null if not found
   */
  async getJourney(userId, journeyId) {
    try {
      if (!userId || !journeyId) {
        throw new Error('User ID and journey ID are required');
      }

      // Check cache first
      const cacheKey = `journey_${userId}_${journeyId}`;
      const cachedJourney = JourneyCacheService.getCacheItem(cacheKey);
      if (cachedJourney) {
        return cachedJourney;
      }

      // Get from Firestore
      const journeyDocRef = doc(db, DOCUMENT_PATHS.userJourney(userId, journeyId));
      const journeyDoc = await getDoc(journeyDocRef);

      if (!journeyDoc.exists()) {
        return null;
      }

      const journeyData = {
        id: journeyDoc.id,
        ...journeyDoc.data(),
        createdAt: journeyDoc.data().createdAt?.toDate(),
        updatedAt: journeyDoc.data().updatedAt?.toDate()
      };

      // Cache the journey
      JourneyCacheService.setCacheItem(cacheKey, journeyData);

      return journeyData;

    } catch (error) {
      console.error('Failed to get journey:', error);
      throw new Error(`Failed to get journey: ${error.message}`);
    }
  }

  /**
   * Get all journeys for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of journey objects
   */
  async getUserJourneys(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check cache first
      const cacheKey = `user_journeys_${userId}`;
      const cachedJourneys = JourneyCacheService.getCacheItem(cacheKey);
      if (cachedJourneys && !options.forceRefresh) {
        return cachedJourneys;
      }

      // Build query
      const journeysCollection = collection(db, DOCUMENT_PATHS.userJourneys(userId));
      let journeyQuery = query(
        journeysCollection,
        orderBy('createdAt', 'desc')
      );

      // Add status filter if specified
      if (options.status) {
        journeyQuery = query(
          journeysCollection,
          where('status', '==', options.status),
          orderBy('createdAt', 'desc')
        );
      }

      // Execute query
      const querySnapshot = await getDocs(journeyQuery);
      const journeys = [];

      querySnapshot.forEach((doc) => {
        const journeyData = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        };
        journeys.push(journeyData);
      });

      // Cache the results
      JourneyCacheService.setCacheItem(cacheKey, journeys);

      return journeys;

    } catch (error) {
      console.error('Failed to get user journeys:', error);
      throw new Error(`Failed to get user journeys: ${error.message}`);
    }
  }

  /**
   * Update journey information
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated journey data
   */
  async updateJourney(userId, journeyId, updates) {
    try {
      if (!userId || !journeyId || !updates) {
        throw new Error('User ID, journey ID, and updates are required');
      }

      // Validate updates
      JourneyValidationService.validateJourneyUpdates(updates);

      // Prepare update document
      const updateDoc = {
        ...updates,
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString()
      };

      // Update in Firestore
      const journeyDocRef = doc(db, DOCUMENT_PATHS.userJourney(userId, journeyId));
      await updateDoc(journeyDocRef, updateDoc);

      // Get updated journey
      const updatedJourney = await this.getJourney(userId, journeyId);

      // Clear related cache entries
      JourneyCacheService.clearCacheForUser(userId);

      console.log(`Journey updated successfully: ${journeyId}`);
      return updatedJourney;

    } catch (error) {
      console.error('Failed to update journey:', error);
      throw new Error(`Failed to update journey: ${error.message}`);
    }
  }

  /**
   * Delete a journey and associated data
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteJourney(userId, journeyId) {
    try {
      if (!userId || !journeyId) {
        throw new Error('User ID and journey ID are required');
      }

      // Get journey data before deletion for cleanup
      const journey = await this.getJourney(userId, journeyId);
      if (!journey) {
        throw new Error('Journey not found');
      }

      // Use batch operation for comprehensive cleanup
      const batch = writeBatch(db);

      // Delete main journey document
      const journeyDocRef = doc(db, DOCUMENT_PATHS.userJourney(userId, journeyId));
      batch.delete(journeyDocRef);

      // Delete associated journey data if exists
      const journeyDataCollection = collection(db, DOCUMENT_PATHS.userJourneyDataCollection(userId));
      const journeyDataQuery = query(journeyDataCollection, where('id', '==', journeyId));
      const journeyDataSnapshot = await getDocs(journeyDataQuery);
      
      journeyDataSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Requirement 4.3: Remove non-saved discoveries, maintain saved ones
      await JourneyDiscoveryService.cleanupJourneyDiscoveries(userId, journeyId);

      // Commit batch operation
      await batch.commit();

      // Clear cache
      JourneyCacheService.clearCacheForUser(userId);

      console.log(`Journey deleted successfully: ${journeyId}`);
      return true;

    } catch (error) {
      console.error('Failed to delete journey:', error);
      throw new Error(`Failed to delete journey: ${error.message}`);
    }
  }

  /**
   * Generate default name for journey
   * @param {number} startTime - Journey start timestamp
   * @returns {string} Default journey name
   */
  generateDefaultName(startTime) {
    const date = new Date(startTime);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Journey on ${dateStr} at ${timeStr}`;
  }

  /**
   * Delegate to JourneyStatsService for statistics
   */
  async getJourneyStats(userId) {
    const journeys = await this.getUserJourneys(userId);
    return JourneyStatsService.calculateJourneyStatistics(journeys);
  }

  /**
   * Delegate to JourneyDiscoveryService for discovery consolidation
   */
  async consolidateJourneyDiscoveries(userId, journeyId, routeCoords) {
    const result = await JourneyDiscoveryService.consolidateJourneyDiscoveries(userId, journeyId, routeCoords);
    
    // Update journey with discovery counts
    await this.updateJourney(userId, journeyId, {
      totalDiscoveriesCount: result.totalDiscoveries,
      reviewedDiscoveriesCount: result.reviewedDiscoveries,
      completionPercentage: result.completionPercentage,
      isCompleted: result.completionPercentage === 100
    });

    return result;
  }


}

// Export singleton instance
export default new JourneyService();