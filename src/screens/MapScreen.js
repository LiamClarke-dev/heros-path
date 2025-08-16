/**
 * Map Screen - Placeholder
 * 
 * This is a placeholder screen for the main map interface.
 * Will be fully implemented in Task 6.4
 * 
 * Updated to demonstrate UI components working with theme system
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Screen, Button, LoadingSpinner, ErrorMessage } from '../components/ui';

const MapScreen = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartJourney = () => {
    setLoading(true);
    setError(null);
    
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
      setError('GPS not available - this is a demo error');
    }, 2000);
  };

  const handleRetry = () => {
    setError(null);
  };

  const styles = StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    status: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    buttonContainer: {
      width: '100%',
      maxWidth: 300,
      gap: theme.spacing.md,
    },
    errorContainer: {
      width: '100%',
      maxWidth: 300,
      marginTop: theme.spacing.lg,
    },
  });

  return (
    <Screen safeArea={false} padding={true}>
      <View style={styles.content}>
        <Text style={styles.title}>Map View</Text>
        <Text style={styles.subtitle}>Journey tracking and navigation</Text>
        <Text style={styles.status}>Demonstrating UI Components</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Start Journey"
            onPress={handleStartJourney}
            variant="primary"
            size="large"
            loading={loading}
            testID="start-journey-button"
          />
          
          <Button
            title="View History"
            onPress={() => {}}
            variant="outline"
            size="medium"
            testID="view-history-button"
          />
          
          <Button
            title="Settings"
            onPress={() => {}}
            variant="ghost"
            size="small"
            testID="settings-button"
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <ErrorMessage
              title="Location Error"
              message={error}
              variant="error"
              onRetry={handleRetry}
              testID="location-error"
            />
          </View>
        )}

        {loading && (
          <LoadingSpinner
            size="large"
            message="Acquiring GPS signal..."
            overlay={false}
            style={{ marginTop: theme.spacing.lg }}
          />
        )}
      </View>
    </Screen>
  );
};

export default MapScreen;