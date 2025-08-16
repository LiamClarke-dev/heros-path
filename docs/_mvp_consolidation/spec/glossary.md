# Hero's Path MVP Glossary

## Overview

This glossary defines key terms, concepts, and domain language used throughout the Hero's Path application. All stakeholders should use these definitions consistently to ensure clear communication and understanding.

**Source**: Generated from repository analysis at `965caea6bcca512353cdc7e4208bc9c3ceb16a0f`  
**Scope**: MVP-focused terminology and concepts

---

## Core Domain Concepts

### Journey
**Definition**: A recorded walking route with associated metadata, tracked via GPS from start to stop.  
**Components**: Start/end times, GPS path coordinates, distance, duration, optional user-provided name.  
**Usage**: "The user completed a 2.5km journey through downtown and discovered 3 new cafés."  
**Technical**: Stored as document in Firestore with path array and calculated statistics.

### Route / Path
**Definition**: The sequence of GPS coordinates that make up a journey's geographic trail.  
**Format**: Array of latitude/longitude coordinate pairs with timestamps.  
**Visualization**: Displayed as polyline overlay on map interface.  
**Processing**: Raw GPS data is filtered and optimized for display and storage.

### Discovery / Place Discovery
**Definition**: The process of finding interesting points of interest (POIs) along a completed journey route.  
**Trigger**: Automatically initiated when user completes a journey.  
**Technology**: Google Places API search along route coordinates.  
**Result**: List of nearby businesses, attractions, and points of interest.

### Point of Interest (POI)
**Definition**: A location of potential interest to walkers, such as restaurants, parks, landmarks, or shops.  
**Source**: Google Places API with business information and ratings.  
**Categories**: Food & drink, attractions, parks, shopping, services, etc.  
**Metadata**: Name, category, rating, address, Google Place ID.

### Saved Place
**Definition**: A POI that a user has chosen to save to their personal collection for future reference.  
**Origin**: Selected from discovered places or manually added.  
**Storage**: User's Firestore subcollection with place metadata.  
**Management**: Can be viewed, organized, and removed by user.

---

## User Interface Terms

### Map Screen
**Definition**: The primary application interface showing the interactive map with user location and journey tracking controls.  
**Components**: Map view, tracking button, control buttons, location indicator.  
**State**: Can show current location, active journey tracking, saved places, or journey history.

### Journey Tracking
**Definition**: The active process of recording a user's movement via GPS while they walk.  
**States**: Inactive, active (tracking), paused (if supported).  
**Visual Feedback**: Real-time polyline drawing on map, tracking button state change.  
**Background**: Continues when app is backgrounded or screen is off.

### Journey History / Past Journeys
**Definition**: The collection of all previously completed and saved journeys for a user.  
**Organization**: Typically sorted by completion date (newest first).  
**Access**: Via dedicated screen or navigation menu.  
**Features**: Browse, search, view details, revisit on map.

### Discovery Results
**Definition**: The list of POIs found along a journey route, displayed to user after journey completion.  
**Presentation**: Modal or screen showing place cards with basic information.  
**User Actions**: View details, save places, dismiss results.  
**Filtering**: May be filtered by category or user preferences.

---

## Technical Architecture Terms

### Context Provider
**Definition**: React Context component that manages and provides application state to child components.  
**Examples**: UserContext (authentication), ThemeContext (styling), NavigationContext (routing).  
**Pattern**: Provider/Consumer pattern for state management without prop drilling.

### Service Class
**Definition**: JavaScript class that encapsulates business logic and external API interactions.  
**Examples**: JourneyService, DiscoveriesService, BackgroundLocationService.  
**Responsibility**: Single responsibility for specific domain operations.  
**Integration**: Used by hooks and contexts, isolated from UI components.

### Custom Hook
**Definition**: React hook that encapsulates stateful logic and side effects for specific features.  
**Examples**: useJourneyTracking, useSavedPlaces, useLocationTracking.  
**Purpose**: Reusable state management and business logic for UI components.  
**Pattern**: Returns state and action functions for component consumption.

### Background Location Service
**Definition**: Service responsible for GPS tracking, location processing, and journey data management.  
**Functionality**: Two-stream processing (journey data + display data), filtering, optimization.  
**Integration**: Works with Expo Location and TaskManager for background tracking.  
**Architecture**: Single source of truth for all location-related operations.

---

## Authentication & User Management

### User Profile
**Definition**: User account information and preferences stored in Firestore.  
**Components**: Display name, email, preferences, statistics, timestamps.  
**Creation**: Automatically created on first sign-in with default values.  
**Management**: Can be updated through app settings and profile screens.

### Authentication Session
**Definition**: The user's logged-in state managed by Firebase Authentication.  
**Persistence**: Automatic session persistence across app restarts.  
**Token Management**: Firebase ID tokens with automatic refresh.  
**State**: Tracked in UserContext and affects app navigation flow.

### Firebase User
**Definition**: The Firebase Authentication user object containing basic auth information.  
**Properties**: UID, email, display name, authentication provider.  
**Usage**: Used to create and link to user profile and user-specific data.  
**Scope**: Authentication only - profile data stored separately in Firestore.

---

## Data and State Management

### State Context
**Definition**: Centralized application state managed through React Context providers.  
**Layers**: Authentication state, theme state, navigation state, feature-specific state.  
**Pattern**: Top-level providers with specific contexts for different concerns.  
**Access**: Consumed via custom hooks (useUser, useTheme, etc.).

### Local Storage / AsyncStorage
**Definition**: Device-local data persistence for preferences, cache, and offline data.  
**Usage**: Theme preferences, user settings, cached journey data.  
**Scope**: Non-sensitive data that doesn't require cloud sync.  
**Management**: Automatic cleanup and size management.

### Firestore Collections
**Definition**: NoSQL database collections storing user data in the cloud.  
**Structure**: User-scoped subcollections for journeys, saved places, preferences.  
**Security**: Firebase security rules ensure users only access their own data.  
**Sync**: Real-time sync with local state when online.

---

## External Integrations

### Google Places API
**Definition**: External service providing business and location information for place discovery.  
**Endpoints**: Nearby Search, Place Details, Text Search.  
**Data**: Business names, categories, ratings, addresses, coordinates.  
**Rate Limits**: API quotas and rate limiting requiring optimization.

### Google Maps API
**Definition**: External service providing map tiles, geocoding, and mapping functionality.  
**Integration**: Via react-native-maps component with Google Maps provider.  
**Features**: Map display, user location, route visualization, place markers.  
**Configuration**: API keys and platform-specific setup.

### Expo Services
**Definition**: Expo platform APIs providing native device functionality.  
**Location**: GPS tracking, background location, permissions management.  
**Auth Session**: OAuth flow management for social logins.  
**Task Manager**: Background task execution for location tracking.

---

## Performance and Optimization

### Two-Stream Processing
**Definition**: Location data processing pattern that creates separate optimized streams for different use cases.  
**Streams**: Journey data (minimal filtering for statistics), display data (heavy processing for visualization).  
**Benefits**: Optimized performance for different consumers without duplicate processing.  
**Implementation**: BackgroundLocationService processes once, provides both streams.

### Location Filtering
**Definition**: Processing pipeline that removes inaccurate or unnecessary GPS points from journey data.  
**Filters**: Accuracy filtering, distance filtering, speed filtering, smoothing.  
**Purpose**: Improve journey quality and reduce data storage requirements.  
**Trade-offs**: Balance between accuracy and data reduction.

### Marker Clustering
**Definition**: Map optimization technique that groups nearby markers into clusters at certain zoom levels.  
**Purpose**: Improve map performance and usability when displaying many saved places.  
**Implementation**: Dynamic clustering based on zoom level and marker density.  
**User Experience**: Smooth map interaction with large numbers of places.

---

## User Experience Patterns

### Progressive Disclosure
**Definition**: UX pattern that reveals information and options progressively based on user needs and context.  
**Examples**: Basic journey info → detailed statistics → discovery results.  
**Purpose**: Avoid overwhelming users while providing access to detailed information.  
**Implementation**: Expandable sections, modal flows, navigation hierarchies.

### Immediate Feedback
**Definition**: UX principle providing instant visual or haptic feedback for user actions.  
**Examples**: Button press animations, loading indicators, success confirmations.  
**Purpose**: Maintain user confidence and understanding of system state.  
**Implementation**: Optimistic updates, skeleton screens, micro-interactions.

### Graceful Degradation
**Definition**: System behavior that maintains core functionality when external services or network connectivity is limited.  
**Examples**: Journey tracking continues offline, cached data when API unavailable.  
**Purpose**: Reliable user experience regardless of external conditions.  
**Implementation**: Local caching, offline-first patterns, error boundaries.

---

## Quality and Testing

### MVP Scope
**Definition**: Minimum Viable Product - the smallest set of features that delivers core user value.  
**Inclusion**: Journey tracking, place discovery, basic management, authentication.  
**Exclusion**: Social features, gamification, advanced preferences, analytics.  
**Purpose**: Focus development effort on proven core value before expanding.

### Acceptance Criteria
**Definition**: Specific, measurable conditions that must be met for a feature to be considered complete.  
**Format**: Given/When/Then scenarios or specific performance/behavior requirements.  
**Purpose**: Clear definition of done for development and testing.  
**Examples**: "Journey saves within 2 seconds", "Discovery returns 3-10 places".

### Error Boundary
**Definition**: React component pattern that catches JavaScript errors in component tree and provides fallback UI.  
**Purpose**: Prevent entire app crashes from isolated component errors.  
**Implementation**: Strategic placement around major features and navigation.  
**User Experience**: Graceful error handling with recovery options.

---

## Development and Maintenance

### Service-Oriented Architecture
**Definition**: Application architecture pattern that organizes functionality into discrete services with specific responsibilities.  
**Benefits**: Separation of concerns, testability, maintainability, scalability.  
**Implementation**: Service classes for business logic, contexts for state, components for UI.  
**Pattern**: Services → Hooks → Components data flow.

### Single Source of Truth
**Definition**: Architectural principle ensuring each piece of data has one authoritative source.  
**Examples**: BackgroundLocationService for location data, UserContext for auth state.  
**Benefits**: Consistency, eliminates sync issues, simplifies debugging.  
**Implementation**: Centralized state management with clear data ownership.

### Code Consolidation
**Definition**: Process of eliminating duplicate code patterns and standardizing implementations.  
**Focus Areas**: Firebase operations, error handling, loading states, UI patterns.  
**Benefits**: Reduced maintenance overhead, consistent behavior, easier testing.  
**Approach**: Create reusable utilities, base classes, and standardized patterns.

---

## Acronyms and Abbreviations

- **API**: Application Programming Interface
- **GPS**: Global Positioning System
- **MVP**: Minimum Viable Product
- **POI**: Point of Interest
- **UI/UX**: User Interface / User Experience
- **CRUD**: Create, Read, Update, Delete (data operations)
- **OAuth**: Open Authorization (authentication standard)
- **SDK**: Software Development Kit
- **JSON**: JavaScript Object Notation
- **HTTP**: HyperText Transfer Protocol
- **HTTPS**: HTTP Secure
- **WCAG**: Web Content Accessibility Guidelines
- **SLA**: Service Level Agreement

---

*This glossary is maintained as part of the MVP consolidation documentation and should be updated as the application evolves.*
