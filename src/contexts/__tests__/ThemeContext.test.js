/**
 * ThemeContext Tests
 */

import theme from '../../styles/theme';

describe('ThemeContext', () => {
  it('theme object has correct structure', () => {
    expect(theme).toBeDefined();
    expect(theme.colors).toBeDefined();
    expect(theme.spacing).toBeDefined();
    expect(theme.typography).toBeDefined();
    expect(theme.borderRadius).toBeDefined();
    expect(theme.shadow).toBeDefined();
    expect(theme.animation).toBeDefined();
    expect(theme.components).toBeDefined();
  });

  it('has required color properties', () => {
    expect(theme.colors.primary).toBe('#007AFF');
    expect(theme.colors.background).toBe('#FFFFFF');
    expect(theme.colors.text).toBe('#000000');
    expect(theme.colors.error).toBe('#FF3B30');
    expect(theme.colors.success).toBe('#34C759');
  });

  it('has consistent spacing scale', () => {
    expect(theme.spacing.xs).toBe(4);
    expect(theme.spacing.sm).toBe(8);
    expect(theme.spacing.md).toBe(16);
    expect(theme.spacing.lg).toBe(24);
    expect(theme.spacing.xl).toBe(32);
  });

  it('has typography definitions', () => {
    expect(theme.typography.h1).toHaveProperty('fontSize');
    expect(theme.typography.h1).toHaveProperty('fontWeight');
    expect(theme.typography.body).toHaveProperty('fontSize');
    expect(theme.typography.button).toHaveProperty('fontSize');
  });

  it('has component configurations', () => {
    expect(theme.components.button).toBeDefined();
    expect(theme.components.button.height).toBeDefined();
    expect(theme.components.input).toBeDefined();
    expect(theme.components.header).toBeDefined();
  });
});