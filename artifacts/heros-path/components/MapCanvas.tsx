import React, { memo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import type RNMapView from "react-native-maps";
import type {
  MapViewProps,
  MapMarkerProps,
  MapPolylineProps,
  MapPolygonProps,
  Region,
  Provider,
} from "react-native-maps";
import Colors from "../constants/colors";
import { EmojiPin } from "./EmojiPin";
import type { ListInfo } from "./ListFilterSheet";
import type { MapPinPlace } from "./MapPinCallout";

const IS_WEB = Platform.OS === "web";

let MapView: React.ComponentClass<MapViewProps> | null = null;
let Marker: React.ComponentType<MapMarkerProps> | null = null;
let Polyline: React.ComponentType<MapPolylineProps> | null = null;
let Polygon: React.ComponentType<MapPolygonProps> | null = null;
let PROVIDER_GOOGLE: Provider | null = null;

if (!IS_WEB) {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Polygon = Maps.Polygon;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

const MARKER_ARROW = require("../assets/sprites/marker_arrow2x.png");

// Stable references — see notes in app/(tabs)/index.tsx
const DASH_PATTERN: number[] = [8, 4];
const PIN_ANCHOR = { x: 0.5, y: 1.0 } as const;
const CHARACTER_ANCHOR = { x: 0.5, y: 0.9 } as const;
const LABEL_ANCHOR = { x: 0.5, y: 0.5 } as const;

const JOURNEY_GREEN = "#4efeb5";
const JOURNEY_GREEN_GLOW = "rgba(78,254,181,0.35)";

export interface ZoneRingRenderData {
  fillKey: string;
  borderKey: string;
  fillCoords: { latitude: number; longitude: number }[];
  borderCoords: { latitude: number; longitude: number }[];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ZoneRenderItem {
  id: string;
  coveragePct: number;
  labelCoord: { latitude: number; longitude: number };
  labelText: string;
  rings: ZoneRingRenderData[];
}

export interface PolylineRenderItem {
  key: string;
  color: string;
  coords: { latitude: number; longitude: number }[];
}

export interface SegmentRenderItem {
  key: string;
  coords: { latitude: number; longitude: number }[];
}

export interface PinRenderItem {
  pin: MapPinPlace;
  coordinate: { latitude: number; longitude: number };
}

interface MapCanvasProps {
  mapRef: React.RefObject<RNMapView | null>;
  initialRegion: Region;
  onRegionChangeComplete: (region: Region) => void;

  zoneRenderData: ZoneRenderItem[];
  zoomLatDelta: number;
  showZoneLabels: boolean;

  historicalPolylineData: PolylineRenderItem[];

  isJourneyActive: boolean;
  activeSegmentGlow: SegmentRenderItem[];
  activeSegmentLine: SegmentRenderItem[];

  characterCoord: { latitude: number; longitude: number } | null;
  characterRotation: number;

  pinRenderData: PinRenderItem[];
  pinSetVersion: number;
  listMap: Record<string, ListInfo>;
  selectedPinId: string | null;
  onPinPress: (pin: MapPinPlace | null) => void;
}

function MapCanvasInner({
  mapRef,
  initialRegion,
  onRegionChangeComplete,
  zoneRenderData,
  zoomLatDelta,
  showZoneLabels,
  historicalPolylineData,
  isJourneyActive,
  activeSegmentGlow,
  activeSegmentLine,
  characterCoord,
  characterRotation,
  pinRenderData,
  pinSetVersion,
  listMap,
  selectedPinId,
  onPinPress,
}: MapCanvasProps) {
  if (!MapView) return null;

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={!IS_WEB && PROVIDER_GOOGLE ? PROVIDER_GOOGLE : undefined}
      customMapStyle={Colors.mapDark}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      onRegionChangeComplete={onRegionChangeComplete}
      initialRegion={initialRegion}
    >
      {/* Zones — geometry is fully pre-computed in zoneRenderData. No
          viewport filter (Google Maps culls offscreen geometry natively),
          and zoom gating uses zoomLatDelta which only updates on >5% changes. */}
      {zoomLatDelta <= 0.12 && zoneRenderData.flatMap((zone) => {
        const elements: React.ReactNode[] = [];
        for (let ri = 0; ri < zone.rings.length; ri++) {
          const r = zone.rings[ri];
          if (Polygon) {
            elements.push(
              <Polygon
                key={r.fillKey}
                coordinates={r.fillCoords}
                strokeColor="transparent"
                strokeWidth={0}
                fillColor={r.fillColor}
              />
            );
          }
          if (Polyline) {
            elements.push(
              <Polyline
                key={r.borderKey}
                coordinates={r.borderCoords}
                strokeColor={r.strokeColor}
                strokeWidth={r.strokeWidth}
                lineDashPattern={DASH_PATTERN}
              />
            );
          }
        }
        if (Marker && showZoneLabels && zone.coveragePct > 0) {
          elements.push(
            <Marker
              key={`zone-label-${zone.id}`}
              coordinate={zone.labelCoord}
              anchor={LABEL_ANCHOR}
              tracksViewChanges={false}
              flat
            >
              <View style={styles.suburbLabelChip}>
                <Text style={styles.suburbLabelText}>{zone.labelText}</Text>
              </View>
            </Marker>
          );
        }
        return elements;
      })}

      {Polyline && historicalPolylineData.map((p) => (
        <Polyline
          key={p.key}
          coordinates={p.coords}
          strokeColor={p.color}
          strokeWidth={4}
        />
      ))}

      {isJourneyActive && activeSegmentGlow.length > 0 && Polyline && (
        <>
          {activeSegmentGlow.map((s) => (
            <Polyline
              key={s.key}
              coordinates={s.coords}
              strokeColor={JOURNEY_GREEN_GLOW}
              strokeWidth={10}
            />
          ))}
          {activeSegmentLine.map((s) => (
            <Polyline
              key={s.key}
              coordinates={s.coords}
              strokeColor={JOURNEY_GREEN}
              strokeWidth={4}
            />
          ))}
        </>
      )}

      {/* Character arrow marker.
          tracksViewChanges MUST stay true on Google Maps iOS — when it's
          false at mount, GMSMarker captures its visual state before the
          `image` PNG is applied, leaving an invisible marker that never
          repaints. Single marker + tiny PNG = negligible perf cost. */}
      {characterCoord && Marker && React.createElement(Marker as React.ElementType, {
        key: "character-arrow",
        coordinate: characterCoord,
        anchor: CHARACTER_ANCHOR,
        tracksViewChanges: true,
        flat: true,
        rotation: characterRotation,
        image: MARKER_ARROW,
      })}

      {/* Pin marker subtree — Fragment key bumps on empty<->non-empty
          transitions to flush GMSMapView's stale marker layer. */}
      {Marker && (
        <React.Fragment key={`pins-${pinSetVersion}`}>
          {pinRenderData.map((item) => {
            const list = listMap[item.pin.listId];
            if (!list) return null;
            const isSelected = selectedPinId === item.pin.googlePlaceId;
            return (
              <Marker
                key={`pin-${item.pin.googlePlaceId}`}
                coordinate={item.coordinate}
                anchor={PIN_ANCHOR}
                tracksViewChanges={isSelected}
                onPress={() => onPinPress(isSelected ? null : item.pin)}
              >
                <EmojiPin emoji={list.emoji} color={list.color} size="md" />
              </Marker>
            );
          })}
        </React.Fragment>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  suburbLabelChip: {
    backgroundColor: Colors.backgroundAlpha85,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.goldGlow45,
  },
  suburbLabelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.parchment,
  },
});

export const MapCanvas = memo(MapCanvasInner);
