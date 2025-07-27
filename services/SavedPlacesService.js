/**
 * SavedPlacesService
 * 
 * Service for managing saved places functionality including:
 * - Loading user's saved places from Firestore
 * - Managing place data and metadata
 * - Providing place type to icon mapping
 * - Handling place details and Google Places integration
 * 
 * Requirements addressed:
 * - 6.1: Show/hide saved places functionality
 * - 6.2: Display markers with Google Place Icons
 * - 6.3: Display detailed information using Google Places UI Kit
 * - 6.4: Visual style that doesn't interfere with journey tracking
 * - 6.6: Theme-aware styling for markers and place details
 * - 6.7: Navigation, saving, and sharing options
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants/FirestoreSchema';

/**
 * Google Place Types to Icon Mapping
 * Maps Google Place types to appropriate icon names for display
 */
export const PLACE_TYPE_TO_ICON = {
  // Food & Drink
  restaurant: 'restaurant',
  food: 'restaurant',
  meal_takeaway: 'restaurant',
  meal_delivery: 'restaurant',
  cafe: 'cafe',
  bar: 'wine-bar',
  bakery: 'bakery-dining',
  
  // Shopping
  store: 'store',
  shopping_mall: 'local-mall',
  supermarket: 'local-grocery-store',
  convenience_store: 'store',
  clothing_store: 'checkroom',
  book_store: 'menu-book',
  
  // Entertainment & Recreation
  park: 'park',
  amusement_park: 'attractions',
  zoo: 'pets',
  museum: 'museum',
  art_gallery: 'palette',
  movie_theater: 'local-movies',
  night_club: 'nightlife',
  
  // Services
  gas_station: 'local-gas-station',
  hospital: 'local-hospital',
  pharmacy: 'local-pharmacy',
  bank: 'account-balance',
  atm: 'atm',
  post_office: 'local-post-office',
  
  // Transportation
  subway_station: 'train',
  bus_station: 'directions-bus',
  taxi_stand: 'local-taxi',
  parking: 'local-parking',
  
  // Accommodation
  lodging: 'hotel',
  
  // Religious
  church: 'church',
  
  // Education
  school: 'school',
  university: 'school',
  
  // Government
  city_hall: 'account-balance',
  courthouse: 'account-balance',
  
  // Default fallback
  establishment: 'place',
  point_of_interest: 'place',
  default: 'place'
};

/**
 * Place Categories for Organization
 */
export const PLACE_CATEGORIES = {
  FOOD_DRINK: 'Food & Drink',
  SHOPPING: 'Shopping',
  ENTERTAINMENT: 'Entertainment',
  SERVICES: 'Services',
  TRANSPORTATION: 'Transportation',
  ACCOMMODATION: 'Accommodation',
  EDUCATION: 'Education',
  OTHER: 'Other'
};

/**
 * Map place types to categories
 */
export const PLACE_TYPE_TO_CATEGORY = {
  restaurant: PLACE_CATEGORIES.FOOD_DRINK,
  food: PLACE_CATEGORIES.FOOD_DRINK,
  cafe: PLACE_CATEGORIES.FOOD_DRINK,
  bar: PLACE_CATEGORIES.FOOD_DRINK,
  bakery: PLACE_CATEGORIES.FOOD_DRINK,
  
  store: PLACE_CATEGORIES.SHOPPING,
  shopping_mall: PLACE_CATEGORIES.SHOPPING,
  supermarket: PLACE_CATEGORIES.SHOPPING,
  
  park: PLACE_CATEGORIES.ENTERTAINMENT,
  museum: PLACE_CATEGORIES.ENTERTAINMENT,
  movie_theater: PLACE_CATEGORIES.ENTERTAINMENT,
  
  gas_station: PLACE_CATEGORIES.SERVICES,
  hospital: PLACE_CATEGORIES.SERVICES,
  pharmacy: PLACE_CATEGORIES.SERVICES,
  bank: PLACE_CATEGORIES.SERVICES,
  
  subway_station: PLACE_CATEGORIES.TRANSPORTATION,
  bus_station: PLACE_CATEGORIES.TRANSPORTATION,
  parking: PLACE_CATEGORIES.TRANSPORTATION,
  
  lodging: PLACE_CATEGORIES.ACCOMMODATION,
  
  school: PLACE_CATEGORIES.EDUCATION,
  university: PLACE_CATEGORIES.EDUCATION,
};

class SavedPlacesService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load saved places for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of saved places
   */
  async loadSavedPlaces(userId, options = {}) {
    try {
      const {
        limit: queryLimit = 100,
        category = null,
        orderBy: orderField = 'createdAt',
        orderDirection = 'desc'
      } = options;

      // Check cache first
      const cacheKey = `saved-places-${userId}-${JSON.stringify(options)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // Build Firestore query
      const placesRef = collection(db, 'users', userId, COLLECTIONS.SAVED_PLACES);
      let q = query(placesRef);

      // Add category filter if specified
      if (category) {
        q = query(q, where('category', '==', category));
      }

      // Add ordering
      q = query(q, orderBy(orderField, orderDirection));

      // Add limit
      if (queryLimit) {
        q = query(q, limit(queryLimit));
      }

      // Execute query
      const querySnapshot = await getDocs(q);
      const places = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        places.push({
          id: doc.id,
          ...data,
          // Ensure required fields have defaults
          types: data.types || ['establishment'],
          saved: true,
          schemaVersion: data.schemaVersion || 1,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        });
      });

      // Cache the results
      this.setCachedData(cacheKey, places);

      console.log(`Loaded ${places.length} saved places for user ${userId}`);
      return places;

    } catch (error) {
      console.error('Error loading saved places:', error);
      throw new Error(`Failed to load saved places: ${error.message}`);
    }
  }

  /**
   * Get icon name for a place based on its types
   * @param {Object} place - Place object with types array
   * @returns {string} Icon name
   */
  getPlaceIcon(place) {
    if (!place || !place.types || !Array.isArray(place.types)) {
      return PLACE_TYPE_TO_ICON.default;
    }

    // Find the first matching type that has an icon mapping
    for (const type of place.types) {
      if (PLACE_TYPE_TO_ICON[type]) {
        return PLACE_TYPE_TO_ICON[type];
      }
    }

    // Fallback to default icon
    return PLACE_TYPE_TO_ICON.default;
  }

  /**
   * Get category for a place based on its types
   * @param {Object} place - Place object with types array
   * @returns {string} Category name
   */
  getPlaceCategory(place) {
    if (!place || !place.types || !Array.isArray(place.types)) {
      return PLACE_CATEGORIES.OTHER;
    }

    // Find the first matching type that has a category mapping
    for (const type of place.types) {
      if (PLACE_TYPE_TO_CATEGORY[type]) {
        return PLACE_TYPE_TO_CATEGORY[type];
      }
    }

    // Fallback to OTHER category
    return PLACE_CATEGORIES.OTHER;
  }

  /**
   * Save a place to user's saved places
   * @param {string} userId - User ID
   * @param {Object} place - Place data to save
   * @returns {Promise<Object>} Saved place object
   */
  async savePlace(userId, place) {
    try {
      const placeId = place.placeId || place.id || `place_${Date.now()}`;
      const placeRef = doc(db, 'users', userId, COLLECTIONS.SAVED_PLACES, placeId);

      const placeData = {
        id: placeId,
        name: place.name || 'Unnamed Place',
        latitude: place.latitude || place.geometry?.location?.lat || 0,
        longitude: place.longitude || place.geometry?.location?.lng || 0,
        vicinity: place.vicinity || place.formatted_address || '',
        placeId: place.placeId || place.place_id || placeId,
        types: place.types || ['establishment'],
        saved: true,
        category: this.getPlaceCategory(place),
        
        // Metadata
        schemaVersion: 2,
        lastUpdated: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Optional fields
        rating: place.rating || null,
        priceLevel: place.price_level || null,
        openingHours: place.opening_hours || null,
        photos: place.photos || [],
        
        // Extension points
        metadata: place.metadata || {},
        extensions: place.extensions || {}
      };

      await setDoc(placeRef, placeData);

      // Clear cache
      this.clearUserCache(userId);

      console.log(`Saved place: ${placeData.name} (${placeId})`);
      return placeData;

    } catch (error) {
      console.error('Error saving place:', error);
      throw new Error(`Failed to save place: ${error.message}`);
    }
  }

  /**
   * Remove a place from user's saved places
   * @param {string} userId - User ID
   * @param {string} placeId - Place ID to remove
   * @returns {Promise<void>}
   */
  async unsavePlace(userId, placeId) {
    try {
      const placeRef = doc(db, 'users', userId, COLLECTIONS.SAVED_PLACES, placeId);
      await deleteDoc(placeRef);

      // Clear cache
      this.clearUserCache(userId);

      console.log(`Removed saved place: ${placeId}`);

    } catch (error) {
      console.error('Error removing saved place:', error);
      throw new Error(`Failed to remove saved place: ${error.message}`);
    }
  }

  /**
   * Get a specific saved place
   * @param {string} userId - User ID
   * @param {string} placeId - Place ID
   * @returns {Promise<Object|null>} Place object or null if not found
   */
  async getSavedPlace(userId, placeId) {
    try {
      const placeRef = doc(db, 'users', userId, COLLECTIONS.SAVED_PLACES, placeId);
      const placeDoc = await getDoc(placeRef);

      if (placeDoc.exists()) {
        return {
          id: placeDoc.id,
          ...placeDoc.data()
        };
      }

      return null;

    } catch (error) {
      console.error('Error getting saved place:', error);
      throw new Error(`Failed to get saved place: ${error.message}`);
    }
  }

  /**
   * Check if a place is saved by the user
   * @param {string} userId - User ID
   * @param {string} placeId - Place ID to check
   * @returns {Promise<boolean>} True if place is saved
   */
  async isPlaceSaved(userId, placeId) {
    try {
      const place = await this.getSavedPlace(userId, placeId);
      return place !== null;
    } catch (error) {
      console.error('Error checking if place is saved:', error);
      return false;
    }
  }

  /**
   * Get places by category
   * @param {string} userId - User ID
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} Array of places in the category
   */
  async getPlacesByCategory(userId, category) {
    return this.loadSavedPlaces(userId, { category });
  }

  /**
   * Search saved places by name
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching places
   */
  async searchSavedPlaces(userId, searchTerm) {
    try {
      const allPlaces = await this.loadSavedPlaces(userId);
      
      if (!searchTerm || searchTerm.trim() === '') {
        return allPlaces;
      }

      const term = searchTerm.toLowerCase().trim();
      return allPlaces.filter(place => 
        place.name.toLowerCase().includes(term) ||
        place.vicinity.toLowerCase().includes(term) ||
        place.types.some(type => type.toLowerCase().includes(term))
      );

    } catch (error) {
      console.error('Error searching saved places:', error);
      throw new Error(`Failed to search saved places: ${error.message}`);
    }
  }

  /**
   * Get theme-aware marker style for a place
   * @param {Object} place - Place object
   * @param {string} theme - Theme name ('light', 'dark', 'adventure')
   * @returns {Object} Marker style configuration
   */
  getMarkerStyle(place, theme = 'light') {
    const baseStyle = {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    };

    const themeStyles = {
      light: {
        backgroundColor: '#FFFFFF',
        borderColor: '#4A90E2',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
      dark: {
        backgroundColor: '#2C2C2C',
        borderColor: '#64B5F6',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
      },
      adventure: {
        backgroundColor: '#8B4513',
        borderColor: '#FFD700',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }
    };

    return {
      ...baseStyle,
      ...themeStyles[theme]
    };
  }

  /**
   * Get theme-aware place detail style
   * @param {string} theme - Theme name ('light', 'dark', 'adventure')
   * @returns {Object} Place detail style configuration
   */
  getPlaceDetailStyle(theme = 'light') {
    const themeStyles = {
      light: {
        backgroundColor: '#FFFFFF',
        textColor: '#333333',
        secondaryTextColor: '#666666',
        borderColor: '#E0E0E0',
        buttonColor: '#4A90E2',
        buttonTextColor: '#FFFFFF',
      },
      dark: {
        backgroundColor: '#2C2C2C',
        textColor: '#FFFFFF',
        secondaryTextColor: '#CCCCCC',
        borderColor: '#444444',
        buttonColor: '#64B5F6',
        buttonTextColor: '#000000',
      },
      adventure: {
        backgroundColor: '#8B4513',
        textColor: '#FFD700',
        secondaryTextColor: '#DDD',
        borderColor: '#A0522D',
        buttonColor: '#FFD700',
        buttonTextColor: '#8B4513',
      }
    };

    return themeStyles[theme];
  }

  /**
   * Cache management methods
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearUserCache(userId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clearAllCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new SavedPlacesService();