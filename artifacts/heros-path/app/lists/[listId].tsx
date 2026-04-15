import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { File as FSFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import {
  useAuthRequest,
  useAutoDiscovery,
  makeRedirectUri,
  type AuthSessionResult,
} from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { VisitLogSheet } from "../../components/VisitLogSheet";

WebBrowser.maybeCompleteAuthSession();

const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  "http://localhost:8080";

interface ListPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  primaryType: string | null;
  types: string[];
  photoUrl: string | null;
  address: string | null;
  addedAt: string;
}

interface PlaceList {
  id: string;
  name: string;
  emoji: string | null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim() || "list";
}

export default function ListDetailScreen() {
  const insets = useSafeAreaInsets();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [list, setList] = useState<PlaceList | null>(null);
  const [places, setPlaces] = useState<ListPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [logSheetPlace, setLogSheetPlace] = useState<{ id: string; name: string } | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const googleDiscovery = useAutoDiscovery("https://accounts.google.com");

  const redirectUri = makeRedirectUri({ scheme: "herospath" });
  const [, , googlePromptAsync] = useAuthRequest(
    {
      clientId: googleClientId ?? "__placeholder__",
      scopes: googleClientId
        ? [
            "profile",
            "email",
            "https://www.googleapis.com/auth/drive.file",
          ]
        : [],
      redirectUri,
    },
    googleDiscovery
  );

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/google/config`)
      .then((r) => r.json())
      .then((d: { clientId: string | null }) => {
        if (d.clientId) setGoogleClientId(d.clientId);
      })
      .catch(() => {});
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!token || !listId) return;
    setLoading(true);
    try {
      const data: { list: PlaceList; places: ListPlace[] } = await apiFetch(
        `/api/lists/${listId}`,
        { token }
      );
      setList(data.list);
      setPlaces(data.places);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, listId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  const handleRemove = useCallback(
    (googlePlaceId: string, name: string) => {
      Alert.alert(
        "Remove Place",
        `Remove "${name}" from this list?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              setPlaces((prev) =>
                prev.filter((p) => p.googlePlaceId !== googlePlaceId)
              );
              try {
                await apiFetch(
                  `/api/lists/${listId}/items/${googlePlaceId}`,
                  { method: "DELETE", token: token! }
                );
              } catch {
                fetchDetail();
              }
            },
          },
        ]
      );
    },
    [listId, token, fetchDetail]
  );

  const exportKml = useCallback(async () => {
    if (!token || !listId || !list) return;
    if (places.length === 0) {
      Alert.alert("Empty List", "Add some places to this list before exporting.");
      return;
    }
    setExporting(true);
    try {
      const filename = sanitizeFilename(list.name) + ".kml";
      const downloadUrl = `${API_BASE}/api/lists/${listId}/export/kml`;
      const destination = new FSFile(Paths.cache, filename);

      const downloadedFile = await FSFile.downloadFileAsync(
        downloadUrl,
        destination,
        {
          headers: { Authorization: `Bearer ${token}` },
          idempotent: true,
        }
      );

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Export Complete",
          `File saved.\n\nSharing is not available on this device.`
        );
        return;
      }

      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: "application/vnd.google-earth.kml+xml",
        dialogTitle: `Export "${list.name}" to Google My Maps`,
        UTI: "com.google.earth.kml",
      });
    } catch {
      Alert.alert("Export Failed", "Something went wrong while exporting. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [token, listId, list, places.length]);

  const copyMapsLink = useCallback(async () => {
    if (!list) return;
    const searchQuery = encodeURIComponent(list.name);
    const url = `https://www.google.com/maps/search/${searchQuery}`;
    await Clipboard.setStringAsync(url);
    Alert.alert("Link Copied", "Google Maps search link copied to clipboard.");
  }, [list]);

  const createGoogleMyMap = useCallback(async () => {
    if (!token || !listId || !list) return;
    if (!googleClientId) {
      Alert.alert(
        "Google Not Connected",
        "Google Drive integration is not configured. Use 'Download KML file' to export manually."
      );
      return;
    }

    setExporting(true);
    try {
      const result: AuthSessionResult = await googlePromptAsync();

      if (result.type !== "success") {
        if (result.type === "cancel" || result.type === "dismiss") return;
        Alert.alert("Sign-in Failed", "Could not sign in with Google. Please try again.");
        return;
      }

      const googleAccessToken = result.authentication?.accessToken ?? result.params.access_token;
      if (!googleAccessToken) {
        Alert.alert("Sign-in Failed", "Could not retrieve Google access token.");
        return;
      }

      const data: { fileId?: string; viewUrl?: string; error?: string } =
        await apiFetch(`/api/lists/${listId}/export/google-my-maps`, {
          method: "POST",
          token,
          body: JSON.stringify({ googleAccessToken }),
        });

      if (data.error || !data.viewUrl) {
        Alert.alert("Export Failed", data.error ?? "Could not create the Google My Maps document.");
        return;
      }

      Alert.alert(
        "My Maps Created!",
        `Your list "${list.name}" has been saved to Google Drive as a My Maps document.`,
        [
          {
            text: "Open in Maps",
            onPress: () => Linking.openURL(data.viewUrl!),
          },
          { text: "Done", style: "cancel" },
        ]
      );
    } catch (err) {
      const backendErr =
        err instanceof Error
          ? (err as unknown as { body?: { error?: string } }).body?.error
          : undefined;
      Alert.alert(
        "Export Failed",
        typeof backendErr === "string"
          ? backendErr
          : "Something went wrong. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }, [token, listId, list, googleClientId, googlePromptAsync]);

  const openExportSheet = useCallback(() => {
    if (places.length === 0) {
      Alert.alert("Empty List", "Add some places to this list before exporting.");
      return;
    }

    const infoMsg = googleClientId
      ? "Download a KML file, create a Google My Maps document directly, or copy a search link."
      : "Import the KML file into Google My Maps:\nmaps.google.com → ☰ → Your places → Maps → Create Map → Import";

    const hasGoogle = !!googleClientId;

    if (Platform.OS === "ios") {
      const options: string[] = [
        "Download KML file",
        ...(hasGoogle ? ["Create Google My Maps"] : []),
        "Copy Maps link",
        "Cancel",
      ];
      const cancelIdx = options.length - 1;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIdx,
          title: `Export "${list?.name ?? "List"}"`,
          message: infoMsg,
        },
        (idx) => {
          if (idx === 0) exportKml();
          else if (hasGoogle && idx === 1) createGoogleMyMap();
          else if (idx === (hasGoogle ? 2 : 1)) copyMapsLink();
        }
      );
    } else {
      const buttons: { text: string; onPress?: () => void; style?: "cancel" | "default" | "destructive" }[] = [
        { text: "Download KML file", onPress: exportKml },
        ...(hasGoogle ? [{ text: "Create Google My Maps", onPress: createGoogleMyMap }] : []),
        { text: "Copy Maps link", onPress: copyMapsLink },
        { text: "Cancel", style: "cancel" as const },
      ];
      Alert.alert(`Export "${list?.name ?? "List"}"`, infoMsg, buttons);
    }
  }, [places.length, list, exportKml, copyMapsLink, createGoogleMyMap, googleClientId]);

  const renderItem = useCallback(
    ({ item }: { item: ListPlace }) => {
      const typeLabel = item.primaryType
        ? item.primaryType.replace(/_/g, " ")
        : item.types[0]?.replace(/_/g, " ") ?? "";

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() =>
            router.push(`/place-detail?googlePlaceId=${item.googlePlaceId}`)
          }
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Feather name="image" size={24} color={Colors.parchmentDim} />
            </View>
          )}

          <View style={styles.cardContent}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.name}
            </Text>
            {typeLabel !== "" && (
              <Text style={styles.placeType}>{typeLabel}</Text>
            )}
            {item.rating !== null && (
              <Text style={styles.rating}>★ {item.rating.toFixed(1)}</Text>
            )}
            {item.address ? (
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionCol}>
            <TouchableOpacity
              style={styles.visitedBtn}
              onPress={() =>
                setLogSheetPlace({ id: item.googlePlaceId, name: item.name })
              }
            >
              <Feather name="check-circle" size={18} color={Colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item.googlePlaceId, item.name)}
            >
              <Feather name="trash-2" size={16} color={Colors.parchmentDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleRemove, router]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.emoji}>{list?.emoji ?? "📍"}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {list?.name ?? ""}
        </Text>
        {!loading && places.length > 0 && (
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={openExportSheet}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Feather name="share" size={20} color={Colors.gold} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p) => p.googlePlaceId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="map-pin" size={32} color={Colors.parchmentDim} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No places yet</Text>
              <Text style={styles.emptySubtitle}>
                Add places from the Discover tab.
              </Text>
            </View>
          }
        />
      )}

      <VisitLogSheet
        visible={logSheetPlace !== null}
        googlePlaceId={logSheetPlace?.id ?? ""}
        placeName={logSheetPlace?.name ?? ""}
        token={token ?? ""}
        onClose={() => setLogSheetPlace(null)}
        onSaved={() => setLogSheetPlace(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  exportBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.goldGlow,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  photo: {
    width: 72,
    height: 72,
  },
  photoPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placeName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.parchment,
    marginBottom: 2,
  },
  placeType: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
    marginBottom: 2,
  },
  rating: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.gold,
    marginBottom: 2,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
  },
  actionCol: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 8,
  },
  visitedBtn: {
    padding: 6,
  },
  removeBtn: {
    padding: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
});
