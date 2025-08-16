/**
 * Deep Link Service Tests
 * Tests for deep link processing, navigation, and authentication handling
 */

import DeepLinkService from '../services/DeepLinkService';
import { parseDeepLink } from '../utils/deepLinkConfig';

// Mock dependencies
jest.mock('../utils/deepLinkConfig', () => ({
  parseDeepLink: jest.fn(),
  generateDeepLink: jest.fn(),
  getInitialDeepLink: jest.fn(),
  DEEP_LINK_PREFIXES: ['com.liamclarke.herospath://', 'https://herospath.app'],
}));

jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn(),
  },
}));

describe('DeepLinkService', () => {
  let mockNavigationRef;
  let mockUserContext;

  beforeEach(() => {
    // Reset service state
    DeepLinkService.cleanup();
    
    // Mock navigation ref
    mockNavigationRef = {
      current: {
        navigate: jest.fn(),
        getState: jest.fn(() => ({ routes: [] })),
      },
    };

    // Mock user context
    mockUserContext = {
      user: null,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with navigation ref and user context', () => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
      
      expect(DeepLinkService.isInitialized).toBe(true);
      expect(DeepLinkService.navigationRef).toBe(mockNavigationRef);
      expect(DeepLinkService.userContext).toBe(mockUserContext);
    });

    it('should set up deep link listener on initialization', () => {
      const { Linking } = require('react-native');
      
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
      
      expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));
    });
  });

  describe('processDeepLink', () => {
    beforeEach(() => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
    });

    it('should process valid deep links successfully', async () => {
      const mockParseResult = {
        isValid: true,
        screen: 'Map',
        params: {},
        requiresAuth: false,
      };
      
      parseDeepLink.mockReturnValue(mockParseResult);

      const result = await DeepLinkService.processDeepLink('com.liamclarke.herospath://map');

      expect(result.success).toBe(true);
      expect(result.screen).toBe('Map');
      expect(mockNavigationRef.current.navigate).toHaveBeenCalled();
    });

    it('should handle invalid deep links', async () => {
      const mockParseResult = {
        isValid: false,
        error: 'Invalid route',
      };
      
      parseDeepLink.mockReturnValue(mockParseResult);

      const result = await DeepLinkService.processDeepLink('invalid://url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid deep link');
    });

    it('should handle authentication requirements', async () => {
      const mockParseResult = {
        isValid: true,
        screen: 'Journeys',
        params: {},
        requiresAuth: true,
      };
      
      parseDeepLink.mockReturnValue(mockParseResult);
      mockUserContext.user = null; // Not authenticated

      const result = await DeepLinkService.processDeepLink('com.liamclarke.herospath://journeys');

      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
      expect(result.pendingDeepLink).toBeDefined();
    });

    it('should navigate authenticated users to protected routes', async () => {
      const mockParseResult = {
        isValid: true,
        screen: 'Journeys',
        params: {},
        requiresAuth: true,
      };
      
      parseDeepLink.mockReturnValue(mockParseResult);
      mockUserContext.user = { id: 'user123' }; // Authenticated

      const result = await DeepLinkService.processDeepLink('com.liamclarke.herospath://journeys');

      expect(result.success).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Main', {
        screen: 'CoreFeatures',
        params: { screen: 'Journeys' },
      });
    });
  });

  describe('navigateToDeepLink', () => {
    beforeEach(() => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
    });

    it('should navigate to Map screen', async () => {
      const parseResult = {
        screen: 'Map',
        params: {},
      };

      const result = await DeepLinkService.navigateToDeepLink(parseResult);

      expect(result.success).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Main', {
        screen: 'CoreFeatures',
        params: { screen: 'Map' },
      });
    });

    it('should navigate to JourneyDetails with parameters', async () => {
      const parseResult = {
        screen: 'JourneyDetails',
        params: { journeyId: '123' },
      };

      const result = await DeepLinkService.navigateToDeepLink(parseResult);

      expect(result.success).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Main', {
        screen: 'CoreFeatures',
        params: {
          screen: 'Journeys',
          params: {
            screen: 'JourneyDetails',
            params: { journeyId: '123' },
          },
        },
      });
    });

    it('should navigate to Social screens', async () => {
      const parseResult = {
        screen: 'Social',
        params: {},
      };

      const result = await DeepLinkService.navigateToDeepLink(parseResult);

      expect(result.success).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Main', {
        screen: 'Social',
      });
    });

    it('should navigate to Auth screens', async () => {
      const parseResult = {
        screen: 'Login',
        params: {},
      };

      const result = await DeepLinkService.navigateToDeepLink(parseResult);

      expect(result.success).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Auth', {
        screen: 'Login',
      });
    });

    it('should handle unknown screens', async () => {
      const parseResult = {
        screen: 'UnknownScreen',
        params: {},
      };

      const result = await DeepLinkService.navigateToDeepLink(parseResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown screen');
    });

    it('should handle navigation errors', async () => {
      const parseResult = {
        screen: 'Map',
        params: {},
      };

      mockNavigationRef.current.navigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const result = await DeepLinkService.navigateToDeepLink(parseResult);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Navigation failed');
    });
  });

  describe('isUserAuthenticated', () => {
    beforeEach(() => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
    });

    it('should return true when user is authenticated', () => {
      mockUserContext.user = { id: 'user123' };
      
      expect(DeepLinkService.isUserAuthenticated()).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      mockUserContext.user = null;
      
      expect(DeepLinkService.isUserAuthenticated()).toBe(false);
    });
  });

  describe('generateShareableLink', () => {
    it('should generate journey share links', () => {
      const link = DeepLinkService.generateShareableLink('JourneyDetails', { journeyId: '123' });
      
      expect(link).toBeDefined();
      expect(typeof link).toBe('string');
    });

    it('should generate place share links', () => {
      const link = DeepLinkService.generateShareableLink('PlaceDetails', { placeId: 'place123' });
      
      expect(link).toBeDefined();
      expect(typeof link).toBe('string');
    });

    it('should throw error for unknown screens', () => {
      expect(() => {
        DeepLinkService.generateShareableLink('UnknownScreen', {});
      }).toThrow('Cannot generate link for screen');
    });
  });

  describe('processPendingDeepLink', () => {
    beforeEach(() => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
    });

    it('should process valid pending deep links', async () => {
      const pendingDeepLink = {
        screen: 'Journeys',
        params: {},
        timestamp: Date.now(),
      };

      const result = await DeepLinkService.processPendingDeepLink(pendingDeepLink);

      expect(result.success).toBe(true);
    });

    it('should reject expired pending deep links', async () => {
      const pendingDeepLink = {
        screen: 'Journeys',
        params: {},
        timestamp: Date.now() - (15 * 60 * 1000), // 15 minutes ago
      };

      const result = await DeepLinkService.processPendingDeepLink(pendingDeepLink);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should handle missing pending deep links', async () => {
      const result = await DeepLinkService.processPendingDeepLink(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No pending deep link');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
    });

    it('should handle invalid deep link gracefully', async () => {
      const result = await DeepLinkService.handleInvalidDeepLink('invalid://url', 'Invalid format');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid deep link');
      expect(mockNavigationRef.current.navigate).toHaveBeenCalled();
    });

    it('should handle authentication required scenario', () => {
      const parseResult = {
        screen: 'Journeys',
        params: {},
      };

      const result = DeepLinkService.handleAuthenticationRequired(parseResult);

      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
      expect(result.pendingDeepLink).toBeDefined();
    });

    it('should handle navigation errors', () => {
      const parseResult = {
        screen: 'Map',
        params: {},
      };

      const result = DeepLinkService.handleNavigationError(parseResult, 'Navigation failed');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Navigation error');
    });
  });

  describe('cleanup', () => {
    it('should clean up listeners and references', () => {
      DeepLinkService.initialize(mockNavigationRef, mockUserContext);
      
      expect(DeepLinkService.isInitialized).toBe(true);
      
      DeepLinkService.cleanup();
      
      expect(DeepLinkService.isInitialized).toBe(false);
      expect(DeepLinkService.navigationRef).toBe(null);
      expect(DeepLinkService.userContext).toBe(null);
    });
  });
});