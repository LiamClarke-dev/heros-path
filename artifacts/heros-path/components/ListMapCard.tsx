import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Linking,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { EmojiPin } from "./EmojiPin";
import type { MapViewProps, MapMarkerProps, Region } from "react-native-maps";

const IS_WEB = Platform.OS === "web";

let MapView: React.ComponentClass<MapViewProps> | null = null;
let Marker: React.ComponentType<MapMarkerProps> | null = null;
let PROVIDER_GOOGLE: string | null = null;

if (!IS_WEB) {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch {}
}

export interface MapPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  primaryType: string | null;
  types: string[];
  photoUrl: string | null;
  address: string | null;
  rating: number | null;
}

interface Props {
  places: MapPlace[];
  listEmoji: string;
  listColor: string;
  onViewPlaceDetail: (googlePlaceId: string) => void;
}

const PIN_COLOR = Colors.amberGlow80;
const CARD_HEIGHT = 200;

function computeRegion(places: MapPlace[]): Region {
  if (places.length === 0) {
    return { latitude: 0, longitude: 0, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }
  if (places.length === 1) {
    return {
      latitude: places[0].lat,
      longitude: places[0].lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.max((maxLat - minLat) * 1.5, 0.005);
  const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.005);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

function openDirections(lat: number, lng: number, name: string) {
  const encodedName = encodeURIComponent(name);
  if (Platform.OS === "ios") {
    const appleMapsUrl = `maps://?daddr=${lat},${lng}&q=${encodedName}`;
    Linking.canOpenURL(appleMapsUrl).then((can) => {
      if (can) {
        Linking.openURL(appleMapsUrl);
      } else {
        Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
      }
    });
  } else {
    Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${encodedName})`).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  }
}

interface CalloutState {
  place: MapPlace;
  slideAnim: Animated.Value;
}

export function ListMapCard({ places, listEmoji, listColor, onViewPlaceDetail }: Props) {
  const insets = useSafeAreaInsets();
  const [fullscreen, setFullscreen] = useState(false);
  const [callout, setCallout] = useState<CalloutState | null>(null);
  const region = computeRegion(places);

  const openCallout = useCallback((place: MapPlace) => {
    const slideAnim = new Animated.Value(200);
    setCallout({ place, slideAnim });
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, []);

  const closeCallout = useCallback(() => {
    if (!callout) return;
    Animated.timing(callout.slideAnim, {
      toValue: 200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setCallout(null));
  }, [callout]);

  const closeFullscreen = useCallback(() => {
    setCallout(null);
    setFullscreen(false);
  }, []);

  if (IS_WEB || !MapView || !Marker) {
    return (
      <View style={styles.webPlaceholder}>
        <Feather name="map" size={20} color={Colors.parchmentMuted} />
        <Text style={styles.webPlaceholderText}>Map view available on mobile</Text>
      </View>
    );
  }

  if (places.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Feather name="map-pin" size={18} color={Colors.parchmentDim} />
        <Text style={styles.emptyCardText}>No places to map yet</Text>
      </View>
    );
  }

  const MapMarker = Marker as React.ComponentType<MapMarkerProps>;

  const renderMarkers = (onPinPress: (place: MapPlace) => void) =>
    places.map((place) => (
      <MapMarker
        key={place.googlePlaceId}
        coordinate={{ latitude: place.lat, longitude: place.lng }}
        onPress={() => onPinPress(place)}
        tracksViewChanges={false}
      >
        <EmojiPin emoji={listEmoji} color={listColor} size={34} />
      </MapMarker>
    ));

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.95}
        style={styles.cardContainer}
        onPress={() => setFullscreen(true)}
      >
        <MapView
          style={styles.map}
          provider={Platform.OS === "android" ? (PROVIDER_GOOGLE as any) : undefined}
          customMapStyle={Colors.mapDark as any}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          {renderMarkers(() => {})}
        </MapView>
        <View style={styles.expandHint}>
          <Feather name="maximize-2" size={14} color={Colors.parchment} />
          <Text style={styles.expandHintText}>Tap to expand</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={fullscreen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeFullscreen}
      >
        <View style={[styles.fullscreenContainer, { paddingTop: insets.top }]}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>
              {listEmoji} Map
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={closeFullscreen}>
              <Feather name="x" size={22} color={Colors.parchment} />
            </TouchableOpacity>
          </View>

          <MapView
            style={styles.fullscreenMap}
            provider={Platform.OS === "android" ? (PROVIDER_GOOGLE as any) : undefined}
            customMapStyle={Colors.mapDark as any}
            initialRegion={region}
          >
            {renderMarkers(openCallout)}
          </MapView>

          {callout && (
            <TouchableWithoutFeedback onPress={closeCallout}>
              <View style={styles.calloutOverlay}>
                <TouchableWithoutFeedback>
                  <Animated.View
                    style={[
                      styles.calloutSheet,
                      { paddingBottom: insets.bottom + 8, transform: [{ translateY: callout.slideAnim }] },
                    ]}
                  >
                    <View style={styles.calloutHandle} />

                    <View style={styles.calloutRow}>
                      {callout.place.photoUrl ? (
                        <Image
                          source={{ uri: callout.place.photoUrl }}
                          style={styles.calloutPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.calloutPhoto, styles.calloutPhotoPlaceholder]}>
                          <Feather name="image" size={20} color={Colors.parchmentDim} />
                        </View>
                      )}

                      <View style={styles.calloutInfo}>
                        <Text style={styles.calloutName} numberOfLines={2}>
                          {callout.place.name}
                        </Text>
                        {(callout.place.primaryType || callout.place.types[0]) ? (
                          <Text style={styles.calloutType} numberOfLines={1}>
                            {(callout.place.primaryType ?? callout.place.types[0]).replace(/_/g, " ")}
                          </Text>
                        ) : null}
                        {callout.place.rating !== null && (
                          <Text style={styles.calloutRating}>★ {callout.place.rating.toFixed(1)}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.calloutActions}>
                      <TouchableOpacity
                        style={styles.calloutBtnPrimary}
                        onPress={() => {
                          closeFullscreen();
                          onViewPlaceDetail(callout.place.googlePlaceId);
                        }}
                      >
                        <Feather name="book-open" size={15} color={Colors.background} />
                        <Text style={styles.calloutBtnPrimaryText}>View Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.calloutBtnSecondary}
                        onPress={() =>
                          openDirections(callout.place.lat, callout.place.lng, callout.place.name)
                        }
                      >
                        <Feather name="navigation" size={15} color={Colors.gold} />
                        <Text style={styles.calloutBtnSecondaryText}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    height: CARD_HEIGHT,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  expandHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(13,26,16,0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchment,
  },
  emptyCard: {
    height: 64,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentDim,
  },
  webPlaceholder: {
    height: 56,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  webPlaceholderText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },

  fullscreenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fullscreenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  fullscreenMap: {
    flex: 1,
  },

  calloutOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  calloutSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  calloutHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  calloutPhoto: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  calloutPhotoPlaceholder: {
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calloutInfo: {
    flex: 1,
  },
  calloutName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.parchment,
    marginBottom: 3,
  },
  calloutType: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
    marginBottom: 3,
  },
  calloutRating: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.gold,
  },
  calloutActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  calloutBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
  },
  calloutBtnPrimaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  calloutBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.goldGlow,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  calloutBtnSecondaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.gold,
  },
});
