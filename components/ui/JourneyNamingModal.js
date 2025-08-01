import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VALIDATION_CONSTANTS } from '../../constants/JourneyModels';

/**
 * JourneyNamingModal Component
 * 
 * A modal that allows users to name their journey before saving.
 * Includes validation, character count, and error handling.
 * 
 * Requirements addressed:
 * - 2.3: Create journey naming modal
 * - 2.4: Journey data structure with metadata
 */

const JourneyNamingModal = ({
  visible,
  onSave,
  onCancel,
  defaultName = '',
  journeyStats = {},
  loading = false,
  validationWarning = null, // New prop for validation warnings
}) => {
  // Debug logging to track distance flow
  React.useEffect(() => {
    if (visible && journeyStats.distance !== undefined) {
      console.log('JourneyNamingModal received stats:', {
        distance: journeyStats.distance,
        duration: journeyStats.duration,
        visible: visible
      });
    }
  }, [visible, journeyStats.distance, journeyStats.duration]);
  const [journeyName, setJourneyName] = useState(defaultName);
  const [nameError, setNameError] = useState('');
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  // Update journey name when default changes
  useEffect(() => {
    setJourneyName(defaultName);
    setNameError('');
  }, [defaultName, visible]);

  /**
   * Validate journey name
   * @param {string} name - Name to validate
   * @returns {boolean} True if valid
   */
  const validateName = (name) => {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setNameError('Journey name is required');
      return false;
    }

    if (trimmedName.length > VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH) {
      setNameError(`Name must be less than ${VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH} characters`);
      return false;
    }

    setNameError('');
    return true;
  };

  /**
   * Handle name input change
   */
  const handleNameChange = (text) => {
    setJourneyName(text);
    
    // Clear error when user starts typing
    if (nameError) {
      setNameError('');
    }
  };

  /**
   * Handle save button press
   */
  const handleSave = () => {
    const trimmedName = journeyName.trim();
    
    if (validateName(trimmedName)) {
      // If there's a validation warning and user hasn't confirmed override
      if (validationWarning && !showOverrideConfirm) {
        setShowOverrideConfirm(true);
        return;
      }
      
      onSave(trimmedName, showOverrideConfirm); // Pass override flag
    }
  };

  /**
   * Handle override confirmation
   */
  const handleOverrideConfirm = () => {
    const trimmedName = journeyName.trim();
    if (validateName(trimmedName)) {
      onSave(trimmedName, true); // Force save with override
    }
  };

  /**
   * Handle override cancel
   */
  const handleOverrideCancel = () => {
    setShowOverrideConfirm(false);
  };

  /**
   * Handle cancel button press
   */
  const handleCancel = () => {
    setJourneyName(defaultName);
    setNameError('');
    setShowOverrideConfirm(false);
    onCancel();
  };

  /**
   * Format duration for display
   */
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0m';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  /**
   * Format distance for display
   */
  const formatDistance = (meters) => {
    if (!meters) return '0m';
    
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  const remainingChars = VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH - journeyName.length;
  const isNameValid = journeyName.trim().length > 0 && remainingChars >= 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Save Journey</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancel}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Journey Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="location" size={20} color="#00AA44" />
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>
                  {formatDistance(journeyStats.distance)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="time" size={20} color="#00AA44" />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>
                  {formatDuration(journeyStats.duration)}
                </Text>
              </View>
            </View>

            {/* Validation Warning */}
            {validationWarning && (
              <View style={styles.warningContainer}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={20} color="#ff8800" />
                  <Text style={styles.warningTitle}>Journey Warning</Text>
                </View>
                <Text style={styles.warningMessage}>{validationWarning.message}</Text>
                {showOverrideConfirm && (
                  <View style={styles.overrideContainer}>
                    <Text style={styles.overrideText}>
                      Do you want to save this journey anyway?
                    </Text>
                    <View style={styles.overrideButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.overrideCancelButton]}
                        onPress={handleOverrideCancel}
                      >
                        <Text style={styles.overrideCancelText}>No, Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.overrideConfirmButton]}
                        onPress={handleOverrideConfirm}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.overrideConfirmText}>Yes, Save Anyway</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Journey Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  nameError ? styles.textInputError : null
                ]}
                value={journeyName}
                onChangeText={handleNameChange}
                placeholder="Enter journey name..."
                maxLength={VALIDATION_CONSTANTS.MAX_JOURNEY_NAME_LENGTH}
                autoFocus={true}
                editable={!loading}
                selectTextOnFocus={true}
              />
              
              {/* Character count */}
              <View style={styles.inputFooter}>
                <Text style={[
                  styles.charCount,
                  remainingChars < 10 ? styles.charCountWarning : null
                ]}>
                  {remainingChars} characters remaining
                </Text>
              </View>

              {/* Error message */}
              {nameError ? (
                <Text style={styles.errorText}>{nameError}</Text>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (!isNameValid || loading) ? styles.saveButtonDisabled : null
                ]}
                onPress={handleSave}
                disabled={!isNameValid || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Journey</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textInputError: {
    borderColor: '#ff4444',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
  charCountWarning: {
    color: '#ff8800',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#00AA44',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  warningContainer: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffcc02',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff8800',
    marginLeft: 8,
  },
  warningMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  overrideContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ffcc02',
  },
  overrideText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  overrideButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  overrideCancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  overrideCancelText: {
    fontSize: 14,
    color: '#666',
  },
  overrideConfirmButton: {
    backgroundColor: '#ff8800',
  },
  overrideConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default JourneyNamingModal;