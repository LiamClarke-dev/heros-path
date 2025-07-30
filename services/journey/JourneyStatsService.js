/**
 * JourneyStatsService - Journey statistics and calculations
 * 
 * Single Responsibility: Journey statistics calculation and distance utilities
 * Requirements: 1.3, 2.2, 5.3
 */

/**
 * JourneyStatsService handles journey statistics and calculations
 */
class JourneyStatsService {

  /**
   * Calculate comprehensive journey statistics
   * @param {Array} journeys - Array of journey objects
   * @returns {Object} Calculated statistics
   */
  calculateJourneyStatistics(journeys) {
    if (!journeys || journeys.length === 0) {
      return this.getEmptyStats();
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    let totalDistance = 0;
    let totalDuration = 0;
    let totalDiscoveries = 0;
    let completedJourneys = 0;
    let inProgressJourneys = 0;
    let longestJourney = null;
    let shortestJourney = null;
    let mostRecentJourney = null;

    const journeyFrequency = { thisWeek: 0, thisMonth: 0, thisYear: 0 };
    const distanceBreakdown = { short: 0, medium: 0, long: 0, ultraLong: 0 };

    journeys.forEach(journey => {
      // Basic totals
      totalDistance += journey.distance || 0;
      totalDuration += journey.duration || 0;
      totalDiscoveries += journey.totalDiscoveriesCount || 0;

      // Status counts
      if (journey.status === 'completed') {
        completedJourneys++;
      } else if (journey.status === 'in_progress') {
        inProgressJourneys++;
      }

      // Distance breakdown (convert to km for categorization)
      const distanceKm = (journey.distance || 0) / 1000;
      if (distanceKm < 1) {
        distanceBreakdown.short++;
      } else if (distanceKm < 5) {
        distanceBreakdown.medium++;
      } else if (distanceKm < 10) {
        distanceBreakdown.long++;
      } else {
        distanceBreakdown.ultraLong++;
      }

      // Longest and shortest journeys
      if (!longestJourney || (journey.distance || 0) > (longestJourney.distance || 0)) {
        longestJourney = journey;
      }
      if (!shortestJourney || (journey.distance || 0) < (shortestJourney.distance || 0)) {
        shortestJourney = journey;
      }

      // Most recent journey
      if (!mostRecentJourney || journey.createdAt > mostRecentJourney.createdAt) {
        mostRecentJourney = journey;
      }

      // Journey frequency
      const journeyDate = journey.createdAt;
      if (journeyDate >= oneWeekAgo) {
        journeyFrequency.thisWeek++;
      }
      if (journeyDate >= oneMonthAgo) {
        journeyFrequency.thisMonth++;
      }
      if (journeyDate >= oneYearAgo) {
        journeyFrequency.thisYear++;
      }
    });

    // Calculate averages
    const totalJourneys = journeys.length;
    const averageDistance = totalJourneys > 0 ? totalDistance / totalJourneys : 0;
    const averageDuration = totalJourneys > 0 ? totalDuration / totalJourneys : 0;
    const averageSpeed = totalDuration > 0 ? (totalDistance / (totalDuration / 1000)) : 0; // m/s
    const averageDiscoveriesPerJourney = totalJourneys > 0 ? totalDiscoveries / totalJourneys : 0;

    return {
      totalJourneys,
      totalDistance: Math.round(totalDistance),
      totalDuration,
      averageDistance: Math.round(averageDistance),
      averageDuration: Math.round(averageDuration),
      longestJourney,
      shortestJourney,
      mostRecentJourney,
      completedJourneys,
      inProgressJourneys,
      averageSpeed: Math.round(averageSpeed * 100) / 100, // Round to 2 decimal places
      totalDiscoveries,
      averageDiscoveriesPerJourney: Math.round(averageDiscoveriesPerJourney * 100) / 100,
      journeyFrequency,
      distanceBreakdown
    };
  }

  /**
   * Get empty statistics structure
   * @returns {Object} Empty statistics
   */
  getEmptyStats() {
    return {
      totalJourneys: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageDistance: 0,
      averageDuration: 0,
      longestJourney: null,
      shortestJourney: null,
      mostRecentJourney: null,
      completedJourneys: 0,
      inProgressJourneys: 0,
      averageSpeed: 0,
      totalDiscoveries: 0,
      averageDiscoveriesPerJourney: 0,
      journeyFrequency: {
        thisWeek: 0,
        thisMonth: 0,
        thisYear: 0
      },
      distanceBreakdown: {
        short: 0,    // < 1km
        medium: 0,   // 1-5km
        long: 0,     // 5-10km
        ultraLong: 0 // > 10km
      }
    };
  }

  /**
   * Calculate distance from coordinates array
   * @param {Array} coordinates - Array of coordinate objects
   * @returns {number} Distance in meters
   */
  calculateDistance(coordinates) {
    if (!coordinates || coordinates.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      totalDistance += this.haversineDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }

    return Math.round(totalDistance);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} Distance in meters
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }


}

// Export singleton instance
export default new JourneyStatsService();