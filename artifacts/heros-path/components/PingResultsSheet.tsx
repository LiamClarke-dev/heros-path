import {
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

export interface PlaceResult {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  primaryType: string | null;
  types: string[];
  editorialSummary: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  phoneNumber: string | null;
  photoReference: string | null;
  photoUrl: string | null;
  address: string | null;
  openNow: boolean | null;
  openingHoursText: string[] | null;
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  night_club: "Nightlife",
  museum: "Museum",
  park: "Park",
  tourist_attraction: "Attraction",
  shopping_mall: "Shopping",
  gym: "Fitness",
  library: "Library",
  movie_theater: "Cinema",
  bakery: "Bakery",
  pharmacy: "Pharmacy",
  hotel: "Hotel",
};

function typeLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  return TYPE_LABELS[raw] ?? raw.replace(/_/g, " ");
}

function priceDots(level: string | null): string {
  switch (level) {
    case "INEXPENSIVE": return "•";
    case "MODERATE": return "••";
    case "EXPENSIVE": return "•••";
    case "VERY_EXPENSIVE": return "••••";
    case "FREE": return "Free";
    default: return "";
  }
}

function formatRating(rating: number | null, count: number | null): string {
  if (rating === null) return "";
  const stars = rating.toFixed(1);
  const votes = count !== null ? ` (${count.toLocaleString()})` : "";
  return `${stars} ★${votes}`;
}

interface PlaceCardProps {
  place: PlaceResult;
}

function PlaceCard({ place }: PlaceCardProps) {
  const openLink = (url: string | null | undefined) => {
    if (url) Linking.openURL(url);
  };

  const dots = priceDots(place.priceLevel);
  const label = typeLabel(place.primaryType);
  const rating = formatRating(place.rating, place.userRatingCount);

  return (
    <View style={styles.card}>
      {place.photoUrl ? (
        <Image
          source={{ uri: place.photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Feather name="image" size={28} color={Colors.parchmentDim} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          {label ? (
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{label}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          {rating ? (
            <Text style={styles.ratingText}>{rating}</Text>
          ) : null}
          {dots ? (
            <Text style={styles.priceText}>{dots}</Text>
          ) : null}
        </View>

        {place.editorialSummary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {place.editorialSummary}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {place.websiteUri ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openLink(place.websiteUri)}
            >
              <Feather name="globe" size={14} color={Colors.gold} />
              <Text style={styles.actionText}>Website</Text>
            </TouchableOpacity>
          ) : null}
          {place.googleMapsUri ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openLink(place.googleMapsUri)}
            >
              <Feather name="map-pin" size={14} color={Colors.gold} />
              <Text style={styles.actionText}>View on Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

interface PingResultsSheetProps {
  visible: boolean;
  places: PlaceResult[];
  newCount: number;
  journeyActive: boolean;
  onClose: () => void;
}

export default function PingResultsSheet({
  visible,
  places,
  newCount,
  journeyActive,
  onClose,
}: PingResultsSheetProps) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (Platform.OS === "web") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTap} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {journeyActive && (
            <View style={styles.journeyBanner}>
              <Feather name="activity" size={12} color={Colors.amber} />
              <Text style={styles.journeyBannerText}>
                Journey in progress — GPS still recording
              </Text>
            </View>
          )}
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {places.length === 0
                ? "No places found nearby"
                : `${places.length} place${places.length !== 1 ? "s" : ""} found`}
            </Text>
            {newCount > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  +{newCount} new
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          {places.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="search" size={40} color={Colors.parchmentDim} />
              <Text style={styles.emptyText}>
                No places found within 200m.{"\n"}Try pinging from a different location.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {places.map((place) => (
                <PlaceCard key={place.googlePlaceId} place={place} />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  journeyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(151,200,217,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  journeyBannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.amber,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
  },
  newBadge: {
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  newBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.gold,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.background,
  },
  photoPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  placeName: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.parchment,
  },
  typeChip: {
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.gold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchment,
  },
  priceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  summary: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontStyle: "italic",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.gold,
  },
});
