/**
 * Category-Based Processing Tests
 * 
 * Tests for the category-based processing functionality in SearchAlongRouteService
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */

// Mock Platform before importing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

// Mock the config module
jest.mock('../config', () => ({
  GOOGLE_MAPS_API_KEY_ANDROID: 'test-android-key',
  GOOGLE_MAPS_API_KEY_IOS: 'test-ios-key'
}));

describe('SearchAlongRouteService - Category-Based Processing', () => {
  let SearchAlongRouteService;
  let PLACE_CATEGORIES;

  beforeAll(() => {
    SearchAlongRouteService = require('../services/SearchAlongRouteService').default;
    PLACE_CATEGORIES = require('../services/SearchAlongRouteService').PLACE_CATEGORIES;
  });

  beforeEach(() => {
    SearchAlongRouteService.clearCache();
  });

  describe('Category Mapping (Requirement 7.3)', () => {
    test('should map Google Places API types to app categories', () => {
      const googleTypes = ['restaurant', 'cafe', 'store', 'museum'];
      const mapping = SearchAlongRouteService.mapGoogleTypesToAppCategories(googleTypes);

      expect(mapping).toHaveProperty('primaryCategory');
      expect(mapping).toHaveProperty('allCategories');
      expect(mapping).toHaveProperty('mappedTypes');
      expect(mapping).toHaveProperty('unmappedTypes');

      // Should map known types
      expect(mapping.mappedTypes).toContain('restaurant');
      expect(mapping.mappedTypes).toContain('cafe');
      expect(mapping.mappedTypes).toContain('store');
      expect(mapping.mappedTypes).toContain('museum');

      // Should identify correct categories
      expect(mapping.allCategories).toContain(PLACE_CATEGORIES.FOOD_DINING);
      expect(mapping.allCategories).toContain(PLACE_CATEGORIES.SHOPPING_RETAIL);
      expect(mapping.allCategories).toContain(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE);
    });

    test('should handle unmapped Google types', () => {
      const googleTypes = ['restaurant', 'unknown_type', 'custom_establishment'];
      const mapping = SearchAlongRouteService.mapGoogleTypesToAppCategories(googleTypes);

      expect(mapping.mappedTypes).toContain('restaurant');
      expect(mapping.unmappedTypes).toContain('unknown_type');
      expect(mapping.unmappedTypes).toContain('custom_establishment');
    });

    test('should handle empty or invalid input', () => {
      const emptyMapping = SearchAlongRouteService.mapGoogleTypesToAppCategories([]);
      expect(emptyMapping.primaryCategory).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
      expect(emptyMapping.allCategories).toEqual([PLACE_CATEGORIES.SERVICES_UTILITIES]);

      const nullMapping = SearchAlongRouteService.mapGoogleTypesToAppCategories(null);
      expect(nullMapping.primaryCategory).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
    });
  });

  describe('Primary Category Classification (Requirement 7.5)', () => {
    test('should classify place by primary category using primaryType', () => {
      const place = {
        primaryType: 'restaurant',
        types: ['restaurant', 'food', 'establishment']
      };

      const category = SearchAlongRouteService.classifyPlaceByPrimaryCategory(place);
      expect(category).toBe(PLACE_CATEGORIES.FOOD_DINING);
    });

    test('should classify place by primary category using types array', () => {
      const place = {
        types: ['museum', 'tourist_attraction', 'establishment']
      };

      const category = SearchAlongRouteService.classifyPlaceByPrimaryCategory(place);
      expect(category).toBe(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE);
    });

    test('should default to Services & Utilities for unknown types', () => {
      const place = {
        types: ['unknown_type', 'custom_establishment']
      };

      const category = SearchAlongRouteService.classifyPlaceByPrimaryCategory(place);
      expect(category).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
    });

    test('should handle places without types', () => {
      const place = { name: 'Test Place' };
      const category = SearchAlongRouteService.classifyPlaceByPrimaryCategory(place);
      expect(category).toBe(PLACE_CATEGORIES.SERVICES_UTILITIES);
    });
  });
});