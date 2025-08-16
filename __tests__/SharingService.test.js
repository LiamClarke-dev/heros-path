/**
 * Sharing Service Tests
 * Tests for content sharing with deep link generation
 */

import SharingService from '../services/SharingService';
import { Share, Platform } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('../utils/deepLinkConfig', () => ({
  generateDeepLink: jest.fn((route, params, prefix) => {
    return `${prefix}${route.replace(':journeyId', params.journeyId || 'test-id')}`;
  }),
}));

describe('SharingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  describe('shareJourney', () => {
    const mockJourney = {
      id: 'journey123',
      name: 'Morning Walk',
      stats: {
        distance: '2.5 km',
        duration: '45 min',
        discoveries: 3,
      },
    };

    it('should share journey with default options', async () => {
      Share.share.mockResolvedValue({
        action: Share.sharedAction,
        activityType: 'com.apple.UIKit.activity.Message',
      });

      const result = await SharingService.shareJourney(mockJourney);

      expect(result.success).toBe(true);
      expect(result.action).toBe(Share.sharedAction);
      expect(result.deepLink).toBeDefined();
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Check out my journey: Morning Walk',
          message: expect.stringContaining("Hero's Path"),
          url: expect.stringContaining('journey123'),
        })
      );
    });

    it('should include stats when includeStats is true', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.shareJourney(mockJourney, { includeStats: true });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Distance: 2\.5 km.*Duration: 45 min.*Discoveries: 3/s),
        })
      );
    });

    it('should exclude stats when includeStats is false', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.shareJourney(mockJourney, { includeStats: false });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.not.stringMatching(/Distance:|Duration:|Discoveries:/),
        })
      );
    });

    it('should use custom message when provided', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });
      const customMessage = 'Check out this amazing journey!';

      await SharingService.shareJourney(mockJourney, { customMessage });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(customMessage),
        })
      );
    });

    it('should handle Android platform differently', async () => {
      Platform.OS = 'android';
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.shareJourney(mockJourney);

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Hero's Path"),
          url: undefined, // Android doesn't use separate URL field
        })
      );
    });

    it('should handle sharing errors', async () => {
      Share.share.mockRejectedValue(new Error('Sharing failed'));

      const result = await SharingService.shareJourney(mockJourney);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sharing failed');
    });
  });

  describe('sharePlace', () => {
    const mockPlace = {
      id: 'place123',
      name: 'Central Park',
      address: '123 Park Ave, New York, NY',
      rating: 4.5,
      category: 'Park',
    };

    it('should share place with default options', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      const result = await SharingService.sharePlace(mockPlace);

      expect(result.success).toBe(true);
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Check out this place: Central Park',
          message: expect.stringContaining('Central Park'),
        })
      );
    });

    it('should include place details when includeDetails is true', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.sharePlace(mockPlace, { includeDetails: true });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Central Park.*123 Park Ave.*Rating: 4\.5.*Category: Park/s),
        })
      );
    });

    it('should exclude details when includeDetails is false', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.sharePlace(mockPlace, { includeDetails: false });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.not.stringMatching(/123 Park Ave|Rating:|Category:/),
        })
      );
    });
  });

  describe('shareDiscovery', () => {
    const mockDiscovery = {
      id: 'discovery123',
      place: {
        name: 'Hidden Cafe',
        category: 'Restaurant',
      },
      journey: {
        name: 'Morning Walk',
      },
      notes: 'Amazing coffee!',
    };

    it('should share discovery with default options', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      const result = await SharingService.shareDiscovery(mockDiscovery);

      expect(result.success).toBe(true);
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Check out my discovery: Hidden Cafe',
          message: expect.stringContaining('Hidden Cafe'),
        })
      );
    });

    it('should include journey info when includeJourney is true', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.shareDiscovery(mockDiscovery, { includeJourney: true });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Found during: Morning Walk'),
        })
      );
    });

    it('should include notes when present', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      await SharingService.shareDiscovery(mockDiscovery);

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('"Amazing coffee!"'),
        })
      );
    });
  });

  describe('shareAppInvitation', () => {
    it('should share app invitation with default message', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });

      const result = await SharingService.shareAppInvitation();

      expect(result.success).toBe(true);
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Join me on Hero's Path!",
          message: expect.stringContaining("Hero's Path"),
        })
      );
    });

    it('should use custom message when provided', async () => {
      Share.share.mockResolvedValue({ action: Share.sharedAction });
      const customMessage = 'Try this awesome app!';

      await SharingService.shareAppInvitation({ customMessage });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(customMessage),
        })
      );
    });
  });

  describe('generateShareableLink', () => {
    it('should generate journey links', () => {
      const link = SharingService.generateShareableLink('journey', { id: 'journey123' });
      
      expect(link).toContain('journey123');
      expect(typeof link).toBe('string');
    });

    it('should generate place links', () => {
      const link = SharingService.generateShareableLink('place', { id: 'place123' });
      
      expect(link).toContain('place123');
      expect(typeof link).toBe('string');
    });

    it('should generate discovery links', () => {
      const link = SharingService.generateShareableLink('discovery', { id: 'discovery123' });
      
      expect(link).toContain('discovery123');
      expect(typeof link).toBe('string');
    });

    it('should generate user profile links', () => {
      const link = SharingService.generateShareableLink('user', { id: 'user123' });
      
      expect(link).toContain('user123');
      expect(typeof link).toBe('string');
    });

    it('should throw error for unknown content types', () => {
      expect(() => {
        SharingService.generateShareableLink('unknown', { id: 'test' });
      }).toThrow('Unknown content type for sharing: unknown');
    });

    it('should use custom scheme when useHttps is false', () => {
      const link = SharingService.generateShareableLink('journey', { id: 'test' }, { useHttps: false });
      
      expect(link).toContain('com.liamclarke.herospath://');
    });
  });

  describe('copyLinkToClipboard', () => {
    it('should copy link to clipboard successfully', async () => {
      const mockClipboard = {
        setString: jest.fn().mockResolvedValue(),
      };
      
      // Mock dynamic import
      jest.doMock('@react-native-clipboard/clipboard', () => ({
        Clipboard: mockClipboard,
      }));

      const result = await SharingService.copyLinkToClipboard('journey', { id: 'test123' });

      expect(result.success).toBe(true);
      expect(result.link).toBeDefined();
    });

    it('should handle clipboard errors', async () => {
      // Mock dynamic import to throw error
      jest.doMock('@react-native-clipboard/clipboard', () => {
        throw new Error('Clipboard not available');
      });

      const result = await SharingService.copyLinkToClipboard('journey', { id: 'test123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clipboard not available');
    });
  });

  describe('getShareAnalytics', () => {
    it('should return analytics data', () => {
      const analytics = SharingService.getShareAnalytics('journey', 'native_share');

      expect(analytics).toEqual({
        event: 'content_shared',
        contentType: 'journey',
        shareMethod: 'native_share',
        timestamp: expect.any(String),
        platform: Platform.OS,
      });
    });

    it('should include current timestamp', () => {
      const before = new Date().toISOString();
      const analytics = SharingService.getShareAnalytics('place', 'copy_link');
      const after = new Date().toISOString();

      expect(analytics.timestamp).toBeGreaterThanOrEqual(before);
      expect(analytics.timestamp).toBeLessThanOrEqual(after);
    });
  });
});