/**
 * Category Section Component
 * 
 * Renders all place type categories with expandable/collapsible functionality.
 * Each category shows enabled count and can be expanded to show individual
 * place type toggles.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PlaceTypeUtils } from '../../constants/PlaceTypes';
import CategoryHeader from './CategoryHeader';
import CategoryContent from './CategoryContent';

/**
 * Category Section Component
 * Renders all categories with their headers and expandable content
 */
const CategorySection = React.memo(({
  preferences,
  expandedCategories,
  onToggleCategory,
  onTogglePlaceType,
}) => {
  // Get categories sorted by popularity
  const categories = PlaceTypeUtils.getCategoriesByPopularity();

  return (
    <View style={styles.container}>
      {categories.map((categoryTitle) => {
        const categoryInfo = PlaceTypeUtils.getCategoryInfo(categoryTitle);
        const isExpanded = expandedCategories[categoryTitle] || false;
        const stats = PlaceTypeUtils.getCategoryEnabledCount(categoryTitle, preferences);

        return (
          <View key={categoryTitle} style={styles.categoryContainer}>
            <CategoryHeader
              title={categoryTitle}
              icon={categoryInfo.icon}
              isExpanded={isExpanded}
              enabledCount={stats.enabled}
              totalCount={stats.total}
              onToggle={() => onToggleCategory(categoryTitle)}
            />
            
            {isExpanded && (
              <CategoryContent
                categoryTitle={categoryTitle}
                preferences={preferences}
                onTogglePlaceType={onTogglePlaceType}
              />
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 8,
  },
});

CategorySection.displayName = 'CategorySection';

export default CategorySection;