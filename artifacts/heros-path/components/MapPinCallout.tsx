import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";

export interface MapPinPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  primaryType: string | null;
  address: string | null;
  listId: string;
}

interface Props {
  place: MapPinPlace;
  listEmoji: string;
  listName: string;
  listColor: string;
  onClose: () => void;
}

export function MapPinCallout({ place, listEmoji, listName, listColor, onClose }: Props) {
  const typeLabel = place.primaryType
    ? place.primaryType.replace(/_/g, " ")
    : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Feather name="x" size={14} color={Colors.parchmentMuted} />
      </TouchableOpacity>

      <Text style={styles.name} numberOfLines={2}>
        {place.name}
      </Text>

      <View
        style={[styles.listTag, { borderColor: listColor, backgroundColor: listColor + "22" }]}
      >
        <Text style={styles.listTagText}>
          {listEmoji} {listName}
        </Text>
      </View>

      <View style={styles.meta}>
        {typeLabel ? (
          <Text style={styles.metaText}>{typeLabel}</Text>
        ) : null}
        {place.rating !== null ? (
          <Text style={styles.metaText}>★ {place.rating.toFixed(1)}</Text>
        ) : null}
      </View>

      {place.address ? (
        <Text style={styles.address} numberOfLines={1}>
          {place.address}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 210,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 2,
    zIndex: 10,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.parchment,
    marginRight: 20,
    marginBottom: 6,
  },
  listTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  listTagText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.parchment,
  },
  meta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
  },
});
