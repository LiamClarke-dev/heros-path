import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * BackgroundPermissionModal Component
 * 
 * Modal that explains why background location permission is needed
 * and provides options to grant permission or continue without it.
 * 
 * This modal appears when the user starts journey tracking but hasn't
 * granted background location permission yet.
 */
const BackgroundPermissionModal = ({
  visible,
  onRequestPermission,
  onCancel,
  onOpenSettings,
  theme,
}) => {
  const colors = theme?.colors || {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#007AFF',
    secondary: '#8E8E93',
    border: '#E5E5EA',
    warning: '#FF9500',
  };

  const handleRequestPermission = async () => {
    try {
      await onRequestPermission();
    } catch (error) {
      console.error('Error requesting background permission:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request background location permission. Please try opening settings manually.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: onOpenSettings },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons 
              name="location-on" 
              size={48} 
              color={colors.primary} 
            />
            <Text style={[styles.title, { color: colors.text }]}>
              Background Location Required
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.description, { color: colors.text }]}>
              Hero's Path needs background location access to continue tracking 
              your journey even when the app is minimized or your device is locked.
            </Text>
            
            <Text style={[styles.description, { color: colors.text, marginTop: 16 }]}>
              This ensures your complete route is recorded without interruption.
            </Text>

            <View style={[styles.infoBox, { backgroundColor: colors.border }]}>
              <MaterialIcons 
                name="info" 
                size={20} 
                color={colors.secondary} 
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                You can change this setting anytime in your device settings.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleRequestPermission}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Allow Background Location
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                console.log('Settings button pressed in BackgroundPermissionModal');
                if (onOpenSettings) {
                  onOpenSettings();
                } else {
                  console.error('onOpenSettings function not provided to BackgroundPermissionModal');
                }
              }}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                Open Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: colors.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  content: {
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    // backgroundColor set via props
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});

export default React.memo(BackgroundPermissionModal);