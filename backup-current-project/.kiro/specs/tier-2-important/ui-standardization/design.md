# UI Standardization Design

## Overview

This design document outlines the architecture for standardizing UI components across Hero's Path, creating a cohesive design system that ensures consistency, maintainability, and excellent user experience.

## Architecture

### Component Hierarchy

```
UI Design System
├── Base Components
│   ├── BaseModal (foundation for all modals)
│   ├── Button (unified button system)
│   └── ThemeProvider (enhanced theme management)
├── Specialized Modals
│   ├── ConfirmationModal (replaces Alert.alert confirmations)
│   ├── AlertModal (replaces Alert.alert notifications)
│   └── InputModal (for text input scenarios)
├── Map Control System
│   ├── MapControlsLayout (positioning system)
│   └── Standardized map buttons
└── Theme Integration
    ├── useTheme hook (consistent theme access)
    └── Theme color standardization
```

### Design Principles

1. **Single Source of Truth**: All styling decisions flow from the theme system
2. **Composition over Inheritance**: Components are built by composing smaller, focused components
3. **Consistent API**: Similar components have similar prop interfaces
4. **Performance First**: All components use React optimization patterns
5. **Accessibility**: All components support screen readers and keyboard navigation

## Components and Interfaces

### BaseModal Component

The foundation for all modal components in the app.

```javascript
// components/ui/BaseModal.js
interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
}

const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  animationType = 'slide',
  ...props
}) => {
  const { theme } = useTheme();
  
  // Implementation with:
  // - Theme-aware styling
  // - Keyboard avoidance
  // - Safe area handling
  // - Consistent animations
  // - Accessibility support
};
```

### Button Design System

Unified button component supporting all use cases in the app.

```javascript
// components/ui/Button.js
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  shape?: 'rounded' | 'circular' | 'square';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onPress: () => void;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  shape = 'rounded',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onPress,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  
  // Implementation with:
  // - Theme-aware styling for all variants
  // - Consistent sizing and spacing
  // - Loading states with spinners
  // - Icon positioning
  // - Accessibility labels
  // - Press feedback animations
};
```

### Map Controls Layout System

Standardized positioning system for map controls.

```javascript
// components/map/MapControlsLayout.js
interface ControlPosition {
  zone: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'bottomCenter';
  priority: number; // Higher priority = closer to corner/center
}

interface MapControlsLayoutProps {
  children: React.ReactElement[];
}

const CONTROL_ZONES = {
  topLeft: { top: SAFE_AREA_TOP + MARGIN, left: MARGIN },
  topRight: { top: SAFE_AREA_TOP + MARGIN, right: MARGIN },
  bottomLeft: { bottom: SAFE_AREA_BOTTOM + MARGIN, left: MARGIN },
  bottomRight: { bottom: SAFE_AREA_BOTTOM + MARGIN, right: MARGIN },
  bottomCenter: { bottom: SAFE_AREA_BOTTOM + MARGIN, alignSelf: 'center' }
};

const MapControlsLayout: React.FC<MapControlsLayoutProps> = ({ children }) => {
  // Implementation with:
  // - Automatic positioning based on zone and priority
  // - Consistent spacing between controls
  // - Safe area boundary respect
  // - Collision detection and resolution
};
```

### Specialized Modal Components

#### ConfirmationModal

Replaces Alert.alert for confirmation dialogs.

```javascript
// components/ui/ConfirmationModal.js
interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}
```

#### AlertModal

Replaces Alert.alert for notifications.

```javascript
// components/ui/AlertModal.js
interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onDismiss: () => void;
}
```

## Data Models

### Theme Color Standardization

```javascript
// Enhanced theme structure
interface ThemeColors {
  // Surface colors
  surface: string;        // Modal backgrounds, card backgrounds
  surfaceVariant: string; // Secondary surface color
  
  // Text colors
  text: string;           // Primary text
  textSecondary: string;  // Secondary text, subtitles
  textDisabled: string;   // Disabled text
  
  // Interactive colors
  primary: string;        // Primary buttons, active states
  primaryVariant: string; // Primary button pressed state
  secondary: string;      // Secondary buttons
  
  // Status colors
  success: string;        // Success states, confirmations
  warning: string;        // Warning states
  danger: string;         // Error states, destructive actions
  
  // Utility colors
  border: string;         // Borders, dividers
  overlay: string;        // Modal overlays, backdrops
  shadow: string;         // Drop shadows
  
  // Map-specific colors (existing)
  mapBackground: string;
  routeColor: string;
  // ... other map colors
}
```

### Button Style Variants

```javascript
// Button styling system
interface ButtonStyles {
  primary: {
    backgroundColor: theme.colors.primary;
    color: theme.colors.surface;
    borderColor: theme.colors.primary;
  };
  secondary: {
    backgroundColor: 'transparent';
    color: theme.colors.primary;
    borderColor: theme.colors.primary;
  };
  ghost: {
    backgroundColor: 'transparent';
    color: theme.colors.text;
    borderColor: 'transparent';
  };
  danger: {
    backgroundColor: theme.colors.danger;
    color: theme.colors.surface;
    borderColor: theme.colors.danger;
  };
}
```

## Error Handling

### Theme Loading Errors

```javascript
// Fallback theme system
const DEFAULT_THEME = {
  colors: {
    surface: '#FFFFFF',
    text: '#000000',
    primary: '#007AFF',
    // ... complete fallback theme
  }
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    console.warn('useTheme must be used within ThemeProvider, using default theme');
    return { theme: DEFAULT_THEME, setTheme: () => {} };
  }
  
  return context;
};
```

### Component Error Boundaries

```javascript
// Error boundary for UI components
class UIComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Component Error:', error, errorInfo);
    // Log to crash reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text>Something went wrong with this component.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Component Testing

```javascript
// Example test for BaseModal
describe('BaseModal', () => {
  it('should apply theme colors correctly', () => {
    const mockTheme = { colors: { surface: '#FFFFFF', overlay: '#00000080' } };
    render(
      <ThemeProvider value={{ theme: mockTheme }}>
        <BaseModal visible={true} onClose={jest.fn()}>
          <Text>Test content</Text>
        </BaseModal>
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('modal-container')).toHaveStyle({
      backgroundColor: '#FFFFFF'
    });
  });

  it('should handle keyboard avoidance on iOS', () => {
    Platform.OS = 'ios';
    render(<BaseModal visible={true} onClose={jest.fn()}>Content</BaseModal>);
    
    expect(screen.getByTestId('keyboard-avoiding-view')).toHaveProp(
      'behavior',
      'padding'
    );
  });
});
```

### Integration Testing

```javascript
// Test theme changes across components
describe('Theme Integration', () => {
  it('should update all components when theme changes', async () => {
    const { rerender } = render(
      <ThemeProvider value={{ theme: lightTheme }}>
        <BaseModal visible={true} onClose={jest.fn()}>
          <Button variant="primary">Test</Button>
        </BaseModal>
      </ThemeProvider>
    );

    // Change to dark theme
    rerender(
      <ThemeProvider value={{ theme: darkTheme }}>
        <BaseModal visible={true} onClose={jest.fn()}>
          <Button variant="primary">Test</Button>
        </BaseModal>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('modal-container')).toHaveStyle({
        backgroundColor: darkTheme.colors.surface
      });
      expect(screen.getByTestId('primary-button')).toHaveStyle({
        backgroundColor: darkTheme.colors.primary
      });
    });
  });
});
```

### Performance Testing

```javascript
// Test for unnecessary re-renders
describe('Performance', () => {
  it('should not re-render when unrelated theme properties change', () => {
    const renderSpy = jest.fn();
    const TestComponent = React.memo(() => {
      renderSpy();
      const { theme } = useTheme();
      return <Text style={{ color: theme.colors.text }}>Test</Text>;
    });

    const { rerender } = render(
      <ThemeProvider value={{ theme: { ...lightTheme, unrelatedProp: 'value1' } }}>
        <TestComponent />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider value={{ theme: { ...lightTheme, unrelatedProp: 'value2' } }}>
        <TestComponent />
      </ThemeProvider>
    );

    expect(renderSpy).toHaveBeenCalledTimes(1); // Should not re-render
  });
});
```

## Migration Strategy

### Phase 1: Foundation Components
1. Create BaseModal component
2. Create Button design system
3. Enhance ThemeProvider with new color structure

### Phase 2: Modal Standardization
1. Update JourneyNamingModal to use BaseModal
2. Create ConfirmationModal and AlertModal
3. Replace critical Alert.alert calls

### Phase 3: Button Standardization
1. Update all map buttons to use new Button component
2. Implement MapControlsLayout system
3. Fix button positioning and overlap issues

### Phase 4: Complete Migration
1. Replace all remaining Alert.alert calls
2. Ensure all components use useTheme() hook
3. Remove all hardcoded colors

### Backward Compatibility

```javascript
// Provide backward compatibility wrappers where needed
const LegacyButton = (props) => {
  console.warn('LegacyButton is deprecated, use Button component instead');
  return <Button {...props} />;
};

// Gradual migration helper
const withThemeCompatibility = (Component) => {
  return React.forwardRef((props, ref) => {
    const { theme } = useTheme();
    
    // Convert legacy theme props to new format if needed
    const compatibleProps = {
      ...props,
      theme: theme || props.theme // Fallback to prop-based theme
    };
    
    return <Component ref={ref} {...compatibleProps} />;
  });
};
```

This design ensures a smooth transition to a standardized UI system while maintaining all existing functionality and providing a foundation for future UI development.