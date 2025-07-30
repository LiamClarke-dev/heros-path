import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Custom Hooks
import useMapPermissions from '../hooks/useMapPermissions';
import useLocationTracking from '../hooks/useLocationTracking';
import useMapState from '../hooks/useMapState';
import useJourneyTracking from '../hooks/useJourneyTracking';
import useSavedRoutes from '../hooks/useSavedRoutes';
import useSavedPlaces from '../hooks/useSavedPlaces';
import useMapStyle from '../hooks/useMapStyle';

// Components
import MapRenderer from '../components/map/MapRenderer';
import MapControls from '../components/map/MapControls';
import MapStatusDisplays from '../components/map/MapStatusDisplays';
import MapModals from '../components/map/MapModals';

// Contexts
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * MapScreen - Refactored with modular architecture
 * 
 * This component serves as the main orchestrator for all map functionality.
 * It has been refactored from a 1600+ line monolithic component into a modular
 * architecture with focused custom hooks and components.
 * 
 * Architecture:
 * - Main component: < 300 lines (orchestration only)
 * - 7 Custom hooks: Focused state management
 * - 4 Main components: Single responsibility rendering
 * 
 * Custom Hooks:
 * - useMapPermissions: Location permission management and status
 * - useLocationTracking: GPS services, position tracking, and location updates
 * - useMapState: Core map state, camera position, and error handling
 * - useJourneyTracking: Journey recording, path management, and saving
 * - useSavedRoutes: Saved routes loading, display, and visibility management
 * - useSavedPlaces: Saved places management, clustering, and interactions
 * - useMapStyle: Map styling, theme integration, and style selection
 * 
 * Components:
 * - MapRenderer: Map display and platform-specific rendering
 * - MapControls: UI controls layout and interaction handling
 * - MapStatusDisplays: Status information display (journey info, GPS status)
 * - MapModals: Modal management (journey naming, place details, style selector)
 * 
 * Performance Optimizations:
 * - Memoized components and callbacks to prevent unnecessary re-renders
 * - Focused state management to minimize update scope
 * - Proper cleanup and lifecycle management in all hooks
 * 
 * Requirements Addressed:
 * - 1.1-1.4: Component decomposition and single responsibility
 * - 2.1-2.4: Custom hooks extraction and state management
 * - 4.1-4.4: UI controls separation and organization
 * - 5.1-5.3: Map rendering isolation
 * - 6.1-6.4: State management optimization and performance
 * - 7.1-7.4: Backward compatibility preservation
 * 
 * @see docs/MapScreen-Refactoring-Architecture.md for detailed architecture documentation
 * @see docs/MapScreen-Developer-Guide.md for development guidelines
 */
const MapScreen = () => {
  // Context
  const { isAuthenticated } = useUser();
  const { currentTheme } = useTheme();

  // Refs
  const mapRef = useRef(null);
  const lastProcessedPosition = useRef(null);
  const hasInitiallyLocated = useRef(false);

  // All hooks integrated - permissions + location tracking + map state + journey tracking + saved routes + saved places + map style
  const permissions = useMapPermissions();
  const locationTracking = useLocationTracking();
  const mapState = useMapState();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Used to throttle position updates and prevent excessive re-renders
   * 
   * @param {Object} pos1 - First position {latitude, longitude}
   * @param {Object} pos2 - Second position {latitude, longitude}
   * @returns {number} Distance in meters, or Infinity if positions invalid
   */
  const calculateDistance = useCallback((pos1, pos2) => {
    if (!pos1 || !pos2) return Infinity;
    const R = 6371000; // Earth's radius in meters
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  /**
   * Coordinate location data between hooks with throttling and automatic centering
   * 
   * This effect synchronizes location data from useLocationTracking with other hooks:
   * - Updates map state with current position (throttled to 5m intervals)
   * - Automatically centers map on first location detection
   * - Adds positions to journey path when tracking is active
   * - Prevents excessive re-renders from frequent GPS updates
   * 
   * Throttling Logic:
   * - Only processes position updates if moved more than 5 meters
   * - Reduces CPU usage and prevents UI jank from frequent updates
   * - Maintains accuracy while optimizing performance
   * 
   * Auto-centering Logic:
   * - Centers map immediately when first GPS location is detected
   * - Prevents the frustrating default San Francisco location issue
   * - Only centers once to avoid disrupting user map interactions
   */
  useEffect(() => {
    if (locationTracking.currentPosition) {
      const currentPos = locationTracking.currentPosition;
      const lastPos = lastProcessedPosition.current;

      // Only update if position changed significantly (more than 5 meters) or it's the first position
      const distance = calculateDistance(lastPos, currentPos);
      if (!lastPos || distance > 5) {
        // Update map state with new position
        mapState.updateCurrentPosition(currentPos);

        // Automatically center map on first location detection
        if (!hasInitiallyLocated.current && mapRef.current) {
          console.log('First GPS location detected - centering map automatically');
          hasInitiallyLocated.current = true;
          
          // Use the animateToLocation utility for smooth centering
          const { animateToLocation } = require('../utils/locationUtils');
          animateToLocation(mapRef, currentPos, 1500).catch(error => {
            console.warn('Failed to animate to initial location:', error);
          });
        }

        // Add position to journey path if actively tracking
        if (journeyTracking.state.isTracking) {
          journeyTracking.addToPath(currentPos);
        }

        // Cache position to prevent redundant processing
        lastProcessedPosition.current = currentPos;
      }
    }
  }, [locationTracking.currentPosition, calculateDistance, mapState, journeyTracking]);

  // Permission handling is now centralized through useMapPermissions hook

  const handleMapReady = useCallback((mapInterface) => {
    mapRef.current = mapInterface.ref;
    console.log('Map ready:', mapInterface);
  }, []);

  const handleLocateMe = useCallback(async () => {
    console.log('MapRef status:', {
      mapRef: !!mapRef,
      current: !!mapRef?.current,
      ready: mapRef?.current ? 'ready' : 'not ready'
    });
    await locationTracking.locateMe(mapRef);
  }, [locationTracking.locateMe]);



  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        journeyTracking={journeyTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
        onMapReady={handleMapReady}
      />

      <MapControls
        trackingState={useMemo(() => ({
          isTracking: journeyTracking.state.isTracking,
          isAuthenticated: journeyTracking.state.isAuthenticated,
          journeyStartTime: journeyTracking.currentJourney?.startTime,
          trackingStatus: journeyTracking.state.trackingStatus,
          metrics: journeyTracking.metrics
        }), [journeyTracking.state.isTracking, journeyTracking.state.isAuthenticated, journeyTracking.currentJourney?.startTime, journeyTracking.state.trackingStatus, journeyTracking.metrics])}
        savedRoutesState={useMemo(() => ({
          isVisible: savedRoutes.visible,
          isLoading: savedRoutes.loading,
          hasRoutes: savedRoutes.data.length > 0
        }), [savedRoutes.visible, savedRoutes.loading, savedRoutes.data.length])}
        savedPlacesState={useMemo(() => ({
          isVisible: savedPlaces.visible,
          isLoading: savedPlaces.loading,
          hasPlaces: savedPlaces.data.length > 0
        }), [savedPlaces.visible, savedPlaces.loading, savedPlaces.data.length])}
        mapStyleState={useMemo(() => ({
          currentStyle: mapStyle.currentStyleName,
          selectorVisible: mapStyle.selector.visible
        }), [mapStyle.currentStyleName, mapStyle.selector.visible])}
        permissions={permissions}
        onLocateMe={handleLocateMe}
        onToggleTracking={useCallback(() => journeyTracking.toggleTracking(locationTracking), [journeyTracking.toggleTracking, locationTracking])}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        onToggleMapStyle={mapStyle.toggleSelector}
      />

      <MapStatusDisplays
        journeyInfo={useMemo(() => ({
          isTracking: journeyTracking.state.isTracking,
          startTime: journeyTracking.currentJourney?.startTime,
          currentPath: journeyTracking.pathToRender
        }), [journeyTracking.state.isTracking, journeyTracking.currentJourney?.startTime, journeyTracking.pathToRender])}
        gpsStatus={useMemo(() => ({
          gpsState: locationTracking.gpsStatus,
          signalStrength: locationTracking.gpsStatus?.signalStrength || 0,
          visible: locationTracking.gpsStatus !== null
        }), [locationTracking.gpsStatus])}
        theme={currentTheme}
        onGPSStatusPress={useCallback(() => console.log('GPS status pressed'), [])}
      />

      <MapModals
        journeyNaming={journeyTracking.namingModal}
        onSaveJourney={journeyTracking.saveJourney}
        onCancelSaveJourney={journeyTracking.cancelSave}
        defaultJourneyName={useMemo(() => `Journey ${new Date().toLocaleDateString()}`, [])}
        savingJourney={journeyTracking.savingJourney}
        placeDetail={savedPlaces.detailModal}
        onClosePlaceDetail={savedPlaces.closeDetailModal}
        onSavePlace={savedPlaces.savePlace}
        onUnsavePlace={savedPlaces.unsavePlace}
        onNavigateToPlace={useCallback((place) => savedPlaces.navigateToPlace(place, mapRef), [savedPlaces.navigateToPlace])}
        mapStyleSelector={mapStyle.selector}
        onCloseStyleSelector={mapStyle.closeSelector}
        onStyleChange={mapStyle.handleStyleChange}
        currentMapStyle={mapStyle.mapStyle}
        theme={currentTheme}
        isAuthenticated={isAuthenticated}
      />

      {/* Centralized permission handling through useMapPermissions hook - no duplicate UI needed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Permission UI styles removed - handled by centralized permission system

});

export default MapScreen;