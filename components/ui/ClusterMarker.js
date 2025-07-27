/**
 * ClusterMarker Component
 * 
 * Renders a cluster marker that represents multiple saved places grouped together.
 * Provides theme-aware styling and handles tap events to expand clusters.
 * 
 * Requirements addressed:
 * - 6.5: Google Marker Clustering with theme-aware styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ClusterMarker = ({ 
  cluster, 
  onPress,
  style 
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(cluster);
    }
  };

  const clusterStyle = cluster.style || {};

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: clusterStyle.width || 40,
          height: clusterStyle.height || 40,
          borderRadius: clusterStyle.borderRadius || 20,
          backgroundColor: clusterStyle.backgroundColor || '#4A90E2',
          borderColor: clusterStyle.borderColor || '#FFFFFF',
          borderWidth: clusterStyle.borderWidth || 2,
        },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Cluster with ${cluster.count} places`}
      accessibilityHint="Tap to zoom in and expand cluster"
    >
      <Text
        style={[
          styles.clusterText,
          {
            color: clusterStyle.textColor || '#FFFFFF',
            fontSize: clusterStyle.textSize || 12,
          }
        ]}
      >
        {cluster.count}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clusterText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ClusterMarker;