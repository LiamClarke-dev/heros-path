/**
 * ExplorationContext Tests
 * 
 * Tests for the ExplorationContext functionality including segment tracking,
 * current journey state management, and persistence operations.
 */

import React, { useState, useEffect } from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExplorationProvider, useExploration } from '../contexts/ExplorationContext';
import { JOURNEY_STORAGE_KEYS } from '../constants/StorageKeys';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Logger
jest.mock('../utils/Logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Test component that uses the exploration context
const TestComponent = ({ onStateChange }) => {
  const exploration = useExploration();
  
  useEffect(() => {
    if (onStateChange) {
      onStateChange(exploration);
    }
  }, [exploration, onStateChange]);

  return (
    <View>
      <Text testID="loading">{exploration.loading ? 'loading' : 'loaded'}</Text>
      <Text testID="segmentCount">{exploration.segmentCount}</Text>
      <Text testID="hasCurrentJourney">{exploration.hasCurrentJourney ? 'yes' : 'no'}</Text>
      <Text testID="historyCount">{exploration.historyCount}</Text>
    </View>
  );
};

describe('ExplorationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.removeItem.mockResolvedValue();
  });

  describe('Initialization', () => {
    test('should initialize with empty state', async () => {
      let explorationState = null;
      
      const { getByTestId } = render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(getByTestId('loading').children[0]).toBe('loaded');
      expect(getByTestId('segmentCount').children[0]).toBe('0');
      expect(getByTestId('hasCurrentJourney').children[0]).toBe('no');
      expect(getByTestId('historyCount').children[0]).toBe('0');
      
      expect(explorationState.segments).toEqual([]);
      expect(explorationState.currentJourney).toBeNull();
      expect(explorationState.explorationHistory).toEqual([]);
      expect(explorationState.error).toBeNull();
    });

    test('should load persisted data on initialization', async () => {
      const mockSegments = [
        {
          id: 'segment_1',
          start: { latitude: 37.7749, longitude: -122.4194 },
          end: { latitude: 37.7849, longitude: -122.4094 },
          timestamp: Date.now(),
          metadata: {}
        }
      ];

      const mockJourney = {
        id: 'journey_1',
        name: 'Test Journey',
        status: 'in_progress'
      };

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockSegments)) // segments
        .mockResolvedValueOnce(JSON.stringify(mockJourney)) // current journey
        .mockResolvedValueOnce(JSON.stringify([])); // history

      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(explorationState.segments).toEqual(mockSegments);
      expect(explorationState.currentJourney).toEqual(mockJourney);
      expect(explorationState.loading).toBe(false);
    });
  });

  describe('Segment Management', () => {
    test('should add segment successfully', async () => {
      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const newSegment = {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7849, longitude: -122.4094 },
        metadata: { journeyId: 'journey_1' }
      };

      await act(async () => {
        await explorationState.addSegment(newSegment);
      });

      expect(explorationState.segments).toHaveLength(1);
      expect(explorationState.segments[0]).toMatchObject({
        start: newSegment.start,
        end: newSegment.end,
        metadata: newSegment.metadata
      });
      expect(explorationState.segments[0].id).toBeDefined();
      expect(explorationState.segments[0].timestamp).toBeDefined();
    });

    test('should get segments for journey', async () => {
      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const segment1 = {
        start: { latitude: 37.7749, longitude: -122.4194 },
        end: { latitude: 37.7849, longitude: -122.4094 },
        metadata: { journeyId: 'journey_1' }
      };

      const segment2 = {
        start: { latitude: 37.7849, longitude: -122.4094 },
        end: { latitude: 37.7949, longitude: -122.3994 },
        metadata: { journeyId: 'journey_2' }
      };

      // Add segments
      await act(async () => {
        await explorationState.addSegment(segment1);
        await explorationState.addSegment(segment2);
      });

      const journey1Segments = explorationState.getSegmentsForJourney('journey_1');
      const journey2Segments = explorationState.getSegmentsForJourney('journey_2');

      expect(journey1Segments).toHaveLength(1);
      expect(journey2Segments).toHaveLength(1);
      expect(journey1Segments[0].metadata.journeyId).toBe('journey_1');
      expect(journey2Segments[0].metadata.journeyId).toBe('journey_2');
    });
  });

  describe('Current Journey Management', () => {
    test('should update current journey', async () => {
      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const journey = {
        id: 'journey_1',
        name: 'Test Journey',
        status: 'in_progress'
      };

      await act(async () => {
        await explorationState.updateCurrentJourney(journey);
      });

      expect(explorationState.currentJourney).toEqual(journey);
      expect(explorationState.hasCurrentJourney).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    test('should persist current journey when updated', async () => {
      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const journey = {
        id: 'journey_1',
        name: 'Test Journey',
        status: 'in_progress'
      };

      await act(async () => {
        await explorationState.updateCurrentJourney(journey);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        JOURNEY_STORAGE_KEYS.CURRENT_JOURNEY_DATA,
        JSON.stringify(journey)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid segment data', async () => {
      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const invalidSegment = {
        start: null,
        end: { latitude: 37.7849, longitude: -122.4094 }
      };

      await act(async () => {
        try {
          await explorationState.addSegment(invalidSegment);
        } catch (error) {
          expect(error.message).toContain('Invalid segment data');
        }
      });

      expect(explorationState.segments).toHaveLength(0);
    });

    test('should handle AsyncStorage errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      let explorationState = null;

      render(
        <ExplorationProvider>
          <TestComponent onStateChange={(state) => { explorationState = state; }} />
        </ExplorationProvider>
      );

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should still initialize with empty state despite storage error
      expect(explorationState.loading).toBe(false);
      expect(explorationState.segments).toEqual([]);
      expect(explorationState.currentJourney).toBeNull();
      expect(explorationState.explorationHistory).toEqual([]);
    });
  });
});