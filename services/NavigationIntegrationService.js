/**
 * Navigation Integration Service
 * Manages data flow and navigation between app features
 * Handles journey completion, discovery flows, and cross-feature navigation
 */

class NavigationIntegrationService {
  constructor() {
    this.navigationCallbacks = new Map();
    this.featureStates = new Map();
  }

  /**
   * Register navigation callback for a feature
   * @param {string} feature - Feature name (journey, discovery, savedPlaces)
   * @param {function} callback - Navigation callback function
   */
  registerNavigationCallback(feature, callback) {
    this.navigationCallbacks.set(feature, callback);
    console.log(`Navigation callback registered for ${feature}`);
  }

  /**
   * Unregister navigation callback
   * @param {string} feature - Feature name
   */
  unregisterNavigationCallback(feature) {
    this.navigationCallbacks.delete(feature);
    console.log(`Navigation callback unregistered for ${feature}`);
  }

  /**
   * Handle journey completion navigation
   * @param {Object} journey - Completed journey data
   * @param {Object} navigationContext - Navigation context
   */
  handleJourneyCompleted(journey, navigationContext) {
    console.log('NavigationIntegrationService: Journey completed', {
      journeyId: journey.id,
      journeyName: journey.name,
      distance: journey.distance
    });

    // Update feature state
    this.featureStates.set('lastCompletedJourney', {
      journey,
      completedAt: new Date(),
      context: navigationContext
    });

    // Call navigation callback if registered
    const callback = this.navigationCallbacks.get('journey');
    if (callback) {
      callback(journey, 'completion');
    }

    return {
      success: true,
      action: 'navigate_to_journeys',
      data: journey
    };
  }

  /**
   * Handle discovery made navigation
   * @param {Object} discovery - Discovery data
   * @param {Object} navigationContext - Navigation context
   */
  handleDiscoveryMade(discovery, navigationContext) {
    console.log('NavigationIntegrationService: Discovery made', {
      discoveryType: discovery.type,
      placeName: discovery.name
    });

    // Update feature state
    this.featureStates.set('lastDiscovery', {
      discovery,
      discoveredAt: new Date(),
      context: navigationContext
    });

    // Call navigation callback if registered
    const callback = this.navigationCallbacks.get('discovery');
    if (callback) {
      callback(discovery, 'new_discovery');
    }

    return {
      success: true,
      action: 'navigate_to_discoveries',
      data: discovery
    };
  }

  /**
   * Handle place saved navigation
   * @param {Object} place - Saved place data
   * @param {Object} navigationContext - Navigation context
   */
  handlePlaceSaved(place, navigationContext) {
    console.log('NavigationIntegrationService: Place saved', {
      placeId: place.id,
      placeName: place.name
    });

    // Update feature state
    this.featureStates.set('lastSavedPlace', {
      place,
      savedAt: new Date(),
      context: navigationContext
    });

    // Call navigation callback if registered
    const callback = this.navigationCallbacks.get('savedPlaces');
    if (callback) {
      callback(place, 'place_saved');
    }

    return {
      success: true,
      action: 'navigate_to_saved_places',
      data: place
    };
  }

  /**
   * Get feature state
   * @param {string} feature - Feature name
   * @returns {Object} Feature state
   */
  getFeatureState(feature) {
    return this.featureStates.get(feature) || null;
  }

  /**
   * Clear feature state
   * @param {string} feature - Feature name
   */
  clearFeatureState(feature) {
    this.featureStates.delete(feature);
    console.log(`Feature state cleared for ${feature}`);
  }

  /**
   * Get navigation flow recommendations
   * @param {string} currentScreen - Current screen name
   * @param {Object} context - Current context
   * @returns {Array} Recommended navigation actions
   */
  getNavigationRecommendations(currentScreen, context = {}) {
    const recommendations = [];

    // Check for recent journey completion
    const lastJourney = this.featureStates.get('lastCompletedJourney');
    if (lastJourney && currentScreen === 'Map') {
      recommendations.push({
        type: 'journey_completed',
        action: 'View your completed journey',
        target: 'Journeys',
        data: lastJourney.journey
      });
    }

    // Check for recent discoveries
    const lastDiscovery = this.featureStates.get('lastDiscovery');
    if (lastDiscovery && currentScreen === 'Map') {
      recommendations.push({
        type: 'discovery_made',
        action: 'Explore your discoveries',
        target: 'Discoveries',
        data: lastDiscovery.discovery
      });
    }

    // Check for recent saved places
    const lastSavedPlace = this.featureStates.get('lastSavedPlace');
    if (lastSavedPlace && currentScreen === 'Map') {
      recommendations.push({
        type: 'place_saved',
        action: 'View your saved places',
        target: 'SavedPlaces',
        data: lastSavedPlace.place
      });
    }

    return recommendations;
  }

  /**
   * Reset all navigation state
   */
  reset() {
    this.navigationCallbacks.clear();
    this.featureStates.clear();
    console.log('NavigationIntegrationService: All state reset');
  }
}

// Create singleton instance
const navigationIntegrationService = new NavigationIntegrationService();

export default navigationIntegrationService;