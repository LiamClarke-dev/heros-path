# Hero's Path MVP v0.1 - Clean Build Requirements

## Introduction

This specification defines the requirements for building Hero's Path MVP v0.1 from scratch. Based on the comprehensive analysis in `docs/_mvp_consolidation/`, we're taking a clean build approach rather than refactoring the existing codebase to avoid architectural debt and complexity.

**Why Clean Build**: The existing codebase has 525+ lines of duplicate code, 4 different Firebase patterns, inconsistent error handling, and over-engineered navigation. A clean build will be faster, safer, and result in better architecture.

## MVP Vision

**Core Value**: Transform daily walks into engaging adventures through simple journey tracking and meaningful place discovery.

**User Promise**: "Record your walking routes and discover interesting places along the way."

## Requirements

### Requirement 1: User Authentication

**User Story**: As a walker, I want to sign in to the app so that my journeys and discoveries are saved to my personal account.

#### Acceptance Criteria

1. WHEN I open the app for the first time THEN I SHALL see a sign-in screen
2. WHEN I tap "Sign in with Google" THEN the system SHALL authenticate me using Google OAuth
3. WHEN authentication succeeds THEN the system SHALL create my user profile and navigate to the map screen
4. WHEN I close and reopen the app THEN the system SHALL remember my login and go directly to the map screen
5. IF authentication fails THEN the system SHALL show a clear error message and allow me to try again

### Requirement 2: Map Navigation and Location

**User Story**: As a walker, I want to see a map with my current location so that I can orient myself and start tracking my journey.

#### Acceptance Criteria

1. WHEN I reach the map screen THEN the system SHALL display a map centered on my current location within 3 seconds
2. WHEN I move around THEN the system SHALL update my position indicator on the map in real-time
3. WHEN I tap the "locate me" button THEN the system SHALL center the map on my current location
4. WHEN I pan and zoom the map THEN the system SHALL respond smoothly without lag
5. IF location permission is denied THEN the system SHALL show a clear message explaining why location is needed

### Requirement 3: Journey Tracking

**User Story**: As a walker, I want to record my walking route so that I can see where I've been and track my progress.

#### Acceptance Criteria

1. WHEN I tap the "Start Journey" button THEN the system SHALL begin GPS tracking and show my route as a colored line on the map
2. WHEN I walk around THEN the system SHALL continuously add to my route line in real-time
3. WHEN I put the app in the background THEN the system SHALL continue tracking my location
4. WHEN I tap "Stop Journey" THEN the system SHALL stop tracking and show me a journey summary
5. WHEN I view my journey summary THEN the system SHALL show distance, time, and route visualization
6. IF GPS signal is poor THEN the system SHALL show a warning but continue tracking when signal improves

### Requirement 4: Place Discovery

**User Story**: As a walker, I want to discover interesting places along my route so that I can learn about my surroundings and find new places to visit.

#### Acceptance Criteria

1. WHEN I complete a journey THEN the system SHALL automatically search for interesting places along my route
2. WHEN place discovery completes THEN the system SHALL show me 3-10 relevant places with names, categories, and ratings
3. WHEN I tap on a discovered place THEN the system SHALL show me more details about that place
4. WHEN I find a place interesting THEN the system SHALL allow me to save it to my personal collection
5. IF no places are found THEN the system SHALL show a friendly message explaining that no places were discovered along this route

### Requirement 5: Journey Management

**User Story**: As a walker, I want to save and view my past journeys so that I can remember where I've been and revisit favorite routes.

#### Acceptance Criteria

1. WHEN I complete a journey THEN the system SHALL allow me to give it a custom name before saving
2. WHEN I save a journey THEN the system SHALL store it with the route, distance, time, and any saved places
3. WHEN I want to view past journeys THEN the system SHALL show me a list of all my saved journeys
4. WHEN I tap on a past journey THEN the system SHALL show me the route on the map with journey details
5. WHEN I have many journeys THEN the system SHALL organize them by date and allow me to search

### Requirement 6: Saved Places Management

**User Story**: As a walker, I want to manage my collection of saved places so that I can remember interesting locations I've discovered.

#### Acceptance Criteria

1. WHEN I save a place from discoveries THEN the system SHALL add it to my personal places collection
2. WHEN I want to view my saved places THEN the system SHALL show them as markers on the map
3. WHEN I tap on a saved place marker THEN the system SHALL show me the place details
4. WHEN I no longer want a saved place THEN the system SHALL allow me to remove it from my collection
5. WHEN I have many saved places THEN the system SHALL organize them and allow me to search

## Non-Functional Requirements

### Performance Requirements
- App launch to map view: < 3 seconds
- GPS acquisition: < 5 seconds to first location
- Journey save: < 2 seconds for typical journey
- Place discovery: < 5 seconds for route analysis
- Journey tracking continues without internet connection

### Quality Requirements
- GPS accuracy: ± 5 meters for route tracking
- Battery usage: < 20% per hour during active tracking
- App crash rate: < 1%
- Journey tracking accuracy: > 95%
- Place discovery success rate: > 90%

### Security Requirements
- User data encrypted in transit and at rest
- Minimal required permissions only
- No user data sharing without explicit consent
- Secure token management for authentication

## Technical Constraints

### Platform Requirements
- Target: iOS and Android
- Framework: React Native 0.79.5 with Expo SDK 53
- Minimum iOS: 14.0
- Minimum Android: API 24 (Android 7.0)

### External Dependencies
- **Expo SDK 53** - Leveraged throughout for simplified development
- **Expo Auth Session** - For Google OAuth authentication
- **Expo Location** - For GPS services and background tracking
- **Expo Maps** - For map rendering (preferred over react-native-maps)
- **Expo SecureStore** - For secure token storage
- **Expo TaskManager** - For background location tracking
- Firebase Auth for user authentication backend
- Firestore for data storage
- Google Places API (New) for place discovery

## Out of Scope for MVP

The following features are explicitly excluded from MVP v0.1:
- Social sharing and friend features
- Gamification and achievements
- Advanced discovery preferences
- Custom place lists and collections
- Real-time collaborative features
- Analytics and developer tools
- Complex theming and customization
- Route planning and navigation
- Workout tracking integration
- Export and backup features

## Success Criteria

### User Experience Success
- User can complete first journey within 5 minutes of signup
- User saves at least 1 place from discoveries
- Core journey flow completes without confusion
- App feels responsive and reliable

### Technical Success
- All acceptance criteria met
- Performance requirements achieved
- Quality requirements achieved
- Clean, maintainable codebase with no duplicate patterns
- Comprehensive test coverage (>85%)

## Implementation Notes

### Architecture Principles
1. **Single Responsibility**: Each service/component has one clear purpose
2. **No Duplication**: Build consistent patterns from the start
3. **Simple First**: Choose the simplest solution that works
4. **Test as You Build**: Write tests for each component as it's created
5. **MVP Focus**: Resist feature creep - build only what's specified

### Key Lessons from Analysis
Based on the consolidation analysis, we will avoid these common mistakes:
- Multiple Firebase CRUD patterns (use one consistent approach)
- Inconsistent error handling (centralize from the start)
- Duplicate loading state management (create reusable hook)
- Mixed modal patterns (standardize early)
- Over-engineered navigation (keep it simple for MVP)

### Development Approach
- Build incrementally with continuous testing
- Start with authentication and basic map
- Add journey tracking next
- Implement place discovery
- Add journey and place management
- Polish and optimize

This clean build approach will result in a maintainable, well-architected MVP that can be extended with additional features in future versions.