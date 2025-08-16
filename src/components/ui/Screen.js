/**
 * Screen Component - Base Screen Wrapper
 * 
 * Provides consistent screen layout and styling across the app
 * Handles safe area, headers, and common screen patterns
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Screen Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Screen content
 * @param {boolean} props.scrollable - Whether the screen should be scrollable
 * @param {boolean} props.safeArea - Whether to use SafeAreaView (default: true)
 * @param {Object} props.style - Additional styles for the container
 * @param {Object} props.contentContainerStyle - Styles for the content container (when scrollable)
 * @param {string} props.backgroundColor - Override background color
 * @param {boolean} props.padding - Whether to apply default padding (default: true)
 * @param {string} props.paddingSize - Padding size from theme (xs, sm, md, lg, xl)
 */
const Screen = ({
  children,
  scrollable = false,
  safeArea = true,
  style,
  contentContainerStyle,
  backgroundColor,
  padding = true,
  paddingSize = 'md',
  ...props
}) => {
  const { theme } = useTheme();

  const containerStyle = [
    styles.container,
    {
      backgroundColor: backgroundColor || theme.colors.background,
      padding: padding ? theme.spacing[paddingSize] : 0,
    },
    style,
  ];

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );

  if (safeArea) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {scrollable ? (
          <View style={containerStyle}>
            {content}
          </View>
        ) : (
          content
        )}
      </SafeAreaView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default Screen;