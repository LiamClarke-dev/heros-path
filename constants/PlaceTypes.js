/**
 * Place Types and Categories for Discovery Preferences
 * 
 * This file defines all available place types and their organization into categories
 * for the Discovery Preferences feature. Place type keys must match Google Places API
 * types exactly for proper filtering.
 */

/**
 * Individual place type definitions
 * Each place type must have a key that matches Google Places API and a user-friendly label
 */
export const PLACE_TYPES = {
  // Food & Dining
  restaurant: { key: 'restaurant', label: 'Restaurants' },
  cafe: { key: 'cafe', label: 'Cafes' },
  bar: { key: 'bar', label: 'Bars' },
  bakery: { key: 'bakery', label: 'Bakeries' },
  meal_takeaway: { key: 'meal_takeaway', label: 'Takeaway' },
  food: { key: 'food', label: 'Food Stores' },

  // Shopping & Retail
  store: { key: 'store', label: 'General Stores' },
  shopping_mall: { key: 'shopping_mall', label: 'Shopping Malls' },
  clothing_store: { key: 'clothing_store', label: 'Clothing Stores' },
  book_store: { key: 'book_store', label: 'Book Stores' },
  electronics_store: { key: 'electronics_store', label: 'Electronics' },
  jewelry_store: { key: 'jewelry_store', label: 'Jewelry Stores' },
  shoe_store: { key: 'shoe_store', label: 'Shoe Stores' },
  supermarket: { key: 'supermarket', label: 'Supermarkets' },

  // Entertainment & Culture
  museum: { key: 'museum', label: 'Museums' },
  art_gallery: { key: 'art_gallery', label: 'Art Galleries' },
  tourist_attraction: { key: 'tourist_attraction', label: 'Tourist Attractions' },
  amusement_park: { key: 'amusement_park', label: 'Amusement Parks' },
  movie_theater: { key: 'movie_theater', label: 'Movie Theaters' },
  night_club: { key: 'night_club', label: 'Night Clubs' },
  casino: { key: 'casino', label: 'Casinos' },

  // Health & Wellness
  hospital: { key: 'hospital', label: 'Hospitals' },
  pharmacy: { key: 'pharmacy', label: 'Pharmacies' },
  dentist: { key: 'dentist', label: 'Dentists' },
  doctor: { key: 'doctor', label: 'Doctors' },
  physiotherapist: { key: 'physiotherapist', label: 'Physiotherapists' },
  gym: { key: 'gym', label: 'Gyms' },
  spa: { key: 'spa', label: 'Spas' },

  // Services
  bank: { key: 'bank', label: 'Banks' },
  atm: { key: 'atm', label: 'ATMs' },
  gas_station: { key: 'gas_station', label: 'Gas Stations' },
  car_wash: { key: 'car_wash', label: 'Car Washes' },
  car_repair: { key: 'car_repair', label: 'Car Repair' },
  laundry: { key: 'laundry', label: 'Laundromats' },
  hair_care: { key: 'hair_care', label: 'Hair Salons' },
  beauty_salon: { key: 'beauty_salon', label: 'Beauty Salons' },

  // Outdoors & Recreation
  park: { key: 'park', label: 'Parks' },
  zoo: { key: 'zoo', label: 'Zoos' },
  aquarium: { key: 'aquarium', label: 'Aquariums' },
  campground: { key: 'campground', label: 'Campgrounds' },
  rv_park: { key: 'rv_park', label: 'RV Parks' },
  stadium: { key: 'stadium', label: 'Stadiums' },
  bowling_alley: { key: 'bowling_alley', label: 'Bowling Alleys' },

  // Transportation
  bus_station: { key: 'bus_station', label: 'Bus Stations' },
  subway_station: { key: 'subway_station', label: 'Subway Stations' },
  train_station: { key: 'train_station', label: 'Train Stations' },
  airport: { key: 'airport', label: 'Airports' },
  taxi_stand: { key: 'taxi_stand', label: 'Taxi Stands' },
  parking: { key: 'parking', label: 'Parking' },

  // Accommodation
  lodging: { key: 'lodging', label: 'Hotels & Lodging' },
  campground: { key: 'campground', label: 'Campgrounds' },
  rv_park: { key: 'rv_park', label: 'RV Parks' },

  // Education & Government
  school: { key: 'school', label: 'Schools' },
  university: { key: 'university', label: 'Universities' },
  library: { key: 'library', label: 'Libraries' },
  post_office: { key: 'post_office', label: 'Post Offices' },
  city_hall: { key: 'city_hall', label: 'City Halls' },
  courthouse: { key: 'courthouse', label: 'Courthouses' },
  police: { key: 'police', label: 'Police Stations' },
  fire_station: { key: 'fire_station', label: 'Fire Stations' },

  // Religious
  church: { key: 'church', label: 'Churches' },
  mosque: { key: 'mosque', label: 'Mosques' },
  synagogue: { key: 'synagogue', label: 'Synagogues' },
  hindu_temple: { key: 'hindu_temple', label: 'Hindu Temples' },
  place_of_worship: { key: 'place_of_worship', label: 'Places of Worship' },
};

/**
 * Place categories with their associated place types
 * Categories organize place types into logical groups for the UI
 */
export const PLACE_CATEGORIES = {
  'Food & Dining': {
    title: 'Food & Dining',
    icon: 'restaurant',
    types: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'food'],
  },
  'Shopping & Retail': {
    title: 'Shopping & Retail',
    icon: 'shopping-bag',
    types: ['store', 'shopping_mall', 'clothing_store', 'book_store', 'electronics_store', 'jewelry_store', 'shoe_store', 'supermarket'],
  },
  'Entertainment & Culture': {
    title: 'Entertainment & Culture',
    icon: 'palette',
    types: ['museum', 'art_gallery', 'tourist_attraction', 'amusement_park', 'movie_theater', 'night_club', 'casino'],
  },
  'Health & Wellness': {
    title: 'Health & Wellness',
    icon: 'medical-bag',
    types: ['hospital', 'pharmacy', 'dentist', 'doctor', 'physiotherapist', 'gym', 'spa'],
  },
  'Services': {
    title: 'Services',
    icon: 'briefcase',
    types: ['bank', 'atm', 'gas_station', 'car_wash', 'car_repair', 'laundry', 'hair_care', 'beauty_salon'],
  },
  'Outdoors & Recreation': {
    title: 'Outdoors & Recreation',
    icon: 'tree',
    types: ['park', 'zoo', 'aquarium', 'campground', 'rv_park', 'stadium', 'bowling_alley'],
  },
  'Transportation': {
    title: 'Transportation',
    icon: 'train',
    types: ['bus_station', 'subway_station', 'train_station', 'airport', 'taxi_stand', 'parking'],
  },
  'Accommodation': {
    title: 'Accommodation',
    icon: 'bed',
    types: ['lodging', 'campground', 'rv_park'],
  },
  'Education & Government': {
    title: 'Education & Government',
    icon: 'school',
    types: ['school', 'university', 'library', 'post_office', 'city_hall', 'courthouse', 'police', 'fire_station'],
  },
  'Religious': {
    title: 'Religious',
    icon: 'place-of-worship',
    types: ['church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship'],
  },
};

/**
 * Default enabled place types for new users
 * These are curated to provide a good initial discovery experience
 */
export const DEFAULT_ENABLED_PLACE_TYPES = [
  // Food & Dining - most popular
  'restaurant',
  'cafe',
  'bar',

  // Entertainment & Culture - interesting discoveries
  'museum',
  'art_gallery',
  'tourist_attraction',

  // Outdoors & Recreation - walking-friendly
  'park',

  // Services - commonly needed
  'bank',
  'atm',
];

/**
 * Default minimum rating for new users
 * Set to 4.0 to ensure quality discoveries
 */
export const DEFAULT_MIN_RATING = 4.0;

/**
 * Utility functions for working with place types
 */
export const PlaceTypeUtils = {
  /**
   * Get all place type keys as an array
   * @returns {string[]} Array of place type keys
   */
  getAllPlaceTypeKeys: () => {
    return Object.keys(PLACE_TYPES);
  },

  /**
   * Get place type label by key
   * @param {string} key - Place type key
   * @returns {string} User-friendly label
   */
  getPlaceTypeLabel: (key) => {
    return PLACE_TYPES[key]?.label || key;
  },

  /**
   * Get all place types in a category
   * @param {string} categoryTitle - Category title
   * @returns {string[]} Array of place type keys in the category
   */
  getPlaceTypesInCategory: (categoryTitle) => {
    return PLACE_CATEGORIES[categoryTitle]?.types || [];
  },

  /**
   * Get category for a place type
   * @param {string} placeTypeKey - Place type key
   * @returns {string|null} Category title or null if not found
   */
  getCategoryForPlaceType: (placeTypeKey) => {
    for (const [categoryTitle, category] of Object.entries(PLACE_CATEGORIES)) {
      if (category.types.includes(placeTypeKey)) {
        return categoryTitle;
      }
    }
    return null;
  },

  /**
   * Create default preferences object
   * @returns {Object} Default preferences with enabled place types
   */
  createDefaultPreferences: () => {
    const preferences = {};
    const allKeys = PlaceTypeUtils.getAllPlaceTypeKeys();
    
    // Set all place types to false by default
    allKeys.forEach(key => {
      preferences[key] = false;
    });
    
    // Enable default place types
    DEFAULT_ENABLED_PLACE_TYPES.forEach(key => {
      if (preferences.hasOwnProperty(key)) {
        preferences[key] = true;
      }
    });
    
    return preferences;
  },

  /**
   * Validate place type preferences object
   * @param {Object} preferences - Preferences object to validate
   * @returns {boolean} Whether preferences are valid
   */
  validatePreferences: (preferences) => {
    if (!preferences || typeof preferences !== 'object') {
      return false;
    }
    
    // Check that all values are boolean
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value !== 'boolean') {
        return false;
      }
      
      // Check that key exists in PLACE_TYPES
      if (!PLACE_TYPES.hasOwnProperty(key)) {
        console.warn(`Unknown place type key: ${key}`);
      }
    }
    
    return true;
  },

  /**
   * Sync preferences with current place types (add new, remove old)
   * @param {Object} existingPreferences - Current user preferences
   * @returns {Object} Updated preferences with new place types added
   */
  syncPreferencesWithPlaceTypes: (existingPreferences = {}) => {
    const allCurrentKeys = PlaceTypeUtils.getAllPlaceTypeKeys();
    const syncedPreferences = { ...existingPreferences };
    
    // Add new place types with default enabled state
    allCurrentKeys.forEach(key => {
      if (!syncedPreferences.hasOwnProperty(key)) {
        // New place types are enabled by default
        syncedPreferences[key] = true;
        console.log(`Added new place type to preferences: ${key}`);
      }
    });
    
    // Remove place types that no longer exist
    Object.keys(syncedPreferences).forEach(key => {
      if (!allCurrentKeys.includes(key)) {
        delete syncedPreferences[key];
        console.log(`Removed obsolete place type from preferences: ${key}`);
      }
    });
    
    return syncedPreferences;
  },
};

export default {
  PLACE_TYPES,
  PLACE_CATEGORIES,
  DEFAULT_ENABLED_PLACE_TYPES,
  DEFAULT_MIN_RATING,
  PlaceTypeUtils,
};