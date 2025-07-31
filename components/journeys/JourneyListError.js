/**
 * JourneyListError - Error state component for journey list
 * 
 * Single Responsibility: Error display with retry functionality
 * Requirements: 3.1, 3.2
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export const JourneyListError = React.memo(({ error, onRetry }) => {
  const { theme } = useTheme();

  const getErrorMessage = (errorString) => {
    if (errorString.includes('network') || errorString.includes('connection')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to load your journeys. Please check your internet connection and try again.',
        icon: 'wifi-outline',
      };
    }
    
    if (errorString.includes('permission') || errorString.includes('unauthorized')) {
      return {
        title: 'Access Denied',
        message: 'Unable to access your journey data. Please try signing in again.',
        icon: 'lock-closed-outline',
      };
    }
    
    return {
      title: 'Something Went Wrong',
      message: 'We encountered an error while loading your journeys. Please try again.',
      icon: 'alert-circle-outline',
    };
  };

  const errorInfo = getErrorMessage(error);

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
      backgroundColor: `${theme.colors.error}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    errorDetails: {
      marginTop: 24,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: '100%',
    },
    errorDetailsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    errorDetailsText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontFamily: 'monospace',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={errorInfo.icon}
          size={40}
          color={theme.colors.error}
        />
      </View>
      
      <Text style={styles.title}>{errorInfo.title}</Text>
      
      <Text style={styles.message}>{errorInfo.message}</Text>
      
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Ionicons
          name="refresh-outline"
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      
      {__DEV__ && (
        <View style={styles.errorDetails}>
          <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
          <Text style={styles.errorDetailsText}>{error}</Text>
        </View>
      )}
    </View>
  );
});

JourneyListError.displayName = 'JourneyListError';