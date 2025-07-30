/**
 * JourneyDiscoveryService - Journey discovery integration
 * 
 * Single Responsibility: Discovery consolidation and journey completion tracking
 * Requirements: 3.3, 3.6, 4.3, 4.4
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { DOCUMENT_PATHS } from '../../constants/FirestoreSchema';

/**
 * JourneyDiscoveryService handles discovery integration with journeys
 */
class JourneyDiscoveryService {
  /**
   * Consolidate journey discoveries - associate discoveries with journey segments
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @param {Array} routeCoords - Route coordinates for discovery matching
   * @returns {Promise<Object>} Consolidation result with discovery associations
   */
  async consolidateJourneyDiscoveries(userId, journeyId, routeCoords) {
    try {
      if (!userId || !journeyId || !routeCoords) {
        throw new Error('User ID, journey ID, and route coordinates are required');
      }

      const consolidationResult = {
        journeyId,
        totalDiscoveries: 0,
        reviewedDiscoveries: 0,
        pendingDiscoveries: 0,
        discoverySegments: [],
        completionPercentage: 0
      };

      // Get existing discovery associations for this journey
      const journeyDiscoveriesCollection = collection(db, DOCUMENT_PATHS.journeyDiscoveries(userId, journeyId));
      const discoveryAssociationsSnapshot = await getDocs(journeyDiscoveriesCollection);

      const existingDiscoveries = [];
      discoveryAssociationsSnapshot.forEach((doc) => {
        const data = doc.data();
        existingDiscoveries.push({
          id: data.discoveryId,
          isReviewed: data.isReviewed || false,
          isSaved: data.isSaved || false,
          associatedAt: data.associatedAt?.toDate(),
          associationIndex: data.associationIndex || 0
        });
      });

      // If no existing discoveries, generate mock data for development
      // TODO: This will be replaced with actual DiscoveriesService integration
      let discoveries = existingDiscoveries;
      if (discoveries.length === 0) {
        const mockDiscoveries = this.generateMockDiscoveries(routeCoords);
        discoveries = mockDiscoveries;

        // Associate mock discoveries with journey for development
        if (mockDiscoveries.length > 0) {
          const mockDiscoveryIds = mockDiscoveries.map(d => d.id);
          await this.associateDiscoveriesWithJourney(userId, journeyId, mockDiscoveryIds);
        }
      }

      // Calculate consolidation metrics
      consolidationResult.totalDiscoveries = discoveries.length;
      consolidationResult.reviewedDiscoveries = discoveries.filter(d => d.isReviewed).length;
      consolidationResult.pendingDiscoveries = discoveries.filter(d => !d.isReviewed).length;
      consolidationResult.completionPercentage = discoveries.length > 0
        ? Math.round((consolidationResult.reviewedDiscoveries / discoveries.length) * 100)
        : 0;

      // Create discovery segments for route visualization
      consolidationResult.discoverySegments = this.createDiscoverySegments(routeCoords, discoveries);

      console.log(`Consolidated ${consolidationResult.totalDiscoveries} discoveries for journey ${journeyId}`);
      return consolidationResult;

    } catch (error) {
      console.error('Failed to consolidate journey discoveries:', error);
      throw new Error(`Failed to consolidate journey discoveries: ${error.message}`);
    }
  }

  /**
   * Associate discoveries with journey
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @param {Array} discoveryIds - Array of discovery IDs to associate
   * @returns {Promise<boolean>} True if association was successful
   */
  async associateDiscoveriesWithJourney(userId, journeyId, discoveryIds) {
    try {
      if (!userId || !journeyId || !Array.isArray(discoveryIds)) {
        throw new Error('User ID, journey ID, and discovery IDs array are required');
      }

      if (discoveryIds.length === 0) {
        console.log('No discoveries to associate with journey');
        return true;
      }

      // Use batch operation for atomic updates
      const batch = writeBatch(db);

      // Update journey document with discovery associations
      const journeyDocRef = doc(db, DOCUMENT_PATHS.userJourney(userId, journeyId));
      batch.update(journeyDocRef, {
        associatedDiscoveries: discoveryIds,
        totalDiscoveriesCount: discoveryIds.length,
        updatedAt: new Date(),
        lastUpdated: new Date().toISOString()
      });

      // Create discovery association documents in subcollection
      const journeyDiscoveriesCollection = collection(db, DOCUMENT_PATHS.journeyDiscoveries(userId, journeyId));

      discoveryIds.forEach((discoveryId, index) => {
        const discoveryAssocDoc = doc(journeyDiscoveriesCollection, discoveryId);
        batch.set(discoveryAssocDoc, {
          discoveryId,
          journeyId,
          associatedAt: new Date(),
          associationIndex: index,
          isReviewed: false,
          isSaved: false
        });
      });

      await batch.commit();

      console.log(`Associated ${discoveryIds.length} discoveries with journey ${journeyId}`);
      return true;

    } catch (error) {
      console.error('Failed to associate discoveries with journey:', error);
      throw new Error(`Failed to associate discoveries with journey: ${error.message}`);
    }
  }

  /**
   * Clean up journey-related discoveries when journey is deleted
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupJourneyDiscoveries(userId, journeyId) {
    try {
      if (!userId || !journeyId) {
        throw new Error('User ID and journey ID are required');
      }

      const cleanupResult = {
        journeyId,
        removedDiscoveries: 0,
        maintainedDiscoveries: 0,
        updatedDiscoveries: 0
      };

      // Get all discovery associations for this journey
      const journeyDiscoveriesCollection = collection(db, DOCUMENT_PATHS.journeyDiscoveries(userId, journeyId));
      const discoveryAssociationsSnapshot = await getDocs(journeyDiscoveriesCollection);

      if (discoveryAssociationsSnapshot.empty) {
        console.log(`No discoveries found for journey ${journeyId}`);
        return cleanupResult;
      }

      // Use batch operation for atomic cleanup
      const batch = writeBatch(db);

      // Process each discovery association
      for (const docSnapshot of discoveryAssociationsSnapshot.docs) {
        const associationData = docSnapshot.data();

        // Requirement 4.3: Remove non-saved discoveries, maintain saved ones
        if (associationData.isSaved) {
          // Keep saved discoveries but remove journey association
          // TODO: When DiscoveriesService is implemented, update the discovery document
          // to remove the journey association while keeping the discovery itself
          cleanupResult.maintainedDiscoveries++;
        } else {
          // Remove non-saved discoveries completely
          // TODO: When DiscoveriesService is implemented, delete the discovery document
          cleanupResult.removedDiscoveries++;
        }

        // Remove the association document
        batch.delete(docSnapshot.ref);
        cleanupResult.updatedDiscoveries++;
      }

      // Commit all cleanup operations
      await batch.commit();

      console.log(`Cleaned up discoveries for deleted journey ${journeyId}:`, cleanupResult);
      return cleanupResult;

    } catch (error) {
      console.error('Failed to cleanup journey discoveries:', error);
      throw new Error(`Failed to cleanup journey discoveries: ${error.message}`);
    }
  }



  /**
   * Update discovery review status
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @param {string} discoveryId - Discovery ID
   * @param {boolean} isReviewed - Review status
   * @param {boolean} isSaved - Save status
   * @returns {Promise<boolean>} True if update was successful
   */
  async updateDiscoveryStatus(userId, journeyId, discoveryId, isReviewed, isSaved = false) {
    try {
      if (!userId || !journeyId || !discoveryId) {
        throw new Error('User ID, journey ID, and discovery ID are required');
      }

      const discoveryAssocDocRef = doc(db, DOCUMENT_PATHS.journeyDiscoveries(userId, journeyId), discoveryId);

      await updateDoc(discoveryAssocDocRef, {
        isReviewed,
        isSaved,
        reviewedAt: isReviewed ? new Date() : null,
        savedAt: isSaved ? new Date() : null
      });

      console.log(`Updated discovery ${discoveryId} status: reviewed=${isReviewed}, saved=${isSaved}`);
      return true;

    } catch (error) {
      console.error('Failed to update discovery status:', error);
      throw new Error(`Failed to update discovery status: ${error.message}`);
    }
  }

  /**
   * Get journey discovery statistics
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Object>} Discovery statistics
   */
  async getJourneyDiscoveryStats(userId, journeyId) {
    try {
      if (!userId || !journeyId) {
        throw new Error('User ID and journey ID are required');
      }

      const journeyDiscoveriesCollection = collection(db, DOCUMENT_PATHS.journeyDiscoveries(userId, journeyId));
      const discoveryAssociationsSnapshot = await getDocs(journeyDiscoveriesCollection);

      const stats = {
        totalDiscoveries: 0,
        reviewedDiscoveries: 0,
        savedDiscoveries: 0,
        pendingDiscoveries: 0,
        completionPercentage: 0,
        lastReviewedAt: null
      };

      let lastReviewedTimestamp = 0;

      discoveryAssociationsSnapshot.forEach((doc) => {
        const data = doc.data();
        stats.totalDiscoveries++;

        if (data.isReviewed) {
          stats.reviewedDiscoveries++;
          const reviewedAt = data.reviewedAt?.toDate();
          if (reviewedAt && reviewedAt.getTime() > lastReviewedTimestamp) {
            lastReviewedTimestamp = reviewedAt.getTime();
            stats.lastReviewedAt = reviewedAt;
          }
        } else {
          stats.pendingDiscoveries++;
        }

        if (data.isSaved) {
          stats.savedDiscoveries++;
        }
      });

      stats.completionPercentage = stats.totalDiscoveries > 0
        ? Math.round((stats.reviewedDiscoveries / stats.totalDiscoveries) * 100)
        : 0;

      return stats;

    } catch (error) {
      console.error('Failed to get journey discovery stats:', error);
      throw new Error(`Failed to get journey discovery stats: ${error.message}`);
    }
  }

  /**
   * Get all discovery associations for a journey
   * @param {string} userId - User ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Array>} Array of discovery associations
   */
  async getJourneyDiscoveryAssociations(userId, journeyId) {
    try {
      if (!userId || !journeyId) {
        throw new Error('User ID and journey ID are required');
      }

      const journeyDiscoveriesCollection = collection(db, DOCUMENT_PATHS.journeyDiscoveries(userId, journeyId));
      const discoveryAssociationsSnapshot = await getDocs(journeyDiscoveriesCollection);

      const associations = [];
      discoveryAssociationsSnapshot.forEach((doc) => {
        const data = doc.data();
        associations.push({
          discoveryId: data.discoveryId,
          journeyId: data.journeyId,
          isReviewed: data.isReviewed || false,
          isSaved: data.isSaved || false,
          associatedAt: data.associatedAt?.toDate(),
          reviewedAt: data.reviewedAt?.toDate(),
          savedAt: data.savedAt?.toDate(),
          associationIndex: data.associationIndex || 0
        });
      });

      // Sort by association index for consistent ordering
      associations.sort((a, b) => a.associationIndex - b.associationIndex);

      return associations;

    } catch (error) {
      console.error('Failed to get journey discovery associations:', error);
      throw new Error(`Failed to get journey discovery associations: ${error.message}`);
    }
  }

  /**
   * Generate mock discoveries for testing (temporary until DiscoveriesService is implemented)
   * @param {Array} routeCoords - Route coordinates
   * @returns {Array} Mock discoveries
   */
  generateMockDiscoveries(routeCoords) {
    if (!routeCoords || routeCoords.length < 2) {
      return [];
    }

    const discoveries = [];
    const discoveryTypes = ['restaurant', 'park', 'landmark', 'shop', 'cafe'];

    // Generate discoveries at roughly every 500 meters along the route
    for (let i = 0; i < routeCoords.length; i += Math.floor(routeCoords.length / 5)) {
      if (i < routeCoords.length) {
        const coord = routeCoords[i];
        discoveries.push({
          id: `mock_discovery_${i}`,
          type: discoveryTypes[i % discoveryTypes.length],
          latitude: coord.latitude,
          longitude: coord.longitude,
          timestamp: coord.timestamp,
          isReviewed: false,
          isSaved: false
        });
      }
    }

    return discoveries;
  }

  /**
   * Create discovery segments from route coordinates and discoveries
   * @param {Array} routeCoords - Route coordinates
   * @param {Array} discoveries - Discoveries to segment
   * @returns {Array} Discovery segments
   */
  createDiscoverySegments(routeCoords, discoveries) {
    if (!routeCoords || !discoveries || routeCoords.length < 2) {
      return [];
    }

    const segments = [];
    const segmentSize = Math.max(1, Math.floor(routeCoords.length / 10)); // 10 segments max

    for (let i = 0; i < routeCoords.length - segmentSize; i += segmentSize) {
      const segmentStart = routeCoords[i];
      const segmentEnd = routeCoords[Math.min(i + segmentSize, routeCoords.length - 1)];

      // Find discoveries within this segment
      const segmentDiscoveries = discoveries.filter(discovery => {
        const discoveryIndex = routeCoords.findIndex(coord =>
          Math.abs(coord.latitude - discovery.latitude) < 0.001 &&
          Math.abs(coord.longitude - discovery.longitude) < 0.001
        );
        return discoveryIndex >= i && discoveryIndex < i + segmentSize;
      });

      segments.push({
        start: segmentStart,
        end: segmentEnd,
        timestamp: segmentStart.timestamp,
        metadata: {
          discoveries: segmentDiscoveries.map(d => d.id),
          discoveryCount: segmentDiscoveries.length,
          segmentIndex: segments.length
        }
      });
    }

    return segments;
  }
}

// Export singleton instance
export default new JourneyDiscoveryService();