# Hero's Path - Fresh Start

**🚨 CLEAN SLATE STATUS**: This project has been reset to eliminate technical debt. All implementation code has been removed, keeping only configuration, dependencies, and documentation.

## Quick Navigation

- 📖 [Concept](#-concept) - What Hero's Path is and why it matters
- 🎯 [Target Users & Goals](#-target-users--goals) - Who benefits and how  
- ⚡️ [Core Features](#️-core-features) - Walk tracking, route saving, POI discoveries, social + gamification
- 🏗️ [Tech Stack & Architecture](#️-tech-stack--architecture) - Expo/React Native, Firebase, modular services
- 🔒 [What's Preserved](#-whats-preserved) - Configuration files kept to avoid redoing setup
- ❌ [What Needs Building](#-what-needs-building) - Everything else needs to be rebuilt
- 🚀 [Getting Started](#-getting-started) - Quick setup steps
- 🛠️ [Implementation Roadmap](#️-implementation-roadmap) - Step-by-step rebuild plan

## 📖 Concept

Hero's Path is a mobile app that transforms everyday walks into engaging adventures. Users record their routes as a glowing polyline overlaid on a map, with an animated "Link" sprite guiding the way. After each walk, the app surfaces nearby points of interest—museums, cafés, hidden alleys—then lets users save, review, and share their favorite journeys. Gamified goals and social sharing keep motivation high, turning an ordinary stroll into a quest worth repeating.

## 🎯 Target Users & Goals

**Target Users:**
- Urban explorers who crave discovery beyond routine routes
- Health-minded walkers seeking motivation through goals and achievements
- Social sharers who want to showcase unique paths and hidden gems
- Tech enthusiasts interested in seamless, polished mobile experiences

**Primary Goals:**
- **Engagement**: Make daily walking compelling via gamification
- **Discovery**: Surface meaningful POIs along every route
- **Social**: Enable easy sharing and community interaction
- **Simplicity**: Offer one-tap recording and review workflows

## ⚡️ Core Features

### Real-time Route Tracking
- Glowing polyline renders live GPS data
- Animated avatar (Link sprite) pacing alongside

### Post-Walk Discoveries
- Search-Along-Route algorithm surfaces nearby POIs
- AI-powered & editorial summaries for each place

### Journey Management
- Save & review past routes with completion stats
- Goal setting (daily steps, distance, new POIs)

### Social & Gamification
- Share routes on social media or in-app feed
- Badges, streaks, and leaderboards for friends

## 🏗️ Tech Stack & Architecture

**Framework**: Expo SDK ~53 (React Native 0.79.5 / React 19)

**Map & Location**: react-native-maps, expo-location

**Auth & Data**: Firebase (Auth + Firestore), expo-auth-session for OAuth

**Services Layer**:
- DiscoveriesService.js (Search Along Route + fallback)
- JourneyService.js (CRUD + caching)
- NewPlacesService.js & EnhancedPlacesService.js (Google Places API)

**State Management**: React Context (UserContext, ExplorationContext)

**Styling & Theming**: Custom theme system via styles/theme.js

**Modular Design**:
- Screens folder houses UI components (Map, PastJourneys, Discoveries, Settings)
- Services folder abstracts all external APIs and business logic
- Utils for cross-cutting concerns (Logger, helpers)

## 🔒 What's Preserved

To avoid rebuilding OAuth, build pipelines, and environment setup, these files are kept:

**Environment & Build**
- `.env` - Environment variables
- `babel.config.js` - Babel configuration
- `app.json` - Expo configuration
- `eas.json` - Build profiles

**Entry Points & Config**
- `index.js` - Entry point (preserved)
- `config.js` - Environment variable management
- `firebase.js` - Firebase initialization

**Package Management**
- `package.json` - All dependencies installed
- `package-lock.json` - Dependency lock file

**Assets**
- `assets/` - All images, fonts, sprites, and design tokens

**Documentation**
- `.kiro/specs/` - Complete feature specifications
- `.kiro/steering/` - Project documentation and guidelines

## ❌ What Needs Building

**Everything else needs to be created from scratch:**

**Core Directories** (all empty or non-existent):
- `components/` - All UI components
- `screens/` - All app screens
- `services/` - All business logic and API services
- `contexts/` - All React Context providers
- `utils/` - All utility functions
- `styles/` - All styling and theming
- `constants/` - All app constants
- `hooks/` - All custom React hooks

**Key Files to Rebuild**:
- `App.js` - Root component (exists but needs complete rebuild)
- All screen components
- All service modules
- All context providers
- Theme system
- Navigation setup

## 🚀 Getting Started

1. **Install Dependencies** (already configured):
   ```bash
   npm ci
   ```

2. **Verify Configuration**:
   ```bash
   expo start
   ```

3. **Check Build Setup**:
   ```bash
   eas build --profile development --platform ios
   ```

4. **Start Building** - Follow the Implementation Roadmap below

## 🛠️ Implementation Roadmap

### Phase 1: Foundation (Tier 1 Critical)
Start with these specs in `.kiro/specs/tier-1-critical/`:
1. **User Authentication** - Firebase auth setup
2. **Map Navigation & GPS** - Basic map with location
3. **Background Location** - Location tracking setup
4. **Journey Tracking** - Route recording functionality
5. **Search Along Route** - Place discovery engine

### Phase 2: Core Features (Tier 2 Important)
Continue with specs in `.kiro/specs/tier-2-important/`:
- Ping Discovery
- Discovery Preferences
- Past Journeys Review
- Saved Places Management
- Discovery Consolidation

### Phase 3: Enhancement (Tier 3)
Add features from `.kiro/specs/tier-3-enhancement/`:
- Theme & Map Style
- Journey Completion
- Enhanced Places Integration
- Custom Lists
- Gamification

### Phase 4: Advanced (Tier 4)
Final features from `.kiro/specs/tier-4-advanced/`:
- Social Sharing
- Advanced Developer Tools
- Google Maps Import/Export

## 📋 Implementation Guidelines

1. **Follow Existing Specs**: Each feature has complete requirements, design, and task documents in `.kiro/specs/`
2. **Build Incrementally**: Complete one feature fully before moving to the next
3. **Test Early**: Use Expo Go for rapid iteration, development builds only when needed
4. **Preserve Architecture**: Follow the modular design patterns outlined in the steering docs
5. **Reference Documentation**: Use `.kiro/steering/` docs for architecture and coding standards

## 🔗 Key Resources

- **Feature Specifications**: `.kiro/specs/` - Complete implementation guides
- **Architecture Guide**: `.kiro/steering/structure.md` - Project organization
- **Technical Overview**: `.kiro/steering/tech.md` - Tech stack and setup
- **Product Overview**: `.kiro/steering/product.md` - Features and priorities

---

**Ready to start building?** Begin with the User Authentication spec in `.kiro/specs/tier-1-critical/user-authentication/`