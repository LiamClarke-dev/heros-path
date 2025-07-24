# Design Document: Discovery Preferences

## Overview

The Discovery Preferences feature provides users with a comprehensive system to customize the types of places they discover during their walks in Hero's Path. This design document outlines the architecture, components, data models, and implementation strategy for this feature, ensuring that users can personalize their discovery experience according to their interests and quality standards.

The feature allows users to:
- Select specific place types they're interested in discovering
- Set minimum rating thresholds for place quality
- Organize preferences by logical categories
- Benefit from smart defaults as new users
- Have their preferences persisted across sessions and devices

This design ensures that the Discovery Preferences feature integrates seamlessly with the app's core discovery functionality, including Search Along Route and Ping Discovery features.

## Architecture

The Discovery Preferences feature follows a layered architecture pattern:

1. **Presentation Layer**
   - `DiscoveryPreferencesScreen.js`: The main UI component for managing preferences
   - UI components for category organization, toggles, and rating selection

2. **Business Logic Layer**
   - `DiscoveriesService.js`: Manages preference logic, validation, and application
   - Handles preference synchronization and default values

3. **Data Layer**
   - Local storage (AsyncStorage) for offline preference persistence
   - Cloud storage (Firestore) for cross-device synchronization
   - Constants for place type definitions

4. **Integration Layer**
   - Integration with Google Places API through `NewPlacesService.js`
   - Integration with discovery features through preference filtering

### System Flow

```mermaid
sequenceDiagram
    participant User
    participant PreferencesScreen
    participant DiscoveriesService
    participant Storage
    participant PlacesAPI
    
    User->>PreferencesScreen: Open preferences
    PreferencesScreen->>DiscoveriesService: getUserDiscoveryPreferences()
    DiscoveriesService->>Storage: Load preferences
    Storage-->>DiscoveriesService: Return saved preferences
    DiscoveriesService-->>PreferencesScreen: Display preferences
    
    User->>PreferencesScreen: Toggle place type
    PreferencesScreen->>DiscoveriesService: Update preference
    DiscoveriesService->>Storage: Save preference
    
    User->>PreferencesScreen: Set minimum rating
    PreferencesScreen->>DiscoveriesService: Update minimum rating
    DiscoveriesService->>Storage: Save minimum rating
    
    User->>PreferencesScreen: Reset to defaults
    PreferencesScreen->>DiscoveriesService: resetDiscoveryPreferences()
    DiscoveriesService->>Storage: Save default preferences
    
    Note over User,PlacesAPI: Later, during discovery
    User->>DiscoveriesService: Trigger discovery
    DiscoveriesService->>Storage: Load preferences
    DiscoveriesService->>PlacesAPI: Apply preferences to query
    PlacesAPI-->>DiscoveriesService: Return filtered results
    DiscoveriesService-->>User: Show personalized discoveries
```

## Components and Interfaces

### 1. DiscoveryPreferencesScreen

The main UI component for managing preferences, with the following features:

- **Category Headers**: Expandable/collapsible sections for organizing place types
- **Place Type Toggles**: Individual switches for each place type
- **Minimum Rating Selector**: UI for selecting rating threshold
- **Reset Button**: Option to restore default preferences
- **Category Counters**: Shows enabled/total count for each category

```javascript
// Component Interface
interface DiscoveryPreferencesScreenProps {
  navigation: NavigationProp;
}

// Component State
interface DiscoveryPreferencesState {
  discoveryPreferences: Record<string, boolean>; // Map of place type keys to enabled state
  minRating: number; // Minimum rating threshold
  expandedCategories: Record<string, boolean>; // Map of category titles to expanded state
}
```

### 2. DiscoveriesService

Service responsible for managing discovery preferences:

```javascript
// Service Interface
interface DiscoveriesService {
  getUserDiscoveryPreferences(): Promise<Record<string, boolean>>;
  getMinRatingPreference(): Promise<number>;
  resetDiscoveryPreferences(): Promise<Record<string, boolean>>;
  syncPreferencesWithPlaceTypes(existingPrefs: Record<string, boolean>): Promise<Record<string, boolean>>;
  filterPlacesByPreferences(places: Place[], preferences: Record<string, boolean>): Place[];
}
```

### 3. Place Types Constants

Defines the available place types and their organization:

```javascript
// Place Type Definition
interface PlaceType {
  key: string; // API key for the place type
  label: string; // User-friendly label
}

// Place Category Definition
interface PlaceCategory {
  title: string; // Category name
  icon: string; // Material icon name
  types: string[]; // Array of place type keys
}
```

## Data Models

### 1. User Preferences Model

```javascript
interface UserPreferences {
  placeTypes: Record<string, boolean>; // Map of place type keys to enabled state
  minRating: number; // Minimum rating threshold (1.0 to 5.0)
  lastUpdated: Timestamp; // When preferences were last modified

  // NEW: Migration framework support
  schemaVersion: Number; // Schema version for migration tracking
  lastMigrationAt: String; // Timestamp of last migration
  migrationHistory: Array; // Array of migration records

  // NEW: Developer tools support
  devMode: Boolean; // Whether in developer mode
  mockData: Boolean; // Whether using mock data

  // NEW: Performance optimization
  cacheKey: String; // Cache key for optimization

  // NEW: Extension points for future features
  metadata: Object; // Extensible metadata
  extensions: Object; // Extension points for future features

  // NEW: Theme-based discovery preferences
  themePreferences: {
    mapStyle: String; // Preferred map style for discovery
    visualTheme: String; // Visual theme preference
    colorScheme: String; // Color scheme for place categories
    iconStyle: String; // Icon style preference
  };

  // NEW: Destination routing preferences
  routingPreferences: {
    preferredTransportMode: String; // Walking, cycling, etc.
    avoidHighways: Boolean; // Avoid highways in routing
    maxDetourDistance: Number; // Maximum detour distance for discoveries
    preferScenicRoutes: Boolean; // Prefer scenic routes
  };

  // NEW: Enhanced place data preferences
  enhancedDataPreferences: {
    includePhotos: Boolean; // Include place photos
    includeReviews: Boolean; // Include place reviews
    includeOperatingHours: Boolean; // Include operating hours
    includeAccessibility: Boolean; // Include accessibility info
    dataCacheExpiry: Number; // Cache expiry time for enhanced data
  };
}
```

### 2. Place Type Model

```javascript
interface PlaceType {
  key: string; // Must match Google Places API type exactly
  label: string; // User-friendly display name

  // NEW: Migration framework support
  schemaVersion: Number; // Schema version for migration tracking
  lastMigrationAt: String; // Timestamp of last migration

  // NEW: Developer tools support
  devMode: Boolean; // Whether in developer mode
  mockData: Boolean; // Whether using mock data

  // NEW: Extension points for future features
  metadata: Object; // Extensible metadata
  extensions: Object; // Extension points for future features

  // NEW: Enhanced place type data
  enhancedData: {
    description: String; // Detailed description of place type
    popularity: Number; // Popularity score among users
    averageRating: Number; // Average rating for this place type
    icon: String; // Enhanced icon identifier
    color: String; // Associated color for theming
    category: String; // Parent category identifier
  };

  // NEW: UI framework extensions
  uiExtensions: {
    customIcon: String; // Custom icon URL or identifier
    displayOrder: Number; // Custom display order
    grouping: String; // Custom grouping identifier
    visibility: Boolean; // Whether visible in UI
    advanced: Boolean; // Whether it's an advanced option
  };
}
```

### 3. Place Category Model

```javascript
interface PlaceCategory {
  title: string; // Category name
  icon: string; // Icon identifier
  types: string[]; // Array of place type keys in this category

  // NEW: Migration framework support
  schemaVersion: Number; // Schema version for migration tracking
  lastMigrationAt: String; // Timestamp of last migration

  // NEW: Developer tools support
  devMode: Boolean; // Whether in developer mode
  mockData: Boolean; // Whether using mock data

  // NEW: Extension points for future features
  metadata: Object; // Extensible metadata
  extensions: Object; // Extension points for future features

  // NEW: Extensible UI framework
  uiFramework: {
    expandable: Boolean; // Whether category is expandable
    collapsible: Boolean; // Whether category can be collapsed
    sortable: Boolean; // Whether types can be reordered
    customizable: Boolean; // Whether users can customize
    theme: String; // Theme variant for this category
  };

  // NEW: Performance optimization
  performance: {
    loadPriority: Number; // Loading priority (1-10)
    cacheStrategy: String; // Caching strategy for this category
    preloadTypes: Boolean; // Whether to preload place types
    batchSize: Number; // Batch size for loading types
  };

  // NEW: Enhanced category data
  enhancedData: {
    description: String; // Category description
    examples: Array; // Example place names
    averagePopularity: Number; // Average popularity in category
    userEngagement: Number; // User engagement score
  };
}
```

## Error Handling

1. **Preference Loading Errors**
   - If local preferences fail to load, fall back to default preferences
   - Log errors but don't disrupt the user experience
   - Retry cloud synchronization on next app launch

2. **Preference Saving Errors**
   - Implement retry logic for cloud synchronization
   - Always save to local storage first, then attempt cloud sync
   - Notify user only for critical errors that affect functionality

3. **API Integration Errors**
   - If preference application fails during discovery, fall back to default preferences
   - Log detailed error information for debugging
   - Implement graceful degradation to ensure discovery still works

## Testing Strategy

1. **Unit Tests**
   - Test preference loading/saving functions
   - Test preference synchronization logic
   - Test default preference generation
   - Test place filtering based on preferences

2. **Integration Tests**
   - Test integration with AsyncStorage and Firestore
   - Test integration with Google Places API
   - Test preference application in discovery workflows

3. **UI Tests**
   - Test category expansion/collapse
   - Test toggle state persistence
   - Test minimum rating selection
   - Test reset functionality

4. **User Acceptance Testing**
   - Verify preferences are correctly applied to discoveries
   - Verify preferences persist across app restarts
   - Verify preferences sync across devices
   - Verify UI is intuitive and responsive

## Implementation Details

### Storage Strategy

1. **Local Storage (AsyncStorage)**
   - Key: `@discovery_preferences` for place type preferences
   - Key: `@discovery_min_rating` for minimum rating
   - Format: JSON string of preference object

2. **Cloud Storage (Firestore)**
   - Collection: `users/{userId}/settings`
   - Document: `discoveryPreferences`
   - Fields: `placeTypes` (map), `minRating` (number), `lastUpdated` (timestamp)

### Default Preferences

The default preferences will be set as follows:

1. **Minimum Rating**: 4.0 (to ensure quality discoveries)
2. **Enabled Place Types**:
   - Food & Dining: restaurant, cafe, bar
   - Entertainment & Culture: museum, art_gallery, tourist_attraction
   - Outdoors & Recreation: park
   - (Other categories disabled by default)

### Preference Synchronization

1. **Device to Cloud**:
   - Save to AsyncStorage immediately on change
   - Debounce cloud updates (500ms) to prevent excessive writes
   - Include timestamp for conflict resolution

2. **Cloud to Device**:
   - Fetch on app startup
   - Merge with local preferences (newer wins)
   - Update local storage with merged result

### Place Type Management

1. **Adding New Place Types**:
   - When new place types are added to the system, they will be enabled by default
   - Existing user preferences will be preserved
   - The `syncPreferencesWithPlaceTypes` function will handle this logic

2. **Removing Place Types**:
   - If a place type is removed from the system, it will be removed from user preferences
   - This prevents errors when applying preferences to API queries

## Performance Considerations

1. **Preference Loading**:
   - Load from AsyncStorage first for immediate display
   - Fetch from cloud in background and merge if newer
   - Cache in memory during app session to reduce storage reads

2. **UI Rendering**:
   - Use collapsible categories to reduce initial render load
   - Implement virtualized lists if place type count grows significantly
   - Optimize toggle components to prevent unnecessary re-renders

3. **API Integration**:
   - Filter preferences before API calls to reduce data transfer
   - Cache filtered results when appropriate
   - Implement batch updates for cloud synchronization

## Dependencies and Extensions

### Dependent Features

- [Destination Routing](../tier-3-enhancement/destination-routing/design.md) - Uses routing preferences for route planning
- [Theme & Map Style](../tier-3-enhancement/theme-map-style/design.md) - Uses theme preferences for visual customization
- [Enhanced Places Integration](../tier-3-enhancement/enhanced-places-integration/design.md) - Uses enhanced data preferences for rich place information
- [Performance Optimization](../tier-3-enhancement/performance-optimization/design.md) - Uses preference caching and optimization strategies

### Extension Points

#### **Theme-Based Discovery**: Support for destination routing preferences
- **Used by**: [Destination Routing](../tier-3-enhancement/destination-routing/design.md), [Theme & Map Style](../tier-3-enhancement/theme-map-style/design.md)
- **Implementation**: Extended `themePreferences` and `routingPreferences` objects in UserPreferences Model
- **Features**:
  - Map style preferences for discovery visualization
  - Transport mode preferences for routing integration
  - Visual theme and color scheme customization
  - Scenic route preferences and detour distance limits

#### **Extensible UI**: Framework for additional preference types
- **Used by**: [Enhanced Places Integration](../tier-3-enhancement/enhanced-places-integration/design.md)
- **Implementation**: Enhanced `uiFramework` object in PlaceCategory Model and `uiExtensions` in PlaceType Model
- **Features**:
  - Expandable and collapsible category management
  - Sortable and customizable place type ordering
  - Custom icon and grouping support
  - Advanced preference visibility controls

#### **Enhanced Places**: Integration with enhanced place data
- **Used by**: [Enhanced Places Integration](../tier-3-enhancement/enhanced-places-integration/design.md)
- **Implementation**: Enhanced `enhancedDataPreferences` object in UserPreferences Model
- **Features**:
  - Photo, review, and operating hours preferences
  - Accessibility information preferences
  - Configurable data cache expiry settings
  - Rich place metadata support

#### **Performance Optimization**: Preference caching and optimization
- **Used by**: [Performance Optimization](../tier-3-enhancement/performance-optimization/design.md)
- **Implementation**: Performance optimization fields and caching strategies
- **Features**:
  - Intelligent preference caching with configurable expiry
  - Load priority and batch processing for categories
  - Memory optimization for large preference sets
  - Network-efficient preference synchronization

### Migration Considerations

- **Schema version**: 2.0
- **Migration requirements**:
  - Add new preference fields to existing user preferences
  - Initialize theme preferences with sensible defaults
  - Migrate routing preferences from legacy settings
  - Update place type and category models with enhanced data
- **Backward compatibility**: Yes - new preference fields are optional with default values
- **Migration strategy**: Progressive migration during user preference updates with fallback to defaults

### Developer Tools Integration

- **Testing support**:
  - Mock preference data for different user scenarios
  - Preference validation and constraint testing
  - Theme and routing preference simulation
  - Performance testing with large preference sets
- **Mock data support**:
  - Configurable place type and category data
  - Simulated user preference profiles
  - Theme variation testing data
  - Performance benchmark scenarios
- **Simulation capabilities**:
  - Preference loading and saving simulation
  - Theme switching and routing preference testing
  - Enhanced place data preference simulation
  - Network condition simulation for preference sync

### Performance Optimization

- **Caching strategy**:
  - Preference data caching with intelligent invalidation
  - Place type and category metadata caching
  - Theme asset preloading and caching
  - Routing preference optimization for quick access
- **Optimization hooks**:
  - Lazy loading of preference UI components
  - Batch processing for preference updates
  - Debounced preference saving to reduce I/O
  - Memory-efficient preference data structures
- **Performance considerations**:
  - UI rendering optimization for large preference lists
  - Network usage minimization for preference sync
  - Battery impact reduction through efficient caching
  - Responsive UI during preference loading and saving