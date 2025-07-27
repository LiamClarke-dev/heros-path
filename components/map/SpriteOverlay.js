import React, { useMemo } from 'react';

// Import the existing MapSprite component
import MapSprite from '../ui/MapSprite';

/**
 * SpriteOverlay Component
 * 
 * Handles sprite rendering and animation logic for the map.
 * Integrates GPS status and manages sprite state.
 * 
 * Requirements addressed:
 * - 5.1: Extract sprite rendering and animation logic
 * - 5.2: Implement GPS status integration and sprite state management
 * - 5.3: Handle sprite positioning and direction calculations
 */
const SpriteOverlay = ({
  currentPosition,
  recentPositions = [],
  spriteState,
  onSpriteStateChange,
  styleConfig = {},
  theme = 'light',
}) => {
  /**
   * Get theme name for sprite component
   */
  const getCurrentThemeName = () => {
    if (theme === 'system') {
      // For system theme, we'd need to check if it's dark mode
      // For now, default to light
      return 'light';
    }
    return theme;
  };

  /**
   * Memoized sprite props to optimize rendering
   */
  const spriteProps = useMemo(() => ({
    position: currentPosition,
    recentPositions,
    gpsAccuracy: spriteState?.gpsAccuracy || null,
    size: styleConfig.spriteSize || undefined, // Use default if not specified
    theme: getCurrentThemeName(),
    onStateChange: onSpriteStateChange,
  }), [
    currentPosition,
    recentPositions,
    spriteState?.gpsAccuracy,
    styleConfig.spriteSize,
    theme,
    onSpriteStateChange,
  ]);

  // Don't render sprite if no position is available
  if (!currentPosition) {
    return null;
  }

  return <MapSprite {...spriteProps} />;
};

export default SpriteOverlay;