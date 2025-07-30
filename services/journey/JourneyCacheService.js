/**
 * JourneyCacheService - Journey caching utilities
 * 
 * Single Responsibility: Journey data caching (memory and offline)
 * Requirements: 5.3
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JOURNEY_SCHEMA_VERSION } from '../../constants/JourneyModels';

/**
 * JourneyCacheService handles journey data caching
 */
class JourneyCacheService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Memory cache management
   */
  setCacheItem(key, value) {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  getCacheItem(key) {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  clearCacheForUser(userId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  clearAllCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Offline caching support
   */
  async cacheJourneysOffline(userId, journeys) {
    try {
      const cacheKey = `offline_journeys_${userId}`;
      const cacheData = {
        journeys,
        timestamp: Date.now(),
        version: JOURNEY_SCHEMA_VERSION
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached ${journeys.length} journeys offline for user ${userId}`);

    } catch (error) {
      console.error('Failed to cache journeys offline:', error);
    }
  }

  async getCachedJourneysOffline(userId) {
    try {
      const cacheKey = `offline_journeys_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        return null;
      }

      const parsedData = JSON.parse(cachedData);
      
      // Check if cache is still valid (24 hours)
      const cacheAge = Date.now() - parsedData.timestamp;
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > maxCacheAge) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return parsedData.journeys;

    } catch (error) {
      console.error('Failed to get cached journeys:', error);
      return null;
    }
  }

  async clearOfflineCache(userId) {
    try {
      const cacheKey = `offline_journeys_${userId}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`Cleared offline cache for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
    }
  }
}

// Export singleton instance
export default new JourneyCacheService();