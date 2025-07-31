/**
 * PastJourneysScreen - Main screen for viewing and managing past journeys
 * 
 * Single Responsibility: Journey list display and management orchestration
 * Requirements: 3.1, 3.2, 3.3, 3.6, 4.1, 4.2, 4.5
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { JourneyListDisplay } from '../components/journeys/JourneyListDisplay';
import { useJourneyList } from '../hooks/useJourneyList';

const PastJourneysScreen = () => {
  const { theme } = useTheme();
  const journeyListState = useJourneyList();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <JourneyListDisplay {...journeyListState} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PastJourneysScreen;