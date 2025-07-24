/**
 * Firestore Schema Definitions for Journey Tracking
 * 
 * This file defines the Firestore collection structure, document schemas,
 * and database rules for the Journey Tracking feature.
 */

/**
 * Firestore Collection Names
 */
export const COLLECTIONS = {
  USERS: 'users',
  JOURNEYS: 'journeys',
  JOURNEY_DATA: 'journeyData',
  DISCOVERIES: 'discoveries',
  SAVED_PLACES: 'savedPlaces',
};

/**
 * Firestore Subcollection Names
 */
export const SUBCOLLECTIONS = {
  USER_JOURNEYS: 'userJourneys',
  JOURNEY_COORDINATES: 'coordinates',
  JOURNEY_DISCOVERIES: 'discoveries',
  MIGRATION_HISTORY: 'migrationHistory',
};

/**
 * Journey Document Schema in Firestore
 * Collection: /users/{userId}/journeys/{journeyId}
 */
export const JOURNEY_FIRESTORE_SCHEMA = {
  // Required fields
  id: 'string',
  userId: 'string',
  name: 'string',
  startTime: 'number', // Unix timestamp
  endTime: 'number', // Unix timestamp
  distance: 'number', // meters
  duration: 'number', // milliseconds
  status: 'string', // 'completed' | 'in_progress'
  createdAt: 'timestamp', // Firestore timestamp
  updatedAt: 'timestamp', // Firestore timestamp
  schemaVersion: 'number',
  lastUpdated: 'string', // ISO string
  
  // Optional fields
  isCompleted: 'boolean',
  reviewedDiscoveriesCount: 'number',
  totalDiscoveriesCount: 'number',
  completionPercentage: 'number',
  lastMigrationAt: 'string', // ISO string
  devMode: 'boolean',
  mockData: 'boolean',
  cacheKey: 'string',
  
  // Complex fields
  route: 'array', // Array of LocationCoordinates objects
  migrationHistory: 'array', // Array of migration records
  metadata: 'map', // Extensible metadata object
  extensions: 'map', // Extension points
};

/**
 * Journey Data Document Schema in Firestore
 * Collection: /users/{userId}/journeyData/{journeyDataId}
 * Used for temporary storage during active tracking
 */
export const JOURNEY_DATA_FIRESTORE_SCHEMA = {
  // Required fields
  id: 'string',
  startTime: 'number', // Unix timestamp
  endTime: 'number', // Unix timestamp
  distance: 'number', // meters
  duration: 'number', // milliseconds
  schemaVersion: 'number',
  lastUpdated: 'string', // ISO string
  
  // Optional fields
  startLocation: 'string',
  endLocation: 'string',
  lastMigrationAt: 'string', // ISO string
  devMode: 'boolean',
  mockData: 'boolean',
  cacheKey: 'string',
  
  // Complex fields
  coordinates: 'array', // Array of LocationCoordinates objects
  metadata: 'map', // Extensible metadata object
  extensions: 'map', // Extension points
};

/**
 * LocationCoordinates Schema (used within arrays)
 */
export const LOCATION_COORDINATES_SCHEMA = {
  // Required fields
  latitude: 'number',
  longitude: 'number',
  timestamp: 'number', // Unix timestamp
  
  // Optional fields
  accuracy: 'number', // meters
  altitude: 'number', // meters
  heading: 'number', // degrees
  speed: 'number', // meters per second
  accuracyLevel: 'string', // 'high' | 'medium' | 'low'
  streetCoverage: 'boolean',
  processed: 'boolean',
  cacheKey: 'string',
};

/**
 * Route Segment Schema (used in ExplorationContext)
 */
export const ROUTE_SEGMENT_SCHEMA = {
  start: 'map', // LocationCoordinates object
  end: 'map', // LocationCoordinates object
  timestamp: 'number', // Unix timestamp
  metadata: 'map', // Extensible metadata
};

/**
 * Journey Metadata Schema (nested within Journey documents)
 */
export const JOURNEY_METADATA_SCHEMA = {
  gamification: {
    achievementTriggers: 'array', // Array of strings
    progressMetrics: 'array', // Array of strings
    completionRewards: 'array', // Array of strings
    levelProgress: 'number',
    experienceGained: 'number',
  },
  socialSharing: {
    shareable: 'boolean',
    privacyLevel: 'string', // 'public' | 'friends' | 'private'
    shareableContent: 'array', // Array of strings
    sharedAt: 'string', // ISO string
    shareCount: 'number',
  },
  routeVisualization: {
    customStyle: 'string',
    overlayData: 'map',
    animationSettings: 'map',
    themeCompatible: 'boolean',
  },
  completion: {
    achievements: 'array', // Array of strings
    badges: 'array', // Array of strings
    completionDate: 'string', // ISO string
    completionTime: 'number',
  },
};

/**
 * Firestore Security Rules Template
 * These rules should be applied to the Firestore database
 */
export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own journey data
    match /users/{userId}/journeys/{journeyId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only access their own journey data during tracking
    match /users/{userId}/journeyData/{journeyDataId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Journey coordinates subcollection
    match /users/{userId}/journeys/{journeyId}/coordinates/{coordinateId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Journey discoveries subcollection
    match /users/{userId}/journeys/{journeyId}/discoveries/{discoveryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Migration history subcollection
    match /users/{userId}/journeys/{journeyId}/migrationHistory/{migrationId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
`;

/**
 * Firestore Indexes Required for Journey Queries
 * These indexes should be created in the Firestore console
 */
export const REQUIRED_FIRESTORE_INDEXES = [
  {
    collection: 'users/{userId}/journeys',
    fields: [
      { field: 'userId', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'users/{userId}/journeys',
    fields: [
      { field: 'userId', order: 'ASCENDING' },
      { field: 'status', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'users/{userId}/journeys',
    fields: [
      { field: 'userId', order: 'ASCENDING' },
      { field: 'isCompleted', order: 'ASCENDING' },
      { field: 'updatedAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'users/{userId}/journeyData',
    fields: [
      { field: 'lastUpdated', order: 'DESCENDING' }
    ]
  }
];

/**
 * Document Path Generators
 */
export const DOCUMENT_PATHS = {
  /**
   * Get the path for a user's journey document
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {string} Firestore document path
   */
  userJourney: (userId, journeyId) => `users/${userId}/journeys/${journeyId}`,
  
  /**
   * Get the path for a user's journey data document
   * @param {string} userId - User ID
   * @param {string} journeyDataId - Journey data ID
   * @returns {string} Firestore document path
   */
  userJourneyData: (userId, journeyDataId) => `users/${userId}/journeyData/${journeyDataId}`,
  
  /**
   * Get the collection path for a user's journeys
   * @param {string} userId - User ID
   * @returns {string} Firestore collection path
   */
  userJourneys: (userId) => `users/${userId}/journeys`,
  
  /**
   * Get the collection path for a user's journey data
   * @param {string} userId - User ID
   * @returns {string} Firestore collection path
   */
  userJourneyDataCollection: (userId) => `users/${userId}/journeyData`,
  
  /**
   * Get the path for journey coordinates subcollection
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {string} Firestore collection path
   */
  journeyCoordinates: (userId, journeyId) => `users/${userId}/journeys/${journeyId}/coordinates`,
  
  /**
   * Get the path for journey discoveries subcollection
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {string} Firestore collection path
   */
  journeyDiscoveries: (userId, journeyId) => `users/${userId}/journeys/${journeyId}/discoveries`,
  
  /**
   * Get the path for migration history subcollection
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {string} Firestore collection path
   */
  migrationHistory: (userId, journeyId) => `users/${userId}/journeys/${journeyId}/migrationHistory`,
};

/**
 * Query Builders for common Firestore queries
 */
export const QUERY_BUILDERS = {
  /**
   * Get all journeys for a user, ordered by creation date (newest first)
   * @param {string} userId - User ID
   * @returns {Object} Query configuration
   */
  getUserJourneys: (userId) => ({
    collection: DOCUMENT_PATHS.userJourneys(userId),
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    where: []
  }),
  
  /**
   * Get completed journeys for a user
   * @param {string} userId - User ID
   * @returns {Object} Query configuration
   */
  getCompletedJourneys: (userId) => ({
    collection: DOCUMENT_PATHS.userJourneys(userId),
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    where: [{ field: 'status', operator: '==', value: 'completed' }]
  }),
  
  /**
   * Get in-progress journeys for a user
   * @param {string} userId - User ID
   * @returns {Object} Query configuration
   */
  getInProgressJourneys: (userId) => ({
    collection: DOCUMENT_PATHS.userJourneys(userId),
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    where: [{ field: 'status', operator: '==', value: 'in_progress' }]
  }),
  
  /**
   * Get recent journey data for cleanup
   * @param {string} userId - User ID
   * @param {number} olderThanTimestamp - Timestamp threshold
   * @returns {Object} Query configuration
   */
  getOldJourneyData: (userId, olderThanTimestamp) => ({
    collection: DOCUMENT_PATHS.userJourneyDataCollection(userId),
    orderBy: [{ field: 'lastUpdated', direction: 'asc' }],
    where: [{ field: 'lastUpdated', operator: '<', value: new Date(olderThanTimestamp).toISOString() }]
  }),
};

export default {
  COLLECTIONS,
  SUBCOLLECTIONS,
  JOURNEY_FIRESTORE_SCHEMA,
  JOURNEY_DATA_FIRESTORE_SCHEMA,
  LOCATION_COORDINATES_SCHEMA,
  ROUTE_SEGMENT_SCHEMA,
  JOURNEY_METADATA_SCHEMA,
  FIRESTORE_SECURITY_RULES,
  REQUIRED_FIRESTORE_INDEXES,
  DOCUMENT_PATHS,
  QUERY_BUILDERS,
};