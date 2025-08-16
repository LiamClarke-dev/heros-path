import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Modal,
  Dimensions 
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * LoadingOverlay component for navigation transitions
 * Provides loading states during navigation and screen transitions
 * Requirements: 1.6 - Loading states during navigation transitions
 */
export function LoadingOverlay({ 
  visible = false,
  message = 'Loading...',
  transparent = true,
  animationType = 'fade',
  showSpinner = true,
  spinnerSize = 'large',
  spinnerColor,
  style,
  textStyle,
  overlayStyle,
  testID = 'loading-overlay'
}) {
  const { theme } = useTheme();
  
  const styles = StyleSheet.create({
    modal: {
      margin: 0,
    },
    overlay: {
      flex: 1,
      backgroundColor: transparent 
        ? 'rgba(0, 0, 0, 0.5)' 
        : theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 24,
      minWidth: 120,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    spinner: {
      marginBottom: message ? 16 : 0,
    },
    text: {
      fontSize: 16,
      color: theme.colors.text,
      textAlign: 'center',
      fontWeight: '500',
    },
  });
  
  const getSpinnerColor = () => {
    return spinnerColor || theme.colors.primary;
  };
  
  if (!visible) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={animationType}
      statusBarTranslucent={true}
      testID={testID}
    >
      <View style={[styles.overlay, overlayStyle]}>
        <View style={[styles.container, style]}>
          {showSpinner && (
            <ActivityIndicator
              size={spinnerSize}
              color={getSpinnerColor()}
              style={styles.spinner}
              testID={`${testID}-spinner`}
            />
          )}
          {message && (
            <Text 
              style={[styles.text, textStyle]}
              testID={`${testID}-text`}
            >
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * FullScreenLoadingOverlay for complete screen coverage
 */
export function FullScreenLoadingOverlay({ 
  visible = false,
  message = 'Loading...',
  backgroundColor,
  ...props 
}) {
  const { theme } = useTheme();
  
  return (
    <LoadingOverlay
      visible={visible}
      message={message}
      transparent={false}
      overlayStyle={{
        backgroundColor: backgroundColor || theme.colors.background,
      }}
      style={{
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      }}
      {...props}
    />
  );
}

/**
 * InlineLoadingOverlay for specific component areas
 */
export function InlineLoadingOverlay({ 
  visible = false,
  message,
  height = 200,
  style,
  ...props 
}) {
  const { theme } = useTheme();
  
  if (!visible) {
    return null;
  }
  
  const styles = StyleSheet.create({
    container: {
      height,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
  });
  
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={{ marginBottom: message ? 16 : 0 }}
      />
      {message && (
        <Text style={{
          fontSize: 16,
          color: theme.colors.text,
          textAlign: 'center',
        }}>
          {message}
        </Text>
      )}
    </View>
  );
}

/**
 * NavigationLoadingOverlay specifically for navigation transitions
 */
export function NavigationLoadingOverlay({ 
  visible = false,
  message = 'Navigating...',
  ...props 
}) {
  return (
    <LoadingOverlay
      visible={visible}
      message={message}
      animationType="fade"
      spinnerSize="large"
      {...props}
    />
  );
}