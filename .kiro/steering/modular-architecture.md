# Modular Architecture Guidelines

## Overview

This document provides essential guidelines for maintaining the modular architecture patterns established during the MapScreen refactoring. All React Native components and hooks in Hero's Path must follow these patterns.

**Last Updated**: January 2025  
**Version**: 2.0

## Core Principles

### 1. Single Responsibility Principle
- Each component/hook has ONE clear responsibility
- Extract hooks for complex state logic
- Create child components for rendering sections

### 2. Size Limits with Warning System

**Target Limits (Green Zone - Ideal):**
- **Screen Components**: 150 lines (orchestration only)
- **Feature Components**: 100 lines  
- **UI Components**: 75 lines
- **Hooks**: 150 lines

**Warning Zone (Yellow - Requires Justification):**
- **Screen Components**: 150-200 lines
- **Feature Components**: 100-150 lines
- **UI Components**: 75-100 lines  
- **Hooks**: 150-200 lines

**Maximum Limits (Red Zone - Must Refactor):**
- **Screen Components**: 200 lines (HARD LIMIT)
- **Feature Components**: 150 lines (HARD LIMIT)
- **UI Components**: 100 lines (HARD LIMIT)
- **Hooks**: 200 lines (HARD LIMIT)

**Yellow Zone Requirements:**
- Must include justification comment in PR
- Must have refactoring plan documented
- Cannot merge without architectural review
- Must demonstrate single responsibility maintained

### 3. Hook-Based Architecture
- ALL business logic goes in custom hooks
- Components are presentation-only
- Never call services directly from components

### 4. Size Limit Rationale
**Why These Limits Work:**
- MapScreen: Reduced from 1600+ lines to <200 lines (all functionality preserved)
- Cognitive load research: Comprehension drops after ~150-200 lines
- Prevents "just one more feature" architectural decay
- Forces better design decisions from the start

**The Goal**: Better architecture, not arbitrary constraints

## Required Patterns

### Hook Structure Template
```javascript
/**
 * Custom hook for [specific responsibility]
 * Requirements: [Reference to requirements]
 */
const useFeatureName = () => {
  // 1. State declarations
  const [state, setState] = useState(initialValue);
  
  // 2. Service integration
  const serviceRef = useRef(null);
  
  // 3. Memoized actions
  const action = useCallback(async () => {
    try {
      const result = await serviceRef.current.performAction();
      setState(result);
    } catch (error) {
      console.error('Action failed:', error);
      throw error;
    }
  }, []);
  
  // 4. Cleanup
  useEffect(() => {
    serviceRef.current = new Service();
    return () => serviceRef.current?.cleanup();
  }, []);
  
  return { state, action };
};
```

### Component Structure Template
```javascript
/**
 * Component documentation
 * Responsibility: [Clear description]
 */
const MyComponent = React.memo(({ prop1, prop2 }) => {
  // 1. Custom hooks only
  const featureState = useFeatureHook();
  
  // 2. Memoized callbacks
  const handleAction = useCallback(() => {
    featureState.performAction();
  }, [featureState.performAction]);
  
  // 3. Render
  return (
    <View style={styles.container}>
      <ChildComponent onAction={handleAction} />
    </View>
  );
});
```

### Integration Pattern (MapScreen Example)
```javascript
const MapScreen = () => {
  // All state through hooks
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const savedPlaces = useSavedPlaces();
  
  // Simple coordination
  useEffect(() => {
    if (locationTracking.currentPosition && journeyTracking.isTracking) {
      journeyTracking.addToPath(locationTracking.currentPosition);
    }
  }, [locationTracking.currentPosition, journeyTracking.isTracking]);
  
  // Component composition
  return (
    <View>
      <MapRenderer {...mapProps} />
      <MapControls {...controlProps} />
    </View>
  );
};
```

## AI Agent Rules (CRITICAL)

### 1. Never Create Monolithic Components
- **Green Zone**: Ideal size, continue development
- **Yellow Zone**: Add justification, create refactoring plan
- **Red Zone**: STOP - Must refactor before proceeding
- Extract hooks for state logic
- Create child components for rendering

### 2. Always Use Hook Pattern
```javascript
// ✅ CORRECT
const useNewFeature = () => { /* logic */ };
const MyComponent = () => {
  const feature = useNewFeature();
  return <View>{/* render */}</View>;
};

// ❌ WRONG - Don't put logic in components
const MyComponent = () => {
  const [state, setState] = useState();
  const handleAction = async () => {
    const result = await SomeService.action(); // NO!
    setState(result);
  };
};
```

### 3. Follow MapScreen Integration Pattern
- Study existing hooks: `useLocationTracking`, `useJourneyTracking`
- Extend existing components through props
- Coordinate hooks in main component only

### 4. Required Performance Optimizations
```javascript
// Always use these
const MyComponent = React.memo(({ data, onAction }) => {
  const memoizedValue = useMemo(() => expensive(data), [data]);
  const handleAction = useCallback(() => onAction(data.id), [onAction, data.id]);
  return <View />;
});
```

### 5. Mandatory Testing
- All hooks: Use `@testing-library/react-hooks`
- All components: Mock hooks, test props/callbacks
- Integration: Test hook coordination

## Extension Points for New Features

### Map Features
1. Create focused hook (e.g., `usePingDiscovery`)
2. Add component to `MapControls`
3. Add overlay to `MapRenderer`
4. Coordinate in `MapScreen`

### Service Integration
```javascript
// Always abstract services through hooks
const useServiceIntegration = () => {
  const serviceRef = useRef(null);
  
  const performAction = useCallback(async () => {
    return await serviceRef.current.performAction();
  }, []);
  
  return { performAction };
};
```

## Code Review Checklist

### Automatic Rejection (Red Zone)
- [ ] Component exceeds HARD LIMITS (200/150/100/200 lines)
- [ ] Direct service calls in components  
- [ ] Missing React.memo/useCallback/useMemo
- [ ] No tests for new code
- [ ] Multiple responsibilities in one unit

### Yellow Zone Requirements
- [ ] Justification comment explaining why size is needed
- [ ] Documented refactoring plan with timeline
- [ ] Architectural review approval
- [ ] Proof that single responsibility is maintained
- [ ] No mixing of business concerns

### Exception Cases (Require Architectural Review)
- [ ] Complex form validation: +25 lines maximum
- [ ] Platform-specific code: +30 lines maximum
- [ ] Legacy integration: +20 lines maximum  
- [ ] Performance-critical sections: +15 lines maximum

### Required for All Approvals
- [ ] Follows hook structure template
- [ ] Has proper error handling
- [ ] Includes cleanup functions
- [ ] Has comprehensive tests
- [ ] Maintains backward compatibility

### Never Allowed (Even with Exceptions)
- [ ] Multiple business concerns in one component
- [ ] Direct service calls mixed with UI logic
- [ ] Unrelated state management
- [ ] Copy-pasted code instead of extraction

## Quick Reference

**Before implementing ANY feature:**
1. Read `docs/MapScreen-Developer-Guide.md`
2. Study existing hook patterns
3. Plan hook structure following template
4. Design component composition
5. Write tests first

**When extending existing features:**
1. Identify the responsible hook/component
2. Extend through props and composition
3. Never modify existing component internals
4. Test integration thoroughly

**For detailed examples and comprehensive documentation:**
- `docs/MapScreen-Refactoring-Architecture.md` - Complete architecture overview
- `docs/MapScreen-Developer-Guide.md` - Development patterns and examples
- `docs/future-proofing/` - Integration patterns for upcoming features

---

## Size Limit Enforcement Process

### For Yellow Zone Components (Warning)
1. **Add Justification Comment**: Explain why the size is necessary
2. **Document Refactoring Plan**: Include timeline and approach
3. **Request Architectural Review**: Cannot merge without approval
4. **Demonstrate Single Responsibility**: Prove no mixed concerns

### Example Yellow Zone Justification
```javascript
/**
 * YELLOW ZONE JUSTIFICATION (180/150 lines)
 * 
 * Reason: Complex form validation with 15 interdependent fields
 * Refactoring Plan: Extract validation logic to useFormValidation hook (Sprint 3)
 * Single Responsibility: Only handles user profile form rendering
 * Architectural Review: Approved by [reviewer] on [date]
 */
const UserProfileForm = () => {
  // Implementation
};
```

### Red Zone Response
- **STOP Development**: No new features until refactored
- **Immediate Action Required**: Extract hooks/components
- **No Exceptions**: Hard limits are non-negotiable
- **Architectural Review**: Required before any changes

---

**Remember**: The MapScreen refactoring reduced 1600+ lines to <200 lines while maintaining all functionality. The size limits are a forcing function for better architecture, not arbitrary constraints.