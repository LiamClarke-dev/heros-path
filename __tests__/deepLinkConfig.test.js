/**
 * Deep Link Configuration Tests
 * Tests for deep link parsing, validation, and URL generation
 */

// Mock React Native Linking module
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    getInitialURL: jest.fn(),
  },
}));

import {
  parseDeepLink,
  generateDeepLink,
  DEEP_LINK_PREFIXES,
  ROUTE_DEFINITIONS,
} from '../utils/deepLinkConfig';

describe('Deep Link Configuration', () => {
  describe('parseDeepLink', () => {
    it('should parse valid deep links correctly', () => {
      const testCases = [
        {
          url: 'com.liamclarke.herospath://map',
          expected: {
            isValid: true,
            path: 'map',
            screen: 'Map',
            params: {},
            requiresAuth: false,
          },
        },
        {
          url: 'com.liamclarke.herospath://journeys/123',
          expected: {
            isValid: true,
            path: 'journeys/123',
            screen: 'JourneyDetails',
            params: { journeyId: '123' },
            requiresAuth: true,
          },
        },
        {
          url: 'https://herospath.app/discoveries/abc-def',
          expected: {
            isValid: true,
            path: 'discoveries/abc-def',
            screen: 'DiscoveryDetails',
            params: { discoveryId: 'abc-def' },
            requiresAuth: true,
          },
        },
        {
          url: 'com.liamclarke.herospath://social/share/journey-456',
          expected: {
            isValid: true,
            path: 'social/share/journey-456',
            screen: 'ShareJourney',
            params: { journeyId: 'journey-456' },
            requiresAuth: true,
          },
        },
      ];

      testCases.forEach(({ url, expected }) => {
        const result = parseDeepLink(url);
        expect(result.isValid).toBe(expected.isValid);
        expect(result.screen).toBe(expected.screen);
        expect(result.params).toEqual(expected.params);
        expect(result.requiresAuth).toBe(expected.requiresAuth);
      });
    });

    it('should handle invalid deep links', () => {
      const invalidUrls = [
        'com.liamclarke.herospath://invalid-route',
        'com.liamclarke.herospath://journeys/',
        'com.liamclarke.herospath://journeys/invalid@id',
        'https://herospath.app/nonexistent',
        'invalid://url',
      ];

      invalidUrls.forEach(url => {
        const result = parseDeepLink(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should validate parameters correctly', () => {
      // Valid parameter
      const validResult = parseDeepLink('com.liamclarke.herospath://journeys/valid-id-123');
      expect(validResult.isValid).toBe(true);
      expect(validResult.params.journeyId).toBe('valid-id-123');

      // Invalid parameter (contains special characters)
      const invalidResult = parseDeepLink('com.liamclarke.herospath://journeys/invalid@id#123');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('Invalid parameter value');
    });

    it('should handle URL encoding in parameters', () => {
      const encodedUrl = 'com.liamclarke.herospath://journeys/test%2Did';
      const result = parseDeepLink(encodedUrl);
      expect(result.isValid).toBe(true);
      expect(result.params.journeyId).toBe('test-id');
    });

    it('should handle different URL prefixes', () => {
      const prefixes = [
        'com.liamclarke.herospath://',
        'https://herospath.app',
        'https://www.herospath.app',
      ];

      prefixes.forEach(prefix => {
        const url = `${prefix}/map`;
        const result = parseDeepLink(url);
        expect(result.isValid).toBe(true);
        expect(result.screen).toBe('Map');
      });
    });
  });

  describe('generateDeepLink', () => {
    it('should generate valid deep links', () => {
      const testCases = [
        {
          route: 'map',
          params: {},
          expected: 'com.liamclarke.herospath://map',
        },
        {
          route: 'journeys/:journeyId',
          params: { journeyId: '123' },
          expected: 'com.liamclarke.herospath://journeys/123',
        },
        {
          route: 'social/share/:journeyId',
          params: { journeyId: 'test-journey' },
          expected: 'com.liamclarke.herospath://social/share/test-journey',
        },
      ];

      testCases.forEach(({ route, params, expected }) => {
        const result = generateDeepLink(route, params);
        expect(result).toBe(expected);
      });
    });

    it('should handle URL encoding in parameters', () => {
      const result = generateDeepLink('journeys/:journeyId', { journeyId: 'test id with spaces' });
      expect(result).toBe('com.liamclarke.herospath://journeys/test%20id%20with%20spaces');
    });

    it('should use custom prefixes', () => {
      const result = generateDeepLink(
        'map',
        {},
        'https://herospath.app'
      );
      expect(result).toBe('https://herospath.app/map');
    });
  });

  describe('ROUTE_DEFINITIONS', () => {
    it('should have valid route definitions', () => {
      Object.entries(ROUTE_DEFINITIONS).forEach(([route, definition]) => {
        expect(definition).toHaveProperty('screen');
        expect(definition).toHaveProperty('requiresAuth');
        expect(definition).toHaveProperty('params');
        expect(Array.isArray(definition.params)).toBe(true);

        if (definition.validation) {
          expect(typeof definition.validation).toBe('object');
          
          // Check that all validation functions are actually functions
          Object.values(definition.validation).forEach(validator => {
            expect(typeof validator).toBe('function');
          });
        }
      });
    });

    it('should have consistent parameter definitions', () => {
      Object.entries(ROUTE_DEFINITIONS).forEach(([route, definition]) => {
        const routeParams = route.match(/:([^/]+)/g)?.map(param => param.slice(1)) || [];
        
        // All route parameters should be in the params array
        routeParams.forEach(param => {
          expect(definition.params).toContain(param);
        });

        // All validation keys should correspond to route parameters
        if (definition.validation) {
          Object.keys(definition.validation).forEach(validationKey => {
            expect(routeParams).toContain(validationKey);
          });
        }
      });
    });
  });

  describe('DEEP_LINK_PREFIXES', () => {
    it('should contain valid URL prefixes', () => {
      expect(Array.isArray(DEEP_LINK_PREFIXES)).toBe(true);
      expect(DEEP_LINK_PREFIXES.length).toBeGreaterThan(0);

      DEEP_LINK_PREFIXES.forEach(prefix => {
        expect(typeof prefix).toBe('string');
        expect(prefix.length).toBeGreaterThan(0);
      });
    });

    it('should include the custom scheme', () => {
      expect(DEEP_LINK_PREFIXES).toContain('com.liamclarke.herospath://');
    });

    it('should include HTTPS URLs', () => {
      const httpsUrls = DEEP_LINK_PREFIXES.filter(prefix => prefix.startsWith('https://'));
      expect(httpsUrls.length).toBeGreaterThan(0);
    });
  });

  describe('Parameter validation', () => {
    it('should validate journey IDs correctly', () => {
      const validator = ROUTE_DEFINITIONS['journeys/:journeyId'].validation.journeyId;
      
      // Valid IDs
      expect(validator('valid-id-123')).toBe(true);
      expect(validator('abc_def')).toBe(true);
      expect(validator('123')).toBe(true);

      // Invalid IDs
      expect(validator('invalid@id')).toBe(false);
      expect(validator('invalid#id')).toBe(false);
      expect(validator('invalid id')).toBe(false);
      expect(validator('')).toBe(false);
    });

    it('should validate place IDs correctly', () => {
      const validator = ROUTE_DEFINITIONS['map/place/:placeId'].validation.placeId;
      
      // Valid IDs
      expect(validator('place-123')).toBe(true);
      expect(validator('abc_def_ghi')).toBe(true);

      // Invalid IDs
      expect(validator('invalid@place')).toBe(false);
      expect(validator('invalid place')).toBe(false);
    });

    it('should validate user IDs correctly', () => {
      const validator = ROUTE_DEFINITIONS['social/profile/:userId'].validation.userId;
      
      // Valid IDs
      expect(validator('user-123')).toBe(true);
      expect(validator('abc123')).toBe(true);

      // Invalid IDs
      expect(validator('invalid@user')).toBe(false);
      expect(validator('invalid user')).toBe(false);
    });
  });
});