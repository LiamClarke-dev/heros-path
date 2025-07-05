import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROUTES_STORAGE_KEY = '@saved_routes';

export default function PastJourneysScreen({ navigation }) {
  const [journeys, setJourneys] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadJourneys);
    return unsubscribe;
  }, [navigation]);

  async function loadJourneys() {
    const stored = await AsyncStorage.getItem(ROUTES_STORAGE_KEY);
    const raw = stored ? JSON.parse(stored) : [];
    setJourneys(
      raw.map((entry, idx) =>
        Array.isArray(entry)
          ? { id: String(idx), coords: entry, date: new Date().toISOString() }
          : entry
      )
    );
  }

  const deleteJourney = (id) => {
    Alert.alert(
      'Delete Journey?',
      'Are you sure you want to delete this journey?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = journeys.filter(j => j.id !== id);
            setJourneys(updated);
            AsyncStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(updated))
              .catch(err => console.error(err));
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }) => {
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit'
    });
    const label = `Journey #${index+1} – ${dateStr} at ${timeStr}`;

    return (
      <View style={styles.item}>
        <TouchableOpacity
          style={styles.info}
          onPress={() =>
            navigation.navigate('Map', { routeToDisplay: item })
          }
        >
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.sub}>{item.coords.length} points</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteJourney(item.id)}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Oldest-first
  const sorted = [...journeys].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <View style={styles.container}>
      {sorted.length === 0 ? (
        <Text style={styles.empty}>No past journeys yet.</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty:     { textAlign: 'center', marginTop: 20 },

  item: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor:     '#eee',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize:   16,
    fontWeight: 'bold',
  },
  sub: {
    fontSize:  12,
    color:     '#666',
  },
  deleteButton: {
    padding:     8,
    marginLeft: 'auto',
  },
  deleteText: {
    fontSize: 18,
  },
});
