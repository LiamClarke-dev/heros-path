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
   * Requirements: 7.2, 7.3, 7.4, 7.5
   * @param {Array<Object>} places - Array of places
   * @param {Object} preferences - User preferences
   * @param {Object} options - Balancing options
   * @param {number} options.maxResults - Maximum total results (default: 20)
   * @param {number} options.minPerCategory - Minimum places per category (default: 1)
   * @param {boolean} options.prioritizeByRating - Sort by rating within categories (default: true)
   * @returns {Array<Object>} Balanced places array
   */
  applyCategoryBalancing(places, preferences, options = {}) {
    if (!Array.isArray(places) || places.length === 0) {
      return places;
    }

    const {
      maxResults = 20,
      minPerCategory = 1,
      prioritizeByRating = true
    } = options;

    // Group places by category with enhanced classification
    const placesByCategory = this.groupPlacesByCategory(places);

    // Get enabled categories based on user preferences
    const enabledCategories = this.getEnabledCategories(preferences);

    if (enabledCategories.size === 0) {
      console.log('No enabled categories found, returning original places');
      return places;
    }

    // Calculate balanced distribution
    const distribution = this.calculateCategoryDistribution(
      placesByCategory,
      enabledCategories,
      maxResults,
      minPerCategory
    );

    // Select places from each category according to distribution
    const balancedPlaces = this.selectPlacesFromCategories(
      placesByCategory,
      distribution,
      prioritizeByRating
    );

    console.log(`Applied category balancing: ${places.length} -> ${balancedPlaces.length} places across ${enabledCategories.size} categories`);
    this.logCategoryDistribution(balancedPlaces);

    return balancedPlaces;
  }

  /**
   * Group places by their primary category
   * Requirements: 7.3, 7.5
   * @param {Array<Object>} places - Array of places
   * @returns {Object} Places grouped by category
   */
  groupPlacesByCategory(places) {
    const placesByCategory = {};

    places.forEach(place => {
      // Use existing category or classify the place
      const category = place.category || this.classifyPlaceByPrimaryCategory(place);
      
      if (!placesByCategory[category]) {
        placesByCategory[category] = [];
      }
      
      // Ensure place has category set for future reference
      place.category = category;
      placesByCategory[category].push(place);
    });

    return placesByCategory;
  }

  /**
   * Classify a place according to its primary category
   * Requirements: 7.5
   * @param {Object} place - Place object
   * @returns {string} Primary category name
   */
  classifyPlaceByPrimaryCategory(place) {
    if (!place || typeof place !== 'object') {
      return PLACE_CATEGORIES.SERVICES_UTILITIES; // Default category
    }

    // Priority order for classification:
    // 1. Use primaryType if available and mapped
    // 2. Use first mapped type from types array
    // 3. Use most specific type from types array
    // 4. Default to Services & Utilities

    // Check primaryType first
    if (place.primaryType && PLACE_TYPE_TO_CATEGORY[place.primaryType]) {
      return PLACE_TYPE_TO_CATEGORY[place.primaryType];
    }

    // Check types array
    if (Array.isArray(place.types) && place.types.length > 0) {
      // Find the first type that has a category mapping
      for (const type of place.types) {
        if (PLACE_TYPE_TO_CATEGORY[type]) {
          return PLACE_TYPE_TO_CATEGORY[type];
        }
      }

      // If no direct mapping found, try to infer from common patterns
      const inferredCategory = this.inferCategoryFromTypes(place.types);
      if (inferredCategory) {
        return inferredCategory;
      }
    }

    // Default fallback
    return PLACE_CATEGORIES.SERVICES_UTILITIES;
  }

  /**
   * Infer category from place types using common patterns
   * @param {Array<string>} types - Array of place types
   * @returns {string|null} Inferred category or null
   */
  inferCategoryFromTypes(types) {
    if (!Array.isArray(types)) {
      return null;
    }

    // Common type patterns for category inference
    const categoryPatterns = {
      [PLACE_CATEGORIES.FOOD_DINING]: [
        'food', 'meal', 'restaurant', 'cafe', 'bar', 'bakery', 'dining'
      ],
      [PLACE_CATEGORIES.SHOPPING_RETAIL]: [
        'store', 'shop', 'retail', 'mall', 'market', 'clothing', 'electronics'
      ],
      [PLACE_CATEGORIES.ENTERTAINMENT_CULTURE]: [
        'entertainment', 'culture', 'museum', 'gallery', 'theater', 'cinema',
        'park', 'attraction', 'zoo', 'aquarium'
      ],
      [PLACE_CATEGORIES.HEALTH_WELLNESS]: [
        'health', 'medical', 'hospital', 'clinic', 'pharmacy', 'gym', 'spa',
        'wellness', 'fitness'
      ],
      [PLACE_CATEGORIES.SERVICES_UTILITIES]: [
        'service', 'bank', 'atm', 'gas', 'fuel', 'post', 'government',
        'utility', 'repair', 'maintenance'
      ],
      [PLACE_CATEGORIES.OUTDOORS_RECREATION]: [
        'outdoor', 'recreation', 'sport', 'stadium', 'golf', 'camping',
        'nature', 'trail'
      ]
    };

    // Check each category pattern
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      for (const type of types) {
        const lowerType = type.toLowerCase();
        if (patterns.some(pattern => lowerType.includes(pattern))) {
          return category;
        }
      }
    }

    return null;
  }

  /**
   * Get enabled categories based on user preferences
   * @param {Object} preferences - User preferences
   * @returns {Set<string>} Set of enabled category names
   */
  getEnabledCategories(preferences) {
    const enabledTypes = this.buildPlaceTypesFromPreferences(preferences);
    const enabledCategories = new Set();

    enabledTypes.forEach(type => {
      const category = PLACE_TYPE_TO_CATEGORY[type];
      if (category) {
        enabledCategories.add(category);
      }
    });

    return enabledCategories;
  }

  /**
   * Calculate how many places to select from each category
   * Requirements: 7.2
   * @param {Object} placesByCategory - Places grouped by category
   * @param {Set<string>} enabledCategories - Enabled categories
   * @param {number} maxResults - Maximum total results
   * @param {number} minPerCategory - Minimum places per category
   * @returns {Object} Distribution map: category -> count
   */
  calculateCategoryDistribution(placesByCategory, enabledCategories, maxResults, minPerCategory) {
    const distribution = {};
    const availableCategories = [];

    // Find categories that have places and are enabled
    enabledCategories.forEach(category => {
      if (placesByCategory[category] && placesByCategory[category].length > 0) {
        availableCategories.push({
          category,
          count: placesByCategory[category].length
        });
      }
    });

    if (availableCategories.length === 0) {
      return distribution;
    }

    // Ensure minimum allocation per category
    let remainingResults = maxResults;
    availableCategories.forEach(({ category }) => {
      const minAllocation = Math.min(minPerCategory, placesByCategory[category].length);
      distribution[category] = minAllocation;
      remainingResults -= minAllocation;
    });

    // Distribute remaining results proportionally based on available places
    if (remainingResults > 0) {
      // Sort categories by number of available places (descending)
      availableCategories.sort((a, b) => b.count - a.count);

      // Distribute remaining results proportionally
      const totalAvailablePlaces = availableCategories.reduce((sum, { count }) => sum + count, 0);
      
      availableCategories.forEach(({ category, count }) => {
        if (remainingResults > 0) {
          const proportion = count / totalAvailablePlaces;
          const additionalAllocation = Math.floor(remainingResults * proportion);
          const maxPossible = placesByCategory[category].length - distribution[category];
          
          const actualAllocation = Math.min(additionalAllocation, maxPossible);
          distribution[category] += actualAllocation;
          remainingResults -= actualAllocation;
        }
      });

      // Distribute any remaining results to categories with available space
      while (remainingResults > 0) {
        let distributed = false;
        for (const { category } of availableCategories) {
          if (remainingResults > 0 && distribution[category] < placesByCategory[category].length) {
            distribution[category]++;
            remainingResults--;
            distributed = true;
          }
        }
        if (!distributed) break; // No more space available
      }
    }

    return distribution;
  }

  /**
   * Select places from categories according to distribution
   * @param {Object} placesByCategory - Places grouped by category
   * @param {Object} distribution - Category distribution map
   * @param {boolean} prioritizeByRating - Whether to prioritize by rating
   * @returns {Array<Object>} Selected places
   */
  selectPlacesFromCategories(placesByCategory, distribution, prioritizeByRating) {
    const selectedPlaces = [];

    Object.entries(distribution).forEach(([category, count]) => {
      if (count > 0 && placesByCategory[category]) {
        let categoryPlaces = [...placesByCategory[category]];

        if (prioritizeByRating) {
          // Sort by rating (highest first), then by name for consistency
          categoryPlaces.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            
            if (ratingA !== ratingB) {
              return ratingB - ratingA; // Higher rating first
            }
            
            // Secondary sort by name for consistent ordering
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
          });
        }

        // Take the specified number of places from this category
        selectedPlaces.push(...categoryPlaces.slice(0, count));
      }
    });

    return selectedPlaces;
  }

  /**
   * Log category distribution for debugging
   * @param {Array<Object>} places - Final balanced places
   */
  logCategoryDistribution(places) {
    const categoryStats = {};
    
    places.forEach(place => {
      const category = place.category || 'Unknown';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    console.log('Category distribution in balanced results:', categoryStats);
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
   * Process raw places data from Google Places API with enhanced category classification
   * Requirements: 7.3, 7.5
   * @param {Array<Object>} rawPlaces - Raw places from API response
   * @returns {Array<Object>} Processed places data
   */
  processRawPlaces(rawPlaces) {
    return rawPlaces.map(place => {
      // Enhanced category mapping
      const categoryMapping = this.mapGoogleTypesToAppCategories(place.types || []);
      
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
        
        // Enhanced category classification
        category: categoryMapping.primaryCategory,
        allCategories: categoryMapping.allCategories,
        mappedTypes: categoryMapping.mappedTypes,
        unmappedTypes: categoryMapping.unmappedTypes,
        
        discoverySource: 'SAR',
        discoveredAt: new Date().toISOString(),
        saved: false,
        dismissed: false,

        // Schema versioning and metadata
        schemaVersion: 1,
        lastUpdated: new Date().toISOString(),
        metadata: {
          categoryClassification: {
            method: 'enhanced_mapping',
            confidence: categoryMapping.mappedTypes.length > 0 ? 'high' : 'inferred',
            alternativeCategories: categoryMapping.allCategories.filter(cat => cat !== categoryMapping.primaryCategory)
          }
        },
        extensions: {}
      };

      return processedPlace;
    });
  }

  /**
   * Get category for a place based on its types
   * Requirements: 7.3, 7.5
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

    // Try to infer category from type patterns if no direct mapping found
    const inferredCategory = this.inferCategoryFromTypes(types);
    if (inferredCategory) {
      return inferredCategory;
    }

    // Fallback to default category
    return PLACE_CATEGORIES.SERVICES_UTILITIES;
  }

  /**
   * Map Google Places API types to app categories with comprehensive coverage
   * Requirements: 7.3
   * @param {Array<string>} googleTypes - Array of Google Places API types
   * @returns {Object} Mapping result with primary category and all applicable categories
   */
  mapGoogleTypesToAppCategories(googleTypes) {
    if (!Array.isArray(googleTypes) || googleTypes.length === 0) {
      return {
        primaryCategory: PLACE_CATEGORIES.SERVICES_UTILITIES,
        allCategories: [PLACE_CATEGORIES.SERVICES_UTILITIES],
        mappedTypes: [],
        unmappedTypes: []
      };
    }

    const mappedTypes = [];
    const unmappedTypes = [];
    const categoriesFound = new Set();

    // Process each Google type
    googleTypes.forEach(type => {
      if (PLACE_TYPE_TO_CATEGORY[type]) {
        mappedTypes.push(type);
        categoriesFound.add(PLACE_TYPE_TO_CATEGORY[type]);
      } else {
        unmappedTypes.push(type);
      }
    });

    // Try to infer categories for unmapped types
    if (unmappedTypes.length > 0) {
      const inferredCategory = this.inferCategoryFromTypes(unmappedTypes);
      if (inferredCategory) {
        categoriesFound.add(inferredCategory);
      }
    }

    // Determine primary category (first mapped type or inferred)
    let primaryCategory = PLACE_CATEGORIES.SERVICES_UTILITIES;
    if (mappedTypes.length > 0) {
      primaryCategory = PLACE_TYPE_TO_CATEGORY[mappedTypes[0]];
    } else if (categoriesFound.size > 0) {
      primaryCategory = Array.from(categoriesFound)[0];
    }

    return {
      primaryCategory,
      allCategories: Array.from(categoriesFound),
      mappedTypes,
      unmappedTypes
    };
  }

  /**
   * Get comprehensive category statistics for places
   * Requirements: 7.2, 7.4
   * @param {Array<Object>} places - Array of places
   * @returns {Object} Category statistics
   */
  getCategoryStatistics(places) {
    if (!Array.isArray(places) || places.length === 0) {
      return {
        totalPlaces: 0,
        categoryCounts: {},
        categoryPercentages: {},
        mostCommonCategory: null,
        leastCommonCategory: null,
        categoryDiversity: 0
      };
    }

    const categoryCounts = {};
    const totalPlaces = places.length;

    // Count places by category
    places.forEach(place => {
      const category = place.category || this.classifyPlaceByPrimaryCategory(place);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Calculate percentages
    const categoryPercentages = {};
    Object.entries(categoryCounts).forEach(([category, count]) => {
      categoryPercentages[category] = Math.round((count / totalPlaces) * 100 * 100) / 100; // Round to 2 decimal places
    });

    // Find most and least common categories
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const mostCommonCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null;
    const leastCommonCategory = sortedCategories.length > 0 ? sortedCategories[sortedCategories.length - 1][0] : null;

    // Calculate diversity (number of different categories)
    const categoryDiversity = Object.keys(categoryCounts).length;

    return {
      totalPlaces,
      categoryCounts,
      categoryPercentages,
      mostCommonCategory,
      leastCommonCategory,
      categoryDiversity
    };
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
   * Deduplicate discovery results by place ID with enhanced efficiency for large datasets
   * Requirements: 1.5, 5.2
   * 
   * This method efficiently handles large result sets by:
   * - Using Set for O(1) lookup performance
   * - Processing results in batches for memory efficiency
   * - Preserving the highest quality duplicate when conflicts occur
   * - Providing detailed logging for debugging
   * 
   * @param {Array<Object>} results - Discovery results to deduplicate
   * @param {Object} options - Deduplication options
   * @param {number} options.batchSize - Size of batches for processing large datasets (default: 1000)
   * @param {boolean} options.preserveHighestRated - Keep highest rated duplicate (default: true)
   * @param {boolean} options.logDuplicates - Log duplicate places found (default: true)
   * @returns {Array<Object>} Deduplicated results
   */
  deduplicateResults(results, options = {}) {
    // Validate input
    if (!Array.isArray(results)) {
      console.warn('deduplicateResults: Invalid input - expected array, got:', typeof results);
      return [];
    }

    if (results.length === 0) {
      return results;
    }

    // Set default options
    const {
      batchSize = 1000,
      preserveHighestRated = true,
      logDuplicates = true
    } = options;

    // For small datasets, use simple approach
    if (results.length <= batchSize) {
      return this._deduplicateSimple(results, { preserveHighestRated, logDuplicates });
    }

    // For large datasets, use batch processing
    return this._deduplicateBatched(results, { batchSize, preserveHighestRated, logDuplicates });
  }

  /**
   * Simple deduplication for small datasets
   * @private
   * @param {Array<Object>} results - Results to deduplicate
   * @param {Object} options - Deduplication options
   * @returns {Array<Object>} Deduplicated results
   */
  _deduplicateSimple(results, options) {
    const { preserveHighestRated, logDuplicates } = options;
    const seenPlaces = new Map(); // Use Map to store place data for comparison
    const duplicatesFound = [];

    for (const place of results) {
      // Skip null, undefined, or non-object entries
      if (!place || typeof place !== 'object') {
        if (logDuplicates) {
          console.warn('deduplicateResults: Invalid place object, skipping:', typeof place);
        }
        continue;
      }

      const placeId = this._extractPlaceId(place);
      
      if (!placeId) {
        if (logDuplicates) {
          console.warn('deduplicateResults: Place missing ID, skipping:', place.name || 'Unknown');
        }
        continue;
      }

      if (!seenPlaces.has(placeId)) {
        // First occurrence of this place
        seenPlaces.set(placeId, place);
      } else {
        // Duplicate found
        const existingPlace = seenPlaces.get(placeId);
        duplicatesFound.push({
          placeId,
          existing: existingPlace.name || 'Unknown',
          duplicate: place.name || 'Unknown'
        });

        if (preserveHighestRated) {
          // Keep the place with higher rating, or the existing one if ratings are equal
          const existingRating = existingPlace.rating || 0;
          const newRating = place.rating || 0;
          
          if (newRating > existingRating) {
            seenPlaces.set(placeId, place);
            if (logDuplicates) {
              console.log(`Duplicate place replaced with higher rated version: ${place.name} (${newRating}) > ${existingPlace.name} (${existingRating})`);
            }
          } else if (logDuplicates) {
            console.log(`Duplicate place filtered out: ${place.name} (${newRating}) <= ${existingPlace.name} (${existingRating})`);
          }
        } else if (logDuplicates) {
          console.log(`Duplicate place filtered out: ${place.name} (${placeId})`);
        }
      }
    }

    const deduplicatedResults = Array.from(seenPlaces.values());
    
    if (logDuplicates && duplicatesFound.length > 0) {
      console.log(`Deduplication completed: ${results.length} -> ${deduplicatedResults.length} places (${duplicatesFound.length} duplicates removed)`);
    }

    return deduplicatedResults;
  }

  /**
   * Batch deduplication for large datasets
   * @private
   * @param {Array<Object>} results - Results to deduplicate
   * @param {Object} options - Deduplication options
   * @returns {Array<Object>} Deduplicated results
   */
  _deduplicateBatched(results, options) {
    const { batchSize, preserveHighestRated, logDuplicates } = options;
    const seenPlaces = new Map();
    let totalDuplicates = 0;
    let processedCount = 0;

    console.log(`Starting batch deduplication for ${results.length} places (batch size: ${batchSize})`);

    // Process results in batches to manage memory usage
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const batchDuplicates = this._processBatch(batch, seenPlaces, preserveHighestRated, logDuplicates);
      
      totalDuplicates += batchDuplicates;
      processedCount += batch.length;

      // Log progress for large datasets
      if (logDuplicates && results.length > 5000) {
        console.log(`Batch deduplication progress: ${processedCount}/${results.length} processed, ${totalDuplicates} duplicates found`);
      }
    }

    const deduplicatedResults = Array.from(seenPlaces.values());
    
    if (logDuplicates) {
      console.log(`Batch deduplication completed: ${results.length} -> ${deduplicatedResults.length} places (${totalDuplicates} duplicates removed)`);
    }

    return deduplicatedResults;
  }

  /**
   * Process a single batch of results
   * @private
   * @param {Array<Object>} batch - Batch of results to process
   * @param {Map} seenPlaces - Map of already seen places
   * @param {boolean} preserveHighestRated - Whether to preserve highest rated duplicates
   * @param {boolean} logDuplicates - Whether to log duplicate information
   * @returns {number} Number of duplicates found in this batch
   */
  _processBatch(batch, seenPlaces, preserveHighestRated, logDuplicates) {
    let duplicatesInBatch = 0;

    for (const place of batch) {
      // Skip null, undefined, or non-object entries
      if (!place || typeof place !== 'object') {
        if (logDuplicates) {
          console.warn('deduplicateResults: Invalid place object in batch, skipping:', typeof place);
        }
        continue;
      }

      const placeId = this._extractPlaceId(place);
      
      if (!placeId) {
        if (logDuplicates) {
          console.warn('deduplicateResults: Place missing ID in batch, skipping:', place.name || 'Unknown');
        }
        continue;
      }

      if (!seenPlaces.has(placeId)) {
        seenPlaces.set(placeId, place);
      } else {
        duplicatesInBatch++;
        
        if (preserveHighestRated) {
          const existingPlace = seenPlaces.get(placeId);
          const existingRating = existingPlace.rating || 0;
          const newRating = place.rating || 0;
          
          if (newRating > existingRating) {
            seenPlaces.set(placeId, place);
          }
        }
      }
    }

    return duplicatesInBatch;
  }

  /**
   * Extract place ID from a place object, handling various formats
   * @private
   * @param {Object} place - Place object
   * @returns {string|null} Place ID or null if not found
   */
  _extractPlaceId(place) {
    if (!place || typeof place !== 'object') {
      return null;
    }

    // Try different possible ID fields in order of preference
    return place.placeId || place.id || place.place_id || place.googlePlaceId || null;
  }

  /**
   * Get deduplication statistics for analysis
   * @param {Array<Object>} originalResults - Original results before deduplication
   * @param {Array<Object>} deduplicatedResults - Results after deduplication
   * @returns {Object} Deduplication statistics
   */
  getDeduplicationStats(originalResults, deduplicatedResults) {
    if (!Array.isArray(originalResults) || !Array.isArray(deduplicatedResults)) {
      return {
        error: 'Invalid input arrays',
        originalCount: 0,
        deduplicatedCount: 0,
        duplicatesRemoved: 0,
        deduplicationRate: 0
      };
    }

    const originalCount = originalResults.length;
    const deduplicatedCount = deduplicatedResults.length;
    const duplicatesRemoved = originalCount - deduplicatedCount;
    const deduplicationRate = originalCount > 0 ? (duplicatesRemoved / originalCount) * 100 : 0;

    // Analyze duplicate patterns
    const placeIdCounts = new Map();
    for (const place of originalResults) {
      const placeId = this._extractPlaceId(place);
      if (placeId) {
        placeIdCounts.set(placeId, (placeIdCounts.get(placeId) || 0) + 1);
      }
    }

    const duplicateGroups = Array.from(placeIdCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a);

    return {
      originalCount,
      deduplicatedCount,
      duplicatesRemoved,
      deduplicationRate: Math.round(deduplicationRate * 100) / 100,
      duplicateGroups: duplicateGroups.slice(0, 10), // Top 10 most duplicated places
      uniquePlaceIds: placeIdCounts.size,
      averageDuplicatesPerPlace: duplicateGroups.length > 0 
        ? Math.round((duplicateGroups.reduce((sum, [_, count]) => sum + count, 0) / duplicateGroups.length) * 100) / 100
        : 0
    };
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