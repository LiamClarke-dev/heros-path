/**
 * LocationBackupManager handles periodic saving and crash recovery
 * for journey location data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Periodic save constants
const PERIODIC_SAVE_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY_JOURNEY_BACKUP = 'journey_backup_';

class LocationBackupManager {
  constructor() {
    this.periodicSaveInterval = null;
    this.lastSaveTime = null;
    this.currentJourneyId = null;
    this.onBackupStatusChange = null;
  }

  /**
   * Set callback for backup status changes
   * @param {Function} callback - Callback function
   */
  setBackupStatusCallback(callback) {
    this.onBackupStatusChange = callback;
  }

  /**
   * Start periodic saving of journey data to prevent data loss (Requirement 5.4)
   * @param {string} journeyId - Journey ID to backup
   */
  startPeriodicSave(journeyId) {
    if (this.periodicSaveInterval) {
      clearInterval(this.periodicSaveInterval);
    }

    this.currentJourneyId = journeyId;
    this.periodicSaveInterval = setInterval(() => this.performPeriodicSave(), PERIODIC_SAVE_INTERVAL);
    this.lastSaveTime = Date.now();
    console.log('Periodic save started for journey data backup');
  }

  /**
   * Stop periodic saving
   */
  stopPeriodicSave() {
    if (this.periodicSaveInterval) {
      clearInterval(this.periodicSaveInterval);
      this.periodicSaveInterval = null;
      this.currentJourneyId = null;
      console.log('Periodic save stopped');
    }
  }

  /**
   * Perform periodic save of current journey data (Requirement 5.4)
   * @param {Array} locationHistory - Current location history to backup
   */
  async performPeriodicSave(locationHistory = []) {
    if (!this.currentJourneyId) {
      return;
    }

    // If no location history provided, skip this save cycle
    if (!locationHistory || locationHistory.length === 0) {
      console.log('No location history to backup');
      return;
    }

    // Debug logging
    console.log(`Backup attempt: ${locationHistory.length} locations, first location:`, locationHistory[0]);

    try {
      // Validate and filter location data more carefully
      const validCoordinates = locationHistory
        .filter((loc, index) => {
          // Check if location object exists
          if (!loc) {
            console.warn(`Location at index ${index} is null/undefined:`, loc);
            return false;
          }
          
          // Check if location has coords property
          if (!loc.coords) {
            console.warn(`Location at index ${index} missing coords:`, loc);
            return false;
          }
          
          // Check if coordinates are valid numbers
          const { latitude, longitude } = loc.coords;
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.warn(`Invalid coordinates at index ${index}:`, { latitude, longitude, loc });
            return false;
          }
          
          // Check if coordinates are within valid ranges
          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.warn(`Coordinates out of range at index ${index}:`, { latitude, longitude });
            return false;
          }
          
          return true;
        })
        .map((loc, index) => {
          try {
            // DEBUGGING: Log the location structure
            console.log(`Mapping location at index ${index}:`, {
              hasCoords: !!loc.coords,
              coordsKeys: loc.coords ? Object.keys(loc.coords) : 'no coords',
              latitude: loc.coords?.latitude,
              longitude: loc.coords?.longitude,
              timestamp: loc.timestamp
            });
            
            // CRITICAL FIX: Add more validation
            if (!loc.coords) {
              throw new Error(`Location at index ${index} missing coords property`);
            }
            
            if (typeof loc.coords.latitude !== 'number' || typeof loc.coords.longitude !== 'number') {
              throw new Error(`Location at index ${index} has invalid coordinates: lat=${loc.coords.latitude}, lng=${loc.coords.longitude}`);
            }
            
            const mappedLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              timestamp: loc.timestamp || Date.now(),
              accuracy: loc.coords.accuracy || null
            };
            
            // Validate the mapped location
            if (typeof mappedLocation.latitude !== 'number' || typeof mappedLocation.longitude !== 'number') {
              throw new Error(`Mapped location at index ${index} has invalid coordinates after mapping`);
            }
            
            return mappedLocation;
          } catch (error) {
            console.error(`Error mapping location at index ${index}:`, error, {
              location: loc,
              errorMessage: error.message,
              stack: error.stack
            });
            return null;
          }
        })
        .filter(coord => coord !== null);

      if (validCoordinates.length === 0) {
        console.warn('No valid coordinates to backup');
        return;
      }

      // DEBUGGING: Check the first location structure
      console.log('First location for startTime:', {
        hasFirstLocation: !!locationHistory[0],
        firstLocationKeys: locationHistory[0] ? Object.keys(locationHistory[0]) : 'no first location',
        timestamp: locationHistory[0]?.timestamp,
        coords: locationHistory[0]?.coords
      });

      const backupData = {
        journeyId: this.currentJourneyId,
        coordinates: validCoordinates,
        startTime: locationHistory[0]?.timestamp || Date.now(),
        lastSaveTime: Date.now(),
        isActive: true
      };

      // CRITICAL FIX: Add validation before JSON.stringify
      try {
        const testSerialization = JSON.stringify(backupData);
        console.log('Backup data serialization test passed:', {
          dataSize: testSerialization.length,
          coordinatesCount: validCoordinates.length
        });
      } catch (serializationError) {
        console.error('Backup data serialization failed:', serializationError, {
          backupData: backupData,
          validCoordinates: validCoordinates
        });
        throw new Error(`Serialization failed: ${serializationError.message}`);
      }

      const backupKey = `${STORAGE_KEY_JOURNEY_BACKUP}${this.currentJourneyId}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      
      this.lastSaveTime = Date.now();
      console.log(`Journey data backed up: ${locationHistory.length} coordinates saved`);
      
      // Notify callback about successful backup
      if (this.onBackupStatusChange) {
        this.onBackupStatusChange({
          type: 'backup_saved',
          message: 'Journey data backed up successfully',
          coordinateCount: locationHistory.length,
          timestamp: this.lastSaveTime
        });
      }
    } catch (error) {
      console.error('Failed to save journey backup:', error);
      
      // Notify callback about backup failure
      if (this.onBackupStatusChange) {
        this.onBackupStatusChange({
          type: 'backup_error',
          message: 'Failed to backup journey data',
          error: error.message
        });
      }
    }
  }

  /**
   * Save journey data immediately (for critical moments)
   * @param {string} journeyId - Journey ID
   * @param {Array} locationHistory - Location history to save
   */
  async saveJourneyDataNow(journeyId, locationHistory) {
    const previousJourneyId = this.currentJourneyId;
    this.currentJourneyId = journeyId;
    
    await this.performPeriodicSave(locationHistory);
    
    this.currentJourneyId = previousJourneyId;
  }

  /**
   * Recover journey data from backup after app crash (Requirement 5.4)
   * @param {string} journeyId - Journey ID to recover
   * @returns {Promise<Object|null>} - Recovered journey data or null
   */
  async recoverJourneyFromBackup(journeyId) {
    try {
      const backupKey = `${STORAGE_KEY_JOURNEY_BACKUP}${journeyId}`;
      const backupDataJson = await AsyncStorage.getItem(backupKey);
      
      if (!backupDataJson) {
        console.log(`No backup found for journey: ${journeyId}`);
        return null;
      }

      const backupData = JSON.parse(backupDataJson);
      console.log(`Recovered journey backup: ${backupData.coordinates.length} coordinates`);
      
      return backupData;
    } catch (error) {
      console.error('Failed to recover journey backup:', error);
      return null;
    }
  }

  /**
   * Clear journey backup data
   * @param {string} journeyId - Journey ID to clear backup for
   */
  async clearJourneyBackup(journeyId) {
    try {
      if (!journeyId) return;
      
      const backupKey = `${STORAGE_KEY_JOURNEY_BACKUP}${journeyId}`;
      await AsyncStorage.removeItem(backupKey);
      console.log(`Journey backup cleared for: ${journeyId}`);
    } catch (error) {
      console.error('Failed to clear journey backup:', error);
    }
  }

  /**
   * Get all available journey backups
   * @returns {Promise<Array>} - Array of backup journey IDs
   */
  async getAvailableBackups() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith(STORAGE_KEY_JOURNEY_BACKUP));
      const journeyIds = backupKeys.map(key => key.replace(STORAGE_KEY_JOURNEY_BACKUP, ''));
      
      console.log(`Found ${journeyIds.length} journey backups`);
      return journeyIds;
    } catch (error) {
      console.error('Failed to get available backups:', error);
      return [];
    }
  }

  /**
   * Get periodic save status
   * @returns {Object} - Save status information
   */
  getBackupStatus() {
    return {
      isActive: !!this.periodicSaveInterval,
      currentJourneyId: this.currentJourneyId,
      lastSaveTime: this.lastSaveTime,
      timeSinceLastSave: this.lastSaveTime ? Date.now() - this.lastSaveTime : null,
      saveInterval: PERIODIC_SAVE_INTERVAL
    };
  }

  /**
   * Clean up backup manager
   */
  cleanup() {
    this.stopPeriodicSave();
    this.onBackupStatusChange = null;
    this.lastSaveTime = null;
  }
}

export default LocationBackupManager;