import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
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
import useMapNavigation from '../hooks/useMapNavigation';

// Components
import MapRenderer from '../components/map/MapRenderer';
import MapControls from '../components/map/MapControls';
import MapStatusDisplays from '../components/map/MapStatusDisplays';
import MapModals from '../components/map/MapModals';
import DistanceDebugOverlay from '../components/ui/DistanceDebugOverlay';
import DebugInstructions from '../components/ui/DebugInstructions';

// Contexts
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';

// Services
import NavigationIntegrationService from '../services/NavigationIntegrationService';

// Navigation
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// CRITICAL FIX: Use centralized distance calculation
import { calculateDistance } from '../utils/distanceUtils';
import { calculateJourneyDistance } from '../utils/distanceUtils';

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
  const navigation = useNavigation();
  
  // Navigation integration
  const mapNavigation = useMapNavigation();

  // Refs
  const mapRef = useRef(null);
  const lastProcessedPosition = useRef(null);
  const hasInitiallyLocated = useRef(false);

  // Local state for GPS details expansion
  const [gpsExpanded, setGpsExpanded] = useState(false);

  // Debug overlay state for production testing
  const [debugOverlayVisible, setDebugOverlayVisible] = useState(false);
  const [debugInstructionsVisible, setDebugInstructionsVisible] = useState(false);

  // All hooks integrated - permissions + location tracking + map state + journey tracking + saved routes + saved places + map style
  const permissions = useMapPermissions();
  const locationTracking = useLocationTracking();
  const mapState = useMapState();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();

  /**
   * Update location tracking when permissions change
   */
  useEffect(() => {
    locationTracking.updatePermissions(permissions.granted);
  }, [permissions.granted, locationTracking.updatePermissions]);

  // CRITICAL FIX: Use centralized distance calculation from utils
  // This ensures consistency across the entire application

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

        // SERVICE-CENTRIC: BackgroundLocationService handles data processing
        // Update journey tracking with latest service data
        if (journeyTracking.state.isTracking) {
          journeyTracking.addToPath(currentPos); // Legacy compatibility
          journeyTracking.updateFromService(locationTracking); // Get processed data from service
        }

        // Cache position to prevent redundant processing
        lastProcessedPosition.current = currentPos;
      }
    }
  }, [locationTracking.currentPosition, mapState, journeyTracking]);

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

  const handleOpenDiscoveryPreferences = useCallback(() => {
    // Use navigation utility for consistent navigation
    mapNavigation.navigateToSettings('DiscoveryPreferences');
  }, [mapNavigation]);

  // Navigation integration - handle screen focus events for location tracking
  useFocusEffect(
    useCallback(() => {
      console.log('MapScreen focused - resuming location tracking if needed');
      
      // Resume location tracking when screen comes into focus
      if (journeyTracking.state.isTracking && !locationTracking.isTracking) {
        locationTracking.startTracking();
      }
      
      // Register navigation callbacks for feature integration
      NavigationIntegrationService.registerNavigationCallback('journey', handleJourneyCompleted);
      NavigationIntegrationService.registerNavigationCallback('savedPlaces', handlePlaceSaved);
      NavigationIntegrationService.registerNavigationCallback('discovery', handleDiscoveryMade);
      
      // Update navigation state
      return () => {
        console.log('MapScreen unfocused - maintaining background location if tracking');
        // Don't stop location tracking when unfocused if journey is active
        // Background location service will handle this
        
        // Unregister navigation callbacks
        NavigationIntegrationService.unregisterNavigationCallback('journey');
        NavigationIntegrationService.unregisterNavigationCallback('savedPlaces');
        NavigationIntegrationService.unregisterNavigationCallback('discovery');
      };
    }, [journeyTracking.state.isTracking, locationTracking.isTracking, locationTracking.startTracking, handleJourneyCompleted, handlePlaceSaved, handleDiscoveryMade])
  );

  // Additional navigation handlers for map controls
  const handleNavigateToJourneys = useCallback(() => {
    mapNavigation.navigateToJourneys();
  }, [mapNavigation]);

  const handleNavigateToDiscoveries = useCallback(() => {
    mapNavigation.navigateToDiscoveries();
  }, [mapNavigation]);

  const handleNavigateToSavedPlaces = useCallback(() => {
    mapNavigation.navigateToSavedPlaces();
  }, [mapNavigation]);

  // Journey completion navigation handler
  const handleJourneyCompleted = useCallback((savedJourney) => {
    console.log('Journey completed, navigating to journeys screen:', savedJourney);
    
    // Use navigation integration service for proper data flow
    const result = NavigationIntegrationService.handleJourneyCompleted(
      savedJourney, 
      { source: 'map_screen', action: 'journey_completed' }
    );
    
    if (result.success) {
      mapNavigation.navigateToJourneys('journey_completion');
    }
  }, [mapNavigation]);

  // Discovery navigation handler
  const handleDiscoveryMade = useCallback((discovery) => {
    console.log('Discovery made, available for navigation:', discovery);
    // Could navigate to discoveries screen or show discovery details
    // For now, just log - actual discovery flow will be implemented in discovery features
  }, []);

  // Saved place navigation handler
  const handlePlaceSaved = useCallback((savedPlace) => {
    console.log('Place saved, navigating to saved places screen:', savedPlace);
    
    // Use navigation integration service for proper data flow
    const result = NavigationIntegrationService.handlePlaceSaved(
      savedPlace,
      { source: 'map_screen', action: 'place_saved' }
    );
    
    if (result.success) {
      mapNavigation.navigateToSavedPlaces('place_saved');
    }
  }, [mapNavigation]);

  // Debug calculations for SERVICE-PROCESSED DATA
  const debugDistances = useMemo(() => {
    // CRITICAL FIX: Handle undefined/null journeyPath gracefully
    const journeyPath = journeyTracking.journeyPath || [];
    const displayPath = journeyTracking.displayPath || [];
    
    if (journeyPath.length < 2) {
      return {
        trackingDistance: 0,
        validationDistance: 0,
        modalDistance: 0,
        pathLength: journeyPath.length,
        displayLength: displayPath.length,
      };
    }

    const trackingDistance = Math.round(calculateJourneyDistance(journeyPath));
    const modalDistance = journeyTracking.namingModal.journey?.distance || 0;
    
    // Debug modal distance issue
    if (journeyTracking.namingModal.visible && modalDistance === 0) {
      console.log('MODAL DISTANCE DEBUG:', {
        modalVisible: journeyTracking.namingModal.visible,
        modalJourney: journeyTracking.namingModal.journey,
        modalDistance: modalDistance,
        journeyDistance: journeyTracking.namingModal.journey?.distance,
        trackingDistance: trackingDistance
      });
    }
    
    return {
      trackingDistance,
      validationDistance: trackingDistance, // Same source - service-processed
      modalDistance,
      pathLength: journeyPath.length,
      displayLength: displayPath.length,
    };
  }, [
    journeyTracking.journeyPath,
    journeyTracking.displayPath,
    journeyTracking.namingModal.journey?.distance
  ]);

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
        onDebugToggle={() => setDebugOverlayVisible(!debugOverlayVisible)}
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
        isLocating={locationTracking.isLocating}
        onLocateMe={handleLocateMe}
        onToggleTracking={useCallback(() => journeyTracking.toggleTracking(locationTracking, permissions), [journeyTracking.toggleTracking, locationTracking, permissions])}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        onToggleMapStyle={mapStyle.toggleSelector}
        onGPSStatusPress={useCallback(() => setGpsExpanded(prev => !prev), [])}
        onOpenDiscoveryPreferences={handleOpenDiscoveryPreferences}
      />

      <MapStatusDisplays
        journeyInfo={useMemo(() => ({
          isTracking: journeyTracking.state.isTracking,
          startTime: journeyTracking.currentJourney?.startTime,
          currentPath: journeyTracking.journeyPath || [] // Use journey data for accurate distance display
        }), [journeyTracking.state.isTracking, journeyTracking.currentJourney?.startTime, journeyTracking.journeyPath])}
        gpsStatus={useMemo(() => ({
          gpsState: locationTracking.gpsStatus,
          signalStrength: locationTracking.gpsStatus?.signalStrength || 0,
          visible: locationTracking.gpsStatus !== null
        }), [locationTracking.gpsStatus])}
        theme={currentTheme}
        onGPSStatusPress={useCallback(() => setGpsExpanded(prev => !prev), [])}
        gpsExpanded={gpsExpanded}
      />

      <MapModals
        journeyNaming={journeyTracking.namingModal}
        onSaveJourney={(journeyName, overrideValidation) => 
          journeyTracking.saveJourney(journeyName, overrideValidation, handleJourneyCompleted)
        }
        onCancelSaveJourney={journeyTracking.cancelSave}
        defaultJourneyName={useMemo(() => {
          const now = Date.now();
          return require('../services/JourneyService').default.generateDefaultName(now);
        }, [])}
        savingJourney={journeyTracking.savingJourney}
        placeDetail={savedPlaces.detailModal}
        onClosePlaceDetail={savedPlaces.closeDetailModal}
        onSavePlace={(place) => savedPlaces.savePlace(place, handlePlaceSaved)}
        onUnsavePlace={savedPlaces.unsavePlace}
        onNavigateToPlace={useCallback((place) => savedPlaces.navigateToPlace(place, mapRef), [savedPlaces.navigateToPlace])}
        mapStyleSelector={mapStyle.selector}
        onCloseStyleSelector={mapStyle.closeSelector}
        onStyleChange={mapStyle.handleStyleChange}
        currentMapStyle={mapStyle.mapStyle}
        backgroundPermission={permissions.backgroundPermissionModal}
        onRequestBackgroundPermission={permissions.requestBackgroundPermissions}
        onCancelBackgroundPermission={permissions.hideBackgroundPermissionModal}
        onOpenSettings={permissions.openSettings}
        theme={currentTheme}
        isAuthenticated={isAuthenticated}
      />

      {/* Distance Debug Overlay for production testing */}
      <DistanceDebugOverlay
        isVisible={debugOverlayVisible}
        trackingDistance={debugDistances.trackingDistance}
        validationDistance={debugDistances.validationDistance}
        modalDistance={debugDistances.modalDistance}
        pathLength={debugDistances.pathLength}
        displayLength={debugDistances.displayLength}

        onToggle={(action) => {
          if (action === 'instructions') {
            setDebugInstructionsVisible(true);
          } else {
            setDebugOverlayVisible(!debugOverlayVisible);
          }
        }}
        theme={currentTheme}
      />

      {/* Debug Instructions Modal */}
      <DebugInstructions
        visible={debugInstructionsVisible}
        onClose={() => setDebugInstructionsVisible(false)}
        theme={currentTheme}
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