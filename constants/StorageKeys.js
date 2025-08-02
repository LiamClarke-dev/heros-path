/**
 * AsyncStorage Keys for Journey Tracking
 * 
 * This file defines all AsyncStorage keys used for local caching and persistence
 * in the Journey Tracking feature. Keys are organized by feature area and include
 * versioning for migration support.
 */

/**
 * Storage key prefixes for organization
 */
const STORAGE_PREFIXES = {
  JOURNEY: 'journey_',
  JOURNEY_DATA: 'journey_data_',
  LOCATION: 'location_',
  CACHE: 'cache_',
  SETTINGS: 'settings_',
  MIGRATION: 'migration_',
  DEV: 'dev_',
  DISCOVERY: 'discovery_',
};

/**
 * Journey-related storage keys
 */
export const JOURNEY_STORAGE_KEYS = {
  // Current journey tracking state
  CURRENT_JOURNEY_ID: `${STORAGE_PREFIXES.JOURNEY}current_id`,
  CURRENT_JOURNEY_DATA: `${STORAGE_PREFIXES.JOURNEY}current_data`,
  TRACKING_STATE: `${STORAGE_PREFIXES.JOURNEY}tracking_state`,
  TRACKING_START_TIME: `${STORAGE_PREFIXES.JOURNEY}start_time`,
  
  // Journey data during tracking
  ACTIVE_COORDINATES: `${STORAGE_PREFIXES.JOURNEY_DATA}active_coordinates`,
  TEMP_JOURNEY_DATA: `${STORAGE_PREFIXES.JOURNEY_DATA}temp_data`,
  LAST_KNOWN_LOCATION: `${STORAGE_PREFIXES.LOCATION}last_known`,
  
  // Journey cache
  JOURNEY_LIST_CACHE: `${STORAGE_PREFIXES.CACHE}journey_list`,
  JOURNEY_CACHE_TIMESTAMP: `${STORAGE_PREFIXES.CACHE}journey_timestamp`,
  JOURNEY_STATS_CACHE: `${STORAGE_PREFIXES.CACHE}journey_stats`,
  
  // Journey settings and preferences
  TRACKING_PREFERENCES: `${STORAGE_PREFIXES.SETTINGS}tracking_prefs`,
  LOCATION_ACCURACY_SETTING: `${STORAGE_PREFIXES.SETTINGS}location_accuracy`,
  BATTERY_OPTIMIZATION: `${STORAGE_PREFIXES.SETTINGS}battery_optimization`,
  
  // Migration and versioning
  JOURNEY_SCHEMA_VERSION: `${STORAGE_PREFIXES.MIGRATION}journey_schema_version`,
  LAST_MIGRATION_CHECK: `${STORAGE_PREFIXES.MIGRATION}last_check`,
  MIGRATION_STATUS: `${STORAGE_PREFIXES.MIGRATION}status`,
  
  // Developer tools
  DEV_MODE_ENABLED: `${STORAGE_PREFIXES.DEV}mode_enabled`,
  MOCK_LOCATION_DATA: `${STORAGE_PREFIXES.DEV}mock_location`,
  DEBUG_LOGGING: `${STORAGE_PREFIXES.DEV}debug_logging`,
};

/**
 * Location tracking storage keys
 */
export const LOCATION_STORAGE_KEYS = {
  // Location permissions
  LOCATION_PERMISSION_STATUS: `${STORAGE_PREFIXES.LOCATION}permission_status`,
  BACKGROUND_PERMISSION_STATUS: `${STORAGE_PREFIXES.LOCATION}background_permission`,
  PERMISSION_REQUEST_COUNT: `${STORAGE_PREFIXES.LOCATION}permission_requests`,
  
  // Location accuracy and filtering
  ACCURACY_THRESHOLD: `${STORAGE_PREFIXES.LOCATION}accuracy_threshold`,
  COORDINATE_FILTER_SETTINGS: `${STORAGE_PREFIXES.LOCATION}filter_settings`,
  LOCATION_UPDATE_INTERVAL: `${STORAGE_PREFIXES.LOCATION}update_interval`,
  
  // Background tracking
  BACKGROUND_TASK_ID: `${STORAGE_PREFIXES.LOCATION}background_task_id`,
  BACKGROUND_TRACKING_STATE: `${STORAGE_PREFIXES.LOCATION}background_state`,
  LAST_BACKGROUND_UPDATE: `${STORAGE_PREFIXES.LOCATION}last_background_update`,
};

/**
 * Cache management storage keys
 */
export const CACHE_STORAGE_KEYS = {
  // Cache metadata
  CACHE_VERSION: `${STORAGE_PREFIXES.CACHE}version`,
  CACHE_SIZE_LIMIT: `${STORAGE_PREFIXES.CACHE}size_limit`,
  LAST_CACHE_CLEANUP: `${STORAGE_PREFIXES.CACHE}last_cleanup`,
  
  // Performance optimization
  COORDINATE_BATCH_CACHE: `${STORAGE_PREFIXES.CACHE}coordinate_batch`,
  ROUTE_SIMPLIFICATION_CACHE: `${STORAGE_PREFIXES.CACHE}route_simplification`,
  DISTANCE_CALCULATION_CACHE: `${STORAGE_PREFIXES.CACHE}distance_calculation`,
  
  // Offline support
  PENDING_SYNC_JOURNEYS: `${STORAGE_PREFIXES.CACHE}pending_sync`,
  OFFLINE_JOURNEY_QUEUE: `${STORAGE_PREFIXES.CACHE}offline_queue`,
  SYNC_STATUS: `${STORAGE_PREFIXES.CACHE}sync_status`,
};

/**
 * Discovery preferences storage keys
 */
export const DISCOVERY_STORAGE_KEYS = {
  // Core preferences
  PLACE_TYPE_PREFERENCES: `${STORAGE_PREFIXES.DISCOVERY}place_types`,
  MIN_RATING_PREFERENCE: `${STORAGE_PREFIXES.DISCOVERY}min_rating`,
  PREFERENCES_VERSION: `${STORAGE_PREFIXES.DISCOVERY}version`,
  LAST_PREFERENCES_UPDATE: `${STORAGE_PREFIXES.DISCOVERY}last_update`,
  
  // Preference synchronization
  PREFERENCES_SYNC_STATUS: `${STORAGE_PREFIXES.DISCOVERY}sync_status`,
  LAST_CLOUD_SYNC: `${STORAGE_PREFIXES.DISCOVERY}last_cloud_sync`,
  PENDING_PREFERENCE_CHANGES: `${STORAGE_PREFIXES.DISCOVERY}pending_changes`,
  
  // Cache for preferences
  PREFERENCES_CACHE: `${STORAGE_PREFIXES.CACHE}discovery_preferences`,
  PREFERENCES_CACHE_TIMESTAMP: `${STORAGE_PREFIXES.CACHE}discovery_timestamp`,
  
  // Migration support
  PREFERENCES_SCHEMA_VERSION: `${STORAGE_PREFIXES.MIGRATION}discovery_schema`,
  PREFERENCES_MIGRATION_STATUS: `${STORAGE_PREFIXES.MIGRATION}discovery_status`,
};

/**
 * Default values for storage keys
 */
export const STORAGE_DEFAULTS = {
  // Journey tracking defaults
  [JOURNEY_STORAGE_KEYS.TRACKING_STATE]: false,
  [JOURNEY_STORAGE_KEYS.CURRENT_JOURNEY_ID]: null,
  [JOURNEY_STORAGE_KEYS.ACTIVE_COORDINATES]: [],
  
  // Location defaults
  [LOCATION_STORAGE_KEYS.ACCURACY_THRESHOLD]: 100, // meters
  [LOCATION_STORAGE_KEYS.LOCATION_UPDATE_INTERVAL]: 5000, // milliseconds
  [LOCATION_STORAGE_KEYS.PERMISSION_REQUEST_COUNT]: 0,
  
  // Cache defaults
  [CACHE_STORAGE_KEYS.CACHE_SIZE_LIMIT]: 50 * 1024 * 1024, // 50MB
  [CACHE_STORAGE_KEYS.CACHE_VERSION]: 1,
  
  // Settings defaults
  [JOURNEY_STORAGE_KEYS.TRACKING_PREFERENCES]: {
    autoSave: true,
    backgroundTracking: true,
    batteryOptimization: true,
    accuracyLevel: 'balanced',
  },
  
  // Migration defaults
  [JOURNEY_STORAGE_KEYS.JOURNEY_SCHEMA_VERSION]: 1,
  [JOURNEY_STORAGE_KEYS.MIGRATION_STATUS]: 'up_to_date',
  
  // Developer defaults
  [JOURNEY_STORAGE_KEYS.DEV_MODE_ENABLED]: false,
  [JOURNEY_STORAGE_KEYS.DEBUG_LOGGING]: false,
  
  // Discovery preferences defaults
  [DISCOVERY_STORAGE_KEYS.MIN_RATING_PREFERENCE]: 4.0,
  [DISCOVERY_STORAGE_KEYS.PREFERENCES_VERSION]: 1,
  [DISCOVERY_STORAGE_KEYS.PREFERENCES_SYNC_STATUS]: 'pending',
  [DISCOVERY_STORAGE_KEYS.PREFERENCES_SCHEMA_VERSION]: 1,
  [DISCOVERY_STORAGE_KEYS.PREFERENCES_MIGRATION_STATUS]: 'up_to_date',
};

/**
 * Storage key validation patterns
 */
export const STORAGE_KEY_PATTERNS = {
  JOURNEY_ID: /^journey_[a-zA-Z0-9_-]+$/,
  TIMESTAMP: /^\d{13}$/, // Unix timestamp in milliseconds
  COORDINATES_ARRAY: /^\[.*\]$/, // JSON array pattern
  BOOLEAN_STRING: /^(true|false)$/,
  VERSION_NUMBER: /^\d+(\.\d+)*$/,
};

/**
 * Cache expiration times (in milliseconds)
 */
export const CACHE_EXPIRATION = {
  JOURNEY_LIST: 5 * 60 * 1000, // 5 minutes
  JOURNEY_STATS: 10 * 60 * 1000, // 10 minutes
  LOCATION_DATA: 30 * 1000, // 30 seconds
  ROUTE_CACHE: 60 * 60 * 1000, // 1 hour
  COORDINATE_BATCH: 2 * 60 * 1000, // 2 minutes
};

/**
 * Storage size limits (in bytes)
 */
export const STORAGE_LIMITS = {
  MAX_COORDINATES_PER_JOURNEY: 10000,
  MAX_CACHED_JOURNEYS: 100,
  MAX_COORDINATE_BATCH_SIZE: 1000,
  MAX_JOURNEY_NAME_LENGTH: 100,
  MAX_METADATA_SIZE: 10 * 1024, // 10KB
};

/**
 * Utility functions for storage key management
 */
export const STORAGE_UTILS = {
  /**
   * Generate a cache key for a specific journey
   * @param {string} journeyId - Journey ID
   * @param {string} suffix - Key suffix
   * @returns {string} Cache key
   */
  getJourneyCacheKey: (journeyId, suffix = '') => {
    const key = `${STORAGE_PREFIXES.CACHE}journey_${journeyId}`;
    return suffix ? `${key}_${suffix}` : key;
  },
  
  /**
   * Generate a temporary data key for active tracking
   * @param {string} journeyId - Journey ID
   * @returns {string} Temporary data key
   */
  getTempDataKey: (journeyId) => {
    return `${STORAGE_PREFIXES.JOURNEY_DATA}temp_${journeyId}`;
  },
  
  /**
   * Generate a coordinate batch key
   * @param {string} journeyId - Journey ID
   * @param {number} batchIndex - Batch index
   * @returns {string} Coordinate batch key
   */
  getCoordinateBatchKey: (journeyId, batchIndex) => {
    return `${STORAGE_PREFIXES.JOURNEY_DATA}coords_${journeyId}_${batchIndex}`;
  },
  
  /**
   * Generate a migration key for a specific version
   * @param {number} version - Schema version
   * @returns {string} Migration key
   */
  getMigrationKey: (version) => {
    return `${STORAGE_PREFIXES.MIGRATION}v${version}`;
  },
  
  /**
   * Check if a key matches a specific pattern
   * @param {string} key - Storage key to validate
   * @param {RegExp} pattern - Pattern to match against
   * @returns {boolean} Whether key matches pattern
   */
  validateKey: (key, pattern) => {
    return pattern.test(key);
  },
  
  /**
   * Get all keys with a specific prefix
   * @param {string} prefix - Key prefix to filter by
   * @returns {string[]} Array of matching keys
   */
  getKeysWithPrefix: (prefix) => {
    return Object.values({
      ...JOURNEY_STORAGE_KEYS,
      ...LOCATION_STORAGE_KEYS,
      ...CACHE_STORAGE_KEYS,
    }).filter(key => key.startsWith(prefix));
  },
  
  /**
   * Check if a cache key has expired
   * @param {string} key - Cache key
   * @param {number} timestamp - Stored timestamp
   * @returns {boolean} Whether cache has expired
   */
  isCacheExpired: (key, timestamp) => {
    const now = Date.now();
    const expiration = CACHE_EXPIRATION[key] || CACHE_EXPIRATION.JOURNEY_LIST;
    return (now - timestamp) > expiration;
  },
};

/**
 * Storage cleanup configuration
 */
export const CLEANUP_CONFIG = {
  // How often to run cleanup (in milliseconds)
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  
  // Age thresholds for cleanup
  OLD_TEMP_DATA_THRESHOLD: 7 * 24 * 60 * 60 * 1000, // 7 days
  OLD_CACHE_THRESHOLD: 30 * 24 * 60 * 60 * 1000, // 30 days
  OLD_LOG_THRESHOLD: 14 * 24 * 60 * 60 * 1000, // 14 days
  
  // Keys to exclude from cleanup
  PROTECTED_KEYS: [
    JOURNEY_STORAGE_KEYS.TRACKING_PREFERENCES,
    JOURNEY_STORAGE_KEYS.JOURNEY_SCHEMA_VERSION,
    LOCATION_STORAGE_KEYS.LOCATION_PERMISSION_STATUS,
    CACHE_STORAGE_KEYS.CACHE_VERSION,
  ],
};

export default {
  JOURNEY_STORAGE_KEYS,
  LOCATION_STORAGE_KEYS,
  CACHE_STORAGE_KEYS,
  DISCOVERY_STORAGE_KEYS,
  STORAGE_DEFAULTS,
  STORAGE_KEY_PATTERNS,
  CACHE_EXPIRATION,
  STORAGE_LIMITS,
  STORAGE_UTILS,
  CLEANUP_CONFIG,
};