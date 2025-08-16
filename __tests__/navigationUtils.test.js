/**
 * Tests for Navigation Utilities
 * Tests navigation utility functions without React Native dependencies
 */

import {
  SCREEN_NAMES,
  STACK_NAMES,
  DEEP_LINK_PATTERNS,
  parseDeepLink,
  generateDeepLink,
  requiresAuthentication,
  getFallbackScreen,
  validateNavigationParams,
  isNavigationAllowed,
} from '../utils/navigationUtils';

describe('Navigation Constants', () => {
  test('should have all required screen names defined', () => {
    expect(SCREEN_NAMES.MAP).toBe('Map');
    expect(SCREEN_NAMES.JOURNEYS).toBe('Journeys');
    expect(SCREEN_NAMES.DISCOVERIES).toBe('Discoveries');
    expect(SCREEN_NAMES.SAVED_PLACES).toBe('SavedPlaces');
    expect(SCREEN_NAMES.SOCIAL).toBe('Social');
    expect(SCREEN_NAMES.SETTINGS).toBe('Settings');
    expect(SCREEN_NAMES.LOGIN).toBe('Login');
    expect(SCREEN_NAMES.SIGNUP).toBe('Signup');
    expect(SCREEN_NAMES.EMAIL_AUTH).toBe('EmailAuth');
  });

  test('should have all required stack names defined', () => {
    expect(STACK_NAMES.AUTH).toBe('Auth');
    expect(STACK_NAMES.MAIN).toBe('Main');
    expect(STACK_NAMES.MAP_STACK).toBe('MapStack');
    expect(STACK_NAMES.JOURNEYS_STACK).toBe('JourneysStack');
    expect(STACK_NAMES.DISCOVERIES_STACK).toBe('DiscoveriesStack');
    expect(STACK_NAMES.SAVED_PLACES_STACK).toBe('SavedPlacesStack');
  });

  test('should have deep link patterns defined', () => {
    expect(DEEP_LINK_PATTERNS.MAP).toBe('/map');
    expect(DEEP_LINK_PATTERNS.JOURNEYS).toBe('/journeys');
    expect(DEEP_LINK_PATTERNS.JOURNEY_DETAIL).toBe('/journeys/:id');
    expect(DEEP_LINK_PATTERNS.DISCOVERIES).toBe('/discoveries');
    expect(DEEP_LINK_PATTERNS.SAVED_PLACES).toBe('/saved-places');
  });
});

describe('parseDeepLink', () => {
  test('should parse basic deep links correctly', () => {
    const testCases = [
      {
        url: 'com.liamclarke.herospath://map',
        expected: { screen: SCREEN_NAMES.MAP, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://journeys',
        expected: { screen: SCREEN_NAMES.JOURNEYS, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://discoveries',
        expected: { screen: SCREEN_NAMES.DISCOVERIES, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://saved-places',
        expected: { screen: SCREEN_NAMES.SAVED_PLACES, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://social',
        expected: { screen: SCREEN_NAMES.SOCIAL, params: {} }
      },
      {
        url: 'com.liamclarke.herospath://settings',
        expected: { screen: SCREEN_NAMES.SETTINGS, params: {} }
      }
    ];

    testCases.forEach(({ url, expected }) => {
      const result = parseDeepLink(url);
      expect(result.screen).toBe(expected.screen);
      expect(result.params).toEqual(expected.params);
    });
  });

  test('should parse deep links with parameters', () => {
    const testCases = [
      {
        url: 'com.liamclarke.herospath://journeys/123',
        expected: { 
          screen: SCREEN_NAMES.JOURNEY_DETAIL, 
          params: { journeyId: '123' } 
        }
      },
      {
        url: 'com.liamclarke.herospath://discoveries/456',
        expected: { 
          screen: SCREEN_NAMES.DISCOVERY_DETAIL, 
          params: { discoveryId: '456' } 
        }
      },
      {
        url: 'com.liamclarke.herospath://places/789',
        expected: { 
          screen: SCREEN_NAMES.PLACE_DETAIL, 
          params: { placeId: '789' } 
        }
      }
    ];

    testCases.forEach(({ url, expected }) => {
      const result = parseDeepLink(url);
      expect(result.screen).toBe(expected.screen);
      expect(result.params).toEqual(expected.params);
    });
  });

  test('should handle invalid deep links gracefully', () => {
    const invalidUrls = [
      'invalid://url',
      'not-a-url',
      '',
      'com.liamclarke.herospath://unknown-screen'
    ];

    invalidUrls.forEach(url => {
      const result = parseDeepLink(url);
      expect(result.screen).toBe(SCREEN_NAMES.MAP); // Should fallback to Map
      expect(result.params).toEqual({});
    });
  });

  test('should handle malformed URLs', () => {
    const malformedUrls = [
      'com.liamclarke.herospath://',
      'com.liamclarke.herospath:///',
      'com.liamclarke.herospath://journeys/',
      'com.liamclarke.herospath://journeys//123'
    ];

    malformedUrls.forEach(url => {
      const result = parseDeepLink(url);
      expect(result).toBeDefined();
      expect(result.screen).toBeDefined();
      expect(result.params).toBeDefined();
    });
  });
});

describe('generateDeepLink', () => {
  test('should generate basic deep links correctly', () => {
    const testCases = [
      {
        screen: SCREEN_NAMES.MAP,
        expected: 'com.liamclarke.herospath://map'
      },
      {
        screen: SCREEN_NAMES.JOURNEYS,
        expected: 'com.liamclarke.herospath://journeys'
      },
      {
        screen: SCREEN_NAMES.DISCOVERIES,
        expected: 'com.liamclarke.herospath://discoveries'
      },
      {
        screen: SCREEN_NAMES.SAVED_PLACES,
        expected: 'com.liamclarke.herospath://saved-places'
      }
    ];

    testCases.forEach(({ screen, expected }) => {
      const result = generateDeepLink(screen);
      expect(result).toBe(expected);
    });
  });

  test('should generate deep links with parameters', () => {
    const testCases = [
      {
        screen: SCREEN_NAMES.JOURNEY_DETAIL,
        params: { journeyId: '123' },
        expected: 'com.liamclarke.herospath://journeys/123'
      },
      {
        screen: SCREEN_NAMES.DISCOVERY_DETAIL,
        params: { discoveryId: '456' },
        expected: 'com.liamclarke.herospath://discoveries/456'
      },
      {
        screen: SCREEN_NAMES.PLACE_DETAIL,
        params: { placeId: '789' },
        expected: 'com.liamclarke.herospath://places/789'
      }
    ];

    testCases.forEach(({ screen, params, expected }) => {
      const result = generateDeepLink(screen, params);
      expect(result).toBe(expected);
    });
  });

  test('should handle unknown screens gracefully', () => {
    const result = generateDeepLink('UnknownScreen');
    expect(result).toBe('com.liamclarke.herospath://map'); // Should fallback to map
  });
});

describe('requiresAuthentication', () => {
  test('should correctly identify public screens', () => {
    const publicScreens = [
      SCREEN_NAMES.LOGIN,
      SCREEN_NAMES.SIGNUP,
      SCREEN_NAMES.EMAIL_AUTH,
      SCREEN_NAMES.MAP
    ];

    publicScreens.forEach(screen => {
      expect(requiresAuthentication(screen)).toBe(false);
    });
  });

  test('should correctly identify protected screens', () => {
    const protectedScreens = [
      SCREEN_NAMES.JOURNEYS,
      SCREEN_NAMES.DISCOVERIES,
      SCREEN_NAMES.SAVED_PLACES,
      SCREEN_NAMES.SOCIAL,
      SCREEN_NAMES.SETTINGS,
      SCREEN_NAMES.PROFILE,
      SCREEN_NAMES.JOURNEY_DETAIL,
      SCREEN_NAMES.DISCOVERY_DETAIL,
      SCREEN_NAMES.PLACE_DETAIL
    ];

    protectedScreens.forEach(screen => {
      expect(requiresAuthentication(screen)).toBe(true);
    });
  });
});

describe('getFallbackScreen', () => {
  test('should return correct fallback for authenticated users', () => {
    const result = getFallbackScreen(true);
    expect(result).toBe(SCREEN_NAMES.MAP);
  });

  test('should return correct fallback for unauthenticated users', () => {
    const result = getFallbackScreen(false);
    expect(result).toBe(SCREEN_NAMES.LOGIN);
  });
});

describe('validateNavigationParams', () => {
  test('should validate parameters for detail screens', () => {
    // Journey detail requires journeyId
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEY_DETAIL, { journeyId: '123' })).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEY_DETAIL, {})).toBe(false);
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEY_DETAIL, null)).toBe(false);

    // Discovery detail requires discoveryId
    expect(validateNavigationParams(SCREEN_NAMES.DISCOVERY_DETAIL, { discoveryId: '456' })).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.DISCOVERY_DETAIL, {})).toBe(false);

    // Place detail requires placeId
    expect(validateNavigationParams(SCREEN_NAMES.PLACE_DETAIL, { placeId: '789' })).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.PLACE_DETAIL, {})).toBe(false);
  });

  test('should validate parameters for screens that do not require specific params', () => {
    const screensWithoutRequiredParams = [
      SCREEN_NAMES.MAP,
      SCREEN_NAMES.JOURNEYS,
      SCREEN_NAMES.DISCOVERIES,
      SCREEN_NAMES.SAVED_PLACES,
      SCREEN_NAMES.SOCIAL,
      SCREEN_NAMES.SETTINGS,
      SCREEN_NAMES.LOGIN,
      SCREEN_NAMES.SIGNUP
    ];

    screensWithoutRequiredParams.forEach(screen => {
      expect(validateNavigationParams(screen, {})).toBe(true);
      expect(validateNavigationParams(screen, null)).toBe(true);
      expect(validateNavigationParams(screen, { anyParam: 'value' })).toBe(true);
    });
  });
});

describe('isNavigationAllowed', () => {
  test('should prevent navigation to protected screens when unauthenticated', () => {
    const protectedScreens = [
      SCREEN_NAMES.JOURNEYS,
      SCREEN_NAMES.DISCOVERIES,
      SCREEN_NAMES.SAVED_PLACES,
      SCREEN_NAMES.SOCIAL
    ];

    protectedScreens.forEach(screen => {
      expect(isNavigationAllowed(SCREEN_NAMES.MAP, screen, false)).toBe(false);
    });
  });

  test('should allow navigation to protected screens when authenticated', () => {
    const protectedScreens = [
      SCREEN_NAMES.JOURNEYS,
      SCREEN_NAMES.DISCOVERIES,
      SCREEN_NAMES.SAVED_PLACES,
      SCREEN_NAMES.SOCIAL
    ];

    protectedScreens.forEach(screen => {
      expect(isNavigationAllowed(SCREEN_NAMES.MAP, screen, true)).toBe(true);
    });
  });

  test('should allow navigation to public screens regardless of auth state', () => {
    const publicScreens = [
      SCREEN_NAMES.MAP,
      SCREEN_NAMES.SIGNUP
    ];

    publicScreens.forEach(screen => {
      expect(isNavigationAllowed(SCREEN_NAMES.LOGIN, screen, false)).toBe(true);
      expect(isNavigationAllowed(SCREEN_NAMES.LOGIN, screen, true)).toBe(true);
    });

    // Test navigation from different starting points
    expect(isNavigationAllowed(SCREEN_NAMES.MAP, SCREEN_NAMES.LOGIN, false)).toBe(true);
    expect(isNavigationAllowed(SCREEN_NAMES.SIGNUP, SCREEN_NAMES.LOGIN, false)).toBe(true);
  });

  test('should prevent navigation to same screen', () => {
    expect(isNavigationAllowed(SCREEN_NAMES.MAP, SCREEN_NAMES.MAP, true)).toBe(false);
    expect(isNavigationAllowed(SCREEN_NAMES.JOURNEYS, SCREEN_NAMES.JOURNEYS, true)).toBe(false);
  });
});

describe('Deep Link Round Trip', () => {
  test('should maintain consistency between parse and generate', () => {
    const testCases = [
      { screen: SCREEN_NAMES.MAP, params: {} },
      { screen: SCREEN_NAMES.JOURNEYS, params: {} },
      { screen: SCREEN_NAMES.JOURNEY_DETAIL, params: { journeyId: '123' } },
      { screen: SCREEN_NAMES.DISCOVERIES, params: {} },
      { screen: SCREEN_NAMES.DISCOVERY_DETAIL, params: { discoveryId: '456' } },
      { screen: SCREEN_NAMES.SAVED_PLACES, params: {} },
      { screen: SCREEN_NAMES.PLACE_DETAIL, params: { placeId: '789' } }
    ];

    testCases.forEach(({ screen, params }) => {
      // Generate deep link
      const deepLink = generateDeepLink(screen, params);
      
      // Parse it back
      const parsed = parseDeepLink(deepLink);
      
      // Should match original
      expect(parsed.screen).toBe(screen);
      expect(parsed.params).toEqual(params);
    });
  });
});