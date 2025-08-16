import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * NavigationBadge component for notification indicators
 * Displays badge counts on navigation items
 * Requirements: 3.6 - Tab badge system for notifications
 */
export function NavigationBadge({ 
  count = 0, 
  maxCount = 99, 
  showZero = false,
  size = 'medium',
  variant = 'primary',
  style,
  testID
}) {
  const { theme } = useTheme();
  
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }
  
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          fontSize: 10,
        };
      case 'large':
        return {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          fontSize: 14,
        };
      default: // medium
        return {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          fontSize: 12,
        };
    }
  };
  
  const getBadgeColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.secondary;
      case 'warning':
        return theme.colors.warning || '#FF9500';
      case 'error':
        return theme.colors.error || '#FF3B30';
      case 'success':
        return theme.colors.success || '#34C759';
      default: // primary
        return theme.colors.primary;
    }
  };
  
  const badgeSize = getBadgeSize();
  const badgeColor = getBadgeColor();
  
  const styles = StyleSheet.create({
    badge: {
      backgroundColor: badgeColor,
      minWidth: badgeSize.minWidth,
      height: badgeSize.height,
      borderRadius: badgeSize.borderRadius,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      position: 'absolute',
      top: -8,
      right: -8,
      zIndex: 1,
      // Ensure minimum touch target for accessibility
      minHeight: 20,
    },
    text: {
      color: '#FFFFFF',
      fontSize: badgeSize.fontSize,
      fontWeight: 'bold',
      textAlign: 'center',
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
  });
  
  return (
    <View 
      style={[styles.badge, style]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${count} notification${count !== 1 ? 's' : ''}`}
    >
      <Text style={styles.text} numberOfLines={1}>
        {displayCount}
      </Text>
    </View>
  );
}

/**
 * BadgeWrapper component to wrap navigation items with badges
 */
export function BadgeWrapper({ children, badgeCount, badgeProps, style }) {
  return (
    <View style={[{ position: 'relative' }, style]}>
      {children}
      <NavigationBadge count={badgeCount} {...badgeProps} />
    </View>
  );
}