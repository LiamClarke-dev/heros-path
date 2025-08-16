/**
 * Connection validation utility for external services
 */

import { db } from '../config/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';

/**
 * Test Firebase Firestore connection
 * @returns {Promise<boolean>} True if connection successful
 */
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');

    // Try to write a test document
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'connection-test'), testData);
    console.log('Firebase write test successful, document ID:', docRef.id);

    // Clean up test document
    await deleteDoc(doc(db, 'connection-test', docRef.id));
    console.log('Firebase cleanup successful');

    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

/**
 * Test Google Maps Geocoding API
 * @returns {Promise<boolean>} True if connection successful
 */
export const testGoogleMapsConnection = async () => {
  try {
    console.log('Testing Google Maps API connection...');

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY_IOS ||
      process.env.GOOGLE_MAPS_API_KEY_ANDROID;
    if (!apiKey) {
      throw new Error('Google Maps API key not found in environment variables');
    }

    // Test with a simple geocoding request
    const testAddress = 'San Francisco, CA';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      console.log('Google Maps API test successful');
      return true;
    } else {
      throw new Error(`Google Maps API returned status: ${data.status}`);
    }
  } catch (error) {
    console.error('Google Maps API connection test failed:', error);
    return false;
  }
};

/**
 * Test Google Places API (New)
 * @returns {Promise<boolean>} True if connection successful
 */
export const testGooglePlacesConnection = async () => {
  try {
    console.log('Testing Google Places API (New) connection...');

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY_IOS ||
      process.env.GOOGLE_MAPS_API_KEY_ANDROID;
    if (!apiKey) {
      throw new Error(
        'Google Places API key not found in environment variables'
      );
    }

    // Test with a simple nearby search request
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const requestBody = {
      includedTypes: ['restaurant'],
      maxResultCount: 1,
      locationRestriction: {
        circle: {
          center: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
          radius: 500.0,
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.id',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Google Places API (New) test successful');
      return true;
    } else {
      const errorData = await response.text();
      throw new Error(
        `Google Places API returned status ${response.status}: ${errorData}`
      );
    }
  } catch (error) {
    console.error('Google Places API (New) connection test failed:', error);
    return false;
  }
};

/**
 * Run all connection tests
 * @returns {Promise<Object>} Test results for each service
 */
export const validateAllConnections = async () => {
  console.log('Starting connection validation tests...');

  const results = {
    firebase: false,
    googleMaps: false,
    googlePlaces: false,
  };

  // Test Firebase connection
  try {
    results.firebase = await testFirebaseConnection();
  } catch (error) {
    console.error('Firebase test error:', error);
  }

  // Test Google Maps API
  try {
    results.googleMaps = await testGoogleMapsConnection();
  } catch (error) {
    console.error('Google Maps test error:', error);
  }

  // Test Google Places API
  try {
    results.googlePlaces = await testGooglePlacesConnection();
  } catch (error) {
    console.error('Google Places test error:', error);
  }

  // Summary
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(
    `Connection validation complete: ${successCount}/${totalTests} services connected`
  );
  console.log('Results:', results);

  return results;
};

/**
 * Check if all critical services are connected
 * @returns {Promise<boolean>} True if all services are working
 */
export const areAllServicesConnected = async () => {
  const results = await validateAllConnections();
  return Object.values(results).every(Boolean);
};
