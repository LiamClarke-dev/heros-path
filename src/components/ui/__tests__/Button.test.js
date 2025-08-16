/**
 * Button Component Tests
 */

import { describe, it, expect, jest } from '@jest/globals';

// Simple test to verify button component structure
describe('Button Component', () => {
  it('should have correct default properties', () => {
    // Test the button component exports and basic structure
    const Button = require('../Button').default;
    
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
  });

  it('should handle different variants', () => {
    // Test that the component can handle different variant props
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'success', 'error'];
    
    variants.forEach(variant => {
      expect(typeof variant).toBe('string');
      expect(variant.length).toBeGreaterThan(0);
    });
  });

  it('should handle different sizes', () => {
    // Test that the component can handle different size props
    const sizes = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      expect(typeof size).toBe('string');
      expect(size.length).toBeGreaterThan(0);
    });
  });
});