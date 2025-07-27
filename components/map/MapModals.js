import React from 'react';
import { View } from 'react-native';

// Modal components
import JourneyNamingModal from '../ui/JourneyNamingModal';
import PlaceDetailModal from '../ui/PlaceDetailModal';
import MapStyleSelector from '../ui/MapStyleSelector';

/**
 * MapModals Component
 * 
 * Container component that manages all modal rendering and state for the MapScreen.
 * This component extracts modal management into an organized structure and handles
 * modal visibility and user interactions.
 * 
 * Requirements addressed:
 * - 4.1: Extract UI controls into separate components
 * - 4.2: Accept props for state and callbacks
 * - 4.3: Use layout component for positioning
 * - 4.4: Don't directly access services
 */
const MapModals = ({
  // Journey naming modal props
  journeyNaming,
  onSaveJourney,
  onCancelSaveJourney,
  defaultJourneyName,
  savingJourney,
  
  // Place detail modal props
  placeDetail,
  onClosePlaceDetail,
  onSavePlace,
  onUnsavePlace,
  onNavigateToPlace,
  
  // Map style selector props
  mapStyleSelector,
  onCloseStyleSelector,
  onStyleChange,
  currentMapStyle,
  
  // Common props
  theme,
  isAuthenticated,
}) => {
  return (
    <View>
      {/* Journey Naming Modal */}
      <JourneyNamingModal
        visible={journeyNaming.visible}
        onSave={onSaveJourney}
        onCancel={onCancelSaveJourney}
        defaultName={defaultJourneyName}
        journeyStats={journeyNaming.journey?.stats || {}}
        loading={savingJourney}
      />

      {/* Place Detail Modal */}
      <PlaceDetailModal
        visible={placeDetail.visible}
        place={placeDetail.place}
        theme={theme}
        onClose={onClosePlaceDetail}
        onSave={onSavePlace}
        onUnsave={onUnsavePlace}
        onNavigate={onNavigateToPlace}
        isAuthenticated={isAuthenticated}
      />

      {/* Map Style Selector Modal */}
      <MapStyleSelector
        visible={mapStyleSelector.visible}
        onClose={onCloseStyleSelector}
        currentStyle={currentMapStyle}
        onStyleChange={onStyleChange}
        showNightModeOption={true}
      />
    </View>
  );
};

export default MapModals;