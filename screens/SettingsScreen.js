/**
 * Settings Screen
 * 
 * Main settings screen with navigation to various preference screens
 * including Discovery Preferences.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Settings Screen Component
 * Provides navigation to various settings screens
 */
const SettingsScreen = React.memo(({ navigation }) => {
  const { theme } = useTheme();

  // Navigate to Discovery Preferences
  const handleDiscoveryPreferences = useCallback(() => {
    navigation.navigate('DiscoveryPreferences');
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Discovery Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Discovery
          </Text>
          
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleDiscoveryPreferences}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                <MaterialIcons name="tune" size={20} color={theme.colors.background} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Discovery Preferences
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Customize place types and rating filters
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Other Settings Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            General
          </Text>
          
          <View style={[styles.settingItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: 0.6 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.textSecondary }]}>
                <MaterialIcons name="palette" size={20} color={theme.colors.background} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textSecondary }]}>
                  Theme Settings
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Coming soon
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
});

SettingsScreen.displayName = 'SettingsScreen';

export default SettingsScreen;