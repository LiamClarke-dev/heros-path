import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_JOURNEY_VALUES, VALIDATION_CONSTANTS } from '../constants/JourneyModels';
import Logger from '../utils/Logger';

/**
 * JourneyService handles all journey-related operations including
 * saving, loading, updating, and deleting journey data in Firestore.
 * 
 * Requirements addressed:
 * - 2.3: Save journey with name and metadata
 * - 2.4: Store route data with timestamps, distance, and duration
 * - 2.5: Load and display saved routes
 * - 2.6: Journey data structure with metadata
 */

class JourneyService {
  constructor() {
    this.collectionName = 'journeys';
  }

  /**
   * Save a new journey to Firestore
   * @param {Object} journeyData - Journey data to save
   * @param {string} journeyData.userId - User ID
   * @param {string} journeyData.name - Journey name
   * @param {Array} journeyData.route - Array of coordinates
   * @param {number} journeyData.distance - Distance in meters
   * @param {number} journeyData.duration - Duration in milliseconds
   * @param {number} journeyData.startTime - Start timestamp
   * @param {number} journeyData.endTime - End timestamp
   * @returns {Promise<Object>} Saved journey with Firestore ID
   */
  async saveJourney(journeyData) {
    try {
      // Validate required fields
      this.validateJourneyData(journeyData);

      // Create journey object with defaults
      const journey = {
        ...DEFAULT_JOURNEY_VALUES,
        ...journeyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString(),
      };

      Logger.info('Saving journey to Firestore:', journey.name);

      // Save to Firestore
      const docRef = await addDoc(collection(db, this.collectionName), journey);
      
      // Return journey with Firestore ID
      const savedJourney = {
        ...journey,
        id: docRef.id,
        createdAt: new Date(), // Convert serverTimestamp for immediate use
        updatedAt: new Date(),
      };

      Logger.info('Journey saved successfully:', docRef.id);
      return savedJourney;

    } catch (error) {
      Logger.error('Failed to save journey:', error);
      throw new Error(`Failed to save journey: ${error.message}`);
    }
  }

  /**
   * Load all journeys for a specific user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of journeys to load
   * @param {string} options.orderBy - Field to order by
   * @param {string} options.orderDirection - Order direction ('asc' or 'desc')
   * @returns {Promise<Array>} Array of user journeys
   */
  async loadUserJourneys(userId, options = {}) {
    try {
      const {
        limit: queryLimit = 50,
        orderBy: orderField = 'createdAt',
        orderDirection = 'desc'
      } = options;

      Logger.info('Loading journeys for user:', userId);

      // Build query
      let journeyQuery = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy(orderField, orderDirection)
      );

      // Add limit if specified
      if (queryLimit) {
        journeyQuery = query(journeyQuery, limit(queryLimit));
      }

      // Execute query
      const querySnapshot = await getDocs(journeyQuery);
      
      // Convert to array of journey objects
      const journeys = [];
      querySnapshot.forEach((doc) => {
        const journeyData = doc.data();
        journeys.push({
          ...journeyData,
          id: doc.id,
          // Convert Firestore timestamps to JavaScript dates
          createdAt: journeyData.createdAt?.toDate() || new Date(),
          updatedAt: journeyData.updatedAt?.toDate() || new Date(),
        });
      });

      Logger.info(`Loaded ${journeys.length} journeys for user`);
      return journeys;

    } catch (error) {
      Logger.error('Failed to load user journeys:', error);
      throw new Error(`Failed to load journeys: ${error.message}`);
    }
  }

  /**
   * Load a specific journey by ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Object|null>} Journey object or null if not found
   */
  async loadJourney(journeyId) {
    try {
      Logger.info('Loading journey:', journeyId);

      const docRef = doc(db, this.collectionName, journeyId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const journeyData = docSnap.data();
        const journey = {
          ...journeyData,
          id: docSnap.id,
          createdAt: journeyData.createdAt?.toDate() || new Date(),
          updatedAt: journeyData.updatedAt?.toDate() || new Date(),
        };

        Logger.info('Journey loaded successfully');
        return journey;
      } else {
        Logger.warn('Journey not found:', journeyId);
        return null;
      }

    } catch (error) {
      Logger.error('Failed to load journey:', error);
      throw new Error(`Failed to load journey: ${error.message}`);
    }
  }

  /**
   * Update an existing journey
   * @param {string} journeyId - Journey ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated journey
   */
  async updateJourney(journeyId, updates) {
    try {
      Logger.info('Updating journey:', journeyId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString(),
      };

      const docRef = doc(db, this.collectionName, journeyId);
      await updateDoc(docRef, updateData);

      // Load and return updated journey
      const updatedJourney = await this.loadJourney(journeyId);
      
      Logger.info('Journey updated successfully');
      return updatedJourney;

    } catch (error) {
      Logger.error('Failed to update journey:', error);
      throw new Error(`Failed to update journey: ${error.message}`);
    }
  }

  /**
   * Delete a journey
   * @param {string} journeyId - Journey ID
   * @returns {Promise<void>}
   */
  async deleteJourney(journeyId) {
    try {
      Logger.info('Deleting journey:', journeyId);

      const docRef = doc(db, this.collectionName, journeyId);
      await deleteDoc(docRef);

      Logger.info('Journey deleted successfully');

    } catch (error) {
      Logger.error('Failed to delete journey:', error);
      throw new Error(`Failed to delete journey: ${error.message}`);
    }
  }

  /**
   * Calculate journey statistics
   * @param {Array} coordinates - Array of coordinates
   * @returns {Object} Journey statistics
   */
  calculateJourneyStats(coordinates) {
    if (!coordinates || coordinates.length < 2) {
      return {
        distance: 0,
        duration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    const startTime = coordinates[0].timestamp;
    const endTime = coordinates[coordinates.length - 1].timestamp;
    const duration = endTime - startTime;

    // Calculate distance and speed
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      
      // Calculate distance between points
      const distance = this.calculateDistance(prev, curr);
      totalDistance += distance;

      // Calculate speed for this segment
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        const speed = distance / timeDiff; // m/s
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }

    const averageSpeed = duration > 0 ? totalDistance / (duration / 1000) : 0;

    return {
      distance: Math.round(totalDistance),
      duration,
      averageSpeed: Math.round(averageSpeed * 100) / 100, // Round to 2 decimal places
      maxSpeed: Math.round(maxSpeed * 100) / 100,
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {Object} coord1 - First coordinate
   * @param {Object} coord2 - Second coordinate
   * @returns {number} Distance in meters
   */
  calculateDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate journey data before saving
   * @param {Object} journeyData - Journey data to validate
   * @throws {Error} If validation fails
   */
  validateJourneyData(journeyData) {
    const { userId, name, route, distance, duration } = journeyData;

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Journey name is required');
    }

    if (name.length > VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH) {
      throw new Error(`Journey name must be less than ${VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH} characters`);
    }

    if (!route || !Array.isArray(route)) {
      throw new Error('Journey route is required and must be an array');
    }

    if (route.length < VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY) {
      throw new Error(`Journey must have at least ${VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY} coordinates`);
    }

    if (typeof distance !== 'number' || distance < 0) {
      throw new Error('Journey distance must be a positive number');
    }

    if (typeof duration !== 'number' || duration < 0) {
      throw new Error('Journey duration must be a positive number');
    }

    // Validate coordinates
    route.forEach((coord, index) => {
      if (!coord.latitude || !coord.longitude || !coord.timestamp) {
        throw new Error(`Invalid coordinate at index ${index}: latitude, longitude, and timestamp are required`);
      }

      if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
        throw new Error(`Invalid coordinate at index ${index}: latitude and longitude must be numbers`);
      }

      if (coord.latitude < -90 || coord.latitude > 90) {
        throw new Error(`Invalid latitude at index ${index}: must be between -90 and 90`);
      }

      if (coord.longitude < -180 || coord.longitude > 180) {
        throw new Error(`Invalid longitude at index ${index}: must be between -180 and 180`);
      }
    });
  }

  /**
   * Generate a default journey name based on date and time
   * @returns {string} Default journey name
   */
  generateDefaultJourneyName() {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Journey ${date} ${time}`;
  }

  /**
   * Check if a journey name is unique for a user
   * @param {string} userId - User ID
   * @param {string} name - Journey name to check
   * @returns {Promise<boolean>} True if name is unique
   */
  async isJourneyNameUnique(userId, name) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('name', '==', name),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;

    } catch (error) {
      Logger.error('Failed to check journey name uniqueness:', error);
      // If we can't check, assume it's not unique to be safe
      return false;
    }
  }

  /**
   * Generate a unique journey name for a user
   * @param {string} userId - User ID
   * @param {string} baseName - Base name to make unique
   * @returns {Promise<string>} Unique journey name
   */
  async generateUniqueJourneyName(userId, baseName) {
    let name = baseName;
    let counter = 1;

    while (!(await this.isJourneyNameUnique(userId, name))) {
      name = `${baseName} (${counter})`;
      counter++;
    }

    return name;
  }
}

// Export singleton instance
export default new JourneyService();