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

    describe('Category Balancing (Requirements 7.2, 7.4)', () => {
        const createMockPlaces = () => [
            // Food & Dining (4 places)
            { id: '1', name: 'Restaurant 1', types: ['restaurant'], rating: 4.5 },
            { id: '2', name: 'Cafe 1', types: ['cafe'], rating: 4.2 },
            { id: '3', name: 'Bar 1', types: ['bar'], rating: 4.0 },
            { id: '4', name: 'Restaurant 2', types: ['restaurant'], rating: 4.8 },

            // Shopping & Retail (3 places)
            { id: '5', name: 'Store 1', types: ['store'], rating: 4.1 },
            { id: '6', name: 'Mall 1', types: ['shopping_mall'], rating: 4.3 },
            { id: '7', name: 'Supermarket 1', types: ['supermarket'], rating: 4.0 },

            // Entertainment & Culture (2 places)
            { id: '8', name: 'Museum 1', types: ['museum'], rating: 4.7 },
            { id: '9', name: 'Gallery 1', types: ['art_gallery'], rating: 4.4 },

            // Health & Wellness (1 place)
            { id: '10', name: 'Gym 1', types: ['gym'], rating: 4.2 }
        ];

        test('should ensure balanced representation of categories', () => {
            const places = createMockPlaces();
            const preferences = {
                placeTypes: {
                    restaurant: true,
                    cafe: true,
                    bar: true,
                    store: true,
                    shopping_mall: true,
                    supermarket: true,
                    museum: true,
                    art_gallery: true,
                    gym: true
                }
            };

            const balanced = SearchAlongRouteService.applyCategoryBalancing(places, preferences, {
                maxResults: 8,
                minPerCategory: 1
            });

            // Should have places from multiple categories
            const categories = new Set();
            balanced.forEach(place => {
                const category = SearchAlongRouteService.classifyPlaceByPrimaryCategory(place);
                categories.add(category);
            });

            expect(categories.size).toBeGreaterThan(1);
            expect(balanced.length).toBeLessThanOrEqual(8);
        });

        test('should handle empty places array', () => {
            const balanced = SearchAlongRouteService.applyCategoryBalancing([], {});
            expect(balanced).toEqual([]);
        });
    });

    describe('Category Statistics (Requirements 7.2, 7.4)', () => {
        const createMockPlaces = () => [
            { id: '1', name: 'Restaurant 1', types: ['restaurant'], category: PLACE_CATEGORIES.FOOD_DINING },
            { id: '2', name: 'Cafe 1', types: ['cafe'], category: PLACE_CATEGORIES.FOOD_DINING },
            { id: '3', name: 'Store 1', types: ['store'], category: PLACE_CATEGORIES.SHOPPING_RETAIL },
            { id: '4', name: 'Museum 1', types: ['museum'], category: PLACE_CATEGORIES.ENTERTAINMENT_CULTURE }
        ];

        test('should calculate comprehensive category statistics', () => {
            const places = createMockPlaces();
            const stats = SearchAlongRouteService.getCategoryStatistics(places);

            expect(stats).toHaveProperty('totalPlaces', 4);
            expect(stats).toHaveProperty('categoryCounts');
            expect(stats).toHaveProperty('categoryPercentages');
            expect(stats).toHaveProperty('mostCommonCategory');
            expect(stats).toHaveProperty('leastCommonCategory');
            expect(stats).toHaveProperty('categoryDiversity');

            // Food & Dining should be most common (2 places)
            expect(stats.categoryCounts[PLACE_CATEGORIES.FOOD_DINING]).toBe(2);
            expect(stats.mostCommonCategory).toBe(PLACE_CATEGORIES.FOOD_DINING);
            expect(stats.categoryDiversity).toBe(3); // 3 different categories
        });

        test('should handle empty places array', () => {
            const stats = SearchAlongRouteService.getCategoryStatistics([]);

            expect(stats.totalPlaces).toBe(0);
            expect(stats.categoryCounts).toEqual({});
            expect(stats.categoryPercentages).toEqual({});
            expect(stats.mostCommonCategory).toBeNull();
            expect(stats.leastCommonCategory).toBeNull();
            expect(stats.categoryDiversity).toBe(0);
        });
    });

    describe('Category Processing Integration', () => {
        test('should process raw places with enhanced category classification', () => {
            const rawPlaces = [
                {
                    id: 'place1',
                    displayName: { text: 'Test Restaurant' },
                    types: ['restaurant', 'food'],
                    primaryType: 'restaurant',
                    location: { latitude: 40.7128, longitude: -74.0060 },
                    rating: 4.5
                },
                {
                    id: 'place2',
                    displayName: { text: 'Test Store' },
                    types: ['store', 'retail'],
                    primaryType: 'store',
                    location: { latitude: 40.7129, longitude: -74.0061 },
                    rating: 4.2
                }
            ];

            const processed = SearchAlongRouteService.processRawPlaces(rawPlaces);

            expect(processed).toHaveLength(2);

            // Check first place (restaurant)
            expect(processed[0]).toHaveProperty('category', PLACE_CATEGORIES.FOOD_DINING);
            expect(processed[0]).toHaveProperty('allCategories');
            expect(processed[0]).toHaveProperty('mappedTypes');
            expect(processed[0].mappedTypes).toContain('restaurant');

            // Check second place (store)
            expect(processed[1]).toHaveProperty('category', PLACE_CATEGORIES.SHOPPING_RETAIL);
            expect(processed[1].mappedTypes).toContain('store');
        });

        test('should group places by category correctly', () => {
            const places = [
                { id: '1', name: 'Restaurant 1', types: ['restaurant'] },
                { id: '2', name: 'Cafe 1', types: ['cafe'] },
                { id: '3', name: 'Store 1', types: ['store'] },
                { id: '4', name: 'Museum 1', types: ['museum'] }
            ];

            const grouped = SearchAlongRouteService.groupPlacesByCategory(places);

            expect(grouped).toHaveProperty(PLACE_CATEGORIES.FOOD_DINING);
            expect(grouped).toHaveProperty(PLACE_CATEGORIES.SHOPPING_RETAIL);
            expect(grouped).toHaveProperty(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE);

            expect(grouped[PLACE_CATEGORIES.FOOD_DINING]).toHaveLength(2);
            expect(grouped[PLACE_CATEGORIES.SHOPPING_RETAIL]).toHaveLength(1);
            expect(grouped[PLACE_CATEGORIES.ENTERTAINMENT_CULTURE]).toHaveLength(1);
        });

        test('should get enabled categories from preferences', () => {
            const preferences = {
                placeTypes: {
                    restaurant: true,
                    cafe: true,
                    store: false,
                    museum: true,
                    gym: false
                }
            };

            const enabledCategories = SearchAlongRouteService.getEnabledCategories(preferences);

            expect(enabledCategories.has(PLACE_CATEGORIES.FOOD_DINING)).toBe(true);
            expect(enabledCategories.has(PLACE_CATEGORIES.SHOPPING_RETAIL)).toBe(false);
            expect(enabledCategories.has(PLACE_CATEGORIES.ENTERTAINMENT_CULTURE)).toBe(true);
            expect(enabledCategories.has(PLACE_CATEGORIES.HEALTH_WELLNESS)).toBe(false);
        });
    });
});