/**
 * Example usage of DiscoveriesService
 * 
 * This file demonstrates how to use the DiscoveriesService for managing
 * discovery preferences in the Hero's Path app.
 */

import DiscoveriesService from '../services/DiscoveriesService';
import { PlaceTypeUtils } from '../constants/PlaceTypes';

/**
 * Example: Basic preference management
 */
async function basicPreferenceExample() {
  console.log('=== Basic Preference Management Example ===');
  
  try {
    // Get current user preferences (will create defaults if none exist)
    const preferences = await DiscoveriesService.getUserDiscoveryPreferences();
    console.log('Current preferences:', preferences);
    
    // Get current minimum rating
    const minRating = await DiscoveriesService.getMinRatingPreference();
    console.log('Current minimum rating:', minRating);
    
    // Update a specific place type preference
    await DiscoveriesService.updatePlaceTypePreference('restaurant', true);
    console.log('Updated restaurant preference to enabled');
    
    // Update minimum rating
    await DiscoveriesService.updateMinRatingPreference(4.5);
    console.log('Updated minimum rating to 4.5');
    
    // Reset to defaults
    const defaultPrefs = await DiscoveriesService.resetDiscoveryPreferences();
    console.log('Reset to defaults:', defaultPrefs);
    
  } catch (error) {
    console.error('Error in basic preference example:', error);
  }
}

/**
 * Example: Filtering places based on preferences
 */
async function placeFilteringExample() {
  console.log('\n=== Place Filtering Example ===');
  
  try {
    // Sample places data (as would come from Google Places API)
    const samplePlaces = [
      {
        name: 'Great Restaurant',
        types: ['restaurant', 'food'],
        rating: 4.5,
        place_id: 'place1'
      },
      {
        name: 'Average Cafe',
        types: ['cafe', 'food'],
        rating: 3.2,
        place_id: 'place2'
      },
      {
        name: 'Excellent Museum',
        types: ['museum', 'tourist_attraction'],
        rating: 4.8,
        place_id: 'place3'
      },
      {
        name: 'Local Park',
        types: ['park'],
        rating: 4.1,
        place_id: 'place4'
      },
      {
        name: 'Shopping Mall',
        types: ['shopping_mall', 'store'],
        rating: 3.9,
        place_id: 'place5'
      }
    ];
    
    console.log('Original places:', samplePlaces.length);
    
    // Set up preferences for this example
    await DiscoveriesService.updatePlaceTypePreference('restaurant', true);
    await DiscoveriesService.updatePlaceTypePreference('museum', true);
    await DiscoveriesService.updatePlaceTypePreference('park', true);
    await DiscoveriesService.updatePlaceTypePreference('cafe', false);
    await DiscoveriesService.updatePlaceTypePreference('shopping_mall', false);
    await DiscoveriesService.updateMinRatingPreference(4.0);
    
    // Filter places based on preferences
    const filteredPlaces = await DiscoveriesService.filterPlacesByPreferences(samplePlaces);
    
    console.log('Filtered places:', filteredPlaces.length);
    filteredPlaces.forEach(place => {
      console.log(`- ${place.name} (${place.rating}★, types: ${place.types.join(', ')})`);
    });
    
  } catch (error) {
    console.error('Error in place filtering example:', error);
  }
}

/**
 * Example: Working with place type categories
 */
async function categoryExample() {
  console.log('\n=== Category Management Example ===');
  
  try {
    // Get all place type keys
    const allPlaceTypes = PlaceTypeUtils.getAllPlaceTypeKeys();
    console.log('Total place types available:', allPlaceTypes.length);
    
    // Get place types in a specific category
    const foodTypes = PlaceTypeUtils.getPlaceTypesInCategory('Food & Dining');
    console.log('Food & Dining place types:', foodTypes);
    
    // Find category for a specific place type
    const restaurantCategory = PlaceTypeUtils.getCategoryForPlaceType('restaurant');
    console.log('Restaurant belongs to category:', restaurantCategory);
    
    // Get user-friendly label for a place type
    const restaurantLabel = PlaceTypeUtils.getPlaceTypeLabel('restaurant');
    console.log('Restaurant label:', restaurantLabel);
    
    // Enable all place types in a category
    const preferences = await DiscoveriesService.getUserDiscoveryPreferences();
    foodTypes.forEach(async (placeType) => {
      await DiscoveriesService.updatePlaceTypePreference(placeType, true);
    });
    console.log('Enabled all Food & Dining place types');
    
  } catch (error) {
    console.error('Error in category example:', error);
  }
}

/**
 * Example: Preference synchronization
 */
async function synchronizationExample() {
  console.log('\n=== Preference Synchronization Example ===');
  
  try {
    // Get current preferences
    const currentPrefs = await DiscoveriesService.getUserDiscoveryPreferences();
    console.log('Current preferences count:', Object.keys(currentPrefs).length);
    
    // Simulate adding new place types by syncing
    const syncedPrefs = await DiscoveriesService.syncPreferencesWithPlaceTypes();
    console.log('Synced preferences count:', Object.keys(syncedPrefs).length);
    
    // Check if any new place types were added
    const currentKeys = Object.keys(currentPrefs);
    const syncedKeys = Object.keys(syncedPrefs);
    const newKeys = syncedKeys.filter(key => !currentKeys.includes(key));
    
    if (newKeys.length > 0) {
      console.log('New place types added:', newKeys);
    } else {
      console.log('No new place types were added during sync');
    }
    
  } catch (error) {
    console.error('Error in synchronization example:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Running DiscoveriesService Examples\n');
  
  await basicPreferenceExample();
  await placeFilteringExample();
  await categoryExample();
  await synchronizationExample();
  
  console.log('\n✅ All examples completed!');
}

// Export for use in other files
export {
  basicPreferenceExample,
  placeFilteringExample,
  categoryExample,
  synchronizationExample,
  runAllExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}