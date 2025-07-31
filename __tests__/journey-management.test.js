/**
 * Journey Management Tests
 * Tests for task 5.2 - Journey management functions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';

// Mock components and hooks
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: '#FFFFFF',
        text: '#000000',
        primary: '#4A90E2',
        error: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
        textSecondary: '#666666',
        card: '#F8F9FA',
        border: '#E1E1E1',
        surface: '#FFFFFF',
        notification: '#FF3B30'
      }
    }
  })
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: { uid: 'test-user-id' },
    isAuthenticated: true
  })
}));

jest.mock('../services/JourneyService', () => ({
  getUserJourneys: jest.fn().mockResolvedValue([
    {
      id: 'journey-1',
      name: 'Test Journey',
      createdAt: new Date('2025-01-27T10:00:00Z'),
      distance: 1000,
      duration: 600000,
      isCompleted: false,
      completionPercentage: 50,
      reviewedDiscoveriesCount: 2,
      totalDiscoveriesCount: 4
    }
  ]),
  deleteJourney: jest.fn().mockResolvedValue(true)
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate
  })
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

import { PastJourneysScreen } from '../screens/PastJourneysScreen';
import { JourneyListDisplay } from '../components/journeys/JourneyListDisplay';
import { JourneyListItem } from '../components/journeys/JourneyListItem';

describe('Journey Management Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation to Journey Discoveries', () => {
    it('should navigate to discoveries when journey is pressed', async () => {
      const TestWrapper = () => (
        <NavigationContainer>
          <PastJourneysScreen />
        </NavigationContainer>
      );

      const { getByText } = render(<TestWrapper />);
      
      await waitFor(() => {
        expect(getByText('Test Journey')).toBeTruthy();
      });

      // Simulate journey press
      fireEvent.press(getByText('Test Journey'));

      expect(mockNavigate).toHaveBeenCalledWith('Discoveries', {
        screen: 'DiscoveriesMain',
        params: {
          journeyId: 'journey-1',
          journeyName: 'Test Journey',
          fromJourneyList: true
        }
      });
    });
  });

  describe('Journey Deletion with Confirmation', () => {
    it('should show confirmation dialog when delete is pressed', () => {
      const mockOnDelete = jest.fn();
      const journey = {
        id: 'journey-1',
        name: 'Test Journey'
      };
      const metadata = {
        name: 'Test Journey',
        date: '1/27/2025',
        time: '10:00 AM',
        distance: '1.00 km',
        duration: '10m'
      };
      const completionStatus = {
        isCompleted: false,
        completionPercentage: 50,
        reviewedCount: 2,
        totalCount: 4,
        hasDiscoveries: true
      };

      const { getByTestId } = render(
        <JourneyListItem
          journey={journey}
          metadata={metadata}
          completionStatus={completionStatus}
          onPress={jest.fn()}
          onDelete={mockOnDelete}
        />
      );

      // Find and press delete button
      const deleteButton = getByTestId('delete-button');
      fireEvent.press(deleteButton);

      // Verify confirmation dialog is shown
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Journey',
        'Are you sure you want to delete "Test Journey"? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' })
        ])
      );
    });
  });

  describe('Journey Completion Status Indicators', () => {
    it('should display completion status correctly', () => {
      const completionStatus = {
        isCompleted: false,
        completionPercentage: 75,
        reviewedCount: 3,
        totalCount: 4,
        hasDiscoveries: true
      };

      const { getByText } = render(
        <JourneyCompletionIndicator completionStatus={completionStatus} />
      );

      expect(getByText('Partially reviewed')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
    });

    it('should show completed status when journey is fully reviewed', () => {
      const completionStatus = {
        isCompleted: true,
        completionPercentage: 100,
        reviewedCount: 4,
        totalCount: 4,
        hasDiscoveries: true
      };

      const { getByText } = render(
        <JourneyCompletionIndicator completionStatus={completionStatus} />
      );

      expect(getByText('Discoveries reviewed')).toBeTruthy();
      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('Refresh Functionality', () => {
    it('should support pull-to-refresh', () => {
      const mockRefreshJourneys = jest.fn();
      const props = {
        journeys: [],
        loading: false,
        refreshing: false,
        error: null,
        sortBy: 'date',
        sortOrder: 'desc',
        refreshJourneys: mockRefreshJourneys,
        deleteJourney: jest.fn(),
        updateSort: jest.fn(),
        getJourneyCompletionStatus: jest.fn(),
        formatJourneyMetadata: jest.fn(),
        hasJourneys: false,
        isEmpty: true,
        onNavigateToDiscoveries: jest.fn()
      };

      const { getByTestId } = render(<JourneyListDisplay {...props} />);
      
      // Find the FlatList and trigger refresh
      const flatList = getByTestId('journey-list');
      fireEvent(flatList, 'refresh');

      expect(mockRefreshJourneys).toHaveBeenCalled();
    });
  });
});