# Hero's Path - Product Overview

## Product Description

Hero's Path is a React Native/Expo mobile application that transforms ordinary walks into adventures of discovery. The app tracks users' walking routes with a glowing polyline and an animated Link sprite (inspired by The Legend of Zelda), saves past routes for later review, and helps users discover interesting places along their journeys.

## Core Features

- **Real-time Route Tracking**: Track walks with GPS, visualized with glowing polylines and an animated character sprite
- **Place Discovery**: Find interesting places along walking routes using Google Places API's Search Along Route (SAR) technology
- **Journey Management**: Save, name, and review past walking routes
- **Discoveries System**: Review, save, or dismiss discovered places after each journey
- **Theme System**: Multiple UI themes (Light, Dark, Adventure) and map styles (Standard, Satellite, Terrain, Night, Adventure)
- **Ping System**: Discover nearby places in real-time during walks using credits
- **Social Sharing**: Share walks and discoveries with friends

## Target Users

- Walking enthusiasts who want to make their walks more engaging
- Explorers interested in discovering new places in their area
- Gamers who enjoy gamified fitness experiences
- Travelers looking to discover points of interest while exploring new areas

## Value Proposition

Hero's Path transforms ordinary walks into adventures of discovery by:
1. Making walking more engaging with game-like elements
2. Helping users discover interesting places they might otherwise miss
3. Creating a record of exploration and discovery over time
4. Encouraging regular walking through gamification

## Feature Prioritization

Features are organized into four priority tiers:

### Tier 1: Critical Core Features
- User Authentication
- Map Navigation & GPS
- Background Location
- Journey Tracking
- Search Along Route (SAR)

### Tier 2: Important User Features
- Ping Discovery
- Discovery Preferences
- Past Journeys Review
- Saved Places Management
- Discovery Consolidation
- Developer Tools (Core)
- Data Migration (Core)

### Tier 3: Enhancement Features
- Theme & Map Style
- Journey Completion
- Enhanced Places Integration
- Performance Optimization
- Custom Lists
- Destination Routing
- Gamification

### Tier 4: Advanced Features
- Social Sharing
- Developer Tools (Advanced)
- Data Migration (Advanced)
- Google Maps Import/Export

## Development Roadmap

The development follows a phased approach based on feature dependencies:

1. **Foundation Phase**: Authentication, Map Navigation, Background Location
2. **Core Features Phase**: Journey Tracking, Search Along Route, Ping Discovery
3. **User Experience Phase**: Discovery Consolidation, Past Journeys, Saved Places
4. **Enhancement Phase**: Enhanced Places Integration, Custom Lists, Destination Routing
5. **Advanced Phase**: Gamification, Social Sharing, Google Maps Integration

## Current Development Status

**FRESH START - CLEAN SLATE**: The app has been reset to a clean state with all implementation code removed to eliminate technical debt. Only configuration files, dependencies, and documentation remain. 

**What's Preserved:**
- Project configuration (package.json, app.json, eas.json, babel.config.js)
- Environment setup (.env, config.js, firebase.js)
- Entry points (App.js, index.js) - but these need to be rebuilt
- Asset files and design tokens
- Complete specification documents for all features
- Steering documentation

**What Needs to be Built:**
- All screens, components, services, contexts, and utilities
- Complete application architecture from scratch
- All features according to the existing specifications

**Next Steps:**
1. Start with Tier 1 Critical Features (User Authentication, Map Navigation, etc.)
2. Follow the existing specifications in `.kiro/specs/` for implementation guidance
3. Build incrementally, testing each feature before moving to the next tier