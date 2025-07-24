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
├── components/              # ❌ NEEDS CREATION - Reusable UI components
│   ├── ui/                  # ❌ Core UI primitives (buttons, cards, etc.)
│   └── [ComponentName].js   # ❌ Feature-specific components
├── constants/               # ❌ NEEDS CREATION - App-wide constants
│   └── PlaceTypes.js        # ❌ Place type definitions
├── contexts/                # ❌ NEEDS CREATION - React Context providers
│   ├── UserContext.js       # ❌ Authentication and user data
│   ├── ThemeContext.js      # ❌ Theme and styling
│   └── ExplorationContext.js # ❌ Exploration state
├── hooks/                   # ❌ NEEDS CREATION - Custom React hooks
├── screens/                 # ❌ NEEDS CREATION - App screens/pages
│   ├── MapScreen.js         # ❌ Main map interface
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