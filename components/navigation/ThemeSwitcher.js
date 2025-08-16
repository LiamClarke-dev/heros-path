import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeAwareNavigationWrapper, ThemeAwareText } from './ThemeAwareNavigationWrapper';
import { useThemeAwareIcons } from '../../hooks/useThemeTransition';

/**
 * Theme switcher component for dynamic theme selection
 * Provides a modal interface for theme selection with preview
 */
export function ThemeSwitcher({ style, showLabel = true }) {
  const { theme, currentTheme, setTheme, availableThemes } = useTheme();
  const { getNavigationIcons } = useThemeAwareIcons();
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const navigationIcons = getNavigationIcons();
  
  const themeDisplayNames = {
    light: 'Light',
    dark: 'Dark',
    adventure: 'Adventure',
    system: 'System',
  };
  
  const themeIcons = {
    light: 'sunny-outline',
    dark: 'moon-outline',
    adventure: 'compass-outline',
    system: 'phone-portrait-outline',
  };
  
  const handleThemeSelect = async (themeName) => {
    try {
      await setTheme(themeName);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error switching theme:', error);
    }
  };
  
  const renderThemeOption = ({ item }) => {
    const isSelected = item === currentTheme;
    
    return (
      <TouchableOpacity
        style={[
          styles.themeOption,
          {
            backgroundColor: isSelected ? theme.colors.primary : 'transparent',
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => handleThemeSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.themeOptionContent}>
          <Ionicons
            name={themeIcons[item] || 'color-palette-outline'}
            size={24}
            color={isSelected ? '#FFFFFF' : theme.colors.text}
          />
          <Text
            style={[
              styles.themeOptionText,
              {
                color: isSelected ? '#FFFFFF' : theme.colors.text,
                marginLeft: 12,
              },
            ]}
          >
            {themeDisplayNames[item] || item}
          </Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#FFFFFF"
          />
        )}
      </TouchableOpacity>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 44,
    },
    buttonText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      width: '80%',
      maxWidth: 300,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginVertical: 4,
      minHeight: 48,
    },
    themeOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    themeOptionText: {
      fontSize: 16,
      fontWeight: '500',
    },
    closeButton: {
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      alignItems: 'center',
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Change theme"
        accessibilityHint="Opens theme selection menu"
      >
        <Ionicons
          name={themeIcons[currentTheme] || 'color-palette-outline'}
          size={20}
          color={theme.colors.text}
        />
        {showLabel && (
          <Text style={styles.buttonText}>
            {themeDisplayNames[currentTheme] || 'Theme'}
          </Text>
        )}
      </TouchableOpacity>
      
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemeAwareNavigationWrapper style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Theme</Text>
            
            <FlatList
              data={availableThemes.concat(['system'])}
              renderItem={renderThemeOption}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
            />
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ThemeAwareNavigationWrapper>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Compact theme switcher for use in navigation headers or toolbars
 */
export function CompactThemeSwitcher({ style }) {
  const { theme, currentTheme, setTheme, availableThemes } = useTheme();
  
  const cycleTheme = async () => {
    const themes = [...availableThemes, 'system'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    try {
      await setTheme(nextTheme);
    } catch (error) {
      console.error('Error cycling theme:', error);
    }
  };
  
  const themeIcons = {
    light: 'sunny-outline',
    dark: 'moon-outline',
    adventure: 'compass-outline',
    system: 'phone-portrait-outline',
  };
  
  return (
    <TouchableOpacity
      style={[
        {
          padding: 8,
          borderRadius: 6,
          minWidth: 44,
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
      onPress={cycleTheme}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Current theme: ${currentTheme}. Tap to cycle themes.`}
    >
      <Ionicons
        name={themeIcons[currentTheme] || 'color-palette-outline'}
        size={24}
        color={theme.colors.text}
      />
    </TouchableOpacity>
  );
}