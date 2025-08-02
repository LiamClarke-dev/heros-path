/**
 * Reset Preferences Button Component
 * 
 * Button component for resetting discovery preferences to defaults with
 * confirmation dialog and visual feedback. Connects to resetDiscoveryPreferences
 * function from the service.
 * 
 * Requirements: 4.3
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Reset Preferences Button Component
 * Provides reset functionality with confirmation and feedback
 */
const ResetPreferencesButton = React.memo(({
  onReset,
}) => {
  const { theme } = useTheme();
  const [isResetting, setIsResetting] = useState(false);

  // Handle reset button press with confirmation
  const handleResetPress = useCallback(() => {
    Alert.alert(
      'Reset Preferences',
      'This will reset all your discovery preferences to the default settings. Are you sure you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: handleConfirmReset,
        },
      ],
      { cancelable: true }
    );
  }, []);

  // Handle confirmed reset action
  const handleConfirmReset = useCallback(async () => {
    try {
      setIsResetting(true);
      
      // Call the reset function
      await onReset();
      
      // Show success feedback
      Alert.alert(
        'Preferences Reset',
        'Your discovery preferences have been reset to the default settings.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('ResetPreferencesButton: Error resetting preferences:', error);
      
      // Show error feedback
      Alert.alert(
        'Reset Failed',
        'There was an error resetting your preferences. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsResetting(false);
    }
  }, [onReset]);

  // Animated style for the button
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(isResetting ? 0.95 : 1, { duration: 200 });
    const opacity = withTiming(isResetting ? 0.7 : 1, { duration: 200 });

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for the icon (pulse effect when resetting)
  const iconAnimatedStyle = useAnimatedStyle(() => {
    if (isResetting) {
      return {
        transform: [
          {
            scale: withSequence(
              withTiming(1.2, { duration: 300 }),
              withTiming(1, { duration: 300 }),
              withDelay(100, withTiming(1.2, { duration: 300 })),
              withTiming(1, { duration: 300 })
            ),
          },
        ],
      };
    }
    return {
      transform: [{ scale: 1 }],
    };
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleResetPress}
        disabled={isResetting}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.error,
            },
            buttonAnimatedStyle,
          ]}
        >
          <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
            <MaterialIcons
              name="restore"
              size={20}
              color={theme.colors.error}
            />
          </Animated.View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.buttonText, { color: theme.colors.error }]}>
              {isResetting ? 'Resetting...' : 'Reset to Defaults'}
            </Text>
            <Text style={[styles.buttonSubtext, { color: theme.colors.textSecondary }]}>
              Restore original preference settings
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  buttonSubtext: {
    fontSize: 13,
    fontWeight: '400',
  },
});

ResetPreferencesButton.displayName = 'ResetPreferencesButton';

export default ResetPreferencesButton;