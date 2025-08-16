# Hero's Path MVP v0.1 - Clean Build Design

## Overview

This design document outlines the architecture and implementation approach for building Hero's Path MVP v0.1 from scratch. The design prioritizes simplicity, maintainability, and avoiding the architectural debt identified in the existing codebase.

## Clean Setup Process for First-Time Developers

### Step 1: Create New Project Structure

Since we're building clean, we'll create a new project structure while preserving the valuable configuration and assets from the existing project.

#### 1.1 Backup Current Project
```bash
# Create a backup of the current project
cp -r heros-path-new heros-path-backup
```

#### 1.2 Clean the Source Code
```bash
# Navigate to your project
cd heros-path-new

# Remove all implementation code (keep config and assets)
rm -rf components/ contexts/ hooks/ screens/ services/ utils/ styles/ constants/

# Reset App.js to minimal state
```

### Step 2: Google Cloud Project Setup (IMPORTANT: Do This First)

#### 2.1 Create Google Cloud Project First
**What you're doing**: Creating the foundation project that will ensure Firebase and Google APIs are properly linked.

**Step-by-step instructions**:
1. Open [Google Cloud Console](https://console.cloud.google.com/) in your web browser
2. Sign in with your Google account (the same one you use for development)
3. Click "Select a project" dropdown at the top of the page
4. Click "New Project" button
5. **Project name**: Enter "Hero's Path MVP"
6. **Project ID**: Will auto-generate (like "heros-path-mvp-123456") - note this down
7. **Organization**: Leave as "No organization" unless you have a specific org
8. Click "Create" and wait 30-60 seconds for project creation
9. **Important**: Make sure the new project is selected in the dropdown

### Step 3: Firebase Console Setup (Using Existing Google Cloud Project)

#### 3.1 Create Firebase Project from Google Cloud Project
**What you're doing**: Adding Firebase services to your existing Google Cloud project (ensures proper linking).

**Step-by-step instructions**:
1. Open [Firebase Console](https://console.firebase.google.com/) in a new tab
2. **Important**: Make sure you're signed in with the same Google account
3. Click "Add project"
4. **Instead of creating new**: Select "Choose an existing Google Cloud Platform (GCP) project"
5. From the dropdown, select your "Hero's Path MVP" project (the one you just created)
6. Click "Continue"
7. **Google Analytics**: Choose whether to enable (optional for MVP)
8. If enabling Analytics, choose "Default Account for Firebase"
9. Click "Add Firebase" and wait for setup to complete
10. Click "Continue" when you see "Your new project is ready"

#### 3.2 Configure Authentication (Google Sign-In)
**What you're doing**: Setting up Google sign-in so users can log into your app.

**Step-by-step instructions**:
1. In your Firebase project dashboard, click "Authentication" in the left sidebar
2. Click "Get started" if this is your first time
3. Click the "Sign-in method" tab at the top
4. Find "Google" in the list and click on it
5. Toggle the "Enable" switch to ON
6. **Project support email**: Select your email from the dropdown
7. Click "Save"

**Important**: We'll configure the OAuth client IDs later when we set up the app.

#### 3.3 Configure Firestore Database
**What you're doing**: Creating a database to store user journeys and saved places.

**Step-by-step instructions**:
1. In the left sidebar, click "Firestore Database"
2. Click "Create database"
3. **Security rules**: Select "Start in test mode" (we'll secure this later)
4. **Location**: Choose the location closest to your users (e.g., "us-central" for US)
5. Click "Done" and wait for database creation (30-60 seconds)

#### 3.4 Get Your Firebase Configuration
**What you're doing**: Getting the connection keys so your app can talk to Firebase.

**Step-by-step instructions**:
1. Click the gear icon ⚙️ next to "Project Overview" in the left sidebar
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click "Add app" and select the "</>" (Web) icon
5. **App nickname**: Enter "Hero's Path MVP Web"
6. **Don't check** "Also set up Firebase Hosting"
7. Click "Register app"
8. **Copy the config object** - it looks like this:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```
9. **Save this information** - you'll need it for your `.env` file
10. Click "Continue to console"

### Step 4: Enable Google APIs (In Same Google Cloud Project)

#### 4.1 Verify You're In The Right Project
**What you're doing**: Making sure you're configuring APIs in the same project as Firebase.

**Step-by-step instructions**:
1. You should still be in [Google Cloud Console](https://console.cloud.google.com/) from Step 2
2. **Verify**: Check that the project dropdown shows your "Hero's Path MVP" project
3. If not, click the dropdown and select the correct project
4. The project ID should match what you noted in Step 2.1

#### 4.2 Enable Required APIs
**What you're doing**: Turning on the Google services your app needs.

**Step-by-step instructions**:
1. In the left sidebar, click "APIs & Services" → "Library"
2. **Enable Google Places API (New)**:
   - In the search box, type "Places API (New)"
   - Click on "Places API (New)" (make sure it says "New")
   - Click the blue "Enable" button
   - Wait for it to enable (30 seconds)

3. **Enable Google Maps SDK for iOS**:
   - Go back to the Library (click "Library" in the left sidebar)
   - Search for "Maps SDK for iOS"
   - Click on it and click "Enable"

4. **Enable Google Maps SDK for Android**:
   - Go back to the Library
   - Search for "Maps SDK for Android" 
   - Click on it and click "Enable"

5. **Enable Geocoding API**:
   - Go back to the Library
   - Search for "Geocoding API"
   - Click on it and click "Enable"

#### 4.3 Create API Keys (First-Time Developer Instructions)
**What you're doing**: Creating secure keys so your app can use Google services.

**Step-by-step instructions**:
1. In the left sidebar, click "APIs & Services" → "Credentials"
2. Click the blue "+ CREATE CREDENTIALS" button at the top
3. Select "API key" from the dropdown

**Create iOS API Key**:
4. After the key is created, click "RESTRICT KEY" 
5. **Name**: Change the name to "Hero's Path iOS Key"
6. **Application restrictions**: Select "iOS apps"
7. Click "Add an item" under iOS apps
8. **Bundle ID**: Enter `com.liamclarke.herospath` (exactly as shown)
9. **API restrictions**: Select "Restrict key"
10. Check these APIs:
    - Places API (New)
    - Maps SDK for iOS
    - Geocoding API
11. Click "Save"
12. **Copy the API key** and save it (you'll need this for your `.env` file)

**Create Android API Key**:
13. Click "+ CREATE CREDENTIALS" → "API key" again
14. Click "RESTRICT KEY"
15. **Name**: Change to "Hero's Path Android Key"
16. **Application restrictions**: Select "Android apps"
17. Click "Add an item" under Android apps
18. **Package name**: Enter `com.liamclarke.herospath`
19. **SHA-1 certificate fingerprint**: Leave blank for now (we'll add this later)
20. **API restrictions**: Select "Restrict key"
21. Check the same APIs as iOS:
    - Places API (New)
    - Maps SDK for Android
    - Geocoding API
22. Click "Save"
23. **Copy this API key** and save it separately

**Important**: Keep these API keys secure and never commit them to GitHub!

### Step 5: Expo Dashboard Setup (First-Time Developer Guide)

#### 5.1 Create Expo Account and Project
**What you're doing**: Setting up your app in Expo's system for building and deployment.

**Step-by-step instructions**:
1. Go to [Expo Dashboard](https://expo.dev/) in your web browser
2. Click "Sign up" if you don't have an account, or "Log in" if you do
3. **Create account**: Use the same email as your Google/Firebase account for consistency
4. After logging in, click "Create a project"
5. **Project name**: Enter "heros-path-mvp"
6. **Project slug**: This will auto-fill as "heros-path-mvp" (this becomes part of your app URL)
7. Click "Create project"

#### 5.2 Configure Environment Variables
**What you're doing**: Securely storing your API keys so Expo can use them when building your app.

**Step-by-step instructions**:
1. In your Expo project dashboard, click "Secrets" in the left sidebar
2. Click "Create" to add each environment variable:

**Add Google Maps iOS Key**:
3. **Name**: `GOOGLE_MAPS_API_KEY_IOS`
4. **Value**: Paste your iOS API key from Google Cloud Console
5. Click "Create"

**Add Google Maps Android Key**:
6. **Name**: `GOOGLE_MAPS_API_KEY_ANDROID`
7. **Value**: Paste your Android API key from Google Cloud Console
8. Click "Create"

**Add Firebase Configuration** (add each of these separately):
9. `FIREBASE_API_KEY` - from your Firebase config
10. `FIREBASE_AUTH_DOMAIN` - from your Firebase config
11. `FIREBASE_PROJECT_ID` - from your Firebase config
12. `FIREBASE_STORAGE_BUCKET` - from your Firebase config
13. `FIREBASE_MESSAGING_SENDER_ID` - from your Firebase config
14. `FIREBASE_APP_ID` - from your Firebase config

#### 5.3 Update Your Local .env File
**What you're doing**: Creating a local file with your keys for development.

**Step-by-step instructions**:
1. In your project folder, find the `.env` file (create it if it doesn't exist)
2. Add these lines (replace with your actual values):
```
GOOGLE_MAPS_API_KEY_IOS=your-ios-api-key-here
GOOGLE_MAPS_API_KEY_ANDROID=your-android-api-key-here
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
```
3. **Important**: Never commit this file to GitHub! It should already be in your `.gitignore`

#### 5.4 Update app.json Configuration
**What you're doing**: Configuring your app's basic information and permissions.

**Step-by-step instructions**:
1. Open `app.json` in your code editor
2. Replace the contents with this configuration:
```json
{
  "expo": {
    "name": "Hero's Path MVP",
    "slug": "heros-path-mvp",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.liamclarke.herospath",
      "config": {
        "googleMapsApiKey": "$GOOGLE_MAPS_API_KEY_IOS"
      },
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs location access to track your walking journeys.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs background location access to continue tracking your journey when the app is not active."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.liamclarke.herospath",
      "config": {
        "googleMaps": {
          "apiKey": "$GOOGLE_MAPS_API_KEY_ANDROID"
        }
      },
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-location",
      "expo-task-manager",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```
3. Save the file

#### 5.5 Test Your Setup
**What you're doing**: Making sure everything is configured correctly.

**Step-by-step instructions**:
1. Open your terminal/command prompt
2. Navigate to your project folder: `cd path/to/your/project`
3. Run: `npx expo start`
4. You should see a QR code and some options
5. If you see any errors about missing configuration, double-check your `.env` file and `app.json`
6. Press `Ctrl+C` to stop the development server

### Step 6: GitHub Repository Setup

#### 6.1 Create Clean Branch
```bash
# Create a new branch for the clean build
git checkout -b mvp-clean-build

# Commit the cleaned structure
git add .
git commit -m "feat: clean project structure for MVP v0.1 build"
git push -u origin mvp-clean-build
```

#### 6.2 Update Repository Settings
1. Go to your GitHub repository
2. Go to "Settings" → "Branches"
3. Set `mvp-clean-build` as the default branch temporarily
4. This ensures all new development happens on the clean branch

## Architecture Design

### Core Architecture Principles

1. **Service-Oriented Architecture**: Business logic in services, UI in components
2. **Single Responsibility**: Each module has one clear purpose
3. **Consistent Patterns**: Establish patterns early and stick to them
4. **No Duplication**: Build it right the first time
5. **Test-Driven**: Write tests as you build

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
├─────────────────────────────────────────────────────────────┤
│  SignInScreen  │  MapScreen  │  JourneyHistoryScreen       │
├─────────────────────────────────────────────────────────────┤
│                    Component Layer                          │
├─────────────────────────────────────────────────────────────┤
│  UI Components │  Map Components  │  Journey Components    │
├─────────────────────────────────────────────────────────────┤
│                   State Management                          │
├─────────────────────────────────────────────────────────────┤
│     UserContext     │     ThemeContext                     │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│ AuthService │ JourneyService │ LocationService │ PlacesService│
├─────────────────────────────────────────────────────────────┤
│                   Data Persistence                          │
├─────────────────────────────────────────────────────────────┤
│    Firebase Auth    │    Firestore    │   AsyncStorage     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.js
│   │   ├── LoadingSpinner.js
│   │   ├── ErrorMessage.js
│   │   ├── Modal.js
│   │   └── Screen.js          # Base screen wrapper
│   └── map/
│       ├── MapView.js
│       ├── LocationMarker.js
│       ├── RoutePolyline.js
│       └── PlaceMarkers.js
├── contexts/
│   ├── UserContext.js
│   └── ThemeContext.js
├── navigation/
│   └── AppNavigator.js        # Simple navigation (start with stack, upgrade to drawer if needed)
├── screens/
│   ├── SignInScreen.js
│   ├── MapScreen.js
│   └── JourneyHistoryScreen.js
├── services/
│   ├── AuthService.js
│   ├── JourneyService.js
│   ├── LocationService.js
│   └── PlacesService.js       # Uses Google Places API (New)
├── styles/
│   └── theme.js               # Single theme file for MVP
├── utils/
│   ├── constants.js
│   ├── helpers.js
│   ├── ErrorHandler.js
│   ├── ApiMonitor.js          # API usage tracking
│   └── PerformanceMonitor.js  # Performance tracking
├── hooks/
│   ├── useAuth.js
│   ├── useLocation.js
│   └── useJourneys.js
└── test/
    ├── setup.js
    ├── testUtils.js
    └── mocks/
```

## UI Infrastructure Design

### Navigation Architecture

#### AppNavigator.js - Root Navigation
```javascript
const AppNavigator = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
```

#### MainNavigator.js - Main App Navigation
```javascript
const MainNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false, // Custom headers in each screen
        drawerStyle: {
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Drawer.Screen name="Map" component={MapScreen} />
      <Drawer.Screen name="JourneyHistory" component={JourneyHistoryScreen} />
    </Drawer.Navigator>
  );
};
```

### Theme Infrastructure

#### theme.js - Simple MVP Theme Configuration
```javascript
// Simple, single-file theme for MVP - can be split later if needed
const theme = {
  colors: {
    // Primary colors
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    
    // Background colors
    background: '#FFFFFF',
    surface: '#F2F2F7',
    
    // Text colors
    text: '#000000',
    textSecondary: '#8E8E93',
    
    // Interactive
    border: '#C6C6C8',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  
  // Simple spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  // Essential typography
  typography: {
    h1: { fontSize: 28, fontWeight: 'bold' },
    h2: { fontSize: 22, fontWeight: 'bold' },
    body: { fontSize: 16, fontWeight: 'normal' },
    caption: { fontSize: 14, fontWeight: 'normal' },
  },
  
  // Basic styling
  borderRadius: 8,
  shadow: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
};

export default theme;
```

#### ThemeContext.js - Theme Provider
```javascript
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme] = useState(baseTheme); // Simple for MVP, can extend later
  
  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Base UI Components

#### Screen.js - Base Screen Wrapper
```javascript
const Screen = ({ 
  children, 
  showHeader = true, 
  title, 
  headerRight,
  style,
  ...props 
}) => {
  const { theme } = useTheme();
  
  return (
    <SafeAreaWrapper>
      {showHeader && (
        <Header title={title} rightComponent={headerRight} />
      )}
      <View style={[
        { 
          flex: 1, 
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md 
        }, 
        style
      ]} {...props}>
        {children}
      </View>
    </SafeAreaWrapper>
  );
};
```

#### Button.js - Themed Button Component
```javascript
const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  style,
  ...props 
}) => {
  const { theme } = useTheme();
  
  const buttonStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary,
      borderWidth: 1,
    },
    // ... other variants
  };
  
  const textStyles = {
    primary: { color: '#FFFFFF' },
    secondary: { color: theme.colors.primary },
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.base,
        buttonStyles[variant],
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text style={[
        theme.typography.body,
        textStyles[variant],
        disabled && styles.disabledText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
```

## Component Design

### 1. Authentication System

#### AuthService.js (Using Expo SDK)
```javascript
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

class AuthService {
  static async signInWithGoogle() {
    // Use Expo AuthSession for simplified OAuth
    const request = new AuthSession.AuthRequest({
      clientId: 'your-google-client-id',
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
      responseType: AuthSession.ResponseType.Code,
    });
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
    });
    
    if (result.type === 'success') {
      // Exchange code for tokens and sign in with Firebase
      const credential = GoogleAuthProvider.credential(result.params.id_token);
      return await signInWithCredential(auth, credential);
    }
    throw new Error('Authentication cancelled');
  }
  
  static async signOut() {
    // Clear secure storage and sign out from Firebase
    await SecureStore.deleteItemAsync('userToken');
    return await auth.signOut();
  }
  
  static getCurrentUser() {
    return auth.currentUser;
  }
  
  static async storeToken(token) {
    // Use Expo SecureStore for secure token storage
    await SecureStore.setItemAsync('userToken', token);
  }
}
```

#### UserContext.js
```javascript
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Authentication methods
  const signIn = async () => { /* implementation */ };
  const signOut = async () => { /* implementation */ };
  
  return (
    <UserContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  );
};
```

### 2. Location and Journey Tracking

#### LocationService.js (Using Expo SDK)
```javascript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

class LocationService {
  static async requestPermissions() {
    // Use Expo Location for simplified permission handling
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      return backgroundStatus.status === 'granted';
    }
    return false;
  }
  
  static async getCurrentLocation() {
    // Use Expo Location for current position
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  }
  
  static async startTracking(callback) {
    // Use Expo TaskManager for background location tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    });
  }
  
  static async stopTracking() {
    // Stop Expo background location tracking
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

// Define background task using Expo TaskManager
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Handle location updates
  }
});
```

#### JourneyService.js
```javascript
class JourneyService {
  static async saveJourney(journeyData) {
    // Save journey to Firestore
    // journeyData: { userId, name, path, distance, duration, startTime, endTime }
  }
  
  static async getUserJourneys(userId) {
    // Get all journeys for a user
  }
  
  static async getJourney(journeyId) {
    // Get specific journey by ID
  }
  
  static async deleteJourney(journeyId) {
    // Delete a journey
  }
}
```

### 3. Place Discovery

#### PlacesService.js
```javascript
class PlacesService {
  static async searchAlongRoute(routePoints, radius = 500) {
    // Use Google Places API (New) to find places along route
    // Utilizes the new searchNearby endpoint for better performance
    // Returns array of places with enhanced details and photos
  }
  
  static async getPlaceDetails(placeId) {
    // Get detailed information using Google Places API (New)
    // Uses the new Place Details endpoint with field masks for efficiency
  }
  
  static async savePlaceToUser(userId, place) {
    // Save a place to user's collection in Firestore
  }
  
  static async getUserSavedPlaces(userId) {
    // Get all places saved by user from Firestore
  }
  
  static async searchNearbyPlaces(location, radius, types) {
    // Use Google Places API (New) searchNearby for real-time discovery
    // More efficient than legacy nearbysearch
  }
}
```

### 4. User Interface Components

#### MapScreen.js
```javascript
const MapScreen = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  
  const startJourney = () => {
    setIsTracking(true);
    LocationService.startTracking((location) => {
      setCurrentRoute(prev => [...prev, location]);
    });
  };
  
  const stopJourney = async () => {
    setIsTracking(false);
    LocationService.stopTracking();
    
    // Show journey naming modal
    // Save journey
    // Discover places along route
  };
  
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        followsUserLocation={!isTracking}
      >
        {/* Route polyline */}
        {currentRoute.length > 1 && (
          <Polyline coordinates={currentRoute} strokeColor="#007AFF" strokeWidth={3} />
        )}
        
        {/* Saved places markers */}
        {savedPlaces.map(place => (
          <Marker key={place.id} coordinate={place.coordinate} title={place.name} />
        ))}
      </MapView>
      
      <View style={styles.controls}>
        <Button
          title={isTracking ? "Stop Journey" : "Start Journey"}
          onPress={isTracking ? stopJourney : startJourney}
        />
      </View>
    </View>
  );
};
```

## Data Models

### User Model
```javascript
{
  id: "firebase-uid",
  email: "user@example.com",
  displayName: "User Name",
  photoURL: "https://...",
  createdAt: "2024-01-01T00:00:00Z",
  preferences: {
    theme: "light",
    units: "metric"
  }
}
```

### Journey Model
```javascript
{
  id: "auto-generated-id",
  userId: "firebase-uid",
  name: "Morning Walk",
  path: [
    { latitude: 37.7749, longitude: -122.4194, timestamp: "2024-01-01T09:00:00Z" },
    { latitude: 37.7750, longitude: -122.4195, timestamp: "2024-01-01T09:01:00Z" }
  ],
  distance: 1500, // meters
  duration: 1800, // seconds
  startTime: "2024-01-01T09:00:00Z",
  endTime: "2024-01-01T09:30:00Z",
  createdAt: "2024-01-01T09:30:00Z",
  discoveredPlaces: ["place-id-1", "place-id-2"]
}
```

### Saved Place Model
```javascript
{
  id: "auto-generated-id",
  userId: "firebase-uid",
  placeId: "google-places-id",
  name: "Coffee Shop",
  category: "restaurant",
  coordinate: { latitude: 37.7749, longitude: -122.4194 },
  rating: 4.5,
  savedAt: "2024-01-01T09:30:00Z",
  discoveredInJourney: "journey-id" // optional
}
```

## Error Handling Strategy

### Centralized Error Handling
```javascript
// utils/ErrorHandler.js
class ErrorHandler {
  static handleAuthError(error) {
    // Handle authentication errors
    // Show user-friendly messages
  }
  
  static handleLocationError(error) {
    // Handle location/GPS errors
    // Guide user to enable permissions
  }
  
  static handleNetworkError(error) {
    // Handle network/API errors
    // Show retry options
  }
  
  static handleFirebaseError(error) {
    // Handle Firebase/Firestore errors
    // Log for debugging, show user-friendly message
  }
}
```

## Testing Strategy

### Unit Tests
- Service classes (AuthService, JourneyService, etc.)
- Utility functions
- Custom hooks
- Component logic

### Integration Tests
- Authentication flow
- Journey tracking end-to-end
- Place discovery workflow
- Data persistence

### Manual Testing Checklist
- [ ] User can sign in with Google
- [ ] Map loads and shows current location
- [ ] Journey tracking works in foreground and background
- [ ] Places are discovered after journey completion
- [ ] Journeys are saved and can be viewed later
- [ ] Saved places appear on map
- [ ] App works offline for journey tracking

## Performance Considerations

### Optimization Strategies
1. **Location Tracking**: Use appropriate accuracy and update intervals
2. **Map Rendering**: Limit number of markers and polyline points
3. **Data Loading**: Implement pagination for journey history
4. **Image Loading**: Lazy load place photos
5. **Bundle Size**: Import only needed components from libraries

### Monitoring
- Track app startup time
- Monitor memory usage during tracking
- Measure battery consumption
- Log API response times

## Security Considerations

### Data Protection
- All user data encrypted in transit (HTTPS)
- Firestore security rules restrict access to user's own data
- API keys restricted to specific platforms and APIs
- No sensitive data stored in AsyncStorage

### Privacy
- Request minimal permissions (location only when needed)
- Clear privacy policy explaining data usage
- Option to delete account and all data
- No tracking or analytics without user consent

## Testing Infrastructure (Set Up Early)

### Testing Framework Setup
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Test Setup and Utilities
```javascript
// src/test/setup.js
import 'react-native-gesture-handler/jestSetup';

// Mock Expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  makeRedirectUri: jest.fn(),
}));

// src/test/testUtils.js
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <ThemeProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ThemeProvider>
  );
  
  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  ...overrides,
});

export const createMockJourney = (overrides = {}) => ({
  id: 'test-journey-id',
  userId: 'test-user-id',
  name: 'Test Journey',
  distance: 1000,
  duration: 1800,
  path: [
    { latitude: 37.7749, longitude: -122.4194 },
    { latitude: 37.7750, longitude: -122.4195 },
  ],
  ...overrides,
});
```

### Example Test Files
```javascript
// src/services/__tests__/AuthService.test.js
import AuthService from '../AuthService';
import * as AuthSession from 'expo-auth-session';

jest.mock('expo-auth-session');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('should sign in successfully with valid response', async () => {
      const mockRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          params: { id_token: 'mock-token' }
        })
      };
      AuthSession.AuthRequest.mockImplementation(() => mockRequest);

      const result = await AuthService.signInWithGoogle();
      expect(result).toBeDefined();
    });

    it('should throw error when authentication is cancelled', async () => {
      const mockRequest = {
        promptAsync: jest.fn().mockResolvedValue({ type: 'cancel' })
      };
      AuthSession.AuthRequest.mockImplementation(() => mockRequest);

      await expect(AuthService.signInWithGoogle()).rejects.toThrow('Authentication cancelled');
    });
  });
});
```

### Integration Testing Setup
```javascript
// src/test/integration/authFlow.test.js
import { renderWithProviders } from '../testUtils';
import { fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../App';

describe('Authentication Flow Integration', () => {
  it('should complete full sign-in flow', async () => {
    const { getByText, getByTestId } = renderWithProviders(<App />);
    
    // Should show sign-in screen initially
    expect(getByText('Sign In')).toBeTruthy();
    
    // Tap Google sign-in button
    fireEvent.press(getByTestId('google-signin-button'));
    
    // Should navigate to map screen after successful auth
    await waitFor(() => {
      expect(getByTestId('map-screen')).toBeTruthy();
    });
  });
});
```

### E2E Testing with Detox (Optional but Recommended)
```javascript
// e2e/firstTest.e2e.js
describe('Hero\'s Path MVP', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete journey tracking flow', async () => {
    // Sign in
    await element(by.id('google-signin-button')).tap();
    
    // Start journey
    await element(by.id('start-journey-button')).tap();
    await expect(element(by.text('Stop Journey'))).toBeVisible();
    
    // Stop journey
    await element(by.id('stop-journey-button')).tap();
    
    // Name journey
    await element(by.id('journey-name-input')).typeText('Test Journey');
    await element(by.id('save-journey-button')).tap();
    
    // Verify journey saved
    await expect(element(by.text('Journey saved successfully'))).toBeVisible();
  });
});
```

## Deployment Strategy

### Development Phase
1. **Expo Go Testing**: Use for rapid UI iteration and basic functionality
2. **Development Builds**: Create for native features (location, auth) testing
3. **Firebase Emulator**: Use for local development and testing
4. **Automated Testing**: Run on every commit with GitHub Actions

### Testing Phase
1. **Unit Tests**: Achieve >80% coverage before any builds
2. **Integration Tests**: Test complete user flows
3. **Device Testing**: Test on multiple iOS/Android devices
4. **Performance Testing**: GPS accuracy, battery usage, memory
5. **TestFlight/Play Console**: Internal testing builds

### Production Phase
1. **EAS Production Builds**: Automated through CI/CD
2. **Gradual Rollout**: Start with 5% of users, increase gradually
3. **Monitoring**: Crash reports, performance metrics, user feedback
4. **Hotfix Pipeline**: Rapid deployment for critical issues

This clean build approach will result in a maintainable, well-architected MVP that avoids all the pitfalls identified in the existing codebase analysis.