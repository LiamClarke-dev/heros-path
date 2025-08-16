/**
 * Unit Tests for Navigation Utilities
 * Tests deep link parsing, navigation validation, and utility functions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
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
  getScreenOptions,
  isNavigationAllowed,
} from '../utils/navigationUtils';

describe('Navigation Constants', () => {
  describe('SCREEN_NAMES', () => {
    test('should have all required screen names', () => {
      expect(SCREEN_NAMES.LOGIN).toBe('Login');
      expect(SCREEN_NAMES.SIGNUP).toBe('Signup');
      expect(SCREEN_NAMES.EMAIL_AUTH).toBe('EmailAuth');
      expect(SCREEN_NAMES.MAP).toBe('Map');
      expect(SCREEN_NAMES.JOURNEYS).toBe('Journeys');
      expect(SCREEN_NAMES.DISCOVERIES).toBe('Discoveries');
      expect(SCREEN_NAMES.SAVED_PLACES).toBe('SavedPlaces');
      expect(SCREEN_NAMES.SOCIAL).toBe('Social');
      expect(SCREEN_NAMES.SETTINGS).toBe('Settings');
      expect(SCREEN_NAMES.JOURNEY_DETAIL).toBe('JourneyDetail');
      expect(SCREEN_NAMES.DISCOVERY_DETAIL).toBe('DiscoveryDetail');
      expect(SCREEN_NAMES.PLACE_DETAIL).toBe('PlaceDetail');
      expect(SCREEN_NAMES.PROFILE).toBe('Profile');
      expect(SCREEN_NAMES.DISCOVERY_PREFERENCES).toBe('DiscoveryPreferences');
      expect(SCREEN_NAMES.PAST_JOURNEYS).toBe('PastJourneys');
    });
  });

  describe('STACK_NAMES', () => {
    test('should have all required stack names', () => {
      expect(STACK_NAMES.AUTH).toBe('Auth');
      expect(STACK_NAMES.MAIN).toBe('Main');
      expect(STACK_NAMES.MAP_STACK).toBe('MapStack');
      expect(STACK_NAMES.JOURNEYS_STACK).toBe('JourneysStack');
      expect(STACK_NAMES.DISCOVERIES_STACK).toBe('DiscoveriesStack');
      expect(STACK_NAMES.SAVED_PLACES_STACK).toBe('SavedPlacesStack');
      expect(STACK_NAMES.SOCIAL_STACK).toBe('SocialStack');
      expect(STACK_NAMES.SETTINGS_STACK).toBe('SettingsStack');
    });
  });

  describe('DEEP_LINK_PATTERNS', () => {
    test('should have all required deep link patterns', () => {
      expect(DEEP_LINK_PATTERNS.MAP).toBe('/map');
      expect(DEEP_LINK_PATTERNS.JOURNEYS).toBe('/journeys');
      expect(DEEP_LINK_PATTERNS.JOURNEY_DETAIL).toBe('/journeys/:id');
      expect(DEEP_LINK_PATTERNS.DISCOVERIES).toBe('/discoveries');
      expect(DEEP_LINK_PATTERNS.DISCOVERY_DETAIL).toBe('/discoveries/:id');
      expect(DEEP_LINK_PATTERNS.SAVED_PLACES).toBe('/saved-places');
      expect(DEEP_LINK_PATTERNS.PLACE_DETAIL).toBe('/places/:id');
      expect(DEEP_LINK_PATTERNS.SOCIAL).toBe('/social');
      expect(DEEP_LINK_PATTERNS.SETTINGS).toBe('/settings');
      expect(DEEP_LINK_PATTERNS.PROFILE).toBe('/profile');
    });
  });
});

describe('parseDeepLink', () => {
  describe('Custom Scheme URLs', () => {
    test('should parse map deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://map');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });

    test('should parse journeys deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://journeys');
      expect(result.screen).toBe(SCREEN_NAMES.JOURNEYS);
      expect(result.params).toEqual({});
    });

    test('should parse journey detail deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://journeys/123');
      expect(result.screen).toBe(SCREEN_NAMES.JOURNEY_DETAIL);
      expect(result.params).toEqual({ journeyId: '123' });
    });

    test('should parse discoveries deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://discoveries');
      expect(result.screen).toBe(SCREEN_NAMES.DISCOVERIES);
      expect(result.params).toEqual({});
    });

    test('should parse discovery detail deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://discoveries/456');
      expect(result.screen).toBe(SCREEN_NAMES.DISCOVERY_DETAIL);
      expect(result.params).toEqual({ discoveryId: '456' });
    });

    test('should parse saved places deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://saved-places');
      expect(result.screen).toBe(SCREEN_NAMES.SAVED_PLACES);
      expect(result.params).toEqual({});
    });

    test('should parse place detail deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://places/789');
      expect(result.screen).toBe(SCREEN_NAMES.PLACE_DETAIL);
      expect(result.params).toEqual({ placeId: '789' });
    });

    test('should parse social deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://social');
      expect(result.screen).toBe(SCREEN_NAMES.SOCIAL);
      expect(result.params).toEqual({});
    });

    test('should parse settings deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://settings');
      expect(result.screen).toBe(SCREEN_NAMES.SETTINGS);
      expect(result.params).toEqual({});
    });

    test('should parse profile deep link', () => {
      const result = parseDeepLink('com.liamclarke.herospath://profile');
      expect(result.screen).toBe(SCREEN_NAMES.PROFILE);
      expect(result.params).toEqual({});
    });
  });

  describe('Query Parameters', () => {
    test('should parse query parameters', () => {
      const result = parseDeepLink('com.liamclarke.herospath://map?lat=37.7749&lng=-122.4194');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({
        lat: '37.7749',
        lng: '-122.4194',
      });
    });

    test('should parse complex query parameters', () => {
      const result = parseDeepLink('com.liamclarke.herospath://journeys/123?share=true&from=social');
      expect(result.screen).toBe(SCREEN_NAMES.JOURNEY_DETAIL);
      expect(result.params).toEqual({
        journeyId: '123',
        share: 'true',
        from: 'social',
      });
    });
  });

  describe('Path Variations', () => {
    test('should handle paths without leading slash', () => {
      const result = parseDeepLink('com.liamclarke.herospath://map');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
    });

    test('should handle paths with leading slash', () => {
      // This tests the regular URL parsing path
      const result = parseDeepLink('https://herospath.app/map');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
    });
  });

  describe('Error Handling', () => {
    test('should handle null URL', () => {
      const result = parseDeepLink(null);
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });

    test('should handle undefined URL', () => {
      const result = parseDeepLink(undefined);
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });

    test('should handle empty string', () => {
      const result = parseDeepLink('');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });

    test('should handle non-string input', () => {
      const result = parseDeepLink(123);
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });

    test('should handle unknown paths', () => {
      const result = parseDeepLink('com.liamclarke.herospath://unknown-path');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });

    test('should handle malformed URLs', () => {
      const result = parseDeepLink('not-a-valid-url');
      expect(result.screen).toBe(SCREEN_NAMES.MAP);
      expect(result.params).toEqual({});
    });
  });
});

describe('generateDeepLink', () => {
  test('should generate map deep link', () => {
    const result = generateDeepLink(SCREEN_NAMES.MAP);
    expect(result).toBe('com.liamclarke.herospath://map');
  });

  test('should generate journeys deep link', () => {
    const result = generateDeepLink(SCREEN_NAMES.JOURNEYS);
    expect(result).toBe('com.liamclarke.herospath://journeys');
  });

  test('should generate journey detail deep link', () => {
    const result = generateDeepLink(SCREEN_NAMES.JOURNEY_DETAIL, { journeyId: '123' });
    expect(result).toBe('com.liamclarke.herospath://journeys/123');
  });

  test('should generate discovery detail deep link', () => {
    const result = generateDeepLink(SCREEN_NAMES.DISCOVERY_DETAIL, { discoveryId: '456' });
    expect(result).toBe('com.liamclarke.herospath://discoveries/456');
  });

  test('should generate place detail deep link', () => {
    const result = generateDeepLink(SCREEN_NAMES.PLACE_DETAIL, { placeId: '789' });
    expect(result).toBe('com.liamclarke.herospath://places/789');
  });

  test('should handle missing parameters', () => {
    const result = generateDeepLink(SCREEN_NAMES.JOURNEY_DETAIL);
    expect(result).toBe('com.liamclarke.herospath://journeys/');
  });

  test('should handle unknown screen names', () => {
    const result = generateDeepLink('UnknownScreen');
    expect(result).toBe('com.liamclarke.herospath://map');
  });

  test('should handle empty parameters', () => {
    const result = generateDeepLink(SCREEN_NAMES.MAP, {});
    expect(result).toBe('com.liamclarke.herospath://map');
  });
});

describe('requiresAuthentication', () => {
  test('should return false for public screens', () => {
    expect(requiresAuthentication(SCREEN_NAMES.LOGIN)).toBe(false);
    expect(requiresAuthentication(SCREEN_NAMES.SIGNUP)).toBe(false);
    expect(requiresAuthentication(SCREEN_NAMES.EMAIL_AUTH)).toBe(false);
    expect(requiresAuthentication(SCREEN_NAMES.MAP)).toBe(false);
  });

  test('should return true for protected screens', () => {
    expect(requiresAuthentication(SCREEN_NAMES.JOURNEYS)).toBe(true);
    expect(requiresAuthentication(SCREEN_NAMES.DISCOVERIES)).toBe(true);
    expect(requiresAuthentication(SCREEN_NAMES.SAVED_PLACES)).toBe(true);
    expect(requiresAuthentication(SCREEN_NAMES.SOCIAL)).toBe(true);
    expect(requiresAuthentication(SCREEN_NAMES.SETTINGS)).toBe(true);
    expect(requiresAuthentication(SCREEN_NAMES.PROFILE)).toBe(true);
  });

  test('should handle unknown screens', () => {
    expect(requiresAuthentication('UnknownScreen')).toBe(true);
  });
});

describe('getFallbackScreen', () => {
  test('should return Map for authenticated users', () => {
    const result = getFallbackScreen(true);
    expect(result).toBe(SCREEN_NAMES.MAP);
  });

  test('should return Login for unauthenticated users', () => {
    const result = getFallbackScreen(false);
    expect(result).toBe(SCREEN_NAMES.LOGIN);
  });
});

describe('validateNavigationParams', () => {
  test('should validate journey detail params', () => {
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEY_DETAIL, { journeyId: '123' })).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEY_DETAIL, {})).toBe(false);
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEY_DETAIL, null)).toBe(false);
  });

  test('should validate discovery detail params', () => {
    expect(validateNavigationParams(SCREEN_NAMES.DISCOVERY_DETAIL, { discoveryId: '456' })).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.DISCOVERY_DETAIL, {})).toBe(false);
  });

  test('should validate place detail params', () => {
    expect(validateNavigationParams(SCREEN_NAMES.PLACE_DETAIL, { placeId: '789' })).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.PLACE_DETAIL, {})).toBe(false);
  });

  test('should return true for screens without required params', () => {
    expect(validateNavigationParams(SCREEN_NAMES.MAP, {})).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.JOURNEYS, {})).toBe(true);
    expect(validateNavigationParams(SCREEN_NAMES.DISCOVERIES, {})).toBe(true);
  });
});

describe('getScreenOptions', () => {
  const mockTheme = {
    colors: {
      surface: '#FFFFFF',
      text: '#000000',
    },
    fonts: {
      medium: 'System',
    },
  };

  test('should return base options for regular screens', () => {
    const options = getScreenOptions(SCREEN_NAMES.JOURNEYS, mockTheme);
    expect(options.headerStyle.backgroundColor).toBe('#FFFFFF');
    expect(options.headerTintColor).toBe('#000000');
    expect(options.headerTitleStyle.fontFamily).toBe('System');
  });

  test('should hide header for map screen', () => {
    const options = getScreenOptions(SCREEN_NAMES.MAP, mockTheme);
    expect(options.headerShown).toBe(false);
  });

  test('should hide header for auth screens', () => {
    const loginOptions = getScreenOptions(SCREEN_NAMES.LOGIN, mockTheme);
    const signupOptions = getScreenOptions(SCREEN_NAMES.SIGNUP, mockTheme);
    
    expect(loginOptions.headerShown).toBe(false);
    expect(signupOptions.headerShown).toBe(false);
  });

  test('should handle missing theme properties', () => {
    const incompleteTheme = {
      colors: {},
      fonts: {},
    };
    
    expect(() => getScreenOptions(SCREEN_NAMES.MAP, incompleteTheme)).not.toThrow();
  });
});

describe('isNavigationAllowed', () => {
  test('should prevent navigation to same screen', () => {
    const result = isNavigationAllowed(SCREEN_NAMES.MAP, SCREEN_NAMES.MAP, true);
    expect(result).toBe(false);
  });

  test('should prevent navigation to protected screens when unauthenticated', () => {
    const result = isNavigationAllowed(SCREEN_NAMES.MAP, SCREEN_NAMES.JOURNEYS, false);
    expect(result).toBe(false);
  });

  test('should allow navigation to protected screens when authenticated', () => {
    const result = isNavigationAllowed(SCREEN_NAMES.MAP, SCREEN_NAMES.JOURNEYS, true);
    expect(result).toBe(true);
  });

  test('should allow navigation to public screens when unauthenticated', () => {
    const result = isNavigationAllowed(SCREEN_NAMES.LOGIN, SCREEN_NAMES.MAP, false);
    expect(result).toBe(true);
  });

  test('should allow navigation between different screens', () => {
    const result = isNavigationAllowed(SCREEN_NAMES.JOURNEYS, SCREEN_NAMES.DISCOVERIES, true);
    expect(result).toBe(true);
  });

  test('should handle edge cases', () => {
    expect(isNavigationAllowed(null, SCREEN_NAMES.MAP, true)).toBe(true);
    expect(isNavigationAllowed(SCREEN_NAMES.MAP, null, true)).toBe(true); // null doesn't require auth
  });
});