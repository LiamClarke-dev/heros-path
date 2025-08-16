/**
 * Hero's Path MVP - Interface Contracts and Type Definitions
 * 
 * This file defines the standardized interfaces and types for the target architecture.
 * These serve as contracts between modules to ensure consistency and type safety.
 * 
 * Generated from repository analysis at: 965caea6bcca512353cdc7e4208bc9c3ceb16a0f
 * Scope: MVP-focused interfaces for core functionality
 */

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

/**
 * Coordinate represents a geographic point with latitude and longitude
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Journey represents a completed walking route with metadata
 */
export interface Journey {
  id: string;
  userId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  distance: number; // meters
  duration: number; // seconds
  path: Coordinate[];
  stats?: JourneyStats;
  discoveries?: PlaceDiscovery[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Journey statistics and metrics
 */
export interface JourneyStats {
  averageSpeed: number; // m/s
  maxSpeed: number; // m/s
  elevationGain?: number; // meters
  calories?: number;
  steps?: number;
}

/**
 * Place represents a point of interest with Google Places data
 */
export interface Place {
  id: string;
  placeId: string; // Google Places ID
  name: string;
  category: PlaceCategory;
  coordinates: Coordinate;
  rating?: number;
  priceLevel?: number;
  address?: string;
  phoneNumber?: string;
  website?: string;
  photos?: string[];
}

/**
 * Saved place in user's collection
 */
export interface SavedPlace extends Place {
  userId: string;
  savedAt: Date;
  notes?: string;
  tags?: string[];
}

/**
 * Place discovery result from search-along-route
 */
export interface PlaceDiscovery {
  place: Place;
  distanceFromRoute: number; // meters
  relevanceScore: number; // 0-1
  discoveredAt: Date;
}

/**
 * Place categories for filtering and organization
 */
export enum PlaceCategory {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  PARK = 'park',
  MUSEUM = 'museum',
  SHOP = 'shop',
  LANDMARK = 'landmark',
  ENTERTAINMENT = 'entertainment',
  SERVICES = 'services',
  OTHER = 'other'
}

/**
 * User profile and account information
 */
export interface UserProfile {
  id: string; // Firebase UID
  email: string;
  displayName?: string;
  photoURL?: string;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User preferences for discovery and app behavior
 */
export interface UserPreferences {
  discoveryRadius: number; // meters
  preferredCategories: PlaceCategory[];
  minimumRating: number; // 0-5
  maxPriceLevel: number; // 0-4
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'adventure' | 'system';
}

/**
 * User statistics and achievements
 */
export interface UserStats {
  totalJourneys: number;
  totalDistance: number; // meters
  totalTime: number; // seconds
  placesDiscovered: number;
  placesSaved: number;
  longestJourney: number; // meters
  achievements?: string[];
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Base interface for all service classes
 */
export interface BaseServiceInterface {
  /**
   * Handle service operation with standardized error handling
   */
  handleOperation<T>(operation: () => Promise<T>, context: string): Promise<T>;
  
  /**
   * Log service operation with context
   */
  logOperation(operation: string, result?: any, error?: Error): void;
  
  /**
   * Validate input data against schema
   */
  validateInput(input: any, schema: ValidationSchema): ValidationResult;
}

/**
 * Firebase service operations interface
 */
export interface FirebaseServiceInterface extends BaseServiceInterface {
  /**
   * Create document in collection
   */
  createDocument(collectionPath: string, data: any): Promise<DocumentResult>;
  
  /**
   * Read document by path
   */
  readDocument(docPath: string, defaultValue?: any): Promise<DocumentResult>;
  
  /**
   * Update document with data
   */
  updateDocument(docPath: string, updates: any, options?: UpdateOptions): Promise<DocumentResult>;
  
  /**
   * Delete document by path
   */
  deleteDocument(docPath: string): Promise<void>;
  
  /**
   * Query collection with constraints
   */
  queryCollection(collectionPath: string, constraints?: QueryConstraint[]): Promise<DocumentResult[]>;
  
  /**
   * Batch write operations
   */
  batchWrite(operations: BatchOperation[]): Promise<void>;
}

/**
 * Journey service interface for journey management
 */
export interface JourneyServiceInterface extends FirebaseServiceInterface {
  /**
   * Start new journey tracking
   */
  startJourney(userId: string): Promise<string>; // returns journey ID
  
  /**
   * Save completed journey
   */
  saveJourney(journeyData: Partial<Journey>): Promise<Journey>;
  
  /**
   * Get user's journeys with optional filtering
   */
  getJourneys(userId: string, filters?: JourneyFilters): Promise<Journey[]>;
  
  /**
   * Get specific journey by ID
   */
  getJourney(journeyId: string): Promise<Journey>;
  
  /**
   * Update journey metadata
   */
  updateJourney(journeyId: string, updates: Partial<Journey>): Promise<Journey>;
  
  /**
   * Delete journey
   */
  deleteJourney(journeyId: string): Promise<void>;
}

/**
 * Discovery service interface for place discovery
 */
export interface DiscoveryServiceInterface extends BaseServiceInterface {
  /**
   * Search for places along route
   */
  searchAlongRoute(route: Coordinate[], preferences: UserPreferences): Promise<PlaceDiscovery[]>;
  
  /**
   * Get place details by Place ID
   */
  getPlaceDetails(placeId: string): Promise<Place>;
  
  /**
   * Search places by text query
   */
  searchPlaces(query: string, location: Coordinate, radius: number): Promise<Place[]>;
  
  /**
   * Save user discovery preferences
   */
  savePreferences(userId: string, preferences: UserPreferences): Promise<void>;
  
  /**
   * Get user discovery preferences
   */
  getPreferences(userId: string): Promise<UserPreferences>;
}

/**
 * Location service interface for GPS tracking
 */
export interface LocationServiceInterface extends BaseServiceInterface {
  /**
   * Start location tracking
   */
  startTracking(journeyId: string): Promise<void>;
  
  /**
   * Stop location tracking
   */
  stopTracking(): Promise<LocationTrackingResult>;
  
  /**
   * Get current processed location data
   */
  getCurrentProcessedData(): LocationProcessingResult;
  
  /**
   * Handle location update from GPS
   */
  handleLocationUpdate(location: Coordinate): void;
  
  /**
   * Check location permissions
   */
  checkPermissions(): Promise<LocationPermissionStatus>;
  
  /**
   * Request location permissions
   */
  requestPermissions(): Promise<LocationPermissionStatus>;
}

// ============================================================================
// HOOK INTERFACES
// ============================================================================

/**
 * Base interface for async operation hooks
 */
export interface AsyncOperationHook<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  cancel: () => void;
}

/**
 * Journey tracking hook interface
 */
export interface JourneyTrackingHook {
  // State
  state: JourneyTrackingState;
  currentJourney: Journey | null;
  pathToRender: Coordinate[];
  
  // Actions
  toggleTracking: (locationHook: LocationTrackingHook) => Promise<void>;
  addToPath: (position: Coordinate) => void;
  saveJourney: (name: string) => Promise<Journey>;
  cancelSave: () => void;
  
  // Status
  savingJourney: boolean;
  saveError: string | null;
}

/**
 * Location tracking hook interface
 */
export interface LocationTrackingHook {
  // State
  currentPosition: Coordinate | null;
  recentPositions: Coordinate[];
  gpsStatus: GPSStatus | null;
  
  // Actions
  locateMe: (mapRef?: any) => Promise<void>;
  startTracking: (journeyId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  
  // Status
  permissionsGranted: boolean;
  isLocating: boolean;
  trackingActive: boolean;
}

/**
 * Saved places hook interface
 */
export interface SavedPlacesHook {
  // State
  savedPlaces: SavedPlace[];
  visible: boolean;
  clusters: PlaceCluster[];
  
  // Actions
  toggleVisibility: () => void;
  refreshPlaces: () => Promise<void>;
  savePlace: (place: Place) => Promise<void>;
  unsavePlace: (placeId: string) => Promise<void>;
  handleMarkerPress: (place: SavedPlace) => void;
  
  // Status
  loading: boolean;
  error: string | null;
}

// ============================================================================
// CONTEXT INTERFACES
// ============================================================================

/**
 * User context interface for authentication and profile
 */
export interface UserContextInterface {
  // State
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  
  // Actions
  signOut: () => Promise<void>;
  createOrUpdateProfile: (profileData?: Partial<UserProfile>) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Status
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
}

/**
 * Theme context interface
 */
export interface ThemeContextInterface {
  // State
  theme: Theme;
  currentTheme: string;
  navigationTheme: NavigationTheme;
  
  // Actions
  setTheme: (themeName: string) => Promise<void>;
  
  // Status
  isLoading: boolean;
  availableThemes: string[];
}

/**
 * Navigation context interface
 */
export interface NavigationContextInterface {
  // State
  navigationRef: any;
  currentRoute: string | null;
  navigationHistory: string[];
  
  // Actions
  navigateToScreen: (screenName: string, params?: any) => void;
  goBack: () => void;
  resetToScreen: (screenName: string, params?: any) => void;
  handleDeepLink: (url: string, params?: any) => void;
  
  // Status
  isNavigating: boolean;
  canGoBack: boolean;
}

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

/**
 * Base modal component props
 */
export interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  children: React.ReactNode;
}

/**
 * Themed button component props
 */
export interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
}

/**
 * Map renderer component props
 */
export interface MapRendererProps {
  mapState: MapState;
  locationTracking: LocationTrackingHook;
  journeyTracking: JourneyTrackingHook;
  savedPlaces: SavedPlacesHook;
  onMapReady: (mapRef: any) => void;
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

/**
 * Error handler interface
 */
export interface ErrorHandlerInterface {
  /**
   * Handle service-level errors
   */
  handleServiceError<T>(operation: () => Promise<T>, context: string): Promise<T>;
  
  /**
   * Handle UI-level errors
   */
  handleUIError(error: Error, userMessage?: string): void;
  
  /**
   * Handle network errors
   */
  handleNetworkError(error: Error): void;
  
  /**
   * Handle Firebase errors
   */
  handleFirebaseError(error: Error): void;
  
  /**
   * Log error with context
   */
  logError(error: Error, context: string, metadata?: any): void;
}

/**
 * Logger interface
 */
export interface LoggerInterface {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

/**
 * Performance monitor interface
 */
export interface PerformanceMonitorInterface {
  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, duration: number): void;
  
  /**
   * Track user interaction performance
   */
  trackUserInteraction(interaction: string, duration: number): void;
  
  /**
   * Track service operation performance
   */
  trackServiceOperation(service: string, operation: string, duration: number): void;
  
  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface ValidationSchema {
  type: string;
  required?: boolean;
  rules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: any;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DocumentResult {
  id: string;
  data: any;
  exists: boolean;
}

export interface UpdateOptions {
  merge?: boolean;
  mergeFields?: string[];
}

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAt' | 'endAt';
  field?: string;
  operator?: string;
  value?: any;
}

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  path: string;
  data?: any;
  options?: UpdateOptions;
}

export interface JourneyFilters {
  startDate?: Date;
  endDate?: Date;
  minDistance?: number;
  maxDistance?: number;
  categories?: PlaceCategory[];
  limit?: number;
  offset?: number;
}

export interface LocationTrackingResult {
  journeyData: Coordinate[];
  displayData: Coordinate[];
  stats: LocationStats;
}

export interface LocationProcessingResult {
  journeyPath: Coordinate[];
  displayPath: Coordinate[];
  currentStats: LocationStats;
}

export interface LocationStats {
  distance: number;
  duration: number;
  averageSpeed: number;
  pointCount: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface GPSStatus {
  accuracy: number;
  signal: 'excellent' | 'good' | 'poor' | 'none';
  lastUpdate: Date;
}

export interface JourneyTrackingState {
  isTracking: boolean;
  currentJourneyId: string | null;
  isAuthenticated: boolean;
  startTime: Date | null;
}

export interface PlaceCluster {
  id: string;
  coordinate: Coordinate;
  pointCount: number;
  places: SavedPlace[];
}

export interface MapState {
  region: MapRegion;
  isReady: boolean;
  followUser: boolean;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  dark: boolean;
}

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface ThemeFonts {
  regular: FontConfig;
  medium: FontConfig;
  bold: FontConfig;
  heavy: FontConfig;
}

export interface FontConfig {
  fontFamily: string;
  fontWeight: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface NavigationTheme {
  dark: boolean;
  colors: NavigationColors;
}

export interface NavigationColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
}

export interface PerformanceReport {
  timestamp: Date;
  componentMetrics: ComponentMetric[];
  serviceMetrics: ServiceMetric[];
  userInteractionMetrics: InteractionMetric[];
  summary: PerformanceSummary;
}

export interface ComponentMetric {
  componentName: string;
  averageRenderTime: number;
  renderCount: number;
  slowestRender: number;
}

export interface ServiceMetric {
  serviceName: string;
  operationName: string;
  averageTime: number;
  callCount: number;
  errorRate: number;
}

export interface InteractionMetric {
  interactionType: string;
  averageTime: number;
  count: number;
  slowestInteraction: number;
}

export interface PerformanceSummary {
  overallScore: number;
  slowComponents: string[];
  slowServices: string[];
  recommendations: string[];
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface AppEvent {
  type: string;
  timestamp: Date;
  data?: any;
  source?: string;
}

export interface NavigationEvent extends AppEvent {
  type: 'navigation';
  data: {
    from: string;
    to: string;
    params?: any;
  };
}

export interface JourneyEvent extends AppEvent {
  type: 'journey';
  data: {
    action: 'start' | 'stop' | 'save' | 'delete';
    journeyId: string;
    metadata?: any;
  };
}

export interface LocationEvent extends AppEvent {
  type: 'location';
  data: {
    action: 'update' | 'permission_granted' | 'permission_denied';
    location?: Coordinate;
    permission?: LocationPermissionStatus;
  };
}

export interface DiscoveryEvent extends AppEvent {
  type: 'discovery';
  data: {
    action: 'search' | 'save_place' | 'unsave_place';
    placeId?: string;
    searchResults?: PlaceDiscovery[];
  };
}

export interface ErrorEvent extends AppEvent {
  type: 'error';
  data: {
    error: Error;
    context: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: Date;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface GooglePlacesResponse {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  formatted_address?: string;
  photos?: GooglePlacePhoto[];
}

export interface GooglePlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

export interface FirestoreDocument {
  id: string;
  data: any;
  createTime: Date;
  updateTime: Date;
}

export interface FirestoreQuery {
  collection: string;
  where?: FirestoreWhereClause[];
  orderBy?: FirestoreOrderBy[];
  limit?: number;
  startAt?: any;
}

export interface FirestoreWhereClause {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
  value: any;
}

export interface FirestoreOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * END OF TYPE DEFINITIONS
 * 
 * These interfaces serve as contracts between modules and should be
 * implemented consistently across the application. They provide:
 * 
 * 1. Type safety for development
 * 2. Clear expectations for module interfaces
 * 3. Documentation for API contracts
 * 4. Foundation for testing and validation
 * 
 * All modules should implement these interfaces to ensure consistency
 * and maintainability across the Hero's Path MVP.
 */
