/**
 * JourneyListEmpty - Empty state component for journey list
 * 
 * Single Responsibility: Empty state display with call-to-action
 * Requirements: 3.1, 3.2
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export const JourneyListEmpty = React.memo(() => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      backgroundColor: theme.colors.background,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    instructionContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: '100%',
    },
    instructionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    instructionStep: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    stepText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
  });

  const instructions = [
    'Go to the Map screen',
    'Tap the tracking button to start recording',
    'Take a walk and explore new places',
    'Stop tracking and save your journey',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="trail-sign-outline"
          size={40}
          color={theme.colors.primary}
        />
      </View>
      
      <Text style={styles.title}>No Journeys Yet</Text>
      
      <Text style={styles.subtitle}>
        Start your first adventure! Record your walks and discover interesting places along the way.
      </Text>
      
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionTitle}>How to get started:</Text>
        
        {instructions.map((instruction, index) => (
          <View key={index} style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{instruction}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

JourneyListEmpty.displayName = 'JourneyListEmpty';