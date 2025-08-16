import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeAwareNavigationWrapper, ThemeAwareText } from './ThemeAwareNavigationWrapper';
import { ThemeSwitcher, CompactThemeSwitcher } from './ThemeSwitcher';
import { NavigationButton } from './NavigationButton';

/**
 * Test component to verify theme integration across navigation components
 * This component can be used during development to test theme switching
 */
export function NavigationThemeTest() {
  const { theme, navigationStyles, currentTheme } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    section: {
      padding: 16,
      marginVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      flexWrap: 'wrap',
    },
    colorSwatch: {
      width: 30,
      height: 30,
      borderRadius: 15,
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    label: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    value: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 12,
    },
  });
  
  const colorTests = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'textSecondary', label: 'Text Secondary' },
    { key: 'border', label: 'Border' },
  ];
  
  return (
    <ScrollView style={styles.container}>
      <ThemeAwareNavigationWrapper style={styles.section}>
        <Text style={styles.sectionTitle}>Current Theme: {currentTheme}</Text>
        <ThemeSwitcher />
      </ThemeAwareNavigationWrapper>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme Colors</Text>
        {colorTests.map(({ key, label }) => (
          <View key={key} style={styles.row}>
            <View 
              style={[
                styles.colorSwatch, 
                { backgroundColor: theme.colors[key] }
              ]} 
            />
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{theme.colors[key]}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigation Styles</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Tab Bar Active</Text>
          <Text style={styles.value}>{navigationStyles.tabBarActive}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Drawer Active</Text>
          <Text style={styles.value}>{navigationStyles.drawerActive}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overlay Color</Text>
          <Text style={styles.value}>{navigationStyles.overlayColor}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme-Aware Components</Text>
        
        <ThemeAwareText style={{ fontSize: 16, marginVertical: 8 }}>
          This text updates with theme changes
        </ThemeAwareText>
        
        <View style={styles.buttonRow}>
          <NavigationButton
            title="Primary"
            variant="primary"
            onPress={() => console.log('Primary pressed')}
          />
          <NavigationButton
            title="Secondary"
            variant="secondary"
            onPress={() => console.log('Secondary pressed')}
          />
        </View>
        
        <View style={styles.buttonRow}>
          <NavigationButton
            title="Ghost"
            variant="ghost"
            onPress={() => console.log('Ghost pressed')}
          />
          <CompactThemeSwitcher />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessibility</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Text on Primary Contrast</Text>
          <Text style={styles.value}>
            {navigationStyles.contrastRatios.textOnPrimary.toFixed(2)}:1
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Text on Surface Contrast</Text>
          <Text style={styles.value}>
            {navigationStyles.contrastRatios.textOnSurface.toFixed(2)}:1
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}