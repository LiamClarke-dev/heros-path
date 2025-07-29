# Modular Architecture Guidelines

## Overview

This document establishes guidelines for maintaining and extending the modular architecture patterns established during the MapScreen refactoring. These guidelines ensure consistent, maintainable, and scalable code across the Hero's Path application.

## Core Principles

### 1. Single Responsibility Principle
Each component and hook should have one clear, well-defined responsibility:

**✅ Good Example:**
```javascript
// useLocationTracking - handles only location-related state and logic
const useLocationTracking = () => {
  // Location state management
  // GPS status tracking
  // Location service integration
};
```

**❌ Bad Example:**
```javascript
// useMapEverything - handles too many responsibilities
const useMapEverything = () => {
  // Location tracking
  // Journey management
  // Saved places
  // Map styling
  // UI state
};
```

### 2. Component Size Limits
Enforce strict size limits to prevent monolithic components:

- **Main Screen Components**: Maximum 200 lines
- **Feature Components**: Maximum 150 lines
- **UI Components**: Maximum 100 lines
- **Utility Components**: Maximum 50 lines

### 3. Hook-Based State Management
Use custom hooks for all complex state logic:

```javascript
// Extract state logic into focused hooks
const MyComponent = () => {
  const dataState = useDataManagement();
  const uiState = useUIState();
  const serviceIntegration = useServiceIntegration();
  
  // Component focuses only on rendering and coordination
  return <View>{/* Render logic */}</View>;
};
```

## Component Architecture Patterns

### Container-Presentation Pattern

**Container Components** (Smart Components):
- Manage state through custom hooks
- Handle business logic coordination
- Pass data and callbacks to presentation components
- Maximum 200 lines

**Presentation Components** (Dumb Components):
- Receive all data through props
- Focus purely on rendering
- No direct service calls or complex state
- Easily testable with mock props

```javascript
// Container Component
const MapScreenContainer = () => {
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  
  return (
    <MapScreenPresentation
      currentPosition={locationTracking.currentPosition}
      onStartJourney={journeyTracking.startJourney}
      // ... other props
    />
  );
};

// Presentation Component
const MapScreenPresentation = ({ currentPosition, onStartJourney }) => {
  return (
    <View>
      <MapView region={currentPosition} />
      <Button onPress={onStartJourney} title="Start Journey" />
    </View>
  );
};
```

### Hook Composition Pattern

Create focused hooks that can be composed together:

```javascript
// Focused hooks
const useLocationData = () => { /* location logic */ };
const useLocationPermissions = () => { /* permission logic */ };
const useLocationTracking = () => { /* tracking logic */ };

// Composed hook (when needed)
const useLocationFeatures = () => {
  const data = useLocationData();
  const permissions = useLocationPermissions();
  const tracking = useLocationTracking();
  
  return { data, permissions, tracking };
};
```

## Custom Hook Guidelines

### Hook Naming Convention
- Always start with `use` prefix
- Use descriptive, specific names
- Indicate the domain or feature area

```javascript
// ✅ Good hook names
useMapState()
useLocationTracking()
useJourneyManagement()
useSavedPlaces()

// ❌ Bad hook names
useMap() // Too generic
useStuff() // Not descriptive
mapHook() // Missing 'use' prefix
```

### Hook Structure Template

```javascript
/**
 * Custom hook for [specific responsibility]
 * 
 * Handles:
 * - [Responsibility 1]
 * - [Responsibility 2]
 * - [Responsibility 3]
 * 
 * Requirements: [Reference to requirements]
 */
const useFeatureName = (initialConfig = {}) => {
  // 1. State declarations
  const [state1, setState1] = useState(initialValue);
  const [state2, setState2] = useState(initialValue);
  
  // 2. Refs for persistent values
  const serviceRef = useRef(null);
  
  // 3. Effect hooks for initialization and cleanup
  useEffect(() => {
    initialize();
    return cleanup;
  }, []);
  
  // 4. Memoized callbacks
  const action1 = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  const action2 = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  // 5. Cleanup function
  const cleanup = useCallback(() => {
    // Cleanup logic
  }, []);
  
  // 6. Return object with clear interface
  return {
    // State (read-only)
    state1,
    state2,
    
    // Actions
    action1,
    action2,
    
    // Utilities (if needed)
    cleanup,
  };
};
```

### Hook Dependencies and Communication

**Direct Communication** (Preferred):
```javascript
const MyComponent = () => {
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  
  // Coordinate between hooks in component
  useEffect(() => {
    if (locationTracking.currentPosition && journeyTracking.isTracking) {
      journeyTracking.addToPath(locationTracking.currentPosition);
    }
  }, [locationTracking.currentPosition, journeyTracking.isTracking]);
};
```

**Shared Context** (When needed):
```javascript
// For truly global state that multiple hooks need
const LocationContext = createContext();

const useLocationTracking = () => {
  const context = useContext(LocationContext);
  // Hook implementation
};
```

## Component Guidelines

### Component File Structure

```javascript
// 1. Imports (grouped and sorted)
import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

// Custom hooks
import useFeatureHook from '../hooks/useFeatureHook';

// Child components
import ChildComponent from './ChildComponent';

/**
 * Component documentation
 * 
 * Responsibility: [Clear description]
 * 
 * Props:
 * - prop1: Description
 * - prop2: Description
 * 
 * Requirements: [Reference to requirements]
 */
const MyComponent = ({ prop1, prop2 }) => {
  // 2. Custom hooks
  const featureState = useFeatureHook();
  
  // 3. Local state (minimal)
  const [localState, setLocalState] = useState(null);
  
  // 4. Memoized values
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(prop1);
  }, [prop1]);
  
  // 5. Callbacks
  const handleAction = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  // 6. Render
  return (
    <View style={styles.container}>
      <ChildComponent
        data={memoizedValue}
        onAction={handleAction}
      />
    </View>
  );
};

// 7. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// 8. Memoization and export
export default React.memo(MyComponent);
```

### Performance Optimization Guidelines

**Memoization Rules:**
- Use `React.memo` for all components
- Use `useMemo` for expensive calculations
- Use `useCallback` for functions passed as props
- Avoid inline objects and functions in render

```javascript
// ✅ Good - memoized callback
const handlePress = useCallback(() => {
  onAction(data.id);
}, [onAction, data.id]);

// ❌ Bad - inline function
<Button onPress={() => onAction(data.id)} />

// ✅ Good - memoized object
const buttonProps = useMemo(() => ({
  title: data.title,
  disabled: data.loading
}), [data.title, data.loading]);

// ❌ Bad - inline object
<Button {...{ title: data.title, disabled: data.loading }} />
```

## Service Integration Patterns

### Hook-Service Integration

Never call services directly from components. Always use hooks:

```javascript
// ✅ Good - service called through hook
const useJourneyManagement = () => {
  const saveJourney = useCallback(async (journeyData) => {
    try {
      const result = await JourneyService.saveJourney(journeyData);
      return result;
    } catch (error) {
      console.error('Failed to save journey:', error);
      throw error;
    }
  }, []);
  
  return { saveJourney };
};

// ❌ Bad - direct service call in component
const MyComponent = () => {
  const handleSave = async () => {
    await JourneyService.saveJourney(data); // Don't do this
  };
};
```

### Error Handling in Hooks

Implement consistent error handling patterns:

```javascript
const useDataFetching = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await DataService.fetchData();
      setData(result);
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    data,
    loading,
    error,
    fetchData,
    clearError: () => setError(null)
  };
};
```

## Testing Guidelines

### Hook Testing

Test hooks in isolation using `@testing-library/react-hooks`:

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import useMyHook from '../hooks/useMyHook';

describe('useMyHook', () => {
  test('should initialize with default state', () => {
    const { result } = renderHook(() => useMyHook());
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  
  test('should handle actions correctly', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await act(async () => {
      await result.current.performAction();
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

### Component Testing

Test components with mocked hooks and props:

```javascript
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../components/MyComponent';

// Mock the hook
jest.mock('../hooks/useMyHook', () => ({
  __esModule: true,
  default: () => ({
    data: mockData,
    loading: false,
    performAction: mockPerformAction
  })
}));

describe('MyComponent', () => {
  test('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });
  
  test('should handle user interactions', () => {
    const { getByTestId } = render(<MyComponent />);
    
    fireEvent.press(getByTestId('action-button'));
    expect(mockPerformAction).toHaveBeenCalled();
  });
});
```

## Refactoring Triggers

### When to Refactor a Component

**Size Triggers:**
- Component exceeds line limits (200 for screens, 150 for features, 100 for UI)
- More than 10 useState calls
- More than 15 useEffect calls

**Complexity Triggers:**
- Multiple responsibilities identified
- Difficult to test in isolation
- Changes frequently affect multiple concerns
- New developers struggle to understand

**Performance Triggers:**
- Unnecessary re-renders detected
- Performance profiling shows bottlenecks
- Memory leaks identified

### Refactoring Process

1. **Identify Responsibilities**: List all the things the component does
2. **Group Related Logic**: Find logical groupings of state and behavior
3. **Extract Hooks**: Create custom hooks for each responsibility group
4. **Create Child Components**: Extract rendering logic into focused components
5. **Update Parent**: Simplify parent to orchestration only
6. **Add Tests**: Ensure all extracted pieces are tested
7. **Validate**: Confirm functionality is preserved

## AI Agent Instructions

### For AI Agents Working on This Codebase

**CRITICAL RULES:**

1. **Never create monolithic components**
   - If a component approaches 200 lines, immediately refactor
   - Extract hooks for complex state logic
   - Create child components for rendering sections

2. **Always use the hook pattern**
   - Don't put business logic directly in components
   - Create custom hooks for service integration
   - Use the hook structure template provided

3. **Follow the established patterns**
   - Use the container-presentation pattern
   - Implement proper memoization
   - Follow the component file structure

4. **Maintain backward compatibility**
   - Preserve all existing functionality
   - Don't change user-facing behavior
   - Ensure performance improvements only

5. **Test everything**
   - Write tests for new hooks
   - Test components in isolation
   - Verify integration works correctly

### Code Review Criteria

**Automatic Rejection Criteria:**
- Components over line limits without justification
- Direct service calls in components
- Missing memoization for expensive operations
- No tests for new hooks or components
- Breaking changes to existing functionality

**Required Elements:**
- Clear component/hook documentation
- Proper error handling
- Cleanup functions in hooks
- Performance optimizations
- Test coverage

## Future Feature Integration

### Extension Point Guidelines

When adding new features, follow these patterns:

**New Map Features:**
- Create focused hooks (e.g., `usePingDiscovery`)
- Extend existing components (e.g., add PingButton to MapControls)
- Use overlay system for visual elements
- Integrate through established data flow

**New UI Features:**
- Follow container-presentation pattern
- Create reusable components in `components/ui/`
- Use theme system for styling
- Implement proper accessibility

**New Services:**
- Abstract through custom hooks
- Implement consistent error handling
- Use proper TypeScript interfaces
- Add comprehensive tests

## Conclusion

These guidelines ensure that the modular architecture established during the MapScreen refactoring is maintained and extended consistently. By following these patterns, we can:

- Keep components focused and maintainable
- Ensure consistent code quality
- Make testing easier and more comprehensive
- Enable faster feature development
- Prevent regression to monolithic patterns

All developers and AI agents working on this codebase must follow these guidelines to maintain the architectural integrity and code quality standards.