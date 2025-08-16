/**
 * Journey Tracking Data Models
 * 
 * This file defines the data models and interfaces for the Journey Tracking feature.
 * These models are used throughout the application for type consistency and data validation.
 */

/**
 * Represents a single GPS coordinate with timestamp and accuracy data
 * @typedef {Object} LocationCoordinates
 * @property {number} latitude - GPS latitude coordinate
 * @property {number} longitude - GPS longitude coordinate
 * @property {number} timestamp - Unix timestamp when coordinate was recorded
 * @property {number} [accuracy] - GPS accuracy in meters
 * @property {number} [altitude] - Altitude in meters
 * @property {number} [heading] - Direction of travel in degrees
 * @property {number} [speed] - Speed in meters per second
 * @property {'high'|'medium'|'low'} [accuracyLevel] - Categorized accuracy level
 * @property {boolean} [streetCoverage] - Whether coordinate has street coverage
 * @property {boolean} [processed] - Whether coordinate has been processed
 * @property {string} [cacheKey] - Cache key for performance optimization
 */

/**
 * Represents the data collected during a journey tracking session
 * @typedef {Object} JourneyData
 * @property {string} id - Unique identifier for the journey data
 * @property {LocationCoordinates[]} coordinates - Array of GPS coordinates
 * @property {number} startTime - Unix timestamp when journey started
 * @property {number} endTime - Unix timestamp when journey ended
 * @property {number} distance - Total distance in meters
 * @property {number} duration - Total duration in milliseconds
 * @property {string} [startLocation] - Human-readable start location
 * @property {string} [endLocation] - Human-readable end location
 * @property {number} schemaVersion - Schema version for migration support
 * @property {string} [lastMigrationAt] - ISO string of last migration
 * @property {boolean} [devMode] - Whether this is development/test data
 * @property {boolean} [mockData] - Whether this is mock data
 * @property {string} lastUpdated - ISO string of last update
 * @property {string} [cacheKey] - Cache key for performance optimization
 * @property {Object} [metadata] - Extensible metadata object
 * @property {Object} [extensions] - Extension points for future features
 */

/**
 * Represents a saved walking journey with route data and metadata
 * @typedef {Object} Journey
 * @property {string} id - Unique identifier for the journey
 * @property {string} userId - ID of the user who created the journey
 * @property {string} name - User-provided name for the journey
 * @property {number} startTime - Unix timestamp when journey started
 * @property {number} endTime - Unix timestamp when journey ended
 * @property {LocationCoordinates[]} route - Array of GPS coordinates forming the route
 * @property {number} distance - Total distance in meters
 * @property {number} duration - Total duration in milliseconds
 * @property {'completed'|'in_progress'} status - Current status of the journey
 * @property {boolean} [isCompleted] - Whether journey is completed
 * @property {number} [reviewedDiscoveriesCount] - Number of reviewed discoveries
 * @property {number} [totalDiscoveriesCount] - Total number of discoveries
 * @property {number} [completionPercentage] - Completion percentage for discoveries
 * @property {Object} createdAt - Firestore timestamp when created
 * @property {Object} updatedAt - Firestore timestamp when last updated
 * @property {number} schemaVersion - Schema version for migration support
 * @property {string} [lastMigrationAt] - ISO string of last migration
 * @property {Array} [migrationHistory] - History of migrations performed
 * @property {boolean} [devMode] - Whether this is development/test data
 * @property {boolean} [mockData] - Whether this is mock data
 * @property {string} lastUpdated - ISO string of last update
 * @property {string} [cacheKey] - Cache key for performance optimization
 * @property {JourneyMetadata} [metadata] - Extensible metadata for future features
 * @property {Object} [extensions] - Extension points for future features
 */

/**
 * Represents extensible metadata for journeys
 * @typedef {Object} JourneyMetadata
 * @property {Object} [gamification] - Gamification-related metadata
 * @property {string[]} [gamification.achievementTriggers] - Achievement triggers
 * @property {string[]} [gamification.progressMetrics] - Progress metrics
 * @property {string[]} [gamification.completionRewards] - Completion rewards
 * @property {number} [gamification.levelProgress] - Level progress
 * @property {number} [gamification.experienceGained] - Experience gained
 * @property {Object} [socialSharing] - Social sharing metadata
 * @property {boolean} [socialSharing.shareable] - Whether journey is shareable
 * @property {'public'|'friends'|'private'} [socialSharing.privacyLevel] - Privacy level
 * @property {string[]} [socialSharing.shareableContent] - Shareable content types
 * @property {string} [socialSharing.sharedAt] - ISO string when shared
 * @property {number} [socialSharing.shareCount] - Number of times shared
 * @property {Object} [routeVisualization] - Route visualization settings
 * @property {string} [routeVisualization.customStyle] - Custom style identifier
 * @property {Object} [routeVisualization.overlayData] - Overlay data
 * @property {Object} [routeVisualization.animationSettings] - Animation settings
 * @property {boolean} [routeVisualization.themeCompatible] - Theme compatibility
 * @property {Object} [completion] - Journey completion metadata
 * @property {string[]} [completion.achievements] - Achievements earned
 * @property {string[]} [completion.badges] - Badges earned
 * @property {string} [completion.completionDate] - ISO string of completion
 * @property {number} [completion.completionTime] - Time taken to complete
 */

/**
 * Represents a segment of a route for exploration tracking
 * @typedef {Object} RouteSegment
 * @property {LocationCoordinates} start - Starting coordinate of segment
 * @property {LocationCoordinates} end - Ending coordinate of segment
 * @property {number} timestamp - Unix timestamp when segment was created
 * @property {Object} [metadata] - Extensible metadata for segment
 * @property {string[]} [metadata.discoveries] - Discovery IDs in this segment
 * @property {string[]} [metadata.achievements] - Achievement IDs for this segment
 * @property {Object} [metadata.socialData] - Social sharing data for segment
 */

/**
 * Represents mock data for developer tools
 * @typedef {Object} MockJourneyData
 * @property {string} name - Name for the mock journey
 * @property {LocationCoordinates[]} route - Mock route coordinates
 * @property {number} startTime - Mock start time
 * @property {number} endTime - Mock end time
 * @property {number} distance - Mock distance
 * @property {number} duration - Mock duration
 * @property {'test'|'demo'|'simulation'} mockType - Type of mock data
 * @property {JourneyMetadata} [metadata] - Mock metadata
 */

/**
 * Represents a segment of a route for exploration tracking
 * @typedef {Object} RouteSegment
 * @property {string} [id] - Unique identifier for the segment
 * @property {LocationCoordinates} start - Starting coordinate of segment
 * @property {LocationCoordinates} end - Ending coordinate of segment
 * @property {number} timestamp - Unix timestamp when segment was created
 * @property {number} [distance] - Distance of the segment in meters
 * @property {Object} [metadata] - Extensible metadata for segment
 * @property {string} [metadata.journeyId] - Journey ID this segment belongs to
 * @property {string[]} [metadata.discoveries] - Discovery IDs in this segment
 * @property {string[]} [metadata.achievements] - Achievement IDs for this segment
 * @property {Object} [metadata.socialData] - Social sharing data for segment
 * @property {number} [metadata.startIndex] - Start index in coordinate array
 * @property {number} [metadata.endIndex] - End index in coordinate array
 * @property {number} [metadata.coordinateCount] - Number of coordinates in segment
 * @property {number} [metadata.mergedSegments] - Number of segments merged into this one
 */

/**
 * Represents accuracy statistics for location tracking
 * @typedef {Object} AccuracyStats
 * @property {number} averageAccuracy - Average accuracy in meters
 * @property {Object} accuracyDistribution - Distribution of accuracy levels
 * @property {number} accuracyDistribution.high - Percentage of high accuracy readings
 * @property {number} accuracyDistribution.medium - Percentage of medium accuracy readings
 * @property {number} accuracyDistribution.low - Percentage of low accuracy readings
 * @property {number} streetCoveragePercentage - Percentage with street coverage
 * @property {number} totalCoordinates - Total number of coordinates
 * @property {number} filteredCoordinates - Number of filtered coordinates
 */

/**
 * Represents an exploration history entry
 * @typedef {Object} ExplorationHistoryEntry
 * @property {string} id - Unique identifier for the history entry
 * @property {string} type - Type of history entry (journey_start, journey_end, segment_added, etc.)
 * @property {number} timestamp - Unix timestamp when entry was created
 * @property {Object} data - Entry-specific data
 * @property {string} createdAt - ISO string of creation time
 */

// Schema version constants
export const JOURNEY_SCHEMA_VERSION = 1;
export const JOURNEY_DATA_SCHEMA_VERSION = 1;

// Default values for journey creation
export const DEFAULT_JOURNEY_VALUES = {
  status: 'in_progress',
  schemaVersion: JOURNEY_SCHEMA_VERSION,
  isCompleted: false,
  reviewedDiscoveriesCount: 0,
  totalDiscoveriesCount: 0,
  completionPercentage: 0,
  devMode: false,
  mockData: false,
};

export const DEFAULT_JOURNEY_DATA_VALUES = {
  schemaVersion: JOURNEY_DATA_SCHEMA_VERSION,
  devMode: false,
  mockData: false,
};

// Validation constants
export const VALIDATION_CONSTANTS = {
  MIN_JOURNEY_DISTANCE: 50, // meters - keeping at 50m but using consistent calculation
  MAX_COORDINATE_ACCURACY: 100, // meters
  MIN_COORDINATES_FOR_JOURNEY: 2,
  MAX_JOURNEY_NAME_LENGTH: 100,
  COORDINATE_BATCH_SIZE: 100,
  MIN_JOURNEY_DURATION: 30000, // 30 seconds in milliseconds
  MAX_JOURNEY_DURATION: 86400000, // 24 hours in milliseconds
};

// Export all types for use in other modules
export {
  // Main data models are exported as JSDoc types above
  // These can be imported and used for validation and documentation
};