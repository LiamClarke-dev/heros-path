import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DiscoveriesScreen() {
  return (
    <View style={styles.container}>
      <Text>Discoveries</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
