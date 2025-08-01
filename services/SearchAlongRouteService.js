/**
 * SearchAlongRouteService
 * 
 * Service for implementing Search Along Route (SAR) functionality using Google Places API.
 * Handles route-based place discovery, preference filtering, and fallback mechanisms.
 * 
 * Requirements addressed:
 * - 1.1: Search for places along entire route path using searchAlongRouteParameters
 * - 1.3: Make single API call with entire route to optimize performance
 * - 6.1: Only search for place types enabled in user's discovery preferences
 * - 6.2: Include only selected types in SAR API request
 * - 6.3: Include all supported place types when 'All Types' is selected
 */

import { Platform } from 'react-native';
import { GOOGLE_MAPS_API_KEY_ANDROID, GOOGLE_MAPS_API_KEY_IOS } from '../config';
import { encodeRoute, validateCoordinates, isRouteLongEnoughForSAR, calculateCenterPoint } from '../utils/routeEncoder';

/**
 * Google Places API supported place types for Search Along Route
 * Based on Google Places API documentation and app requirements
 */
export const PLACE_TYPES = {
  // Food & Dining
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  bakery: 'Bakery',
  meal_takeaway: 'Takeaway',
  meal_delivery: 'Food Delivery',
  
  // Shopping & Retail
  store: 'Store',
  shopping_mall: 'Shopping Mall',
  supermarket: 'Supermarket',
  convenience_store: 'Convenience Store',
  clothing_store: 'Clothing Store',
  book_store: 'Book Store',
  
  // Entertainment & Culture
  park: 'Park',
  amusement_park: 'Amusement Park',
  zoo: 'Zoo',
  museum: 'Museum',
  art_gallery: 'Art Gallery',
  movie_theater: 'Movie Theater',
  night_club: 'Night Club',
  
  // Health & Wellness
  hospital: 'Hospital',
  pharmacy: 'Pharmacy',
  gym: 'Gym',
  spa: 'Spa',
  
  // Services & Utilities
  gas_station: 'Gas Station',
  bank: 'Bank',
  atm: 'ATM',
  post_office: 'Post Office',
  
  // Outdoors & Recreation
  tourist_attraction: 'Tourist Attraction',
  campground: 'Campground',
  rv_park: 'RV Park'
};

/**
 * Place categories for organization
 */
export const PLACE_CATEGORIES = {
  FOOD_DINING: 'Food & Dining',
  SHOPPING_RETAIL: 'Shopping & Retail',
  ENTERTAINMENT_CULTURE: 'Entertainment & Culture',
  HEALTH_WELLNESS: 'Health & Wellness',
  SERVICES_UTILITIES: 'Services & Utilities',
  OUTDOORS_RECREATION: 'Outdoors & Recreation'
};

/**
 * Map place types to categories
 */
export const PLACE_TYPE_TO_CATEGORY = {
  restaurant: PLACE_CATEGORIES.FOOD_DINING,
  cafe: PLACE_CATEGORIES.FOOD_DINING,
  bar: PLACE_CATEGORIES.FOOD_DINING,
  bakery: PLACE_CATEGORIES.FOOD_DINING,
  meal_takeaway: PLACE_CATEGORIES.FOOD_DINING,
  meal_delivery: PLACE_CATEGORIES.FOOD_DINING,
  
  store: PLACE_CATEGORIES.SHOPPING_RETAIL,
  shopping_mall: PLACE_CATEGORIES.SHOPPING_RETAIL,
  supermarket: PLACE_CATEGORIES.SHOPPING_RETAIL,
  convenience_store: PLACE_CATEGORIES.SHOPPING_RETAIL,
  clothing_store: PLACE_CATEGORIES.SHOPPING_RETAIL,
  book_store: PLACE_CATEGORIES.SHOPPING_RETAIL,
  
  park: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  amusement_park: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  zoo: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  museum: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  art_gallery: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  movie_theater: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  night_club: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE,
  
  hospital: PLACE_CATEGORIES.HEALTH_WELLNESS,
  pharmacy: PLACE_CATEGORIES.HEALTH_WELLNESS,
  gym: PLACE_CATEGORIES.HEALTH_WELLNESS,
  spa: PLACE_CATEGORIES.HEALTH_WELLNESS,
  
  gas_station: PLACE_CATEGORIES.SERVICES_UTILITIES,
  bank: PLACE_CATEGORIES.SERVICES_UTILITIES,
  atm: PLACE_CATEGORIES.SERVICES_UTILITIES,
  post_office: PLACE_CATEGORIES.SERVICES_UTILITIES,
  
  tourist_attraction: PLACE_CATEGORIES.OUTDOORS_RECREATION,
  campground: PLACE_CATEGORIES.OUTDOORS_RECREATION,
  rv_park: PLACE_CATEGORIES.OUTDOORS_RECREATION
};

class SearchAlongRouteService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
    this.baseUrl = 'https://places.googleapis.com/v1/places:searchAlongRoute';
  }

  /**
   * Get the appropriate Google Maps API key for the current platform
   * @returns {string} API key for current platform
   * @throws {Error} If no API key is available
   */
  getApiKey() {
    let apiKey;
    
    if (Platform.OS === 'ios' && GOOGLE_MAPS_API_KEY_IOS) {
      apiKey = GOOGLE_MAPS_API_KEY_IOS;
    } else if (Platform.OS === 'android' && GOOGLE_MAPS_API_KEY_ANDROID) {
      apiKey = GOOGLE_MAPS_API_KEY_ANDROID;
    } else {
      // Fallback to any available key
      apiKey = GOOGLE_MAPS_API_KEY_IOS || GOOGLE_MAPS_API_KEY_ANDROID;
    }

    if (!apiKey) {
      throw new Error('No Google Maps API key available for Search Along Route');
    }

    return apiKey;
  }

  /**
   * Build place types array based on user preferences
   * @param {Object} preferences - User's discovery preferences
   * @returns {Array<string>} Array of place types to search for
   */
  buildPlaceTypesFromPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      // Default to all place types if no preferences provided
      return Object.keys(PLACE_TYPES);
    }

    // Handle structured preference object with placeTypes property
    const placeTypePrefs = preferences.placeTypes || preferences;

    // If 'All Types' is selected, return all supported types
    if (preferences.allTypes === true || placeTypePrefs.allTypes === true) {
      return Object.keys(PLACE_TYPES);
    }

    // Build array from individual preference selections
    const selectedTypes = [];
    
    Object.keys(PLACE_TYPES).forEach(type => {
      if (placeTypePrefs[type] === true) {
        selectedTypes.push(type);
      }
    });

    // If no types are selected, default to all types
    if (selectedTypes.length === 0) {
      return Object.keys(PLACE_TYPES);
    }

    return selectedTypes;
  }

  /**
   * Get minimum rating from user preferences
   * @param {Object} preferences - User's discovery preferences
   * @returns {number} Minimum rating threshold
   */
  getMinRatingFromPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      return 0; // No minimum rating if no preferences
    }

    // Check for minRating in preferences object
    const minRating = preferences.minRating || preferences.minimumRating || 0;
    
    // Validate rating is within valid range (0-5)
    if (typeof minRating === 'number' && minRating >= 0 && minRating <= 5) {
      return minRating;
    }

    return 0; // Default to no minimum rating
  }

  /**
   * Apply advanced preference filtering to discovered places
   * @param {Array<Object>} places - Array of discovered places
   * @param {Object} preferences - User's discovery preferences
   * @returns {Array<Object>} Filtered places array
   */
  applyPreferenceFiltering(places, preferences) {
    if (!Array.isArray(places) || places.length === 0) {
      return places;
    }

    if (!preferences || typeof preferences !== 'object') {
      return places; // No filtering if no preferences
    }

    let filteredPlaces = [...places];

    // Apply minimum rating filter
    const minRating = this.getMinRatingFromPreferences(preferences);
    if (minRating > 0) {
      filteredPlaces = filteredPlaces.filter(place => {
        return place.rating && place.rating >= minRating;
      });
    }

    // Apply place type filtering (additional client-side filtering)
    const enabledTypes = this.buildPlaceTypesFromPreferences(preferences);
    if (enabledTypes.length < Object.keys(PLACE_TYPES).length) {
      filteredPlaces = filteredPlaces.filter(place => {
        if (!place.types || !Array.isArray(place.types)) {
          return false;
        }
        
        // Check if any of the place's types are in the enabled types
        return place.types.some(type => enabledTypes.includes(type));
      });
    }

    // Apply enhanced data preferences if available
    if (preferences.enhancedDataPreferences) {
      filteredPlaces = this.applyEnhancedDataFiltering(filteredPlaces, preferences.enhancedDataPreferences);
    }

    console.log(`Applied preference filtering: ${places.length} -> ${filteredPlaces.length} places`);
    return filteredPlaces;
  }

  /**
   * Apply enhanced data preference filtering
   * @param {Array<Object>} places - Array of places
   * @param {Object} enhancedPrefs - Enhanced data preferences
   * @returns {Array<Object>} Filtered places array
   */
  applyEnhancedDataFiltering(places, enhancedPrefs) {
    if (!enhancedPrefs || typeof enhancedPrefs !== 'object') {
      return places;
    }

    let filteredPlaces = [...places];

    // Filter based on photo availability if required
    if (enhancedPrefs.includePhotos === true) {
      filteredPlaces = filteredPlaces.filter(place => {
        return place.photos && Array.isArray(place.photos) && place.photos.length > 0;
      });
    }

    // Filter based on operating hours if required
    if (enhancedPrefs.includeOperatingHours === true) {
      filteredPlaces = filteredPlaces.filter(place => {
        return place.openingHours || place.opening_hours;
      });
    }

    return filteredPlaces;
  }

  /**
   * Validate and normalize user preferences for SAR
   * @param {Object} preferences - Raw user preferences
   * @returns {Object} Normalized preferences object
   */
  validateAndNormalizePreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      return {
        placeTypes: {},
        minRating: 0,
        allTypes: true
      };
    }

    const normalized = {
      placeTypes: preferences.placeTypes || preferences,
      minRating: this.getMinRatingFromPreferences(preferences),
      allTypes: preferences.allTypes || false,
      enhancedDataPreferences: preferences.enhancedDataPreferences || null
    };

    // Validate place types against known types
    if (normalized.placeTypes && typeof normalized.placeTypes === 'object') {
      const validatedPlaceTypes = {};
      Object.keys(PLACE_TYPES).forEach(type => {
        validatedPlaceTypes[type] = normalized.placeTypes[type] === true;
      });
      normalized.placeTypes = validatedPlaceTypes;
    }

    return normalized;
  }

  /**
   * Get user preference statistics for logging and debugging
   * @param {Object} preferences - User preferences
   * @returns {Object} Preference statistics
   */
  getPreferenceStats(preferences) {
    const normalized = this.validateAndNormalizePreferences(preferences);
    const enabledTypes = this.buildPlaceTypesFromPreferences(normalized);
    
    const stats = {
      totalPlaceTypes: Object.keys(PLACE_TYPES).length,
      enabledPlaceTypes: enabledTypes.length,
      minRating: normalized.minRating,
      allTypesEnabled: normalized.allTypes,
      hasEnhancedPrefs: !!normalized.enhancedDataPreferences
    };

    // Count enabled types by category
    stats.enabledByCategory = {};
    Object.entries(PLACE_TYPE_TO_CATEGORY).forEach(([type, category]) => {
      if (enabledTypes.includes(type)) {
        stats.enabledByCategory[category] = (stats.enabledByCategory[category] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Build Search Along Route API request payload
   * @param {string} encodedPolyline - Google encoded polyline string
   * @param {Object} preferences - User's discovery preferences
   * @param {number} minRating - Minimum rating threshold (1-5)
   * @returns {Object} API request payload
   */
  buildSARRequest(encodedPolyline, preferences = {}, minRating = 0) {
    const placeTypes = this.buildPlaceTypesFromPreferences(preferences);
    
    const request = {
      polyline: {
        encodedPolyline: encodedPolyline
      },
      includedTypes: placeTypes,
      maxResultCount: 20, // Reasonable limit for performance
      rankPreference: 'DISTANCE'
    };

    // Add minimum rating filter if specified
    if (minRating > 0 && minRating <= 5) {
      request.minRating = minRating;
    }

    return request;
  }

  /**
   * Perform Search Along Route API call with enhanced preference integration
   * @param {string} encodedPolyline - Google encoded polyline string
   * @param {Object} preferences - User's discovery preferences (structured object)
   * @param {number} minRating - Minimum rating threshold
   * @returns {Promise<Array<Object>>} Array of discovered places
   * @throws {Error} If API call fails
   */
  async performSARRequest(encodedPolyline, preferences = {}, minRating = 0) {
    try {
      const apiKey = this.getApiKey();
      const requestPayload = this.buildSARRequest(encodedPolyline, preferences, minRating);

      console.log('Making Search Along Route API request:', {
        url: this.baseUrl,
        placeTypes: requestPayload.includedTypes,
        minRating: requestPayload.minRating || 'none',
        maxResults: requestPayload.maxResultCount
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.location,places.rating,places.priceLevel,places.primaryType'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search Along Route API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`SAR API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.places || !Array.isArray(data.places)) {
        console.log('No places found in SAR response');
        return [];
      }

      console.log(`Search Along Route found ${data.places.length} places`);
      return this.processRawPlaces(data.places);

    } catch (error) {
      console.error('Error performing Search Along Route request:', error);
      throw error;
    }
  }

  /**
   * Process raw places data from Google Places API
   * @param {Array<Object>} rawPlaces - Raw places from API response
   * @returns {Array<Object>} Processed places data
   */
  processRawPlaces(rawPlaces) {
    return rawPlaces.map(place => {
      const processedPlace = {
        id: place.id,
        placeId: place.id, // Google Places v1 uses 'id' instead of 'place_id'
        name: place.displayName?.text || 'Unnamed Place',
        types: place.types || [],
        primaryType: place.primaryType || (place.types && place.types[0]) || 'establishment',
        location: {
          latitude: place.location?.latitude || 0,
          longitude: place.location?.longitude || 0
        },
        rating: place.rating || null,
        priceLevel: place.priceLevel || null,
        category: this.getPlaceCategory(place.types || []),
        discoverySource: 'SAR',
        discoveredAt: new Date().toISOString(),
        saved: false,
        dismissed: false,
        
        // Schema versioning and metadata
        schemaVersion: 1,
        lastUpdated: new Date().toISOString(),
        metadata: {},
        extensions: {}
      };

      return processedPlace;
    });
  }

  /**
   * Get category for a place based on its types
   * @param {Array<string>} types - Array of place types
   * @returns {string} Category name
   */
  getPlaceCategory(types) {
    if (!Array.isArray(types) || types.length === 0) {
      return PLACE_CATEGORIES.SERVICES_UTILITIES; // Default category
    }

    // Find the first matching type that has a category mapping
    for (const type of types) {
      if (PLACE_TYPE_TO_CATEGORY[type]) {
        return PLACE_TYPE_TO_CATEGORY[type];
      }
    }

    // Fallback to default category
    return PLACE_CATEGORIES.SERVICES_UTILITIES;
  }

  /**
   * Main Search Along Route function with enhanced preference integration
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} preferences - User's discovery preferences (structured object)
   * @param {number} minRating - Minimum rating threshold (optional, overrides preferences)
   * @returns {Promise<Array<Object>>} Array of discovered places
   * @throws {Error} If coordinates are invalid or API fails
   */
  async searchAlongRoute(coordinates, preferences = {}, minRating = null) {
    try {
      // Validate input coordinates
      if (!validateCoordinates(coordinates)) {
        throw new Error('Invalid coordinates provided for Search Along Route');
      }

      // Check if route is long enough for SAR
      if (!isRouteLongEnoughForSAR(coordinates)) {
        console.log('Route too short for Search Along Route, skipping SAR');
        return [];
      }

      // Determine minimum rating from preferences or parameter
      const effectiveMinRating = minRating !== null ? minRating : this.getMinRatingFromPreferences(preferences);

      // Check cache first
      const cacheKey = this.generateCacheKey(coordinates, preferences, effectiveMinRating);
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log('Returning cached SAR results');
        return cached;
      }

      // Encode route to polyline
      const encodedPolyline = encodeRoute(coordinates);
      console.log('Encoded route for SAR:', {
        coordinateCount: coordinates.length,
        polylineLength: encodedPolyline.length,
        enabledPlaceTypes: this.buildPlaceTypesFromPreferences(preferences).length,
        minRating: effectiveMinRating
      });

      // Perform SAR API request with preferences
      const rawPlaces = await this.performSARRequest(encodedPolyline, preferences, effectiveMinRating);

      // Apply additional client-side preference filtering
      const filteredPlaces = this.applyPreferenceFiltering(rawPlaces, preferences);

      // Cache the results
      this.setCachedData(cacheKey, filteredPlaces);

      console.log(`SAR completed: ${rawPlaces.length} raw places -> ${filteredPlaces.length} filtered places`);
      return filteredPlaces;

    } catch (error) {
      console.error('Search Along Route failed:', error);
      throw error;
    }
  }

  /**
   * Check if a route meets the minimum length requirement for SAR
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @returns {boolean} True if route is long enough for SAR
   */
  isRouteLongEnough(coordinates) {
    return isRouteLongEnoughForSAR(coordinates);
  }

  /**
   * Generate cache key for SAR results
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} preferences - User preferences
   * @param {number} minRating - Minimum rating
   * @returns {string} Cache key
   */
  generateCacheKey(coordinates, preferences, minRating) {
    // Create a simple hash of the route and preferences
    const routeHash = coordinates.length > 0 ? 
      `${coordinates[0].latitude},${coordinates[0].longitude}-${coordinates[coordinates.length - 1].latitude},${coordinates[coordinates.length - 1].longitude}` : 
      'empty';
    const prefsHash = JSON.stringify(preferences);
    return `sar-${routeHash}-${prefsHash}-${minRating}`;
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

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new SearchAlongRouteService();