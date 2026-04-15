import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

interface PlaceList {
  id: string;
  name: string;
  emoji: string | null;
  itemCount: number;
}

interface Props {
  visible: boolean;
  googlePlaceId: string | null;
  onClose: () => void;
  onCreateNew: () => void;
}

export function AddToListSheet({ visible, googlePlaceId, onClose, onCreateNew }: Props) {
  const { token } = useAuth();
  const [lists, setLists] = useState<PlaceList[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible || !token) return;
    setLoading(true);
    setAdded(new Set());
    apiFetch("/api/lists", { token })
      .then((data: { lists: PlaceList[] }) => setLists(data.lists))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, token]);

  const handleAdd = useCallback(
    async (listId: string) => {
      if (!googlePlaceId || !token) return;
      setAdding(listId);
      try {
        await apiFetch(`/api/lists/${listId}/items`, {
          method: "POST",
          token,
          body: JSON.stringify({ googlePlaceId }),
        });
        setAdded((prev) => new Set(prev).add(listId));
      } catch {
      } finally {
        setAdding(null);
      }
    },
    [googlePlaceId, token]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add to List</Text>

        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginVertical: 24 }} />
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(l) => l.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isAdded = added.has(item.id);
              const isAdding = adding === item.id;
              return (
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => !isAdded && handleAdd(item.id)}
                  disabled={isAdded || isAdding}
                >
                  <Text style={styles.listEmoji}>{item.emoji ?? "📍"}</Text>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{item.name}</Text>
                    <Text style={styles.listCount}>{item.itemCount} places</Text>
                  </View>
                  {isAdding ? (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  ) : isAdded ? (
                    <Feather name="check" size={18} color={Colors.success} />
                  ) : (
                    <Feather name="plus" size={18} color={Colors.parchmentMuted} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>No lists yet — create one!</Text>
            }
          />
        )}

        <TouchableOpacity style={styles.createBtn} onPress={onCreateNew}>
          <Feather name="plus" size={16} color={Colors.gold} />
          <Text style={styles.createText}>Create New List</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "60%",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.gold,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  listEmoji: {
    fontSize: 22,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.parchment,
  },
  listCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    paddingVertical: 20,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 10,
  },
  createText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.gold,
  },
});
