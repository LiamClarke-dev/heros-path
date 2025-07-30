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
    if (!this.currentJourneyId || locationHistory.length === 0) {
      return;
    }

    try {
      const backupData = {
        journeyId: this.currentJourneyId,
        coordinates: locationHistory
          .filter(loc => loc && loc.coords && typeof loc.coords.latitude === 'number' && typeof loc.coords.longitude === 'number')
          .map(loc => ({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
            accuracy: loc.coords.accuracy
          })),
        startTime: locationHistory[0]?.timestamp || Date.now(),
        lastSaveTime: Date.now(),
        isActive: true
      };

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