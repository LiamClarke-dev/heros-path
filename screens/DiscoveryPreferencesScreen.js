/**
 * Discovery Preferences Screen
 * 
 * Main screen for managing user discovery preferences including place types,
 * minimum rating, and category organization. Follows modular architecture
 * patterns with hook-based state management.
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.3, 3.4
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useDiscoveryPreferences } from '../hooks/useDiscoveryPreferences';
import CategorySection from '../components/ui/CategorySection';
import MinimumRatingSelector from '../components/ui/MinimumRatingSelector';
import ResetPreferencesButton from '../components/ui/ResetPreferencesButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';

/**
 * Discovery Preferences Screen Component
 * Orchestrates preference management UI with minimal business logic
 */
const DiscoveryPreferencesScreen = React.memo(() => {
  const { theme } = useTheme();
  const {
    preferences,
    minRating,
    expandedCategories,
    isLoading,
    toggleCategory,
    togglePlaceType,
    updateMinRating,
    resetPreferences,
  } = useDiscoveryPreferences();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimum Rating Selector */}
        <View style={styles.section}>
          <MinimumRatingSelector
            value={minRating}
            onValueChange={updateMinRating}
          />
        </View>

        {/* Category Sections */}
        <View style={styles.categoriesContainer}>
          <CategorySection
            preferences={preferences}
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
            onTogglePlaceType={togglePlaceType}
          />
        </View>

        {/* Reset Button */}
        <View style={styles.resetSection}>
          <ResetPreferencesButton onReset={resetPreferences} />
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
    marginHorizontal: 16,
    marginTop: 16,
  },
  categoriesContainer: {
    marginTop: 8,
  },
  resetSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
});

DiscoveryPreferencesScreen.displayName = 'DiscoveryPreferencesScreen';

export default DiscoveryPreferencesScreen;