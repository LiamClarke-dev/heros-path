# Target Architecture Module Map

## Overview

This document defines the target modular architecture for the Hero's Path MVP, designed to eliminate code duplication, improve maintainability, and provide a scalable foundation. The architecture follows service-oriented principles with clear separation of concerns and unidirectional data flow.

**Source**: Consolidated from repository analysis at `965caea6bcca512353cdc7e4208bc9c3ceb16a0f`  
**Scope**: MVP-focused architecture for core journey tracking and discovery features  
**Principles**: Single responsibility, dependency inversion, interface segregation

---

## Architectural Overview

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   App.js        │  │  Navigation     │  │   Screens   │  │
│  │  Entry Point    │  │   Container     │  │  Map/Auth   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   Components    │  │     Hooks       │  │   Contexts  │  │
│  │   UI Elements   │  │  State Logic    │  │   Providers │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │    Services     │  │   Utilities     │  │   Models    │  │
│  │  Core Logic     │  │   Helpers       │  │   Types     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL INTEGRATION LAYER                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │    Firebase     │  │   Google APIs   │  │   Expo APIs │  │
│  │  Auth/Firestore │  │  Maps/Places    │  │  Location   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Pattern

```
External APIs → Services → Contexts → Hooks → Components → Screens
     ↑                                                        │
     └─── User Interactions ←─────────────────────────────────┘
```

---

## Module Definitions

### 1. Application Layer

#### App Module (`App.js`)
**Responsibility**: Application bootstrap and provider orchestration  
**Dependencies**: All context providers, navigation container  
**Interface**: React component with no props  
**Key Functions**:
- Initialize application providers
- Configure theme and navigation
- Handle app-level error boundaries

#### Navigation Module (`navigation/`)
**Responsibility**: Screen routing and navigation state management  
**Dependencies**: React Navigation, contexts  
**Structure**:
```
navigation/
├── NavigationContainer.js     # Root navigation with theme integration
├── MainNavigator.js          # Authenticated user navigation
├── TabNavigator.js           # Bottom tab navigation
└── stacks/                   # Stack navigators by feature
    ├── MapStack.js
    ├── JourneysStack.js
    └── SettingsStack.js
```

#### Screens Module (`screens/`)
**Responsibility**: Top-level UI screens and layout orchestration  
**Dependencies**: Hooks, components, contexts  
**Key Screens**:
- `MapScreen.js` - Primary map interface
- `SignInScreen.js` - Authentication
- `PastJourneysScreen.js` - Journey history
- `SettingsScreen.js` - App configuration

### 2. Presentation Layer

#### Components Module (`components/`)
**Responsibility**: Reusable UI components and rendering logic  
**Structure**:
```
components/
├── map/                      # Map-specific components
│   ├── MapRenderer.js        # Map display logic
│   ├── MapControls.js        # Control button layout
│   ├── TrackingButton.js     # Journey tracking control
│   └── SavedPlacesToggle.js  # Places visibility toggle
├── ui/                       # Generic UI components
│   ├── BaseModal.js          # Standardized modal base
│   ├── LoadingSpinner.js     # Loading indicators
│   └── ThemedButton.js       # Consistent button styling
└── navigation/               # Navigation-specific components
    ├── LoadingOverlay.js     # Navigation loading states
    └── ErrorBoundary.js      # Error handling
```

#### Hooks Module (`hooks/`)
**Responsibility**: Stateful logic and side effect management  
**Key Hooks**:
- `useJourneyTracking.js` - Journey recording state
- `useSavedPlaces.js` - Places management
- `useLocationTracking.js` - GPS and location state
- `useAsyncOperation.js` - Standardized loading states (NEW)
- `useMapState.js` - Map view state

#### Contexts Module (`contexts/`)
**Responsibility**: Application-wide state management  
**Key Contexts**:
- `UserContext.js` - Authentication and user profile
- `ThemeContext.js` - Theme and styling state
- `NavigationContext.js` - Navigation state and deep linking

### 3. Business Logic Layer

#### Services Module (`services/`)
**Responsibility**: Business logic, external API integration, data processing  
**Target Structure**:
```
services/
├── base/
│   └── BaseFirebaseService.js    # Common Firebase operations (NEW)
├── core/
│   ├── JourneyService.js         # Journey CRUD operations
│   ├── UserProfileService.js     # User profile management
│   ├── SavedPlacesService.js     # Places CRUD operations
│   └── DiscoveriesService.js     # Place discovery logic
├── location/
│   ├── BackgroundLocationService.js  # GPS tracking (CONSOLIDATE)
│   ├── LocationFilter.js         # Location data processing
│   └── LocationOptimizer.js      # Performance optimization
└── integration/
    ├── GooglePlacesIntegration.js # Google Places API
    ├── GoogleMapsIntegration.js   # Google Maps API
    └── ExpoLocationIntegration.js # Expo Location API
```

#### Utilities Module (`utils/`)
**Responsibility**: Cross-cutting concerns and helper functions  
**Key Utilities**:
- `ErrorHandler.js` - Centralized error handling (NEW)
- `Logger.js` - Centralized logging
- `ThemeUtils.js` - Theme helper functions (NEW)
- `PerformanceMonitor.js` - Performance tracking

#### Models Module (`constants/`)
**Responsibility**: Type definitions, constants, and data models  
**Key Files**:
- `JourneyModels.js` - Journey data types
- `PlaceTypes.js` - Place and POI definitions
- `StorageKeys.js` - AsyncStorage key constants
- `FirestoreSchema.js` - Database schema definitions

### 4. External Integration Layer

#### Firebase Integration
**Module**: `firebase.js` + service integrations  
**Responsibility**: Authentication and data persistence  
**Services**: Auth, Firestore, security rules

#### Google APIs Integration
**Modules**: Service-level integrations  
**Responsibility**: Maps and place data  
**Services**: Google Maps API, Google Places API

#### Expo APIs Integration
**Modules**: Service-level integrations  
**Responsibility**: Device capabilities  
**Services**: Location, TaskManager, AuthSession

---

## Module Dependencies and Interfaces

### Dependency Rules

1. **Unidirectional Dependencies**: Lower layers never depend on higher layers
2. **Interface Segregation**: Modules depend on specific interfaces, not implementations
3. **Dependency Inversion**: High-level modules don't depend on low-level modules directly

### Dependency Matrix

| Module | Can Import From | Cannot Import From |
|--------|----------------|-------------------|
| Screens | Hooks, Components, Contexts | Services directly |
| Components | Contexts (via hooks), Utils | Services, other Components |
| Hooks | Services, Contexts, Utils | Components, Screens |
| Contexts | Services, Utils | Hooks, Components, Screens |
| Services | Utils, Models, External APIs | Any React-specific modules |
| Utils | Models, External APIs | Any application modules |

### Key Interfaces

#### Service Interface Pattern
```javascript
class BaseService {
  // Standardized error handling
  async handleOperation(operation, context) { }
  
  // Logging integration
  logOperation(operation, result, error) { }
  
  // Common validation
  validateInput(input, schema) { }
}
```

#### Hook Interface Pattern
```javascript
const useFeature = () => {
  return {
    // State
    data: /* current data */,
    loading: /* loading state */,
    error: /* error state */,
    
    // Actions
    performAction: /* async function */,
    reset: /* reset function */,
    refresh: /* refresh function */
  };
};
```

#### Context Interface Pattern
```javascript
const FeatureContext = {
  // State
  state: /* current state */,
  
  // Actions
  actions: /* available actions */,
  
  // Status
  isLoading: /* loading indicator */,
  error: /* error state */
};
```

---

## Consolidation Strategy

### Phase 1: Service Layer Consolidation

**Objective**: Eliminate Firebase operation duplication  
**Approach**: Create `BaseFirebaseService` with common CRUD operations  
**Impact**: 4 services refactored, ~200 lines eliminated

**Migration Plan**:
1. Create `BaseFirebaseService` with common methods
2. Refactor `JourneyService` to extend base class
3. Refactor `UserProfileService` to extend base class
4. Refactor remaining services
5. Remove duplicate code from original implementations

### Phase 2: Error Handling Standardization

**Objective**: Consistent error handling across application  
**Approach**: Create `ErrorHandler` utility with standardized patterns  
**Impact**: All services and hooks use consistent error handling

**Implementation**:
1. Create `ErrorHandler` class with service, UI, and network error methods
2. Update services to use `ErrorHandler.handleServiceError`
3. Update hooks to use `ErrorHandler.handleUIError`
4. Standardize error messages and user feedback

### Phase 3: UI Component Standardization

**Objective**: Consistent UI patterns and theming  
**Approach**: Create base components and standardized patterns  
**Impact**: Consistent modals, buttons, and theming throughout app

**Components to Create**:
1. `BaseModal` - Foundation for all modals
2. `ThemedButton` - Consistent button styling
3. `useAsyncOperation` - Standardized loading states
4. `ThemeUtils` - Theme helper functions

### Phase 4: Performance Optimization

**Objective**: Optimize module loading and runtime performance  
**Approach**: Lazy loading, code splitting, optimization  
**Impact**: Faster app startup and smoother operation

---

## Quality and Testing Strategy

### Module Testing Approach

**Service Layer**:
- Unit tests for all service methods
- Mock external dependencies (Firebase, Google APIs)
- Integration tests for service interactions

**Hook Layer**:
- React Testing Library for hook testing
- Mock service dependencies
- Test state transitions and side effects

**Component Layer**:
- Snapshot testing for UI consistency
- Interaction testing for user flows
- Visual regression testing for styling

### Code Quality Standards

**Linting**: ESLint with React Native configuration  
**Formatting**: Prettier with consistent configuration  
**Type Safety**: PropTypes for component interfaces  
**Documentation**: JSDoc comments for all public interfaces

### Performance Monitoring

**Bundle Analysis**: Monitor module size and dependencies  
**Runtime Performance**: Track rendering performance and memory usage  
**User Experience**: Monitor app startup time and interaction responsiveness

---

## Migration Path

### Current State Assessment

**Strengths**:
- Clear service layer separation
- Good use of React Context for state management
- Comprehensive hook-based architecture

**Issues to Address**:
- Duplicate Firebase operations across services
- Inconsistent error handling patterns
- Mixed UI component patterns
- Some circular dependency risks

### Target State Goals

**Consistency**: Standardized patterns for common operations  
**Maintainability**: Clear module boundaries and responsibilities  
**Testability**: Isolated modules with clear interfaces  
**Performance**: Optimized loading and runtime characteristics

### Success Metrics

**Code Quality**:
- Lines of duplicate code reduced by 80%
- Test coverage increased to 85%
- Linting errors reduced to zero

**Performance**:
- App startup time improved by 25%
- Bundle size reduced by 15%
- Memory usage optimized

**Developer Experience**:
- Consistent patterns across all modules
- Clear documentation and interfaces
- Simplified onboarding for new developers

---

*This module map serves as the architectural blueprint for the MVP refactor and should be referenced during all development activities to ensure consistency with the target architecture.*
