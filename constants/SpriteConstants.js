/**
 * Sprite Constants
 * 
 * Constants for the animated Link sprite that represents the user on the map.
 * The sprite changes direction based on user movement and provides visual feedback
 * for GPS states.
 * 
 * Requirements addressed:
 * - 1.2: Character sprite that shows movement direction
 * - 1.3: Sprite animation based on movement direction
 * - 1.4: Visual indicators for GPS signal strength
 * - 5.4: Sprite state for GPS signal loss
 */

// Sprite state enumeration
export const SPRITE_STATES = {
  IDLE: 'idle',
  WALK_DOWN: 'walk_down',
  WALK_UP: 'walk_up',
  WALK_LEFT: 'walk_left',
  WALK_RIGHT: 'walk_right',
  GPS_LOST: 'gps_lost', // Special state for GPS signal loss
};

// Sprite asset mapping
export const SPRITE_ASSETS = {
  [SPRITE_STATES.IDLE]: require('../assets/link_sprites/link_idle.gif'),
  [SPRITE_STATES.WALK_DOWN]: require('../assets/link_sprites/link_walk_down.gif'),
  [SPRITE_STATES.WALK_UP]: require('../assets/link_sprites/link_walk_up.gif'),
  [SPRITE_STATES.WALK_LEFT]: require('../assets/link_sprites/link_walk_left.gif'),
  [SPRITE_STATES.WALK_RIGHT]: require('../assets/link_sprites/link_walk_right.gif'),
  [SPRITE_STATES.GPS_LOST]: require('../assets/link_sprites/link_idle.gif'), // Use idle for GPS lost state
};

// Sprite configuration
export const SPRITE_CONFIG = {
  // Default sprite size (can be scaled based on zoom level)
  DEFAULT_SIZE: 32,
  
  // Minimum movement distance to trigger direction change (in meters)
  MIN_MOVEMENT_DISTANCE: 5,
  
  // Minimum time between direction updates (in milliseconds)
  DIRECTION_UPDATE_THROTTLE: 1000,
  
  // GPS accuracy thresholds for sprite states
  GPS_ACCURACY_THRESHOLDS: {
    GOOD: 10, // meters
    POOR: 50, // meters
    LOST: 100, // meters or null
  },
  
  // Animation configuration
  ANIMATION: {
    FADE_DURATION: 300, // milliseconds
    SCALE_DURATION: 200, // milliseconds
    PULSE_DURATION: 1000, // milliseconds for GPS lost state
  },
  
  // Sprite styling
  STYLE: {
    SHADOW_OPACITY: 0.3,
    SHADOW_RADIUS: 4,
    SHADOW_OFFSET: { width: 0, height: 2 },
    BORDER_RADIUS: 16,
  },
};

// Direction calculation constants
export const DIRECTION_CONSTANTS = {
  // Angle ranges for determining sprite direction (in degrees)
  // 0 degrees = North, 90 = East, 180 = South, 270 = West
  ANGLE_RANGES: {
    NORTH: { min: 315, max: 45 }, // -45 to 45 degrees
    EAST: { min: 45, max: 135 },  // 45 to 135 degrees
    SOUTH: { min: 135, max: 225 }, // 135 to 225 degrees
    WEST: { min: 225, max: 315 },  // 225 to 315 degrees
  },
  
  // Smoothing factor for direction changes (0-1, higher = more smoothing)
  DIRECTION_SMOOTHING: 0.3,
  
  // Minimum speed to consider as movement (m/s)
  MIN_MOVEMENT_SPEED: 0.5, // ~1.8 km/h walking speed
};

// GPS state indicators
export const GPS_STATE_INDICATORS = {
  GOOD: {
    color: '#00FF88', // Green
    opacity: 1.0,
    pulseEnabled: false,
    borderColor: '#00CC66',
    borderWidth: 2,
    glowEnabled: false,
    iconOverlay: null,
  },
  POOR: {
    color: '#FFB800', // Orange
    opacity: 0.8,
    pulseEnabled: true,
    borderColor: '#FF9500',
    borderWidth: 2,
    glowEnabled: true,
    glowColor: '#FFB800',
    iconOverlay: 'warning',
  },
  LOST: {
    color: '#FF4444', // Red
    opacity: 0.6,
    pulseEnabled: true,
    borderColor: '#CC0000',
    borderWidth: 3,
    glowEnabled: true,
    glowColor: '#FF4444',
    iconOverlay: 'alert',
  },
};

// GPS signal strength levels for more granular feedback
export const GPS_SIGNAL_LEVELS = {
  EXCELLENT: { threshold: 5, indicator: 'GOOD', description: 'Excellent GPS signal' },
  GOOD: { threshold: 10, indicator: 'GOOD', description: 'Good GPS signal' },
  FAIR: { threshold: 20, indicator: 'POOR', description: 'Fair GPS signal' },
  POOR: { threshold: 50, indicator: 'POOR', description: 'Poor GPS signal' },
  VERY_POOR: { threshold: 100, indicator: 'LOST', description: 'Very poor GPS signal' },
  LOST: { threshold: Infinity, indicator: 'LOST', description: 'GPS signal lost' },
};

// Default sprite state
export const DEFAULT_SPRITE_STATE = {
  state: SPRITE_STATES.IDLE,
  position: null,
  lastDirection: null,
  lastUpdate: 0,
  gpsAccuracy: null,
  gpsState: 'GOOD',
};