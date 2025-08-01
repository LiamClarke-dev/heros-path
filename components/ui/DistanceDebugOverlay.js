/**
 * DistanceDebugOverlay Component
 * 
 * Visual debugging overlay that shows distance calculations in the UI
 * for testing on production builds where console logs aren't available.
 * 
 * This component can be toggled on/off and shows:
 * - Current tracking distance
 * - Validation distance
 * - Modal distance
 * - Distance calculation source
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DistanceDebugOverlay = ({
  isVisible = false,
  trackingDistance = 0,
  validationDistance = 0,
  modalDistance = 0,
  pathLength = 0,
  displayLength = 0,
  onToggle,
  theme = 'light',
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={onToggle}
        onLongPress={() => {
          // Show instructions on long press
          if (onToggle) {
            // This will be handled by the parent component
            onToggle('instructions');
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="bug" size={16} color="#666" />
      </TouchableOpacity>
    );
  }

  const getStatusColor = () => {
    // Green if all distances match, red if they don't
    const allMatch = trackingDistance === validationDistance && 
                     validationDistance === modalDistance;
    return allMatch ? '#00AA44' : '#FF4444';
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          textColor: '#fff',
          borderColor: '#333',
        };
      case 'adventure':
        return {
          backgroundColor: 'rgba(139, 69, 19, 0.9)',
          textColor: '#f5f5dc',
          borderColor: '#8B4513',
        };
      default:
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          textColor: '#333',
          borderColor: '#ddd',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <View style={[
      styles.overlay,
      { 
        backgroundColor: themeStyles.backgroundColor,
        borderColor: themeStyles.borderColor,
      }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          <Ionicons 
            name={expanded ? "chevron-down" : "chevron-up"} 
            size={16} 
            color={themeStyles.textColor} 
          />
          <Text style={[styles.title, { color: themeStyles.textColor }]}>
            Distance Debug
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onToggle}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={16} color={themeStyles.textColor} />
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.content}>
          {/* Status Indicator */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: themeStyles.textColor }]}>
              {trackingDistance === validationDistance && validationDistance === modalDistance
                ? 'All distances match ✓'
                : 'Distance mismatch detected ⚠️'
              }
            </Text>
          </View>

          {/* Distance Values */}
          <View style={styles.distanceGrid}>
            <View style={styles.distanceItem}>
              <Text style={[styles.distanceLabel, { color: themeStyles.textColor }]}>
                Journey Distance
              </Text>
              <Text style={[styles.distanceValue, { color: getStatusColor() }]}>
                {trackingDistance}m
              </Text>
            </View>

            <View style={styles.distanceItem}>
              <Text style={[styles.distanceLabel, { color: themeStyles.textColor }]}>
                Modal Distance
              </Text>
              <Text style={[styles.distanceValue, { color: getStatusColor() }]}>
                {modalDistance}m
              </Text>
            </View>



            <View style={styles.distanceItem}>
              <Text style={[styles.distanceLabel, { color: themeStyles.textColor }]}>
                Journey Points
              </Text>
              <Text style={[styles.distanceValue, { color: themeStyles.textColor }]}>
                {pathLength}
              </Text>
            </View>

            <View style={styles.distanceItem}>
              <Text style={[styles.distanceLabel, { color: themeStyles.textColor }]}>
                Display Points
              </Text>
              <Text style={[styles.distanceValue, { color: themeStyles.textColor }]}>
                {displayLength}
              </Text>
            </View>
          </View>

          {/* Service-Processed Data Details */}
          <View style={styles.detailsSection}>
            <Text style={[styles.detailsTitle, { color: themeStyles.textColor }]}>
              Service-Processed Data:
            </Text>
            <Text style={[styles.detailsText, { color: themeStyles.textColor }]}>
              • Journey: Statistics data ({pathLength})
            </Text>
            <Text style={[styles.detailsText, { color: themeStyles.textColor }]}>
              • Display: Visualization data ({displayLength})
            </Text>
            <Text style={[styles.detailsText, { color: themeStyles.textColor }]}>
              • Processing: BackgroundLocationService
            </Text>
            <Text style={[styles.detailsText, { color: themeStyles.textColor }]}>
              • Single source of truth ✓
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 100,
    right: 16,
    minWidth: 200,
    maxWidth: 280,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  distanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  distanceItem: {
    width: '50%',
    marginBottom: 8,
  },
  distanceLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  distanceValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
  },
  detailsTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 9,
    opacity: 0.7,
    marginBottom: 2,
  },
});

export default React.memo(DistanceDebugOverlay);