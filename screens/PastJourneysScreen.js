/**
 * PastJourneysScreen - Main screen for viewing and managing past journeys
 * 
 * Single Responsibility: Journey list display and management orchestration
 * Requirements: 3.1, 3.2, 3.3, 3.6, 4.1, 4.2, 4.5
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { JourneyListDisplay } from '../components/journeys/JourneyListDisplay';
import { useJourneyList } from '../hooks/useJourneyList';

const PastJourneysScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const journeyListState = useJourneyList();

  /**
   * Handle navigation to journey discoveries
   * Requirements: 3.3, 4.2
   */
  const handleNavigateToDiscoveries = useCallback((journey) => {
    // Navigate to the Discoveries tab with journey context
    navigation.navigate('Discoveries', {
      screen: 'DiscoveriesMain',
      params: {
        journeyId: journey.id,
        journeyName: journey.name,
        fromJourneyList: true
      }
    });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <JourneyListDisplay 
        {...journeyListState} 
        onNavigateToDiscoveries={handleNavigateToDiscoveries}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PastJourneysScreen;