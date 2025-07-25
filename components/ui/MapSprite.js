/**
 * MapSprite Component
 * 
 * Renders an animated Link sprite on the map that shows user movement direction
 * and provides visual feedback for GPS states. The sprite changes animation
 * based on movement direction and shows different visual indicators for GPS accuracy.
 * 
 * This component renders as an overlay on the map and positions itself at the center
 * of the screen, representing the user's current location.
 * 
 * Requirements addressed:
 * - 1.2: Character sprite that shows movement direction
 * - 1.3: Sprite animation based on movement direction
 * - 1.4: Visual indicators for GPS signal strength
 * - 5.4: Sprite state for GPS signal loss
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';

import {
  SPRITE_ASSETS,
  SPRITE_CONFIG,
  SPRITE_STATES,
  DEFAULT_SPRITE_STATE,
} from '../../constants/SpriteConstants';

import {
  getSpriteState,
  smoothDirectionChange,
  throttle,
} from '../../utils/spriteUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * MapSprite Component Props
 * @typedef {Object} MapSpriteProps
 * @property {Object} position - Current position {latitude, longitude, timestamp}
 * @property {Array} recentPositions - Array of recent positions for direction calculation
 * @property {number|null} gpsAccuracy - Current GPS accuracy in meters
 * @property {number} size - Sprite size (optional, defaults to SPRITE_CONFIG.DEFAULT_SIZE)
 * @property {string} theme - Theme for styling ('light', 'dark', 'adventure')
 * @property {Function} onStateChange - Callback when sprite state changes (optional)
 */

const MapSprite = ({
  position,
  recentPositions = [],
  gpsAccuracy = null,
  size = SPRITE_CONFIG.DEFAULT_SIZE,
  theme = 'light',
  onStateChange,
}) => {
  // State management
  const [spriteState, setSpriteState] = useState(DEFAULT_SPRITE_STATE);
  const [isVisible, setIsVisible] = useState(true);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(1)).current;

  // Throttled state update function
  const throttledUpdateState = useRef(
    throttle((newState) => {
      setSpriteState(newState);
      if (onStateChange) {
        onStateChange(newState);
      }
    }, SPRITE_CONFIG.DIRECTION_UPDATE_THROTTLE)
  ).current;

  /**
   * Update sprite state based on position and GPS accuracy
   */
  useEffect(() => {
    if (!position) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Get new sprite state based on movement and GPS
    const newSpriteStateData = getSpriteState(recentPositions, gpsAccuracy);
    
    // Apply direction smoothing
    const smoothedDirection = smoothDirectionChange(
      newSpriteStateData.state,
      spriteState.state,
      spriteState.lastUpdate
    );

    if (smoothedDirection.shouldUpdate) {
      const updatedState = {
        ...spriteState,
        state: smoothedDirection.direction,
        position,
        lastUpdate: smoothedDirection.timestamp,
        gpsAccuracy,
        gpsState: newSpriteStateData.gpsState,
        indicators: newSpriteStateData.indicators,
      };

      throttledUpdateState(updatedState);
    }
  }, [position, recentPositions, gpsAccuracy]);

  /**
   * Handle sprite state animations
   */
  useEffect(() => {
    // Fade animation for state transitions
    Animated.timing(fadeAnim, {
      toValue: isVisible ? spriteState.indicators?.opacity || 1 : 0,
      duration: SPRITE_CONFIG.ANIMATION.FADE_DURATION,
      useNativeDriver: true,
    }).start();

    // Scale animation for direction changes
    if (spriteState.state !== SPRITE_STATES.IDLE) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: SPRITE_CONFIG.ANIMATION.SCALE_DURATION / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: SPRITE_CONFIG.ANIMATION.SCALE_DURATION / 2,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Glow animation for GPS state feedback
    if (spriteState.indicators?.glowEnabled) {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: SPRITE_CONFIG.ANIMATION.PULSE_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: SPRITE_CONFIG.ANIMATION.PULSE_DURATION / 2,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation.start();

      return () => {
        glowAnimation.stop();
      };
    } else {
      glowAnim.setValue(0);
    }

    // Pulse animation for GPS issues
    if (spriteState.indicators?.pulseEnabled) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: SPRITE_CONFIG.ANIMATION.PULSE_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: SPRITE_CONFIG.ANIMATION.PULSE_DURATION / 2,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Border pulse animation
      const borderPulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1.2,
            duration: SPRITE_CONFIG.ANIMATION.PULSE_DURATION / 2,
            useNativeDriver: false, // Border animations can't use native driver
          }),
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: SPRITE_CONFIG.ANIMATION.PULSE_DURATION / 2,
            useNativeDriver: false,
          }),
        ])
      );
      borderPulseAnimation.start();

      return () => {
        pulseAnimation.stop();
        borderPulseAnimation.stop();
      };
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      borderAnim.setValue(1);
    }
  }, [spriteState, isVisible]);

  /**
   * Get sprite asset based on current state
   */
  const getSpriteAsset = () => {
    return SPRITE_ASSETS[spriteState.state] || SPRITE_ASSETS[SPRITE_STATES.IDLE];
  };

  /**
   * Get container style based on theme and GPS state
   */
  const getContainerStyle = () => {
    const baseStyle = {
      ...styles.container,
      width: size,
      height: size,
    };

    // Add GPS state indicator styling
    if (spriteState.indicators) {
      baseStyle.borderColor = spriteState.indicators.borderColor || spriteState.indicators.color;
      baseStyle.borderWidth = spriteState.indicators.borderWidth || 2;
    }

    // Theme-specific styling
    switch (theme) {
      case 'dark':
        baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        break;
      case 'adventure':
        baseStyle.backgroundColor = 'rgba(139, 69, 19, 0.1)'; // Brown tint
        break;
      default:
        baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }

    return baseStyle;
  };

  /**
   * Get glow style for GPS state feedback
   */
  const getGlowStyle = () => {
    if (!spriteState.indicators?.glowEnabled) {
      return null;
    }

    return {
      position: 'absolute',
      width: size + 20,
      height: size + 20,
      borderRadius: (size + 20) / 2,
      backgroundColor: spriteState.indicators.glowColor || spriteState.indicators.color,
      opacity: 0.3,
      top: -10,
      left: -10,
    };
  };

  /**
   * Get image style
   */
  const getImageStyle = () => {
    return {
      ...styles.sprite,
      width: size,
      height: size,
    };
  };

  if (!isVisible || !position) {
    return null;
  }

  return (
    <View style={styles.spriteContainer}>
      {/* Glow effect for GPS state feedback */}
      {spriteState.indicators?.glowEnabled && (
        <Animated.View
          style={[
            getGlowStyle(),
            {
              opacity: glowAnim,
              transform: [
                { scale: borderAnim },
              ],
            },
          ]}
        />
      )}
      
      <Animated.View
        style={[
          getContainerStyle(),
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <Image
          source={getSpriteAsset()}
          style={getImageStyle()}
          resizeMode="contain"
        />
        
        {/* GPS State Indicator Dot */}
        {spriteState.indicators && (
          <View
            style={[
              styles.gpsIndicator,
              {
                backgroundColor: spriteState.indicators.color,
                opacity: spriteState.indicators.opacity,
              },
            ]}
          />
        )}
        
        {/* GPS Signal Strength Bars */}
        {spriteState.signalStrength !== undefined && (
          <View style={styles.signalBars}>
            {[1, 2, 3, 4].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  {
                    backgroundColor: spriteState.signalStrength >= (bar * 25) 
                      ? spriteState.indicators.color 
                      : 'rgba(255, 255, 255, 0.3)',
                    height: 2 + (bar * 2), // Increasing height for each bar
                  },
                ]}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  spriteContainer: {
    position: 'absolute',
    top: screenHeight / 2 - SPRITE_CONFIG.DEFAULT_SIZE / 2,
    left: screenWidth / 2 - SPRITE_CONFIG.DEFAULT_SIZE / 2,
    zIndex: 1000,
    pointerEvents: 'none', // Allow map interactions to pass through
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SPRITE_CONFIG.STYLE.BORDER_RADIUS,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: SPRITE_CONFIG.STYLE.SHADOW_OFFSET,
        shadowOpacity: SPRITE_CONFIG.STYLE.SHADOW_OPACITY,
        shadowRadius: SPRITE_CONFIG.STYLE.SHADOW_RADIUS,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sprite: {
    // Image will be sized by props
  },
  gpsIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  signalBars: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: 16,
    height: 10,
  },
  signalBar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
  },
});

export default MapSprite;