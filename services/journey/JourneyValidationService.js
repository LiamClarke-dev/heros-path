/**
 * JourneyValidationService - Journey data validation utilities
 * 
 * Single Responsibility: Journey data validation and integrity checking
 * Requirements: 2.2, 2.3, 5.1
 */

import { VALIDATION_CONSTANTS } from '../../constants/JourneyModels';

/**
 * JourneyValidationService handles all journey data validation
 */
class JourneyValidationService {
  /**
   * Validate journey data before creation
   * @param {Object} journeyData - Journey data to validate
   */
  validateJourneyData(journeyData) {
    if (!journeyData.startTime || !journeyData.endTime) {
      throw new Error('Journey must have start and end times');
    }

    if (journeyData.endTime <= journeyData.startTime) {
      throw new Error('Journey end time must be after start time');
    }

    if (journeyData.coordinates && journeyData.coordinates.length < VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY) {
      throw new Error(`Journey must have at least ${VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY} coordinates`);
    }

    // Validate coordinates format
    if (journeyData.coordinates) {
      journeyData.coordinates.forEach((coord, index) => {
        if (!coord.latitude || !coord.longitude || !coord.timestamp) {
          throw new Error(`Invalid coordinate at index ${index}: missing required fields`);
        }
        if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
          throw new Error(`Invalid coordinate at index ${index}: latitude and longitude must be numbers`);
        }
      });
    }
  }

  /**
   * Validate journey updates
   * @param {Object} updates - Updates to validate
   */
  validateJourneyUpdates(updates) {
    // Validate name length if provided
    if (updates.name && updates.name.length > VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH) {
      throw new Error(`Journey name cannot exceed ${VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH} characters`);
    }

    // Validate status if provided
    if (updates.status && !['completed', 'in_progress'].includes(updates.status)) {
      throw new Error('Journey status must be either "completed" or "in_progress"');
    }

    // Prevent updating immutable fields
    const immutableFields = ['id', 'userId', 'createdAt', 'schemaVersion'];
    immutableFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        throw new Error(`Cannot update immutable field: ${field}`);
      }
    });
  }

  /**
   * Validate journey data integrity
   * @param {Object} journey - Journey object to validate
   * @returns {Object} Validation result with issues found
   */
  validateJourneyDataIntegrity(journey) {
    const issues = [];
    const warnings = [];

    if (!journey) {
      issues.push('Journey object is null or undefined');
      return { isValid: false, issues, warnings };
    }

    // Required field validation
    const requiredFields = ['id', 'userId', 'name', 'startTime', 'endTime', 'distance', 'duration'];
    requiredFields.forEach(field => {
      if (!journey.hasOwnProperty(field) || journey[field] === null || journey[field] === undefined) {
        issues.push(`Missing required field: ${field}`);
      }
    });

    // Data type validation
    if (journey.startTime && typeof journey.startTime !== 'number') {
      issues.push('startTime must be a number (timestamp)');
    }
    if (journey.endTime && typeof journey.endTime !== 'number') {
      issues.push('endTime must be a number (timestamp)');
    }
    if (journey.distance && typeof journey.distance !== 'number') {
      issues.push('distance must be a number');
    }
    if (journey.duration && typeof journey.duration !== 'number') {
      issues.push('duration must be a number');
    }

    // Logical validation
    if (journey.startTime && journey.endTime && journey.endTime <= journey.startTime) {
      issues.push('endTime must be after startTime');
    }

    if (journey.distance && journey.distance < 0) {
      issues.push('distance cannot be negative');
    }

    if (journey.duration && journey.duration < 0) {
      issues.push('duration cannot be negative');
    }

    // Route validation
    if (journey.route) {
      if (!Array.isArray(journey.route)) {
        issues.push('route must be an array');
      } else {
        journey.route.forEach((coord, index) => {
          if (!coord.latitude || !coord.longitude) {
            issues.push(`Invalid coordinate at index ${index}: missing latitude or longitude`);
          }
          if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
            issues.push(`Invalid coordinate at index ${index}: latitude and longitude must be numbers`);
          }
          if (Math.abs(coord.latitude) > 90) {
            issues.push(`Invalid coordinate at index ${index}: latitude out of range`);
          }
          if (Math.abs(coord.longitude) > 180) {
            issues.push(`Invalid coordinate at index ${index}: longitude out of range`);
          }
        });

        // Check for minimum coordinates
        if (journey.route.length < VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY) {
          warnings.push(`Journey has only ${journey.route.length} coordinates, minimum recommended is ${VALIDATION_CONSTANTS.MIN_COORDINATES_FOR_JOURNEY}`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}

// Export singleton instance
export default new JourneyValidationService();