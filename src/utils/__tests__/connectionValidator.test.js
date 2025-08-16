/**
 * Tests for connection validator utility
 * Note: These tests use mocks since we don't have real API keys in test environment
 */

import {
  testFirebaseConnection,
  testGoogleMapsConnection,
  testGooglePlacesConnection,
  validateAllConnections,
} from '../connectionValidator';

// Mock Firebase
jest.mock(
  '../config/firebase',
  () => ({
    db: 'mocked-db',
  }),
  { virtual: true }
);

jest.mock(
  'firebase/firestore',
  () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    deleteDoc: jest.fn(),
    doc: jest.fn(),
  }),
  { virtual: true }
);

// Mock fetch
global.fetch = jest.fn();

describe('Connection Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.GOOGLE_MAPS_API_KEY_IOS = 'test-api-key';
    process.env.GOOGLE_MAPS_API_KEY_ANDROID = 'test-api-key';
  });

  describe('testFirebaseConnection', () => {
    it('should return true when Firebase connection succeeds', async () => {
      const { addDoc, deleteDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue({ id: 'test-doc-id' });
      deleteDoc.mockResolvedValue();

      const result = await testFirebaseConnection();
      expect(result).toBe(true);
      expect(addDoc).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should return false when Firebase connection fails', async () => {
      const { addDoc } = require('firebase/firestore');
      addDoc.mockRejectedValue(new Error('Firebase error'));

      const result = await testFirebaseConnection();
      expect(result).toBe(false);
    });
  });

  describe('testGoogleMapsConnection', () => {
    it('should return true when Google Maps API succeeds', async () => {
      fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [{ formatted_address: 'San Francisco, CA, USA' }],
          }),
      });

      const result = await testGoogleMapsConnection();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('maps.googleapis.com/maps/api/geocode')
      );
    });

    it('should return false when API key is missing', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY_IOS;
      delete process.env.GOOGLE_MAPS_API_KEY_ANDROID;

      const result = await testGoogleMapsConnection();
      expect(result).toBe(false);
    });

    it('should return false when Google Maps API fails', async () => {
      fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: 'REQUEST_DENIED',
            results: [],
          }),
      });

      const result = await testGoogleMapsConnection();
      expect(result).toBe(false);
    });
  });

  describe('testGooglePlacesConnection', () => {
    it('should return true when Google Places API succeeds', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            places: [{ displayName: { text: 'Test Restaurant' } }],
          }),
      });

      const result = await testGooglePlacesConnection();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchNearby',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': 'test-api-key',
          }),
        })
      );
    });

    it('should return false when API key is missing', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY_IOS;
      delete process.env.GOOGLE_MAPS_API_KEY_ANDROID;

      const result = await testGooglePlacesConnection();
      expect(result).toBe(false);
    });

    it('should return false when Google Places API fails', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      const result = await testGooglePlacesConnection();
      expect(result).toBe(false);
    });
  });

  describe('validateAllConnections', () => {
    it('should test all connections and return results', async () => {
      // Mock successful Firebase
      const { addDoc, deleteDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue({ id: 'test-doc-id' });
      deleteDoc.mockResolvedValue();

      // Mock successful Google APIs
      fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ status: 'OK', results: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ places: [{}] }),
        });

      const results = await validateAllConnections();

      expect(results).toEqual({
        firebase: true,
        googleMaps: true,
        googlePlaces: true,
      });
    });

    it('should handle mixed success/failure results', async () => {
      // Mock failed Firebase
      const { addDoc } = require('firebase/firestore');
      addDoc.mockRejectedValue(new Error('Firebase error'));

      // Mock successful Google Maps but failed Places
      fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ status: 'OK', results: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: () => Promise.resolve('Forbidden'),
        });

      const results = await validateAllConnections();

      expect(results).toEqual({
        firebase: false,
        googleMaps: true,
        googlePlaces: false,
      });
    });
  });
});
