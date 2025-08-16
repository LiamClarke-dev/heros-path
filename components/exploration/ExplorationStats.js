import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useExploration } from '../../contexts/ExplorationContext';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ExplorationStats Component
 * 
 * Displays exploration statistics including segment count, current journey status,
 * and exploration history. This component demonstrates how to use the ExplorationContext
 * in a UI component.
 * 
 * Requirements: 3.4, 5.2
 */
const ExplorationStats = ({ style }) => {
  const { theme } = useTheme();
  const {
    segmentCount,
    hasCurrentJourney,
    currentJourney,
    historyCount,
    loading,
    error
  } = useExploration();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }, style]}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading exploration data...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }, style]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Error loading exploration data
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }, style]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Exploration Stats
      </Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {segmentCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Segments
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {historyCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            History
          </Text>
        </View>
      </View>

      <View style={styles.journeyStatus}>
        <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
          Current Journey:
        </Text>
        {hasCurrentJourney ? (
          <View style={styles.journeyInfo}>
            <Text style={[styles.journeyName, { color: theme.colors.text }]}>
              {currentJourney.name || 'Unnamed Journey'}
            </Text>
            <Text style={[styles.journeyStatus, { color: theme.colors.secondary }]}>
              {currentJourney.status || 'Active'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.noJourney, { color: theme.colors.textSecondary }]}>
            No active journey
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  journeyStatus: {
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
    paddingTop: 12,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  journeyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  journeyStatus: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  noJourney: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ExplorationStats;