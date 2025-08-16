/**
 * Sharing Service
 * Handles content sharing with deep link generation
 */

import { Share, Platform } from 'react-native';
import { generateDeepLink } from '../utils/deepLinkConfig';

class SharingService {
  constructor() {
    this.baseUrl = 'https://herospath.app';
    this.appName = "Hero's Path";
  }

  /**
   * Share a journey with deep link
   * @param {Object} journey - Journey data to share
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  async shareJourney(journey, options = {}) {
    try {
      const { 
        includeStats = true, 
        includeMap = true,
        customMessage = null 
      } = options;

      // Generate deep link
      const deepLink = generateDeepLink(
        'journeys/:journeyId',
        { journeyId: journey.id },
        this.baseUrl
      );

      // Create share content
      const title = `Check out my journey: ${journey.name}`;
      let message = customMessage || `I just completed an amazing journey with ${this.appName}!`;
      
      if (includeStats && journey.stats) {
        message += `\n\n📍 Distance: ${journey.stats.distance}`;
        message += `\n⏱️ Duration: ${journey.stats.duration}`;
        message += `\n🎯 Discoveries: ${journey.stats.discoveries || 0}`;
      }

      message += `\n\n${deepLink}`;

      const shareOptions = {
        title,
        message: Platform.OS === 'ios' ? message : undefined,
        url: Platform.OS === 'ios' ? deepLink : undefined,
        subject: title, // For email sharing
      };

      // Add Android-specific content
      if (Platform.OS === 'android') {
        shareOptions.message = message;
      }

      const result = await Share.share(shareOptions);

      return {
        success: true,
        action: result.action,
        activityType: result.activityType,
        deepLink,
      };
    } catch (error) {
      console.error('Error sharing journey:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Share a place with deep link
   * @param {Object} place - Place data to share
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  async sharePlace(place, options = {}) {
    try {
      const { 
        includeDetails = true,
        customMessage = null 
      } = options;

      // Generate deep link
      const deepLink = generateDeepLink(
        'map/place/:placeId',
        { placeId: place.id },
        this.baseUrl
      );

      // Create share content
      const title = `Check out this place: ${place.name}`;
      let message = customMessage || `I found this interesting place with ${this.appName}!`;
      
      if (includeDetails) {
        message += `\n\n📍 ${place.name}`;
        if (place.address) {
          message += `\n🏠 ${place.address}`;
        }
        if (place.rating) {
          message += `\n⭐ Rating: ${place.rating}/5`;
        }
        if (place.category) {
          message += `\n🏷️ Category: ${place.category}`;
        }
      }

      message += `\n\n${deepLink}`;

      const shareOptions = {
        title,
        message: Platform.OS === 'ios' ? message : undefined,
        url: Platform.OS === 'ios' ? deepLink : undefined,
        subject: title,
      };

      if (Platform.OS === 'android') {
        shareOptions.message = message;
      }

      const result = await Share.share(shareOptions);

      return {
        success: true,
        action: result.action,
        activityType: result.activityType,
        deepLink,
      };
    } catch (error) {
      console.error('Error sharing place:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Share a discovery with deep link
   * @param {Object} discovery - Discovery data to share
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  async shareDiscovery(discovery, options = {}) {
    try {
      const { 
        includeJourney = true,
        customMessage = null 
      } = options;

      // Generate deep link
      const deepLink = generateDeepLink(
        'discoveries/:discoveryId',
        { discoveryId: discovery.id },
        this.baseUrl
      );

      // Create share content
      const title = `Check out my discovery: ${discovery.place.name}`;
      let message = customMessage || `I discovered something amazing during my journey with ${this.appName}!`;
      
      message += `\n\n🎯 ${discovery.place.name}`;
      if (discovery.place.category) {
        message += `\n🏷️ ${discovery.place.category}`;
      }
      
      if (includeJourney && discovery.journey) {
        message += `\n🚶 Found during: ${discovery.journey.name}`;
      }

      if (discovery.notes) {
        message += `\n💭 "${discovery.notes}"`;
      }

      message += `\n\n${deepLink}`;

      const shareOptions = {
        title,
        message: Platform.OS === 'ios' ? message : undefined,
        url: Platform.OS === 'ios' ? deepLink : undefined,
        subject: title,
      };

      if (Platform.OS === 'android') {
        shareOptions.message = message;
      }

      const result = await Share.share(shareOptions);

      return {
        success: true,
        action: result.action,
        activityType: result.activityType,
        deepLink,
      };
    } catch (error) {
      console.error('Error sharing discovery:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Share app invitation
   * @param {Object} options - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  async shareAppInvitation(options = {}) {
    try {
      const { customMessage = null } = options;

      // Generate app link
      const appLink = `${this.baseUrl}/`;

      // Create share content
      const title = `Join me on ${this.appName}!`;
      const message = customMessage || 
        `I've been using ${this.appName} to turn my walks into adventures of discovery! ` +
        `Join me and start exploring interesting places in your area.\n\n${appLink}`;

      const shareOptions = {
        title,
        message: Platform.OS === 'ios' ? message : undefined,
        url: Platform.OS === 'ios' ? appLink : undefined,
        subject: title,
      };

      if (Platform.OS === 'android') {
        shareOptions.message = message;
      }

      const result = await Share.share(shareOptions);

      return {
        success: true,
        action: result.action,
        activityType: result.activityType,
        deepLink: appLink,
      };
    } catch (error) {
      console.error('Error sharing app invitation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a shareable link without opening share dialog
   * @param {string} type - Content type ('journey', 'place', 'discovery')
   * @param {Object} data - Content data
   * @param {Object} options - Generation options
   * @returns {string} Generated shareable link
   */
  generateShareableLink(type, data, options = {}) {
    const { useHttps = true } = options;
    const prefix = useHttps ? this.baseUrl : 'com.liamclarke.herospath://';

    switch (type) {
      case 'journey':
        return generateDeepLink('journeys/:journeyId', { journeyId: data.id }, prefix);
      
      case 'place':
        return generateDeepLink('map/place/:placeId', { placeId: data.id }, prefix);
      
      case 'discovery':
        return generateDeepLink('discoveries/:discoveryId', { discoveryId: data.id }, prefix);
      
      case 'user':
        return generateDeepLink('social/profile/:userId', { userId: data.id }, prefix);
      
      default:
        throw new Error(`Unknown content type for sharing: ${type}`);
    }
  }

  /**
   * Copy link to clipboard
   * @param {string} type - Content type
   * @param {Object} data - Content data
   * @param {Object} options - Copy options
   * @returns {Promise<Object>} Copy result
   */
  async copyLinkToClipboard(type, data, options = {}) {
    try {
      const { Clipboard } = await import('@react-native-clipboard/clipboard');
      const link = this.generateShareableLink(type, data, options);
      
      await Clipboard.setString(link);
      
      return {
        success: true,
        link,
      };
    } catch (error) {
      console.error('Error copying link to clipboard:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get sharing analytics data
   * @param {string} contentType - Type of content shared
   * @param {string} shareMethod - Method used for sharing
   * @returns {Object} Analytics data
   */
  getShareAnalytics(contentType, shareMethod) {
    return {
      event: 'content_shared',
      contentType,
      shareMethod,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
    };
  }
}

// Export singleton instance
export default new SharingService();