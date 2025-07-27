import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Custom Hooks
import useMapState from '../hooks/useMapState';
import useLocationTracking from '../hooks/useLocationTracking';
import useJourneyTracking from '../hooks/useJourneyTracking';
import useSavedRoutes from '../hooks/useSavedRoutes';
import useSavedPlaces from '../hooks/useSavedPlaces';
import useMapStyle from '../hooks/useMapStyle';
import useMapPermissions from '../hooks/useMapPermissions';

// Components
import MapRenderer from '../components/map/MapRenderer';
import MapControls from '../components/map/MapControls';
import MapStatusDisplays from '../components/map/MapStatusDisplays';
import MapModals from '../components/map/MapModals';

// Contexts
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Refactored MapScreen using custom hooks and component composition.
 * Orchestrates child components and manages high-level state.
 */

const MapScreen = React.memo(({ navigation }) => {
  // Context
  const { user, isAuthenticated } = useUser();
  const { theme, currentTheme } = useTheme();

  // Custom hooks for state management
  const mapState = useMapState();
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();
  const permissions = useMapPermissions();

  // Refs
  const mapRef = useRef(null);
  const renderCountRef = useRef(0);

  // Performance monitoring
  useEffect(() => {
    renderCountRef.current += 1;
    if (__DEV__) {
      console.log(`MapScreen render count: ${renderCountRef.current}`);
    }
  });

  // Sync location tracking with journey tracking
  useEffect(() => {
    if (locationTracking.currentPosition && journeyTracking.state.isTracking) {
      journeyTracking.addToPath(locationTracking.currentPosition);
    }
  }, [locationTracking.currentPosition, journeyTracking.state.isTracking]);

  // Update map state when location changes
  useEffect(() => {
    if (locationTracking.currentPosition) {
      mapState.updateCurrentPosition(locationTracking.currentPosition);
      mapState.updateCameraPosition(locationTracking.currentPosition);
    }
  }, [locationTracking.currentPosition]);

  // Keep map centered on user position when tracking
  useEffect(() => {
    if (journeyTracking.state.isTracking && locationTracking.currentPosition && mapRef.current) {
      const animateToCurrentPosition = async () => {
        try {
          const { animateToLocation } = await import('../utils/locationUtils');
          await animateToLocation(mapRef.current, locationTracking.currentPosition);
        } catch (error) {
          console.warn('Failed to animate map to current position:', error);
        }
      };
      const timeoutId = setTimeout(animateToCurrentPosition, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [locationTracking.currentPosition, journeyTracking.state.isTracking]);

  // Event handlers (memoized for performance)
  const handleLocateMe = useCallback(async () => {
    await locationTracking.locateMe(mapRef);
  }, [locationTracking]);

  const handleToggleTracking = useCallback(async () => {
    await journeyTracking.toggleTracking(locationTracking);
  }, [journeyTracking, locationTracking]);

  const handleSaveJourney = useCallback(async (journeyName) => {
    try {
      await journeyTracking.saveJourney(journeyName);
      await savedRoutes.refresh();
    } catch (error) {
      console.error('Error in handleSaveJourney:', error);
    }
  }, [journeyTracking, savedRoutes]);

  const handleSavePlace = useCallback(async (place) => {
    try {
      await savedPlaces.savePlace(place);
    } catch (error) {
      console.error('Error saving place:', error);
      throw error;
    }
  }, [savedPlaces]);

  const handleUnsavePlace = useCallback(async (place) => {
    try {
      await savedPlaces.unsavePlace(place.placeId || place.id);
    } catch (error) {
      console.error('Error unsaving place:', error);
      throw error;
    }
  }, [savedPlaces]);

  const handleNavigateToPlace = useCallback((place) => {
    savedPlaces.navigateToPlace(place, mapRef);
  }, [savedPlaces]);

  const handleGPSStatusPress = useCallback(() => {
    console.log('GPS status pressed');
  }, []);

  const handleMapReady = useCallback((mapInterface) => {
    mapRef.current = mapInterface.ref;
  }, []);

  // Memoized state objects for performance
  const trackingState = useMemo(() => ({
    isTracking: journeyTracking.state.isTracking,
    isAuthenticated: journeyTracking.state.isAuthenticated,
    journeyStartTime: journeyTracking.currentJourney?.startTime,
  }), [journeyTracking.state.isTracking, journeyTracking.state.isAuthenticated, journeyTracking.currentJourney?.startTime]);

  const savedRoutesState = useMemo(() => ({
    isVisible: savedRoutes.visible,
    isLoading: savedRoutes.loading,
    hasRoutes: savedRoutes.data.length > 0,
  }), [savedRoutes.visible, savedRoutes.loading, savedRoutes.data.length]);

  const savedPlacesState = useMemo(() => ({
    isVisible: savedPlaces.visible,
    isLoading: savedPlaces.loading,
    hasPlaces: savedPlaces.data.length > 0,
  }), [savedPlaces.visible, savedPlaces.loading, savedPlaces.data.length]);

  const mapStyleState = useMemo(() => ({
    currentStyle: mapStyle.mapStyle,
    selectorVisible: mapStyle.selector.visible,
  }), [mapStyle.mapStyle, mapStyle.selector.visible]);

  const journeyInfo = useMemo(() => ({
    isTracking: journeyTracking.state.isTracking,
    startTime: journeyTracking.currentJourney?.startTime,
    currentPath: journeyTracking.pathToRender || [],
  }), [journeyTracking.state.isTracking, journeyTracking.currentJourney?.startTime, journeyTracking.pathToRender]);

  const gpsStatus = useMemo(() => ({
    gpsState: locationTracking.gpsStatus,
    signalStrength: locationTracking.gpsStatus?.accuracy ? 
      Math.max(0, Math.min(100, 100 - (locationTracking.gpsStatus.accuracy / 2))) : 0,
    visible: locationTracking.gpsStatus?.indicator === 'POOR' || 
             locationTracking.gpsStatus?.indicator === 'LOST',
  }), [locationTracking.gpsStatus]);

  const currentThemeValue = useMemo(() => 
    currentTheme === 'system' ? (theme.dark ? 'dark' : 'light') : currentTheme,
    [currentTheme, theme.dark]
  );

  const journeyNamingProps = useMemo(() => ({
    visible: journeyTracking.namingModal.visible,
    journey: journeyTracking.namingModal.journey,
  }), [journeyTracking.namingModal.visible, journeyTracking.namingModal.journey]);

  const placeDetailProps = useMemo(() => ({
    visible: savedPlaces.detailModal.visible,
    place: savedPlaces.detailModal.place,
  }), [savedPlaces.detailModal.visible, savedPlaces.detailModal.place]);

  const mapStyleSelectorProps = useMemo(() => ({
    visible: mapStyle.selector.visible,
  }), [mapStyle.selector.visible]);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
        onMapReady={handleMapReady}
      />
      
      <MapControls
        trackingState={trackingState}
        savedRoutesState={savedRoutesState}
        savedPlacesState={savedPlacesState}
        mapStyleState={mapStyleState}
        permissions={permissions}
        onLocateMe={handleLocateMe}
        onToggleTracking={handleToggleTracking}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        onToggleMapStyle={mapStyle.toggleSelector}
      />
      
      <MapStatusDisplays
        journeyInfo={journeyInfo}
        gpsStatus={gpsStatus}
        theme={currentThemeValue}
        onGPSStatusPress={handleGPSStatusPress}
      />
      
      <MapModals
        journeyNaming={journeyNamingProps}
        onSaveJourney={handleSaveJourney}
        onCancelSaveJourney={journeyTracking.cancelSave}
        defaultJourneyName="My Journey"
        savingJourney={journeyTracking.savingJourney}
        placeDetail={placeDetailProps}
        onClosePlaceDetail={savedPlaces.closeDetailModal}
        onSavePlace={handleSavePlace}
        onUnsavePlace={handleUnsavePlace}
        onNavigateToPlace={handleNavigateToPlace}
        mapStyleSelector={mapStyleSelectorProps}
        onCloseStyleSelector={mapStyle.closeSelector}
        onStyleChange={mapStyle.handleStyleChange}
        currentMapStyle={mapStyle.mapStyle}
        theme={currentThemeValue}
        isAuthenticated={isAuthenticated}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default MapScreen;