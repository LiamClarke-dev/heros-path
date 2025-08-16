// App-wide constants

// API Configuration
export const API_CONFIG = {
  GOOGLE_PLACES_BASE_URL: 'https://places.googleapis.com/v1',
  GEOCODING_BASE_URL: 'https://maps.googleapis.com/maps/api/geocode/json',
  REQUEST_TIMEOUT: 10000, // 10 seconds
};

// Location Configuration
export const LOCATION_CONFIG = {
  HIGH_ACCURACY: {
    accuracy: 4, // Expo.Location.Accuracy.High
    timeInterval: 5000, // 5 seconds
    distanceInterval: 10, // 10 meters
  },
  BACKGROUND_TASK_NAME: 'background-location-task',
  GEOFENCE_RADIUS: 100, // meters
};

// Journey Configuration
export const JOURNEY_CONFIG = {
  MIN_DISTANCE_FOR_SAVE: 50, // meters
  MIN_DURATION_FOR_SAVE: 60, // seconds
  MAX_JOURNEY_DURATION: 8 * 60 * 60, // 8 hours in seconds
  ROUTE_SIMPLIFICATION_TOLERANCE: 10, // meters
};

// Place Discovery Configuration
export const PLACES_CONFIG = {
  SEARCH_RADIUS: 500, // meters
  MAX_RESULTS: 10,
  MIN_RATING: 3.0,
  PREFERRED_TYPES: [
    'restaurant',
    'cafe',
    'tourist_attraction',
    'park',
    'museum',
    'store',
    'gas_station',
  ],
};

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  TOAST_DURATION: 3000,
  LOADING_TIMEOUT: 30000,
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  USER_PREFERENCES: 'userPreferences',
  CACHED_JOURNEYS: 'cachedJourneys',
  LAST_LOCATION: 'lastLocation',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    'Network connection error. Please check your internet connection.',
  LOCATION_PERMISSION_DENIED:
    'Location permission is required to track your journeys.',
  GPS_UNAVAILABLE: 'GPS is not available. Please enable location services.',
  AUTHENTICATION_FAILED: 'Authentication failed. Please try again.',
  JOURNEY_SAVE_FAILED: 'Failed to save journey. Please try again.',
  PLACES_SEARCH_FAILED: 'Failed to discover places. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  JOURNEY_SAVED: 'Journey saved successfully!',
  PLACE_SAVED: 'Place saved to your collection!',
  AUTHENTICATION_SUCCESS: 'Successfully signed in!',
  LOCATION_PERMISSION_GRANTED: 'Location permission granted.',
};

// App Metadata
export const APP_INFO = {
  NAME: "Hero's Path MVP",
  VERSION: '0.1.0',
  DESCRIPTION: 'Transform daily walks into engaging adventures',
  SUPPORT_EMAIL: 'support@herospath.app',
};
