/**
 * NetworkErrorHandler component for Hero's Path
 * Handles network-related errors and offline states during navigation
 * Requirements: 10.3, 10.4, 10.8
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../../contexts/ThemeContext';
import NavigationErrorService from '../../services/NavigationErrorService';
import Logger from '../../utils/Logger';

const NetworkErrorHandler = ({ children, onNetworkChange }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState('unknown');
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [slideAnim] = useState(new Animated.Value(-100));
  const theme = useTheme();

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = isConnected;
      const nowConnected = state.isConnected;
      
      setIsConnected(nowConnected);
      setNetworkType(state.type);

      Logger.info('Network state changed', {
        isConnected: nowConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });

      // Handle network state changes
      if (wasConnected && !nowConnected) {
        // Just went offline
        handleNetworkLost();
      } else if (!wasConnected && nowConnected) {
        // Just came back online
        handleNetworkRestored();
      }

      // Notify parent component
      if (onNetworkChange) {
        onNetworkChange(state);
      }
    });

    return () => unsubscribe();
  }, [isConnected, onNetworkChange]);

  const handleNetworkLost = useCallback(() => {
    Logger.warn('Network connection lost');
    
    // Show offline indicator
    setShowOfflineModal(true);
    
    // Animate in the offline banner
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Handle navigation limitations
    const networkErrorResult = NavigationErrorService.handleNetworkError(
      new Error('Network connection lost'),
      { type: 'offline', networkType }
    );

    // Apply navigation restrictions if needed
    if (networkErrorResult.shouldLimitNavigation) {
      Logger.info('Navigation limited due to offline state', {
        allowedRoutes: networkErrorResult.allowedRoutes,
      });
    }
  }, [slideAnim, networkType]);

  const handleNetworkRestored = useCallback(() => {
    Logger.info('Network connection restored');
    
    // Hide offline modal after a brief delay
    setTimeout(() => {
      setShowOfflineModal(false);
      setRetryCount(0);
      
      // Animate out the offline banner
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1500); // Show "back online" message briefly
  }, [slideAnim]);

  const handleRetryConnection = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    Logger.info('Retrying network connection', { attempt: retryCount + 1 });

    try {
      // Check current network state
      const state = await NetInfo.fetch();
      
      if (state.isConnected) {
        handleNetworkRestored();
      } else {
        Logger.warn('Network retry failed - still offline', { attempt: retryCount + 1 });
      }
    } catch (error) {
      Logger.error('Network retry check failed', error);
    }
  }, [retryCount, handleNetworkRestored]);

  const getNetworkStatusColor = () => {
    if (!isConnected) return theme.colors.error;
    if (networkType === 'cellular') return theme.colors.warning;
    return theme.colors.success;
  };

  const getNetworkStatusText = () => {
    if (!isConnected) return 'Offline';
    if (networkType === 'wifi') return 'WiFi Connected';
    if (networkType === 'cellular') return 'Mobile Data';
    return 'Connected';
  };

  const getNetworkIcon = () => {
    if (!isConnected) return 'cloud-offline-outline';
    if (networkType === 'wifi') return 'wifi-outline';
    if (networkType === 'cellular') return 'cellular-outline';
    return 'cloud-done-outline';
  };

  return (
    <View style={styles.container}>
      {children}
      
      {/* Offline Banner */}
      {!isConnected && (
        <Animated.View 
          style={[
            styles.offlineBanner,
            { 
              backgroundColor: theme.colors.error,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.bannerContent}>
            <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
            <Text style={styles.bannerText}>No Internet Connection</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRetryConnection}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Network Status Modal */}
      <Modal
        visible={showOfflineModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOfflineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Ionicons 
              name={getNetworkIcon()} 
              size={64} 
              color={getNetworkStatusColor()} 
              style={styles.modalIcon}
            />
            
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {isConnected ? 'Back Online!' : 'You\'re Offline'}
            </Text>
            
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
              {isConnected 
                ? 'Your internet connection has been restored. All features are now available.'
                : 'Some features may be limited while you\'re offline. You can still view the map and access saved content.'
              }
            </Text>

            <View style={styles.networkInfo}>
              <Text style={[styles.networkInfoText, { color: theme.colors.textSecondary }]}>
                Status: <Text style={{ color: getNetworkStatusColor() }}>
                  {getNetworkStatusText()}
                </Text>
              </Text>
              {retryCount > 0 && (
                <Text style={[styles.networkInfoText, { color: theme.colors.textSecondary }]}>
                  Retry attempts: {retryCount}
                </Text>
              )}
            </View>
            
            {!isConnected && (
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleRetryConnection}
                >
                  <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>Try Again</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.secondaryButton, { borderColor: theme.colors.border }]}
                  onPress={() => setShowOfflineModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                    Continue Offline
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isConnected && (
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.colors.success }]}
                onPress={() => setShowOfflineModal(false)}
              >
                <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // Account for status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  retryButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 320,
    width: '100%',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  networkInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  networkInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalButtonContainer: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NetworkErrorHandler;