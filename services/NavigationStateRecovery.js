/**
 * NavigationStateRecovery service for Hero's Path
 * Handles navigation state recovery and persistence
 * Requirements: 10.5, 10.6
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import Logger from '../utils/Logger';

class NavigationStateRecovery {
  constructor() {
    this.navigationRef = null;
    this.stateKey = 'HERO_PATH_NAVIGATION_STATE';
    this.backupStateKey = 'HERO_PATH_NAVIGATION_BACKUP';
    this.maxStateHistory = 10;
    this.stateHistory = [];
    this.isRecovering = false;
  }

  /**
   * Set the navigation reference
   */
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  /**
   * Save current navigation state
   */
  async saveNavigationState(state) {
    try {
      if (!state || !state.routes || state.routes.length === 0) {
        Logger.warn('Invalid navigation state, skipping save');
        return false;
      }

      // Create a clean state object
      const cleanState = this.cleanNavigationState(state);
      
      // Save current state
      await AsyncStorage.setItem(this.stateKey, JSON.stringify({
        state: cleanState,
        timestamp: new Date().toISOString(),
        version: '1.0',
      }));

      // Add to history
      this.stateHistory.unshift({
        state: cleanState,
        timestamp: new Date().toISOString(),
      });

      // Keep only recent history
      if (this.stateHistory.length > this.maxStateHistory) {
        this.stateHistory = this.stateHistory.slice(0, this.maxStateHistory);
      }

      // Save backup
      await this.saveBackupState();

      Logger.debug('Navigation state saved successfully');
      return true;
    } catch (error) {
      Logger.error('Failed to save navigation state', error);
      return false;
    }
  }

  /**
   * Load saved navigation state
   */
  async loadNavigationState() {
    try {
      const savedStateData = await AsyncStorage.getItem(this.stateKey);
      
      if (!savedStateData) {
        Logger.info('No saved navigation state found');
        return null;
      }

      const parsedData = JSON.parse(savedStateData);
      const state = parsedData.state;

      // Validate the loaded state
      if (this.validateNavigationState(state)) {
        Logger.info('Navigation state loaded successfully', {
          timestamp: parsedData.timestamp,
          routeCount: state.routes?.length,
        });
        return state;
      } else {
        Logger.warn('Loaded navigation state is invalid, trying backup');
        return await this.loadBackupState();
      }
    } catch (error) {
      Logger.error('Failed to load navigation state', error);
      return await this.loadBackupState();
    }
  }

  /**
   * Save backup navigation state
   */
  async saveBackupState() {
    try {
      if (this.stateHistory.length > 0) {
        await AsyncStorage.setItem(
          this.backupStateKey, 
          JSON.stringify({
            history: this.stateHistory.slice(0, 5), // Keep last 5 states
            timestamp: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      Logger.error('Failed to save backup navigation state', error);
    }
  }

  /**
   * Load backup navigation state
   */
  async loadBackupState() {
    try {
      const backupData = await AsyncStorage.getItem(this.backupStateKey);
      
      if (!backupData) {
        Logger.info('No backup navigation state found');
        return null;
      }

      const parsedBackup = JSON.parse(backupData);
      const history = parsedBackup.history;

      // Try to find a valid state from history
      for (const historyItem of history) {
        if (this.validateNavigationState(historyItem.state)) {
          Logger.info('Using backup navigation state', {
            timestamp: historyItem.timestamp,
          });
          return historyItem.state;
        }
      }

      Logger.warn('No valid backup navigation state found');
      return null;
    } catch (error) {
      Logger.error('Failed to load backup navigation state', error);
      return null;
    }
  }

  /**
   * Clean navigation state for storage
   */
  cleanNavigationState(state) {
    if (!state) return null;

    return {
      index: state.index,
      routes: state.routes?.map(route => ({
        name: route.name,
        key: route.key,
        params: this.cleanParams(route.params),
        state: route.state ? this.cleanNavigationState(route.state) : undefined,
      })),
      routeNames: state.routeNames,
      history: state.history?.slice(-5), // Keep only recent history
      type: state.type,
    };
  }

  /**
   * Clean route parameters for storage
   */
  cleanParams(params) {
    if (!params || typeof params !== 'object') return params;

    const cleanedParams = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Skip functions and complex objects that can't be serialized
      if (typeof value === 'function') continue;
      if (value && typeof value === 'object' && value.constructor !== Object && !Array.isArray(value)) continue;
      
      cleanedParams[key] = value;
    }

    return cleanedParams;
  }

  /**
   * Validate navigation state structure
   */
  validateNavigationState(state) {
    if (!state || typeof state !== 'object') return false;
    if (!Array.isArray(state.routes) || state.routes.length === 0) return false;
    if (typeof state.index !== 'number' || state.index < 0 || state.index >= state.routes.length) return false;

    // Validate routes
    for (const route of state.routes) {
      if (!route.name || typeof route.name !== 'string') return false;
      if (!route.key || typeof route.key !== 'string') return false;
    }

    return true;
  }

  /**
   * Recover navigation state
   */
  async recoverNavigationState() {
    if (this.isRecovering) {
      Logger.warn('Navigation state recovery already in progress');
      return false;
    }

    this.isRecovering = true;

    try {
      Logger.info('Starting navigation state recovery');

      if (!this.navigationRef?.current) {
        throw new Error('Navigation reference not available');
      }

      // Try to load saved state
      const savedState = await this.loadNavigationState();
      
      if (savedState) {
        // Restore the saved state
        this.navigationRef.current.dispatch(
          CommonActions.reset(savedState)
        );
        
        Logger.info('Navigation state recovered successfully');
        return true;
      } else {
        // No valid saved state, reset to default
        return await this.resetToDefaultState();
      }
    } catch (error) {
      Logger.error('Navigation state recovery failed', error);
      return await this.resetToDefaultState();
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Reset to default navigation state
   */
  async resetToDefaultState() {
    try {
      if (!this.navigationRef?.current) {
        throw new Error('Navigation reference not available');
      }

      Logger.info('Resetting to default navigation state');

      // Reset to the default route (Map screen)
      this.navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Map' }],
        })
      );

      // Clear corrupted state
      await this.clearNavigationState();

      Logger.info('Navigation reset to default state');
      return true;
    } catch (error) {
      Logger.error('Failed to reset to default navigation state', error);
      return false;
    }
  }

  /**
   * Clear saved navigation state
   */
  async clearNavigationState() {
    try {
      await AsyncStorage.multiRemove([this.stateKey, this.backupStateKey]);
      this.stateHistory = [];
      Logger.info('Navigation state cleared');
    } catch (error) {
      Logger.error('Failed to clear navigation state', error);
    }
  }

  /**
   * Get navigation state statistics
   */
  getStateStats() {
    return {
      historyCount: this.stateHistory.length,
      isRecovering: this.isRecovering,
      hasNavigationRef: !!this.navigationRef?.current,
      lastSavedTimestamp: this.stateHistory[0]?.timestamp,
    };
  }

  /**
   * Handle navigation state corruption
   */
  async handleStateCorruption(error, currentState) {
    Logger.error('Navigation state corruption detected', {
      error: error.message,
      currentState,
    });

    try {
      // Try to recover from backup
      const backupState = await this.loadBackupState();
      
      if (backupState && this.validateNavigationState(backupState)) {
        Logger.info('Recovering from backup state');
        
        this.navigationRef.current.dispatch(
          CommonActions.reset(backupState)
        );
        
        return true;
      } else {
        // No valid backup, reset to default
        return await this.resetToDefaultState();
      }
    } catch (recoveryError) {
      Logger.error('State corruption recovery failed', recoveryError);
      return await this.resetToDefaultState();
    }
  }

  /**
   * Create navigation state checkpoint
   */
  async createCheckpoint(label = 'manual') {
    try {
      if (!this.navigationRef?.current) {
        return false;
      }

      const currentState = this.navigationRef.current.getRootState();
      
      if (this.validateNavigationState(currentState)) {
        const checkpoint = {
          state: this.cleanNavigationState(currentState),
          timestamp: new Date().toISOString(),
          label,
        };

        await AsyncStorage.setItem(
          `${this.stateKey}_checkpoint_${label}`,
          JSON.stringify(checkpoint)
        );

        Logger.info('Navigation checkpoint created', { label });
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('Failed to create navigation checkpoint', error);
      return false;
    }
  }

  /**
   * Restore from checkpoint
   */
  async restoreFromCheckpoint(label = 'manual') {
    try {
      const checkpointData = await AsyncStorage.getItem(
        `${this.stateKey}_checkpoint_${label}`
      );

      if (!checkpointData) {
        Logger.warn(`No checkpoint found with label: ${label}`);
        return false;
      }

      const checkpoint = JSON.parse(checkpointData);
      
      if (this.validateNavigationState(checkpoint.state)) {
        this.navigationRef.current.dispatch(
          CommonActions.reset(checkpoint.state)
        );
        
        Logger.info('Navigation restored from checkpoint', { 
          label, 
          timestamp: checkpoint.timestamp 
        });
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('Failed to restore from checkpoint', error);
      return false;
    }
  }
}

// Create singleton instance
const navigationStateRecovery = new NavigationStateRecovery();

export default navigationStateRecovery;