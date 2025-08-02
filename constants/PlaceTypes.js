/**
 * Place Types and Categories for Discovery Preferences
 * 
 * This file defines all available place types and their organization into categories
 * for the Discovery Preferences feature. Place type keys must match Google Places API
 * types exactly for proper filtering.
 * 
 * @version 2.0
 * @updated January 2025
 */

/**
 * Individual place type definitions
 * Each place type must have a key that matches Google Places API and a user-friendly label
 * Keys are based on Google Places API Place Types: https://developers.google.com/maps/documentation/places/web-service/place-types
 * 
 * NOTE: All keys MUST match Google Places API types exactly for proper filtering
 */
export const PLACE_TYPES = {
    // Food & Dining - Most popular category for walking discoveries
    restaurant: { key: 'restaurant', label: 'Restaurants' }, // Establishments that serve food
    cafe: { key: 'cafe', label: 'Cafes' }, // Coffee shops and casual dining
    bar: { key: 'bar', label: 'Bars' }, // Establishments that serve alcoholic beverages
    bakery: { key: 'bakery', label: 'Bakeries' }, // Bakeries and pastry shops
    meal_takeaway: { key: 'meal_takeaway', label: 'Takeaway' }, // Fast food and takeaway establishments
    meal_delivery: { key: 'meal_delivery', label: 'Meal Delivery' }, // Food delivery services
    food: { key: 'food', label: 'Food Stores' }, // General food establishments

    // Shopping & Retail - Common urban discoveries
    store: { key: 'store', label: 'General Stores' }, // General retail establishments
    shopping_mall: { key: 'shopping_mall', label: 'Shopping Malls' }, // Shopping centers and malls
    clothing_store: { key: 'clothing_store', label: 'Clothing Stores' }, // Apparel and fashion stores
    book_store: { key: 'book_store', label: 'Book Stores' }, // Bookshops and literary stores
    electronics_store: { key: 'electronics_store', label: 'Electronics' }, // Electronics and technology retailers
    jewelry_store: { key: 'jewelry_store', label: 'Jewelry Stores' }, // Jewelry and accessories shops
    shoe_store: { key: 'shoe_store', label: 'Shoe Stores' }, // Footwear and shoe stores
    supermarket: { key: 'supermarket', label: 'Supermarkets' }, // Large grocery stores
    convenience_store: { key: 'convenience_store', label: 'Convenience Stores' }, // Small local stores
    department_store: { key: 'department_store', label: 'Department Stores' }, // Large multi-department retailers
    furniture_store: { key: 'furniture_store', label: 'Furniture Stores' }, // Furniture and home furnishing stores
    home_goods_store: { key: 'home_goods_store', label: 'Home Goods' }, // Home improvement and goods stores
    bicycle_store: { key: 'bicycle_store', label: 'Bike Shops' }, // Bicycle sales and repair shops
    pet_store: { key: 'pet_store', label: 'Pet Stores' }, // Pet supplies and animal stores
    florist: { key: 'florist', label: 'Florists' }, // Flower shops and floral services
    liquor_store: { key: 'liquor_store', label: 'Liquor Stores' }, // Alcoholic beverage retailers
    convenience_store: { key: 'convenience_store', label: 'Convenience Stores' }, // Small local stores
    department_store: { key: 'department_store', label: 'Department Stores' }, // Large multi-department retailers
    furniture_store: { key: 'furniture_store', label: 'Furniture Stores' }, // Furniture and home furnishing stores
    home_goods_store: { key: 'home_goods_store', label: 'Home Goods' }, // Home improvement and goods stores
    bicycle_store: { key: 'bicycle_store', label: 'Bike Shops' }, // Bicycle sales and repair shops
    pet_store: { key: 'pet_store', label: 'Pet Stores' }, // Pet supplies and animal stores
    florist: { key: 'florist', label: 'Florists' }, // Flower shops and floral services
    liquor_store: { key: 'liquor_store', label: 'Liquor Stores' }, // Alcoholic beverage retailers

    // Entertainment & Culture - Interesting walking discoveries
    museum: { key: 'museum', label: 'Museums' }, // Museums and cultural exhibitions
    art_gallery: { key: 'art_gallery', label: 'Art Galleries' }, // Art galleries and exhibitions
    tourist_attraction: { key: 'tourist_attraction', label: 'Tourist Attractions' }, // Points of interest and landmarks
    amusement_park: { key: 'amusement_park', label: 'Amusement Parks' }, // Theme parks and entertainment venues
    movie_theater: { key: 'movie_theater', label: 'Movie Theaters' }, // Cinemas and movie venues
    night_club: { key: 'night_club', label: 'Night Clubs' }, // Nightlife and entertainment venues
    casino: { key: 'casino', label: 'Casinos' }, // Gaming and gambling establishments
    library: { key: 'library', label: 'Libraries' }, // Public and private libraries
    performing_arts_theater: { key: 'performing_arts_theater', label: 'Theaters' }, // Performance and theater venues

    // Health & Wellness - Essential services
    hospital: { key: 'hospital', label: 'Hospitals' }, // Medical facilities and hospitals
    pharmacy: { key: 'pharmacy', label: 'Pharmacies' }, // Drug stores and pharmacies
    dentist: { key: 'dentist', label: 'Dentists' }, // Dental practices and clinics
    doctor: { key: 'doctor', label: 'Doctors' }, // Medical practices and clinics
    physiotherapist: { key: 'physiotherapist', label: 'Physiotherapists' }, // Physical therapy services
    gym: { key: 'gym', label: 'Gyms' }, // Fitness centers and gyms
    spa: { key: 'spa', label: 'Spas' }, // Wellness spas and health centers
    veterinary_care: { key: 'veterinary_care', label: 'Veterinarians' }, // Animal hospitals and veterinary services

    // Services - Daily necessities and professional services
    bank: { key: 'bank', label: 'Banks' }, // Banking institutions
    atm: { key: 'atm', label: 'ATMs' }, // Automated teller machines
    gas_station: { key: 'gas_station', label: 'Gas Stations' }, // Fuel stations and service stations
    car_wash: { key: 'car_wash', label: 'Car Washes' }, // Vehicle cleaning services
    car_repair: { key: 'car_repair', label: 'Car Repair' }, // Automotive repair shops
    car_dealer: { key: 'car_dealer', label: 'Car Dealers' }, // Automotive dealerships
    car_rental: { key: 'car_rental', label: 'Car Rental' }, // Vehicle rental services
    laundry: { key: 'laundry', label: 'Laundromats' }, // Laundry and dry cleaning services
    hair_care: { key: 'hair_care', label: 'Hair Salons' }, // Hair styling and care services
    beauty_salon: { key: 'beauty_salon', label: 'Beauty Salons' }, // Beauty and cosmetic services
    post_office: { key: 'post_office', label: 'Post Offices' }, // Postal and mailing services
    insurance_agency: { key: 'insurance_agency', label: 'Insurance' }, // Insurance services and agencies
    real_estate_agency: { key: 'real_estate_agency', label: 'Real Estate' }, // Property and real estate services
    travel_agency: { key: 'travel_agency', label: 'Travel Agencies' }, // Travel planning and booking services
    accounting: { key: 'accounting', label: 'Accounting' }, // Accounting and financial services
    lawyer: { key: 'lawyer', label: 'Lawyers' }, // Legal services and law offices

    // Outdoors & Recreation - Great for walking discoveries
    park: { key: 'park', label: 'Parks' }, // Public parks and green spaces
    zoo: { key: 'zoo', label: 'Zoos' }, // Zoological parks and animal exhibits
    aquarium: { key: 'aquarium', label: 'Aquariums' }, // Marine life exhibits and aquariums
    campground: { key: 'campground', label: 'Campgrounds' }, // Camping facilities and grounds
    rv_park: { key: 'rv_park', label: 'RV Parks' }, // Recreational vehicle parks
    stadium: { key: 'stadium', label: 'Stadiums' }, // Sports stadiums and arenas
    bowling_alley: { key: 'bowling_alley', label: 'Bowling Alleys' }, // Bowling centers and alleys
    golf_course: { key: 'golf_course', label: 'Golf Courses' }, // Golf courses and clubs

    // Transportation - Travel-related discoveries
    bus_station: { key: 'bus_station', label: 'Bus Stations' }, // Bus terminals and stations
    subway_station: { key: 'subway_station', label: 'Subway Stations' }, // Metro and subway stations
    train_station: { key: 'train_station', label: 'Train Stations' }, // Railway stations and terminals
    airport: { key: 'airport', label: 'Airports' }, // Airports and air terminals
    taxi_stand: { key: 'taxi_stand', label: 'Taxi Stands' }, // Taxi pickup locations
    parking: { key: 'parking', label: 'Parking' }, // Parking facilities and lots
    transit_station: { key: 'transit_station', label: 'Transit Stations' }, // General public transit stations

    // Accommodation - Travel and lodging
    lodging: { key: 'lodging', label: 'Hotels & Lodging' }, // Hotels, motels, and accommodations

    // Education & Government - Civic and educational institutions
    school: { key: 'school', label: 'Schools' }, // Primary and secondary schools
    university: { key: 'university', label: 'Universities' }, // Higher education institutions
    city_hall: { key: 'city_hall', label: 'City Halls' }, // Municipal government buildings
    courthouse: { key: 'courthouse', label: 'Courthouses' }, // Legal and judicial facilities
    police: { key: 'police', label: 'Police Stations' }, // Law enforcement facilities
    fire_station: { key: 'fire_station', label: 'Fire Stations' }, // Fire and emergency services
    embassy: { key: 'embassy', label: 'Embassies' }, // Diplomatic missions and consulates

    // Religious - Places of worship and spiritual sites
    church: { key: 'church', label: 'Churches' }, // Christian churches and chapels
    mosque: { key: 'mosque', label: 'Mosques' }, // Islamic mosques and prayer halls
    synagogue: { key: 'synagogue', label: 'Synagogues' }, // Jewish synagogues and temples
    hindu_temple: { key: 'hindu_temple', label: 'Hindu Temples' }, // Hindu temples and shrines
    place_of_worship: { key: 'place_of_worship', label: 'Places of Worship' }, // General religious and spiritual sites
};

/**
 * Place categories with their associated place types
 * Categories organize place types into logical groups for the UI
 * Icons use Material Design icon names compatible with @expo/vector-icons
 */
export const PLACE_CATEGORIES = {
    'Food & Dining': {
        title: 'Food & Dining',
        icon: 'restaurant', // Material icon for food and dining
        types: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'food'],
    },
    'Shopping & Retail': {
        title: 'Shopping & Retail',
        icon: 'shopping-bag', // Material icon for shopping
        types: [
            'store', 'shopping_mall', 'clothing_store', 'book_store', 'electronics_store',
            'jewelry_store', 'shoe_store', 'supermarket', 'convenience_store', 'department_store',
            'furniture_store', 'home_goods_store', 'bicycle_store', 'pet_store', 'florist', 'liquor_store'
        ],
    },
    'Entertainment & Culture': {
        title: 'Entertainment & Culture',
        icon: 'palette', // Material icon for arts and culture
        types: [
            'museum', 'art_gallery', 'tourist_attraction', 'amusement_park', 'movie_theater',
            'night_club', 'casino', 'library', 'performing_arts_theater'
        ],
    },
    'Health & Wellness': {
        title: 'Health & Wellness',
        icon: 'medical-bag', // Material icon for health services
        types: [
            'hospital', 'pharmacy', 'dentist', 'doctor', 'physiotherapist',
            'gym', 'spa', 'veterinary_care'
        ],
    },
    'Services': {
        title: 'Services',
        icon: 'briefcase', // Material icon for professional services
        types: [
            'bank', 'atm', 'gas_station', 'car_wash', 'car_repair', 'car_dealer', 'car_rental',
            'laundry', 'hair_care', 'beauty_salon', 'post_office', 'insurance_agency',
            'real_estate_agency', 'travel_agency', 'accounting', 'lawyer'
        ],
    },
    'Outdoors & Recreation': {
        title: 'Outdoors & Recreation',
        icon: 'tree', // Material icon for outdoor activities
        types: [
            'park', 'zoo', 'aquarium', 'campground', 'rv_park', 'stadium',
            'bowling_alley', 'golf_course'
        ],
    },
    'Transportation': {
        title: 'Transportation',
        icon: 'train', // Material icon for transportation
        types: [
            'bus_station', 'subway_station', 'train_station', 'airport',
            'taxi_stand', 'parking', 'transit_station'
        ],
    },
    'Accommodation': {
        title: 'Accommodation',
        icon: 'bed', // Material icon for lodging
        types: ['lodging'],
    },
    'Education & Government': {
        title: 'Education & Government',
        icon: 'school', // Material icon for education and civic services
        types: [
            'school', 'university', 'city_hall', 'courthouse', 'police',
            'fire_station', 'embassy'
        ],
    },
    'Religious': {
        title: 'Religious',
        icon: 'place-of-worship', // Material icon for religious sites
        types: [
            'church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship'
        ],
    },
};

/**
 * Default enabled place types for new users
 * These are curated to provide a good initial discovery experience
 * Focus on popular, interesting places that enhance walking experiences
 */
export const DEFAULT_ENABLED_PLACE_TYPES = [
    // Food & Dining - most popular for walking discoveries
    'restaurant',
    'cafe',
    'bar',

    // Entertainment & Culture - interesting and engaging discoveries
    'museum',
    'art_gallery',
    'tourist_attraction',
];

/**
 * Default minimum rating for new users
 * Set to 4.0 to ensure quality discoveries
 */
export const DEFAULT_MIN_RATING = 4.0;

/**
 * Utility functions for working with place types and categories
 */
export const PlaceTypeUtils = {
    /**
     * Get all place type keys as an array
     * @returns {string[]} Array of place type keys
     */
    getAllPlaceTypeKeys: () => {
        return Object.keys(PLACE_TYPES);
    },

    /**
     * Get place type label by key
     * @param {string} key - Place type key
     * @returns {string} User-friendly label
     */
    getPlaceTypeLabel: (key) => {
        return PLACE_TYPES[key]?.label || key;
    },

    /**
     * Get all place types in a category
     * @param {string} categoryTitle - Category title
     * @returns {string[]} Array of place type keys in the category
     */
    getPlaceTypesInCategory: (categoryTitle) => {
        return PLACE_CATEGORIES[categoryTitle]?.types || [];
    },

    /**
     * Get category for a place type
     * @param {string} placeTypeKey - Place type key
     * @returns {string|null} Category title or null if not found
     */
    getCategoryForPlaceType: (placeTypeKey) => {
        for (const [categoryTitle, category] of Object.entries(PLACE_CATEGORIES)) {
            if (category.types.includes(placeTypeKey)) {
                return categoryTitle;
            }
        }
        return null;
    },

    /**
     * Get all category titles as an array
     * @returns {string[]} Array of category titles
     */
    getAllCategoryTitles: () => {
        return Object.keys(PLACE_CATEGORIES);
    },

    /**
     * Get category information by title
     * @param {string} categoryTitle - Category title
     * @returns {Object|null} Category object or null if not found
     */
    getCategoryInfo: (categoryTitle) => {
        return PLACE_CATEGORIES[categoryTitle] || null;
    },

    /**
     * Get icon for a category
     * @param {string} categoryTitle - Category title
     * @returns {string} Material icon name
     */
    getCategoryIcon: (categoryTitle) => {
        return PLACE_CATEGORIES[categoryTitle]?.icon || 'help-outline';
    },

    /**
     * Count enabled place types in a category
     * @param {string} categoryTitle - Category title
     * @param {Object} preferences - User preferences object
     * @returns {Object} Object with enabled and total counts
     */
    getCategoryEnabledCount: (categoryTitle, preferences) => {
        const categoryTypes = PlaceTypeUtils.getPlaceTypesInCategory(categoryTitle);
        const enabledCount = categoryTypes.filter(type => preferences[type] === true).length;

        return {
            enabled: enabledCount,
            total: categoryTypes.length,
        };
    },

    /**
     * Check if a category has any enabled place types
     * @param {string} categoryTitle - Category title
     * @param {Object} preferences - User preferences object
     * @returns {boolean} Whether category has enabled types
     */
    isCategoryEnabled: (categoryTitle, preferences) => {
        const categoryTypes = PlaceTypeUtils.getPlaceTypesInCategory(categoryTitle);
        return categoryTypes.some(type => preferences[type] === true);
    },

    /**
     * Enable or disable all place types in a category
     * @param {string} categoryTitle - Category title
     * @param {boolean} enabled - Whether to enable or disable all types
     * @param {Object} preferences - Current preferences object
     * @returns {Object} Updated preferences object
     */
    setCategoryEnabled: (categoryTitle, enabled, preferences) => {
        const updatedPreferences = { ...preferences };
        const categoryTypes = PlaceTypeUtils.getPlaceTypesInCategory(categoryTitle);

        categoryTypes.forEach(type => {
            updatedPreferences[type] = enabled;
        });

        return updatedPreferences;
    },

    /**
     * Create default preferences object
     * @returns {Object} Default preferences with enabled place types
     */
    createDefaultPreferences: () => {
        const preferences = {};
        const allKeys = PlaceTypeUtils.getAllPlaceTypeKeys();

        // Set all place types to false by default
        allKeys.forEach(key => {
            preferences[key] = false;
        });

        // Enable default place types
        DEFAULT_ENABLED_PLACE_TYPES.forEach(key => {
            if (preferences.hasOwnProperty(key)) {
                preferences[key] = true;
            }
        });

        return preferences;
    },

    /**
     * Validate place type preferences object
     * @param {Object} preferences - Preferences object to validate
     * @returns {boolean} Whether preferences are valid
     */
    validatePreferences: (preferences) => {
        if (!preferences || typeof preferences !== 'object') {
            return false;
        }

        // Check that all values are boolean
        for (const [key, value] of Object.entries(preferences)) {
            if (typeof value !== 'boolean') {
                return false;
            }

            // Check that key exists in PLACE_TYPES
            if (!PLACE_TYPES.hasOwnProperty(key)) {
                console.warn(`Unknown place type key: ${key}`);
            }
        }

        return true;
    },

    /**
     * Sync preferences with current place types (add new, remove old)
     * @param {Object} existingPreferences - Current user preferences
     * @returns {Object} Updated preferences with new place types added
     */
    syncPreferencesWithPlaceTypes: (existingPreferences = {}) => {
        const allCurrentKeys = PlaceTypeUtils.getAllPlaceTypeKeys();
        const syncedPreferences = { ...existingPreferences };

        // Add new place types with default enabled state
        allCurrentKeys.forEach(key => {
            if (!syncedPreferences.hasOwnProperty(key)) {
                // New place types are enabled by default
                syncedPreferences[key] = true;
                console.log(`Added new place type to preferences: ${key}`);
            }
        });

        // Remove place types that no longer exist
        Object.keys(syncedPreferences).forEach(key => {
            if (!allCurrentKeys.includes(key)) {
                delete syncedPreferences[key];
                console.log(`Removed obsolete place type from preferences: ${key}`);
            }
        });

        return syncedPreferences;
    },

    /**
     * Get categories sorted by popularity (based on default enabled types)
     * @returns {string[]} Array of category titles sorted by popularity
     */
    getCategoriesByPopularity: () => {
        const categoryPopularity = {};

        // Calculate popularity based on default enabled types
        DEFAULT_ENABLED_PLACE_TYPES.forEach(placeType => {
            const category = PlaceTypeUtils.getCategoryForPlaceType(placeType);
            if (category) {
                categoryPopularity[category] = (categoryPopularity[category] || 0) + 1;
            }
        });

        // Sort categories by popularity, then alphabetically
        return Object.keys(PLACE_CATEGORIES).sort((a, b) => {
            const popularityA = categoryPopularity[a] || 0;
            const popularityB = categoryPopularity[b] || 0;

            if (popularityA !== popularityB) {
                return popularityB - popularityA; // Higher popularity first
            }

            return a.localeCompare(b); // Alphabetical for same popularity
        });
    },

    /**
     * Filter place types by search query
     * @param {string} query - Search query
     * @returns {Object} Object with matching place types and categories
     */
    searchPlaceTypes: (query) => {
        if (!query || query.trim() === '') {
            return {
                placeTypes: [],
                categories: [],
            };
        }

        const lowerQuery = query.toLowerCase().trim();
        const matchingPlaceTypes = [];
        const matchingCategories = new Set();

        // Search place type labels
        Object.entries(PLACE_TYPES).forEach(([key, placeType]) => {
            if (placeType.label.toLowerCase().includes(lowerQuery)) {
                matchingPlaceTypes.push(key);
                const category = PlaceTypeUtils.getCategoryForPlaceType(key);
                if (category) {
                    matchingCategories.add(category);
                }
            }
        });

        // Search category titles
        Object.keys(PLACE_CATEGORIES).forEach(categoryTitle => {
            if (categoryTitle.toLowerCase().includes(lowerQuery)) {
                matchingCategories.add(categoryTitle);
            }
        });

        return {
            placeTypes: matchingPlaceTypes,
            categories: Array.from(matchingCategories),
        };
    },
};

export default {
    PLACE_TYPES,
    PLACE_CATEGORIES,
    DEFAULT_ENABLED_PLACE_TYPES,
    DEFAULT_MIN_RATING,
    PlaceTypeUtils,
};