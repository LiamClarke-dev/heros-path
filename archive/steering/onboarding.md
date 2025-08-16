# New Agent Onboarding Guide

## 🚨 CRITICAL: Project Status

**This is a CLEAN SLATE project.** All implementation code has been removed to eliminate technical debt. Only configuration, dependencies, and documentation remain.

## Quick Start for New Agents

### 1. Understand the Current State

**✅ What EXISTS:**
- Complete project configuration (package.json, app.json, etc.)
- All dependencies installed and ready
- Firebase and environment setup
- Complete feature specifications in `.kiro/specs/`
- All design assets in `assets/`
- Project documentation in `.kiro/steering/`

**❌ What DOESN'T EXIST:**
- Any implementation code (screens, components, services, etc.)
- App.js needs complete rebuild
- All directories: components/, screens/, services/, contexts/, utils/, styles/

### 2. Before You Start Coding

**ALWAYS READ THESE FIRST:**
1. **README.md** - Project overview and current status
2. **`.kiro/steering/product.md`** - Product vision and features
3. **`.kiro/steering/structure.md`** - Architecture and file organization
4. **`.kiro/steering/tech.md`** - Technical stack and setup

### 3. Implementation Approach

**Follow This Order:**
1. **Check Specifications**: Look in `.kiro/specs/tier-1-critical/` for the feature you're building
2. **Read Requirements**: Every spec has requirements.md, design.md, and tasks.md
3. **Build Incrementally**: Complete one task at a time
4. **Test Frequently**: Use `expo start` to test changes immediately

### 4. Key Principles

**Architecture:**
- Services handle all business logic and API calls
- Contexts manage global state
- Screens are UI-only, calling services through contexts
- Components are reusable UI elements

**File Organization:**
- PascalCase for components (e.g., `MapScreen.js`)
- camelCase for services and utils (e.g., `journeyService.js`)
- Group related functionality in services

**Development Workflow:**
- Use Expo Go for JavaScript-only changes (free, instant)
- Use development builds only for native dependencies (~$5 each)
- Test on device frequently

### 5. Common Mistakes to Avoid

❌ **Don't assume existing code** - Everything needs to be built from scratch
❌ **Don't skip reading specs** - Each feature has detailed requirements
❌ **Don't build everything at once** - Follow the tier-based approach
❌ **Don't hardcode API keys** - Use environment variables from config.js
❌ **Don't ignore the architecture** - Follow the modular service-based design

### 6. Getting Help

**When stuck, check:**
1. **Feature specs** in `.kiro/specs/` for detailed requirements
2. **Steering docs** in `.kiro/steering/` for architecture guidance
3. **Package.json** for available dependencies
4. **Config files** for environment setup

### 7. First Steps Checklist

Before writing any code:
- [ ] Read README.md completely
- [ ] Review the feature spec you're implementing
- [ ] Understand the project architecture from structure.md
- [ ] Verify the app runs with `expo start`
- [ ] Check that you understand which tier/feature you're building

### 8. Implementation Priority

**Start Here (Tier 1 Critical):**
1. User Authentication
2. Map Navigation & GPS  
3. Background Location
4. Journey Tracking
5. Search Along Route

**Then Move To (Tier 2 Important):**
- Ping Discovery
- Discovery Preferences
- Past Journeys Review
- Saved Places Management

**Don't Start With (Tier 3-4):**
- Social features
- Advanced gamification
- Complex UI themes
- Import/export features

## Quick Commands

```bash
# Start development server
npm start

# Test on specific platform
npm run ios
npm run android

# Build for testing (only when needed)
eas build --profile development --platform ios
```

## Remember

This is a **complete rebuild** - treat it as a new project that happens to have great documentation and configuration already set up. Follow the specs, build incrementally, and test frequently.