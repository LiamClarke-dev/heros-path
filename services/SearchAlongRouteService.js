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
import { encodeRoute, validateCoordinates, isRouteLongEnoughForSAR, calculateCenterPoint, calculateRouteDistance } from '../utils/routeEncoder';

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
   * Enhanced to handle DiscoveryPreferencesScreen structured preferences
   * @param {Object} preferences - User's discovery preferences (structured or legacy format)
   * @returns {Array<string>} Array of place types to search for
   */
  buildPlaceTypesFromPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      // Default to all place types if no preferences provided
      console.log('No preferences provided, using all place types');
      return Object.keys(PLACE_TYPES);
    }

    // Handle structured preference object with placeTypes property (from DiscoveryPreferencesScreen)
    let placeTypePrefs = preferences.placeTypes || preferences;

    // If 'All Types' is selected, return all supported types
    if (preferences.allTypes === true || placeTypePrefs.allTypes === true) {
      console.log('All types enabled, using all place types');
      return Object.keys(PLACE_TYPES);
    }

    // Build array from individual preference selections
    const selectedTypes = [];
    const allPlaceTypes = Object.keys(PLACE_TYPES);

    allPlaceTypes.forEach(type => {
      if (placeTypePrefs[type] === true) {
        selectedTypes.push(type);
      }
    });

    // If no types are selected, default to all types to avoid empty results
    if (selectedTypes.length === 0) {
      console.log('No place types selected, defaulting to all types');
      return allPlaceTypes;
    }

    console.log(`Built place types from preferences: ${selectedTypes.length}/${allPlaceTypes.length} types enabled`);
    return selectedTypes;
  }

  /**
   * Get minimum rating from user preferences
   * Enhanced to handle DiscoveryPreferencesScreen structured preferences
   * @param {Object} preferences - User's discovery preferences (structured or legacy format)
   * @returns {number} Minimum rating threshold
   */
  getMinRatingFromPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      return 0; // No minimum rating if no preferences
    }

    // Check for minRating in various possible locations
    let minRating = 0;

    // Priority order for finding minimum rating:
    // 1. Direct minRating property (from DiscoveryPreferencesScreen)
    // 2. minimumRating property (legacy)
    // 3. rating property (alternative naming)
    // 4. Default to 0

    if (typeof preferences.minRating === 'number') {
      minRating = preferences.minRating;
    } else if (typeof preferences.minimumRating === 'number') {
      minRating = preferences.minimumRating;
    } else if (typeof preferences.rating === 'number') {
      minRating = preferences.rating;
    }

    // Validate rating is within valid range (0-5)
    if (minRating >= 0 && minRating <= 5) {
      return minRating;
    }

    // Log warning for invalid rating values
    if (minRating !== 0) {
      console.warn(`Invalid minimum rating value: ${minRating}. Using default value 0.`);
    }

    return 0; // Default to no minimum rating
  }

  /**
   * Apply advanced preference filtering to discovered places
   * Enhanced to work with DiscoveryPreferencesScreen integration
   * @param {Array<Object>} places - Array of discovered places
   * @param {Object} preferences - User's discovery preferences (structured object from DiscoveryPreferencesScreen)
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
    const originalCount = places.length;

    // Normalize preferences to handle both structured and legacy formats
    const normalizedPrefs = this.validateAndNormalizePreferences(preferences);

    // Apply minimum rating filter with enhanced logic
    const minRating = this.getMinRatingFromPreferences(normalizedPrefs);
    if (minRating > 0) {
      filteredPlaces = filteredPlaces.filter(place => {
        // Handle places without ratings more intelligently
        if (!place.rating || place.rating === null || place.rating === undefined) {
          // For places without ratings, apply a more lenient filter
          // Only exclude if minimum rating is very high (4.5+)
          return minRating < 4.5;
        }
        return place.rating >= minRating;
      });

      console.log(`Applied minimum rating filter (${minRating}): ${originalCount} -> ${filteredPlaces.length} places`);
    }

    // Apply place type filtering with enhanced logic
    const enabledTypes = this.buildPlaceTypesFromPreferences(normalizedPrefs);
    if (enabledTypes.length < Object.keys(PLACE_TYPES).length && !normalizedPrefs.allTypes) {
      const beforeTypeFilter = filteredPlaces.length;

      filteredPlaces = filteredPlaces.filter(place => {
        if (!place.types || !Array.isArray(place.types) || place.types.length === 0) {
          // For places without types, check primary type
          if (place.primaryType) {
            return enabledTypes.includes(place.primaryType);
          }
          return false;
        }

        // Check if any of the place's types are in the enabled types
        return place.types.some(type => enabledTypes.includes(type));
      });

      console.log(`Applied place type filter (${enabledTypes.length} enabled): ${beforeTypeFilter} -> ${filteredPlaces.length} places`);
    }

    // Apply category-based filtering for balanced results
    if (normalizedPrefs.categoryBalancing !== false) {
      filteredPlaces = this.applyCategoryBalancing(filteredPlaces, normalizedPrefs);
    }

    // Apply enhanced data preferences if available
    if (normalizedPrefs.enhancedDataPreferences) {
      filteredPlaces = this.applyEnhancedDataFiltering(filteredPlaces, normalizedPrefs.enhancedDataPreferences);
    }

    // Apply user behavior-based filtering if available
    if (normalizedPrefs.userBehaviorPreferences) {
      filteredPlaces = this.applyUserBehaviorFiltering(filteredPlaces, normalizedPrefs.userBehaviorPreferences);
    }

    console.log(`Applied comprehensive preference filtering: ${originalCount} -> ${filteredPlaces.length} places`);
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
   * Apply category balancing to ensure diverse results
   * @param {Array<Object>} places - Array of places
   * @param {Object} preferences - User preferences
   * @returns {Array<Object>} Balanced places array
   */
  applyCategoryBalancing(places, preferences) {
    if (!Array.isArray(places) || places.length === 0) {
      return places;
    }

    // Group places by category
    const placesByCategory = {};
    places.forEach(place => {
      const category = place.category || this.getPlaceCategory(place.types || []);
      if (!placesByCategory[category]) {
        placesByCategory[category] = [];
      }
      placesByCategory[category].push(place);
    });

    // Get enabled categories based on user preferences
    const enabledTypes = this.buildPlaceTypesFromPreferences(preferences);
    const enabledCategories = new Set();

    enabledTypes.forEach(type => {
      const category = PLACE_TYPE_TO_CATEGORY[type];
      if (category) {
        enabledCategories.add(category);
      }
    });

    // Balance results across enabled categories
    const balancedPlaces = [];
    const maxPerCategory = Math.max(1, Math.floor(20 / enabledCategories.size)); // Distribute 20 results across categories, minimum 1 per category

    Object.entries(placesByCategory).forEach(([category, categoryPlaces]) => {
      if (enabledCategories.has(category)) {
        // Sort by rating (highest first) and take top results for this category
        const sortedPlaces = categoryPlaces.sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });

        balancedPlaces.push(...sortedPlaces.slice(0, maxPerCategory));
      }
    });

    console.log(`Applied category balancing: ${places.length} -> ${balancedPlaces.length} places across ${enabledCategories.size} categories`);
    return balancedPlaces;
  }

  /**
   * Apply user behavior-based filtering
   * @param {Array<Object>} places - Array of places
   * @param {Object} behaviorPrefs - User behavior preferences
   * @returns {Array<Object>} Filtered places array
   */
  applyUserBehaviorFiltering(places, behaviorPrefs) {
    if (!behaviorPrefs || typeof behaviorPrefs !== 'object') {
      return places;
    }

    let filteredPlaces = [...places];

    // Filter based on previously saved/dismissed places
    if (behaviorPrefs.excludePreviouslyDismissed === true && behaviorPrefs.dismissedPlaceIds) {
      const dismissedIds = new Set(behaviorPrefs.dismissedPlaceIds);
      filteredPlaces = filteredPlaces.filter(place => !dismissedIds.has(place.placeId));
    }

    // Filter based on user's historical preferences
    if (behaviorPrefs.preferredCategories && Array.isArray(behaviorPrefs.preferredCategories)) {
      const preferredCategories = new Set(behaviorPrefs.preferredCategories);
      filteredPlaces = filteredPlaces.filter(place => {
        const category = place.category || this.getPlaceCategory(place.types || []);
        return preferredCategories.has(category);
      });
    }

    // Apply time-based filtering if available
    if (behaviorPrefs.timePreferences) {
      filteredPlaces = this.applyTimeBasedFiltering(filteredPlaces, behaviorPrefs.timePreferences);
    }

    return filteredPlaces;
  }

  /**
   * Apply time-based filtering for places
   * @param {Array<Object>} places - Array of places
   * @param {Object} timePrefs - Time-based preferences
   * @returns {Array<Object>} Filtered places array
   */
  applyTimeBasedFiltering(places, timePrefs) {
    if (!timePrefs || typeof timePrefs !== 'object') {
      return places;
    }

    // This is a placeholder for future time-based filtering
    // Could include filtering based on opening hours, peak times, etc.
    return places;
  }

  /**
   * Validate and normalize user preferences for SAR
   * Enhanced to handle DiscoveryPreferencesScreen structured preferences
   * @param {Object} preferences - Raw user preferences from DiscoveryPreferencesScreen or legacy format
   * @returns {Object} Normalized preferences object
   */
  validateAndNormalizePreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      return {
        placeTypes: {},
        minRating: 0,
        allTypes: true,
        categoryBalancing: true,
        enhancedDataPreferences: null,
        userBehaviorPreferences: null
      };
    }

    // Handle both structured preferences from DiscoveryPreferencesScreen and legacy format
    let placeTypes = {};

    // Check if this is a structured preference object from DiscoveryPreferencesScreen
    if (preferences.placeTypes && typeof preferences.placeTypes === 'object') {
      placeTypes = preferences.placeTypes;
    } else {
      // Legacy format - preferences object contains place types directly
      placeTypes = preferences;
    }

    const normalized = {
      placeTypes: placeTypes,
      minRating: this.getMinRatingFromPreferences(preferences),
      allTypes: preferences.allTypes || false,
      categoryBalancing: preferences.categoryBalancing !== false, // Default to true
      enhancedDataPreferences: preferences.enhancedDataPreferences || null,
      userBehaviorPreferences: preferences.userBehaviorPreferences || null
    };

    // Validate place types against known types
    if (normalized.placeTypes && typeof normalized.placeTypes === 'object') {
      const validatedPlaceTypes = {};
      Object.keys(PLACE_TYPES).forEach(type => {
        // Include all place types with their boolean values
        validatedPlaceTypes[type] = normalized.placeTypes[type] === true;
      });
      normalized.placeTypes = validatedPlaceTypes;
    }

    // Check if all types are enabled (for optimization)
    const enabledCount = Object.values(normalized.placeTypes).filter(Boolean).length;
    const totalCount = Object.keys(PLACE_TYPES).length;

    if (enabledCount === totalCount) {
      normalized.allTypes = true;
    } else if (enabledCount === 0) {
      // If no types are enabled, default to all types
      normalized.allTypes = true;
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
      hasEnhancedPrefs: !!normalized.enhancedDataPreferences,
      hasBehaviorPrefs: !!normalized.userBehaviorPreferences,
      categoryBalancingEnabled: normalized.categoryBalancing
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
   * Create SAR-compatible preferences from DiscoveryPreferencesScreen data
   * This method bridges the gap between the DiscoveryPreferencesScreen hook and SAR service
   * @param {Object} discoveryPreferences - Preferences from useDiscoveryPreferences hook
   * @param {number} minRating - Minimum rating from useDiscoveryPreferences hook
   * @param {Object} additionalPrefs - Additional preferences (optional)
   * @returns {Object} SAR-compatible preferences object
   */
  createSARPreferencesFromDiscoveryScreen(discoveryPreferences, minRating, additionalPrefs = {}) {
    if (!discoveryPreferences || typeof discoveryPreferences !== 'object') {
      console.warn('Invalid discovery preferences provided to createSARPreferencesFromDiscoveryScreen');
      return this.validateAndNormalizePreferences({
        minRating: typeof minRating === 'number' && !isNaN(minRating) ? minRating : 0
      });
    }

    // Create structured preferences object for SAR
    const sarPreferences = {
      placeTypes: discoveryPreferences, // The preferences object from useDiscoveryPreferences contains place type selections
      minRating: typeof minRating === 'number' && !isNaN(minRating) ? minRating : 0,
      allTypes: false, // Will be determined by validation
      categoryBalancing: additionalPrefs.categoryBalancing !== false,
      enhancedDataPreferences: additionalPrefs.enhancedDataPreferences || null,
      userBehaviorPreferences: additionalPrefs.userBehaviorPreferences || null
    };

    // Validate and normalize the preferences
    const normalized = this.validateAndNormalizePreferences(sarPreferences);

    console.log('Created SAR preferences from DiscoveryPreferencesScreen:', {
      enabledTypes: this.buildPlaceTypesFromPreferences(normalized).length,
      minRating: normalized.minRating,
      allTypes: normalized.allTypes,
      categoryBalancing: normalized.categoryBalancing
    });

    return normalized;
  }

  /**
   * Validate preferences compatibility with DiscoveryPreferencesScreen
   * @param {Object} preferences - Preferences to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validateDiscoveryScreenCompatibility(preferences) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!preferences || typeof preferences !== 'object') {
      validation.isValid = false;
      validation.errors.push('Preferences object is required');
      return validation;
    }

    // Check for required structure
    if (!preferences.placeTypes && !Object.keys(PLACE_TYPES).some(type => preferences.hasOwnProperty(type))) {
      validation.warnings.push('No place type preferences found, will default to all types');
    }

    // Validate minimum rating
    const minRating = this.getMinRatingFromPreferences(preferences);
    if (minRating > 4.5) {
      validation.warnings.push('Very high minimum rating may result in few discoveries');
    }

    // Check for enabled place types
    const enabledTypes = this.buildPlaceTypesFromPreferences(preferences);
    if (enabledTypes.length === 0) {
      validation.warnings.push('No place types enabled, will default to all types');
    } else if (enabledTypes.length < 3) {
      validation.suggestions.push('Consider enabling more place types for diverse discoveries');
    }

    // Check category distribution
    const categoryStats = {};
    enabledTypes.forEach(type => {
      const category = PLACE_TYPE_TO_CATEGORY[type];
      if (category) {
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      }
    });

    if (Object.keys(categoryStats).length < 2) {
      validation.suggestions.push('Consider enabling place types from multiple categories for varied discoveries');
    }

    return validation;
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
   * Enhanced to work seamlessly with DiscoveryPreferencesScreen
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} preferences - User's discovery preferences (structured object from DiscoveryPreferencesScreen)
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

      // Validate preferences compatibility
      const validation = this.validateDiscoveryScreenCompatibility(preferences);
      if (!validation.isValid) {
        console.error('Invalid preferences for SAR:', validation.errors);
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }

      // Log warnings and suggestions
      validation.warnings.forEach(warning => console.warn(`SAR preference warning: ${warning}`));
      validation.suggestions.forEach(suggestion => console.log(`SAR preference suggestion: ${suggestion}`));

      // Normalize preferences for consistent processing
      const normalizedPreferences = this.validateAndNormalizePreferences(preferences);

      // Determine minimum rating from preferences or parameter
      const effectiveMinRating = minRating !== null ? minRating : normalizedPreferences.minRating;

      // Log preference statistics for debugging
      const prefStats = this.getPreferenceStats(normalizedPreferences);
      console.log('SAR preference statistics:', prefStats);

      // Check cache first
      const cacheKey = this.generateCacheKey(coordinates, normalizedPreferences, effectiveMinRating);
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
        enabledPlaceTypes: this.buildPlaceTypesFromPreferences(normalizedPreferences).length,
        minRating: effectiveMinRating,
        categoryBalancing: normalizedPreferences.categoryBalancing
      });

      // Perform SAR API request with normalized preferences
      const rawPlaces = await this.performSARRequest(encodedPolyline, normalizedPreferences, effectiveMinRating);

      // Apply comprehensive client-side preference filtering
      const filteredPlaces = this.applyPreferenceFiltering(rawPlaces, normalizedPreferences);

      // Cache the results
      this.setCachedData(cacheKey, filteredPlaces);

      console.log(`SAR completed successfully: ${rawPlaces.length} raw places -> ${filteredPlaces.length} filtered places`);
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
   * Convenience method for Search Along Route with DiscoveryPreferencesScreen integration
   * This method provides a simple interface for components using useDiscoveryPreferences hook
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} discoveryPreferences - Preferences object from useDiscoveryPreferences hook
   * @param {number} minRating - Minimum rating from useDiscoveryPreferences hook
   * @param {Object} options - Additional options for SAR
   * @returns {Promise<Array<Object>>} Array of discovered places
   */
  async searchAlongRouteWithDiscoveryPreferences(coordinates, discoveryPreferences, minRating, options = {}) {
    try {
      // Create SAR-compatible preferences from DiscoveryPreferencesScreen data
      const sarPreferences = this.createSARPreferencesFromDiscoveryScreen(
        discoveryPreferences,
        minRating,
        options
      );

      // Perform search with enhanced preferences
      return await this.searchAlongRoute(coordinates, sarPreferences);

    } catch (error) {
      console.error('Search Along Route with Discovery Preferences failed:', error);
      throw error;
    }
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

  /**
   * Perform center-point search as fallback when SAR fails
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} preferences - User's discovery preferences
   * @param {number} minRating - Minimum rating threshold
   * @returns {Promise<Array<Object>>} Array of discovered places
   */
  async performCenterPointSearch(coordinates, preferences = {}, minRating = 0) {
    try {
      console.log('Performing center-point fallback search');

      // Calculate center point of the route
      const centerPoint = calculateCenterPoint(coordinates);
      console.log('Calculated center point:', centerPoint);

      // Get enabled place types from preferences
      const enabledTypes = this.buildPlaceTypesFromPreferences(preferences);
      console.log(`Center-point search for ${enabledTypes.length} place types`);

      // Search for each enabled place type separately
      const allResults = [];
      const searchRadius = 500; // 500-meter radius as per requirements

      for (const placeType of enabledTypes) {
        try {
          console.log(`Searching for ${placeType} within ${searchRadius}m of center point`);
          
          const results = await this.performNearbySearch(
            centerPoint,
            [placeType],
            searchRadius,
            minRating
          );

          // Mark results as center-point discoveries
          const markedResults = results.map(place => ({
            ...place,
            discoverySource: 'center-point',
            fallbackReason: 'SAR API failure'
          }));

          allResults.push(...markedResults);
          console.log(`Found ${results.length} ${placeType} places`);

        } catch (typeError) {
          console.error(`Error searching for ${placeType}:`, typeError);
          // Continue with other types even if one fails
        }
      }

      // Apply preference filtering to combined results
      const filteredResults = this.applyPreferenceFiltering(allResults, preferences);

      // Deduplicate results by place ID
      const deduplicatedResults = this.deduplicateResults(filteredResults);

      console.log(`Center-point search completed: ${allResults.length} raw -> ${deduplicatedResults.length} final results`);
      return deduplicatedResults;

    } catch (error) {
      console.error('Center-point fallback search failed:', error);
      throw error;
    }
  }

  /**
   * Perform nearby search using Google Places API Nearby Search
   * @param {{latitude: number, longitude: number}} location - Center point for search
   * @param {Array<string>} placeTypes - Array of place types to search for
   * @param {number} radius - Search radius in meters
   * @param {number} minRating - Minimum rating threshold
   * @returns {Promise<Array<Object>>} Array of discovered places
   */
  async performNearbySearch(location, placeTypes, radius, minRating = 0) {
    try {
      const apiKey = this.getApiKey();
      const baseUrl = 'https://places.googleapis.com/v1/places:searchNearby';

      const requestPayload = {
        includedTypes: placeTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.latitude,
              longitude: location.longitude
            },
            radius: radius
          }
        },
        rankPreference: 'DISTANCE'
      };

      // Add minimum rating filter if specified
      if (minRating > 0 && minRating <= 5) {
        requestPayload.minRating = minRating;
      }

      console.log('Making Nearby Search API request:', {
        url: baseUrl,
        location: location,
        radius: radius,
        placeTypes: placeTypes,
        minRating: minRating || 'none'
      });

      const response = await fetch(baseUrl, {
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
        console.error('Nearby Search API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Nearby Search API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.places || !Array.isArray(data.places)) {
        console.log('No places found in Nearby Search response');
        return [];
      }

      console.log(`Nearby Search found ${data.places.length} places`);
      return this.processRawPlaces(data.places);

    } catch (error) {
      console.error('Error performing Nearby Search request:', error);
      throw error;
    }
  }

  /**
   * Deduplicate discovery results by place ID
   * Requirements: 1.5, 5.2
   * @param {Array<Object>} results - Discovery results
   * @returns {Array<Object>} Deduplicated results
   */
  deduplicateResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return results;
    }

    const seenPlaceIds = new Set();
    const deduplicatedResults = [];

    for (const place of results) {
      const placeId = place.placeId || place.id;
      
      if (!seenPlaceIds.has(placeId)) {
        seenPlaceIds.add(placeId);
        deduplicatedResults.push(place);
      } else {
        console.log(`Duplicate place filtered out: ${place.name} (${placeId})`);
      }
    }

    console.log(`Deduplication: ${results.length} -> ${deduplicatedResults.length} places`);
    return deduplicatedResults;
  }

  /**
   * Enhanced Search Along Route with automatic fallback to center-point search
   * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} preferences - User's discovery preferences
   * @param {number} minRating - Minimum rating threshold
   * @returns {Promise<Array<Object>>} Array of discovered places
   */
  async searchAlongRouteWithFallback(coordinates, preferences = {}, minRating = null) {
    try {
      // Validate input coordinates
      if (!validateCoordinates(coordinates)) {
        throw new Error('Invalid coordinates provided for Search Along Route');
      }

      // Check if route is long enough for SAR
      if (!isRouteLongEnoughForSAR(coordinates)) {
        console.log('Route too short for Search Along Route, using center-point search');
        const effectiveMinRating = minRating !== null ? minRating : this.getMinRatingFromPreferences(preferences);
        return await this.performCenterPointSearch(coordinates, preferences, effectiveMinRating);
      }

      // Normalize preferences
      const normalizedPreferences = this.validateAndNormalizePreferences(preferences);
      const effectiveMinRating = minRating !== null ? minRating : normalizedPreferences.minRating;

      try {
        // Attempt Search Along Route first
        console.log('Attempting Search Along Route...');
        const sarResults = await this.searchAlongRoute(coordinates, normalizedPreferences, effectiveMinRating);
        
        console.log(`Search Along Route successful: ${sarResults.length} places found`);
        return sarResults;

      } catch (sarError) {
        // Log SAR failure and attempt fallback
        console.warn('Search Along Route failed, falling back to center-point search:', sarError.message);
        
        // Log fallback operation for debugging
        this.logFallbackOperation(coordinates, normalizedPreferences, sarError);

        // Perform center-point fallback search
        const fallbackResults = await this.performCenterPointSearch(
          coordinates, 
          normalizedPreferences, 
          effectiveMinRating
        );

        console.log(`Fallback center-point search completed: ${fallbackResults.length} places found`);
        return fallbackResults;
      }

    } catch (error) {
      console.error('Search Along Route with fallback failed:', error);
      throw error;
    }
  }

  /**
   * Log fallback operation for debugging purposes
   * Requirements: 2.5
   * @param {Array<{latitude: number, longitude: number}>} coordinates - Route coordinates
   * @param {Object} preferences - User preferences
   * @param {Error} sarError - The error that caused the fallback
   */
  logFallbackOperation(coordinates, preferences, sarError) {
    const fallbackLog = {
      timestamp: new Date().toISOString(),
      operation: 'SAR_FALLBACK_TO_CENTER_POINT',
      routeInfo: {
        coordinateCount: coordinates.length,
        routeDistance: calculateRouteDistance ? calculateRouteDistance(coordinates) : 'unknown'
      },
      preferences: this.getPreferenceStats(preferences),
      sarError: {
        message: sarError.message,
        name: sarError.name,
        stack: sarError.stack?.split('\n')[0] // First line of stack trace only
      },
      fallbackReason: 'SAR API failure',
      fallbackMethod: 'center-point search with 500m radius'
    };

    console.log('SAR Fallback Operation:', fallbackLog);

    // In a production environment, this could be sent to a logging service
    // For now, we'll just log to console for debugging
  }
}

// Export singleton instance
export default new SearchAlongRouteService();