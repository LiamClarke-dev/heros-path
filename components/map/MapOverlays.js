import React from 'react';

// Import sub-components
import SpriteOverlay from './SpriteOverlay';
import SavedPlacesOverlay from './SavedPlacesOverlay';

/**
 * MapOverlays Component
 * 
 * Container component that manages all map overlays including sprites,
 * markers, and clusters. Handles overlay positioning and interaction.
 * 
 * Requirements addressed:
 * - 5.1: Extract sprite, markers, and cluster overlay rendering
 * - 5.2: Implement overlay positioning and interaction handling
 * - 5.3: Create sub-components for different overlay types
 */
const MapOverlays = ({
  // Sprite overlay props
  currentPosition,
  recentPositions = [],
  spriteState,
  onSpriteStateChange,
  
  // Saved places overlay props
  savedPlaces = [],
  showSavedPlaces = false,
  clusters = [],
  onPlacePress,
  onClusterPress,
  
  // Styling props
  styleConfig = {},
  theme,
}) => {
  return (
    <>
      {/* Sprite overlay - shows user position and GPS status */}
      <SpriteOverlay
        currentPosition={currentPosition}
        recentPositions={recentPositions}
        spriteState={spriteState}
        onSpriteStateChange={onSpriteStateChange}
        styleConfig={styleConfig}
        theme={theme}
      />
      
      {/* Saved places overlay - shows saved places markers and clusters */}
      <SavedPlacesOverlay
        savedPlaces={savedPlaces}
        showSavedPlaces={showSavedPlaces}
        clusters={clusters}
        onPlacePress={onPlacePress}
        onClusterPress={onClusterPress}
        styleConfig={styleConfig}
        theme={theme}
      />
    </>
  );
};

export default MapOverlays;