/**
 * DebugInstructions Component
 * 
 * Shows instructions for enabling debug features in production builds.
 * This helps users understand how to access debugging tools when console logs aren't available.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DebugInstructions = ({ visible, onClose, theme = 'light' }) => {
  if (!visible) return null;

  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          textColor: '#fff',
          borderColor: '#333',
        };
      case 'adventure':
        return {
          backgroundColor: 'rgba(139, 69, 19, 0.95)',
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
    <View style={styles.overlay}>
      <View style={[
        styles.container,
        { 
          backgroundColor: themeStyles.backgroundColor,
          borderColor: themeStyles.borderColor,
        }
      ]}>
        <View style={styles.header}>
          <Ionicons name="bug" size={20} color={themeStyles.textColor} />
          <Text style={[styles.title, { color: themeStyles.textColor }]}>
            Debug Mode
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={themeStyles.textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.instruction, { color: themeStyles.textColor }]}>
            To enable distance debugging in production:
          </Text>
          
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: themeStyles.textColor }]}>1.</Text>
            <Text style={[styles.stepText, { color: themeStyles.textColor }]}>
              Triple-tap anywhere on the map
            </Text>
          </View>
          
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: themeStyles.textColor }]}>2.</Text>
            <Text style={[styles.stepText, { color: themeStyles.textColor }]}>
              A debug overlay will appear showing distance calculations
            </Text>
          </View>
          
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: themeStyles.textColor }]}>3.</Text>
            <Text style={[styles.stepText, { color: themeStyles.textColor }]}>
              Start tracking a journey to see real-time distance values
            </Text>
          </View>

          <View style={styles.note}>
            <Ionicons name="information-circle" size={16} color="#0066CC" />
            <Text style={[styles.noteText, { color: themeStyles.textColor }]}>
              The overlay shows tracking, validation, and modal distances. 
              All values should match if the fix is working correctly.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  container: {
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  instruction: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
    minWidth: 20,
  },
  stepText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default React.memo(DebugInstructions);