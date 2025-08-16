# Implementation Plan

- [x] 1. Set up new project

- [x] 1.1 Clean existing source code while preserving configuration
  - Remove all directories: `components/`, `contexts/`, `hooks/`, `screens/`, `services/`, `utils/`, `styles/`, `constants/`
  - Keep: `package.json`, `app.json`, `eas.json`, `babel.config.js`, `.env`, `config.js`, `firebase.js`, `assets/`, `.kiro/`
  - Create minimal `App.js` that just shows "Hero's Path MVP - Coming Soon"
  - _Requirements: All requirements (foundation for everything)_

- [x] 1.2 Create Google Cloud Project first (ensures proper linking)
  - Go to [Google Cloud Console](https://console.cloud.google.com/)
  - Click "New Project" and name it "heros-path-mvp"
  - Note the Project ID (will be auto-generated, like "heros-path-mvp-123456")
  - Wait for project creation to complete
  - _Requirements: Foundation for Firebase and Google APIs_

- [x] 1.3 Create Firebase project from Google Cloud project
  - Go to [Firebase Console](https://console.firebase.google.com/)
  - Click "Add project"
  - Select "Choose an existing Google Cloud Platform (GCP) project"
  - Select your "heros-path-mvp" project from the dropdown
  - Continue through setup (enable Google Analytics if desired)
  - This ensures proper Firebase ↔ Google Cloud linking
  - _Requirements: 1.1 (User Authentication)_

- [x] 1.4 Configure Firebase services
  - Enable Authentication with Google provider
  - Create Firestore database in test mode
  - Get Firebase configuration object from Project Settings
  - Update `.env` with Firebase configuration keys
  - _Requirements: 1.1 (User Authentication)_

- [x] 1.5 Configure Google Cloud Console APIs
  - In Google Cloud Console (same project), go to "APIs & Services" → "Library"
  - Enable **Google Places API (New)**, Google Maps SDK for iOS/Android, Geocoding API
  - Create restricted API keys for iOS and Android
  - Update `.env` with new Google API keys
  - _Requirements: 2.1, 4.1 (Map Navigation, Place Discovery)_

- [x] 1.6 Update Expo configuration
  - Update `app.json` with new project name and bundle identifiers
  - Add environment variables to Expo dashboard
  - Test that `expo start` works with clean setup
  - _Requirements: All requirements (foundation)_

- [x] 1.7 Create clean Git branch
  - Create `mvp-clean-build` branch
  - Commit clean project structure
  - Set as default branch temporarily
  - _Requirements: All requirements (version control)_

- [x] 2. Set Up Development Infrastructure

- [x] 2.1 Set up development environment consistency and GitHub workflow
  - Install and configure ESLint with React Native and Expo rules
  - Install and configure Prettier for code formatting
  - Create `.eslintrc.js` and `.prettierrc` configuration files
  - Set up pre-commit hooks with Husky to enforce code quality
  - Create GitHub PR template with quality checklist
  - Configure branch protection rules for main branch
  - Set up commit message linting with conventional commits
  - _Requirements: All requirements (code quality and workflow foundation)_

- [x] 2.2 Set up comprehensive testing infrastructure
  - Install testing dependencies: `@testing-library/react-native`, `@testing-library/jest-native`, `jest-expo`
  - Create `src/test/` directory with `setup.js`, `testUtils.js`, and mock factories
  - Configure `jest.config.js` with coverage thresholds (85% minimum)
  - Create GitHub Actions workflow for automated testing on commits
  - _Requirements: All requirements (quality assurance foundation)_

- [x] 2.3 Create directory structure and basic utilities
  - Create `src/` directory with subdirectories: `components/`, `contexts/`, `screens/`, `services/`, `utils/`, `hooks/`, `navigation/`
  - Create `src/components/ui/` and `src/components/map/` subdirectories
  - Create `src/utils/constants.js`, `src/utils/helpers.js`, `src/utils/ErrorHandler.js`
  - Update import paths in `App.js` to use `src/` structure
  - _Requirements: All requirements (architecture foundation)_

- [x] 2.4 Create Firebase configuration and validate external service connections
  - Create `src/config/firebase.js` with Firebase initialization using environment variables
  - Install Firebase dependencies: `firebase`, `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/firestore`
  - Test Firebase connection with minimal read/write operation
  - Test Google Maps API key with simple geocoding request
  - Test Google Places API (New) with basic search request
  - Create connection validation utility for troubleshooting
  - _Requirements: 1.1, 2.1, 4.1 (service validation)_

- [x] 3. Set Up Navigation Structure and Theme/Styles
- [x] 3.1 Create simple theme system
  - Create `src/styles/theme.js` with all theme configuration in one file (colors, typography, spacing)
  - Create `src/contexts/ThemeContext.js` with theme provider and useTheme hook
  - Keep theme simple for MVP - can be split into separate files later if needed
  - _Requirements: All requirements (consistent theming foundation)_

- [x] 3.2 Create basic navigation structure
  - Install React Navigation v7 dependencies
  - Create `src/navigation/AppNavigator.js` as root navigation component
  - Create simple stack navigation (can upgrade to drawer later if needed)
  - Test navigation works with basic placeholder screens
  - _Requirements: All requirements (navigation foundation)_

- [x] 3.3 Create essential UI components
  - Create `src/components/ui/Screen.js` as base screen wrapper
  - Create `src/components/ui/Button.js` with primary/secondary variants
  - Create `src/components/ui/LoadingSpinner.js` and `src/components/ui/ErrorMessage.js`
  - Test all components work with theme system
  - _Requirements: All requirements (UI consistency foundation)_

- [ ] 4. Set Up Auth System

- [ ] 4.1 Install authentication dependencies and create AuthService
  - Install required dependencies: `expo-auth-session`, `expo-crypto`, `expo-secure-store`, `expo-web-browser`
  - Implement `src/services/AuthService.js` using **Expo AuthSession** for simplified OAuth
  - Use **Expo SecureStore** for secure token storage
  - Methods: `signInWithGoogle()`, `signOut()`, `getCurrentUser()`, `storeToken()`
  - Write comprehensive unit tests for all authentication methods
  - Test with Firebase connection validation from Task 2.4
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 (User Authentication)_

- [ ] 4.2 Create UserContext and useAuth hook
  - Implement `src/contexts/UserContext.js` for global user state
  - Implement `src/hooks/useAuth.js` for easy access to user context
  - Handle authentication state persistence and loading states
  - Write unit tests for context and hook functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 (User Authentication)_

- [ ] 4.3 Create SignInScreen
  - Implement `src/screens/SignInScreen.js` using Screen wrapper and themed Button
  - Show app logo, branding, and Google sign-in button
  - Handle authentication errors using ErrorHandler utility
  - Test authentication flow end-to-end
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 (User Authentication)_

- [ ] 4.4 Integrate authentication with navigation
  - Update AppNavigator to handle authenticated/unauthenticated states
  - Show SignInScreen when not authenticated, main app when authenticated
  - Handle loading states during authentication check
  - Test navigation flow works correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 (User Authentication)_

- [ ] 5. Set Up API & Testing Infra
- [ ] 5.1 Set up API usage monitoring
  - Create `src/utils/ApiMonitor.js` to track Google Places API calls and costs
  - Implement request logging and rate limiting for development
  - Set up alerts for approaching API quotas
  - Create dashboard for monitoring API usage during development
  - _Requirements: 4.1 (Place Discovery cost management)_

- [ ] 5.2 Implement performance monitoring foundation
  - Create `src/utils/PerformanceMonitor.js` for tracking app performance
  - Monitor app startup time, memory usage, and GPS acquisition time
  - Set up crash reporting with Expo's built-in crash reporting
  - Create performance benchmarking utilities
  - _Requirements: Performance requirements_

- [ ] 5.3 Set up security best practices
  - Implement secure storage patterns for sensitive data
  - Create security utilities for input validation and sanitization
  - Set up environment variable validation to prevent misconfigurations
  - Document security guidelines for the team
  - _Requirements: Security requirements_

- [ ] 6. Map and Location System

- [ ] 6.1 Install location dependencies and create LocationService
  - Install required dependencies: `expo-location`, `expo-task-manager`
  - Update `app.json` plugins to include `expo-location` and `expo-task-manager`
  - Implement `src/services/LocationService.js` using **Expo Location** and **Expo TaskManager**
  - Use Expo's simplified permission handling and background location tracking
  - Methods: `requestPermissions()`, `getCurrentLocation()`, `startTracking()`, `stopTracking()`
  - Leverage Expo TaskManager for reliable background location updates
  - Write unit tests with mocked Expo modules
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 (Map Navigation and Location)_

- [ ] 6.2 Create useLocation hook
  - Implement `src/hooks/useLocation.js` for location state management
  - Provide current location, permission status, and location methods
  - Handle location updates and error states
  - Write comprehensive unit tests with mocked Expo Location
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 (Map Navigation and Location)_

- [ ] 6.3 Create basic map components using Expo Maps
  - Implement `src/components/map/MapView.js` using **Expo Maps**
  - Implement `src/components/map/LocationMarker.js` for user position
  - Handle map initialization and basic interactions
  - Write component tests with proper mocking
  - Test map performance with location updates
  - _Requirements: 2.1, 2.2, 2.3, 2.4 (Map Navigation and Location)_

- [ ] 6.4 Create MapScreen with validation
  - Implement `src/screens/MapScreen.js` as main app interface
  - Show map with user location and "locate me" button
  - Handle location permission requests with clear user guidance
  - Test map screen works on both iOS and Android
  - Validate GPS accuracy meets requirements (±5 meters)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 (Map Navigation and Location)_

- [ ] 6.5 Integration testing and validation
  - Test complete authentication → map navigation flow
  - Validate app startup time meets requirement (<3 seconds to map)
  - Test location acquisition time meets requirement (<5 seconds)
  - Verify error handling works for all location scenarios
  - **Update documentation**: Document map integration patterns and performance learnings
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 (Map Navigation and Location)_

- [ ] 7. Journey Tracking System
- [ ] 7.1 Extend LocationService for tracking
  - Add continuous location tracking with background support
  - Implement route path collection and management
  - Handle GPS accuracy and battery optimization
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 (Journey Tracking)_

- [ ] 7.2 Create JourneyService
  - Implement `src/services/JourneyService.js` for journey data management
  - Methods: `saveJourney()`, `getUserJourneys()`, `getJourney()`, `deleteJourney()`
  - Handle Firestore operations for journey persistence
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 (Journey Management)_

- [ ] 7.3 Create useJourneyTracking hook
  - Implement `src/hooks/useJourneyTracking.js` for tracking state
  - Manage tracking state, current route, and journey operations
  - Handle start/stop tracking and journey saving
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 (Journey Tracking)_

- [ ] 7.4 Create route visualization components
  - Implement `src/components/map/RoutePolyline.js` for route display
  - Show real-time route as colored line on map
  - Handle route styling and performance optimization
  - _Requirements: 3.1, 3.2, 3.3 (Journey Tracking visualization)_

- [ ] 7.5 Add tracking controls to MapScreen
  - Add "Start Journey" / "Stop Journey" button
  - Show journey statistics (distance, time) during tracking
  - Handle journey naming and saving after completion
  - _Requirements: 3.1, 3.2, 3.4, 3.5 (Journey Tracking)_

- [ ] 8. Journey Naming & Saving
- [ ] 8.1 Create journey naming modal
  - Implement `src/components/ui/JourneyNamingModal.js`
  - Allow user to enter custom name for journey
  - Provide default name based on date/time
  - _Requirements: 5.1, 5.2 (Journey Management)_

- [ ] 8.2 Implement journey saving workflow
  - Calculate journey statistics (distance, duration)
  - Save journey data to Firestore with user association
  - Handle saving errors and provide user feedback
  - _Requirements: 5.1, 5.2, 5.3, 5.4 (Journey Management)_

- [ ] 8.3 Add journey completion flow
  - Show journey summary after stopping tracking
  - Allow user to name and save journey
  - Provide option to discard journey if desired
  - _Requirements: 3.4, 3.5, 5.1, 5.2 (Journey Tracking and Management)_

- [ ] 9. Place Discovery System

- [ ] 9.1 Install places API dependencies and create PlacesService
  - Install required dependencies for HTTP requests: `axios` or use built-in `fetch`
  - Implement `src/services/PlacesService.js` for **Google Places API (New)** integration
  - Methods: `searchAlongRoute()`, `getPlaceDetails()`, `savePlaceToUser()`, `getUserSavedPlaces()`, `searchNearbyPlaces()`
  - Use new searchNearby endpoint for better performance and enhanced place data
  - Handle API rate limits and error responses
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5 (Place Discovery)_

- [ ] 9.2 Implement route-based place search
  - Search for places along journey route using **Google Places API (New)** searchNearby endpoint
  - Utilize field masks for efficient data retrieval and cost optimization
  - Filter results by relevance, rating, and place types
  - Return 3-10 most interesting places per journey with enhanced metadata
  - _Requirements: 4.1, 4.2, 4.5 (Place Discovery)_

- [ ] 9.3 Create place discovery UI
  - Show discovered places after journey completion
  - Display place names, categories, ratings, and photos
  - Allow user to view place details and save interesting ones
  - _Requirements: 4.1, 4.2, 4.3, 4.4 (Place Discovery)_

- [ ] 9.4 Integrate discovery with journey completion
  - Automatically trigger place discovery when journey is completed
  - Show discovery results before journey naming/saving
  - Allow user to save places to personal collection
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5 (Place Discovery)_

- [ ] 10. Saved Places
- [ ] 10.1 Create saved places data management
  - Extend PlacesService with saved places CRUD operations
  - Store saved places in Firestore with user association
  - Handle place data synchronization and updates
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5 (Saved Places Management)_

- [ ] 10.2 Create place marker components
  - Implement `src/components/map/PlaceMarkers.js` for map display
  - Show saved places as markers on map
  - Handle marker clustering for performance
  - _Requirements: 6.2, 6.3 (Saved Places Management)_

- [ ] 10.3 Add saved places to MapScreen
  - Display saved places as markers on map
  - Allow user to tap markers to view place details
  - Provide toggle to show/hide saved places
  - _Requirements: 6.2, 6.3, 6.4 (Saved Places Management)_

- [ ] 10.4 Create place management interface
  - Allow user to remove places from saved collection
  - Provide search/filter functionality for many saved places
  - Show place details and associated journey information
  - _Requirements: 6.4, 6.5 (Saved Places Management)_

- [ ] 11. Journey History and Management
- [ ] 11.1 Create JourneyHistoryScreen
  - Implement `src/screens/JourneyHistoryScreen.js` for journey browsing
  - Show list of past journeys with preview information
  - Organize journeys by date with search functionality
  - _Requirements: 5.3, 5.4, 5.5 (Journey Management)_

- [ ] 11.2 Create journey list components
  - Implement journey list items with route preview
  - Show journey name, date, distance, and duration
  - Handle journey selection and navigation
  - _Requirements: 5.3, 5.4 (Journey Management)_

- [ ] 11.3 Implement journey detail view
  - Show selected journey route on map
  - Display journey statistics and discovered places
  - Allow user to view associated saved places
  - _Requirements: 5.4, 5.5 (Journey Management)_

- [ ] 11.4 Add navigation between screens and document patterns
  - Implement basic navigation between MapScreen and JourneyHistoryScreen
  - Add navigation controls to access journey history
  - Handle navigation state and back navigation
  - **Update documentation**: Document navigation patterns and screen flow established
  - _Requirements: 5.3, 5.4, 5.5 (Journey Management)_

- [ ] 12. Error Handling and Performance Optimization
- [ ] 12.1 Implement comprehensive error handling
  - Add error boundaries for crash prevention
  - Implement user-friendly error messages for all failure scenarios
  - Add retry mechanisms for network operations
  - _Requirements: All requirements (error handling)_

- [ ] 12.2 Optimize performance
  - Implement location tracking battery optimization
  - Add map rendering performance optimizations
  - Implement data loading pagination for large journey collections
  - _Requirements: Performance requirements_

- [ ] 12.3 Add loading states and user feedback
  - Implement loading spinners for all async operations
  - Add progress indicators for journey saving and place discovery
  - Provide clear feedback for user actions
  - _Requirements: All requirements (user experience)_

- [ ] 12.4 Implement offline support
  - Ensure journey tracking works without internet connection
  - Cache essential data for offline viewing
  - Handle network reconnection gracefully
  - _Requirements: Performance requirements (offline capability)_

- [ ] 12.5 Add comprehensive testing
  - Write unit tests for all services and utilities
  - Create integration tests for critical user flows
  - Test on multiple devices and operating systems
  - _Requirements: All requirements (quality assurance)_

- [ ] 13. Final Testing and Deployment
- [ ] 13.1 Complete automated testing suite and consolidate documentation
  - Achieve >85% test coverage across all components and services
  - Write integration tests for complete user flows (sign-in → journey → discovery)
  - Add E2E tests using Detox for critical paths
  - Set up continuous integration with automated test runs
  - Validate all acceptance criteria are met through tests
  - **Consolidate documentation**: Update all steering docs with final patterns and learnings
  - **Archive outdated docs**: Remove any documentation that's no longer relevant
  - _Requirements: All requirements (quality assurance and documentation)_

- [ ] 13.2 Performance testing
  - Test app startup time (<3 seconds to map view)
  - Validate GPS acquisition time (<5 seconds)
  - Test battery usage during tracking (<20% per hour)
  - Measure journey save time (<2 seconds)
  - _Requirements: Performance requirements_

- [ ] 13.3 Device and platform testing
  - Test on multiple iOS and Android devices
  - Validate minimum OS version compatibility
  - Test different screen sizes and orientations
  - _Requirements: Platform requirements_

- [ ] 13.4 User acceptance testing
  - Test complete user journey from sign-in to journey completion
  - Validate place discovery provides relevant results
  - Ensure all UI interactions are intuitive
  - _Requirements: Success criteria_

- [ ] 14. Production Readiness Checks
- [ ] 14.1 Production configuration
  - Update Firebase security rules for production
  - Configure production API keys and rate limits
  - Set up production environment variables
  - _Requirements: Security requirements_

- [ ] 14.2 Build and deployment setup
  - Create production builds through EAS
  - Test production builds on physical devices
  - Prepare app store metadata and screenshots
  - _Requirements: Platform requirements_

- [ ] 14.3 Monitoring and analytics setup
  - Implement crash reporting
  - Set up basic usage analytics (with user consent)
  - Configure performance monitoring
  - _Requirements: Quality requirements_

- [ ] 14.4 Documentation and handoff
  - Update README with MVP architecture and setup instructions
  - Document API usage and rate limits
  - Create maintenance and troubleshooting guides
  - _Requirements: All requirements (maintainability)_

## Success Validation Checklist

Before considering the MVP complete, validate:

### Functional Requirements

- [ ] User can sign in with Google OAuth
- [ ] Map loads and shows current location within 3 seconds
- [ ] Journey tracking works in foreground and background
- [ ] Route appears on map in real-time during tracking
- [ ] Journey saves with custom name within 2 seconds
- [ ] Place discovery finds 3-10 relevant places within 5 seconds
- [ ] User can save interesting places to personal collection
- [ ] Past journeys can be viewed with route visualization
- [ ] Saved places appear as markers on map

### Performance Requirements

- [ ] App startup time < 3 seconds
- [ ] GPS acquisition < 5 seconds
- [ ] Journey save < 2 seconds
- [ ] Place discovery < 5 seconds
- [ ] Battery usage < 20% per hour during tracking

### Quality Requirements

- [ ] App crash rate < 1%
- [ ] GPS accuracy ± 5 meters
- [ ] Test coverage > 85%
- [ ] All error scenarios handled gracefully
- [ ] Offline journey tracking works

### User Experience

- [ ] User can complete first journey within 5 minutes of signup
- [ ] All interactions feel responsive and intuitive
- [ ] Error messages are clear and helpful
- [ ] Loading states provide appropriate feedback

This implementation plan provides a clear path from clean setup to production-ready MVP, avoiding all the architectural pitfalls identified in the existing codebase.
