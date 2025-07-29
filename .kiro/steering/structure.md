# Hero's Path - Project Structure

## Directory Organization

**CURRENT STATE - CLEAN SLATE**: Most directories and files need to be created from scratch.

### Existing Structure (Preserved)
```
heros-path-fresh/
├── App.js                   # ⚠️  EXISTS but needs complete rebuild
├── index.js                 # ✅ Entry point (preserved)
├── app.json                 # ✅ Expo configuration (preserved)
├── config.js                # ✅ Environment variables (preserved)
├── firebase.js              # ✅ Firebase initialization (preserved)
├── package.json             # ✅ Dependencies (preserved)
├── babel.config.js          # ✅ Babel config (preserved)
├── eas.json                 # ✅ Build configuration (preserved)
├── .env                     # ✅ Environment variables (preserved)
├── assets/                  # ✅ Images, icons, animations, fonts (preserved)
│   ├── link_sprites/        # ✅ Character sprite animations
│   ├── fonts/               # ✅ Custom fonts
│   └── [other assets]       # ✅ All design assets preserved
└── .kiro/                   # ✅ Specifications and steering docs (preserved)
    ├── specs/               # ✅ Complete feature specifications
    └── steering/            # ✅ Project documentation
```

### Structure to be Created
```
├── components/              # ⚠️ PARTIALLY COMPLETE - Reusable UI components
│   ├── map/                 # ✅ Map-specific components (refactored from MapScreen)
│   │   ├── MapRenderer.js   # ✅ Map display and rendering
│   │   ├── MapControls.js   # ✅ UI controls layout
│   │   ├── MapStatusDisplays.js # ✅ Status information display
│   │   ├── MapModals.js     # ✅ Modal management
│   │   ├── TrackingButton.js # ✅ Journey tracking control
│   │   ├── SavedRoutesToggle.js # ✅ Routes visibility toggle
│   │   ├── SavedPlacesToggle.js # ✅ Places visibility toggle
│   │   ├── MapStyleButton.js # ✅ Style selector button
│   │   ├── JourneyInfoDisplay.js # ✅ Journey information display
│   │   ├── MapOverlays.js   # ✅ Map overlay management
│   │   ├── MapPolylines.js  # ✅ Polyline rendering
│   │   ├── SpriteOverlay.js # ✅ Character sprite display
│   │   └── SavedPlacesOverlay.js # ✅ Places marker display
│   ├── ui/                  # ❌ Core UI primitives (buttons, cards, etc.)
│   └── [ComponentName].js   # ❌ Other feature-specific components
├── constants/               # ❌ NEEDS CREATION - App-wide constants
│   └── PlaceTypes.js        # ❌ Place type definitions
├── contexts/                # ❌ NEEDS CREATION - React Context providers
│   ├── UserContext.js       # ❌ Authentication and user data
│   ├── ThemeContext.js      # ❌ Theme and styling
│   └── ExplorationContext.js # ❌ Exploration state
├── hooks/                   # ⚠️ PARTIALLY COMPLETE - Custom React hooks
│   ├── useMapPermissions.js # ✅ Location permission management
│   ├── useLocationTracking.js # ✅ GPS and location services
│   ├── useMapState.js       # ✅ Core map state management
│   ├── useJourneyTracking.js # ✅ Journey recording and saving
│   ├── useSavedRoutes.js    # ✅ Saved routes display and management
│   ├── useSavedPlaces.js    # ✅ Saved places management and clustering
│   ├── useMapStyle.js       # ✅ Map styling and theme integration
│   └── [OtherHooks].js      # ❌ Additional hooks for other features
├── screens/                 # ⚠️ PARTIALLY COMPLETE - App screens/pages
│   ├── MapScreen.js         # ✅ Main map interface (refactored to modular architecture)
│   ├── DiscoveriesScreen.js # ❌ Discoveries interface
│   ├── CustomListsScreen.js # ❌ Custom lists management
│   ├── GamificationScreen.js # ❌ Achievements and challenges
│   ├── RoutingScreen.js     # ❌ Destination routing interface
│   ├── SocialScreen.js      # ❌ Social sharing interface
│   └── [ScreenName].js      # ❌ Other screens
├── services/                # ❌ NEEDS CREATION - Business logic and API services
│   ├── JourneyService.js    # ❌ Journey management
│   ├── DiscoveriesService.js # ❌ Discovery engine
│   ├── NewPlacesService.js  # ❌ Google Places API integration
│   ├── GamificationService.js # ❌ Gamification features
│   ├── CustomListsService.js # ❌ Custom lists management
│   ├── RoutingService.js    # ❌ Destination routing
│   ├── SocialService.js     # ❌ Social sharing features
│   └── [ServiceName].js     # ❌ Other services
├── styles/                  # ❌ NEEDS CREATION - Styling and theming
│   └── theme.js             # ❌ Theme definitions
└── utils/                   # ❌ NEEDS CREATION - Utility functions
    └── Logger.js            # ❌ Logging utility
```

**Legend:**
- ✅ = File/directory exists and is preserved
- ⚠️ = File exists but needs complete rebuild
- ❌ = Needs to be created from scratch

## Architecture Patterns

### Component Organization

- **Screens**: Full pages in the app, imported by navigation
- **Components**: Reusable UI elements used across multiple screens
- **Contexts**: App-wide state management using React Context API
- **Services**: Business logic and API interactions

### Data Flow

1. **User Interaction** → Screen components
2. **API/Data Requests** → Service layer
3. **Global State** → Context providers
4. **Local State** → Component state
5. **Persistence** → Firebase (remote) and AsyncStorage (local)

### Key Files and Their Roles

**Existing (Preserved):**
- **firebase.js**: ✅ Firebase initialization and authentication utilities
- **config.js**: ✅ Environment variable management
- **package.json**: ✅ Dependencies and scripts

**Need to be Created:**
- **App.js**: ❌ Entry point with providers and navigation setup (exists but needs rebuild)
- **contexts/UserContext.js**: ❌ User authentication and profile management
- **contexts/ThemeContext.js**: ❌ Theme management (colors, styles)
- **contexts/ExplorationContext.js**: ❌ Exploration state management
- **services/DiscoveriesService.js**: ❌ Core discovery engine using Google Places API
- **services/JourneyService.js**: ❌ Journey tracking and management
- **screens/MapScreen.js**: ❌ Main app interface with map and tracking
- **utils/Logger.js**: ❌ Centralized logging system
- **styles/theme.js**: ❌ Theme definitions and styling system

**Implementation Priority:**
1. **First**: Create basic App.js with navigation structure
2. **Second**: Build core contexts (UserContext, ThemeContext)
3. **Third**: Implement essential services (JourneyService, DiscoveriesService)
4. **Fourth**: Create main screens (MapScreen, etc.)
5. **Fifth**: Add utilities and styling system

## MapScreen Refactoring Success

The MapScreen has been successfully refactored from a monolithic 1600+ line component into a modular architecture:

**Architecture Transformation:**
- **Before**: Single 1600+ line component with multiple responsibilities
- **After**: < 200 line orchestrator with 7 focused hooks and 15+ components

**Modular Components Created:**
- `MapRenderer`: Map display and platform-specific rendering
- `MapControls`: UI controls layout and interaction handling
- `MapStatusDisplays`: Status information display
- `MapModals`: Modal management and rendering

**Custom Hooks Extracted:**
- `useMapPermissions`: Location permission management
- `useLocationTracking`: GPS services and position tracking
- `useMapState`: Core map state and camera management
- `useJourneyTracking`: Journey recording and saving logic
- `useSavedRoutes`: Saved routes display and management
- `useSavedPlaces`: Saved places management and clustering
- `useMapStyle`: Map styling and theme integration

**Benefits Achieved:**
- ✅ Improved maintainability and code organization
- ✅ Enhanced testability with isolated components
- ✅ Better performance through optimized re-rendering
- ✅ Preserved backward compatibility (all functionality identical)
- ✅ Established patterns for future feature development

**Documentation Created:**
- `docs/MapScreen-Refactoring-Architecture.md`: Comprehensive architecture documentation
- `docs/MapScreen-Developer-Guide.md`: Developer guide for working with refactored code
- `.kiro/steering/modular-architecture.md`: Guidelines for maintaining modular patterns

This refactoring serves as the architectural foundation and pattern for all future component development in the application.

## Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities and services
- **Components**: PascalCase (e.g., `PingButton.js`)
- **Functions**: camelCase (e.g., `getUserDiscoveryPreferences()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `PLACE_TYPES`)
- **Context Providers**: PascalCase with "Provider" suffix (e.g., `ThemeProvider`)
- **Context Hooks**: camelCase with "use" prefix (e.g., `useTheme`)

## Code Style Guidelines

- Use functional components with hooks instead of class components
- Prefer destructuring for props and state
- Use async/await for asynchronous operations
- Include JSDoc comments for complex functions
- Group related functions in service files
- Use consistent error handling with try/catch
- Implement proper logging with the Logger utility

## State Management

- **Global State**: React Context API for app-wide state
- **Local State**: React's useState hook for component-specific state
- **Persistence**: AsyncStorage for local data, Firestore for remote data

## Navigation Structure

- **Drawer Navigation**: Main app navigation (MapScreen, DiscoveriesScreen, etc.)
- **Stack Navigation**: Authentication flow and modal screens
- **Tab Navigation**: Used within specific sections (e.g., Discoveries)