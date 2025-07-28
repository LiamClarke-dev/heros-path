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
 * This component orchestrates all map functionality through custom hooks and components:
 * - useMapPermissions: Location permission management
 * - useLocationTracking: GPS and location services
 * - useMapState: Map state and camera management
 * - useJourneyTracking: Journey recording and saving
 * - useSavedRoutes: Saved routes display and management
 * - useSavedPlaces: Saved places display and clustering
 * - useMapStyle: Map styling and theme integration
 */
const MapScreen = () => {
  // Context
  const { isAuthenticated } = useUser();
  const { currentTheme } = useTheme();

  // Refs
  const mapRef = useRef(null);
  const lastProcessedPosition = useRef(null);

  // All hooks integrated - permissions + location tracking + map state + journey tracking + saved routes + saved places + map style
  const permissions = useMapPermissions();
  const locationTracking = useLocationTracking();
  const mapState = useMapState();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();

  // Helper function to calculate distance between two positions
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

  // Sync location data with map state (throttled to prevent excessive updates)
  useEffect(() => {
    if (locationTracking.currentPosition) {
      const currentPos = locationTracking.currentPosition;
      const lastPos = lastProcessedPosition.current;

      // Only update if position changed significantly (more than 5 meters) or it's the first position
      const distance = calculateDistance(lastPos, currentPos);
      if (!lastPos || distance > 5) {
        // Only update the position in map state, don't animate camera
        mapState.updateCurrentPosition(currentPos);

        // Add position to journey path if tracking
        if (journeyTracking.state.isTracking) {
          journeyTracking.addToPath(currentPos);
        }

        lastProcessedPosition.current = currentPos;
      }
    }
  }, [locationTracking.currentPosition, calculateDistance]);

  // Manual permission request function
  const handleRequestPermissions = async () => {
    try {
      console.log('Manually requesting location permissions...');
      await permissions.requestPermissions();
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const handleMapReady = useCallback((mapInterface) => {
    mapRef.current = mapInterface.ref;
    console.log('Map ready:', mapInterface);
  }, []);

  const handleLocateMe = useCallback(async () => {
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
          journeyStartTime: journeyTracking.currentJourney?.startTime
        }), [journeyTracking.state.isTracking, journeyTracking.state.isAuthenticated, journeyTracking.currentJourney?.startTime])}
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

      {/* Permission prompt overlay */}
      {!permissions.granted && (
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionPrompt}>
            <Text style={styles.permissionTitle}>Location Access Required</Text>
            <Text style={styles.permissionText}>
              Location access is needed to show your position on the map and track your journeys.
            </Text>
            <Text style={styles.permissionSubtext}>
              Status: {permissions.statusMessage}
            </Text>
            <Text style={styles.permissionSubtext}>
              User: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
            </Text>
            {permissions.canAskAgain && (
              <>
                <Text style={styles.permissionSubtext}>
                  Tap the button below to request location access.
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={handleRequestPermissions}
                >
                  <Text style={styles.permissionButtonText}>
                    Request Location Access
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  permissionPrompt: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

});

export default MapScreen;