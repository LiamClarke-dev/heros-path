// firebase.js
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from "./config";

import Logger from './utils/Logger';

/**
 * Firebase Configuration and Authentication Setup
 * Provides secure Firebase initialization with AsyncStorage persistence
 * and comprehensive error handling for configuration issues
 */

// Configuration validation and error handling
const validateFirebaseConfig = () => {
  const requiredConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
  };

  const missingValues = Object.entries(requiredConfig)
    .filter(([key, value]) => !value || value.trim() === '')
    .map(([key]) => key);

  if (missingValues.length > 0) {
    const errorMessage = `Missing Firebase configuration values: ${missingValues.join(', ')}`;
    Logger.error('Firebase Configuration Error:', errorMessage);
    Logger.error('Please check your environment variables in .env file or EAS build configuration');
    throw new Error(errorMessage);
  }

  Logger.debug('Firebase configuration validation passed');
  return requiredConfig;
};

// Initialize Firebase with error handling
let app;
let auth;
let db;
let isFirebaseInitialized = false;

const initializeFirebase = () => {
  try {
    // Validate configuration first
    const config = validateFirebaseConfig();
    
    const firebaseConfig = {
      ...config,
      measurementId: FIREBASE_MEASUREMENT_ID,
    };

    Logger.debug('Initializing Firebase with config:', {
      apiKey: config.apiKey ? 'SET' : 'EMPTY',
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
      measurementId: FIREBASE_MEASUREMENT_ID || 'NOT_SET',
    });

    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    Logger.info('Firebase app initialized successfully');

    // Initialize Auth with AsyncStorage persistence for token storage
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    Logger.info('Firebase Auth initialized with AsyncStorage persistence');

    // Initialize Firestore
    db = getFirestore(app);
    Logger.info('Firestore initialized successfully');

    isFirebaseInitialized = true;
    return { app, auth, db };

  } catch (error) {
    Logger.error('Firebase initialization failed:', error);
    
    // Create fallback objects to prevent app crashes
    // These will throw meaningful errors when used
    const createFailsafeAuth = () => ({
      onAuthStateChanged: (callback) => {
        Logger.warn('Firebase Auth not initialized - onAuthStateChanged called');
        callback(null);
        return () => {};
      },
      signOut: async () => {
        throw new Error('Firebase Auth not properly initialized. Check your configuration.');
      },
      currentUser: null,
    });

    app = null;
    auth = createFailsafeAuth();
    db = null;
    isFirebaseInitialized = false;

    // Re-throw the error for proper handling upstream
    throw error;
  }
};

// Initialize Firebase immediately
try {
  initializeFirebase();
} catch (error) {
  // Error is already logged in initializeFirebase
  // App will continue with failsafe objects
}

/**
 * Authentication Functions
 * Provides secure email/password authentication with comprehensive error handling
 */

// Sign up with email and password
const signUpWithEmail = async (email, password) => {
  try {
    if (!isFirebaseInitialized) {
      throw new Error('Firebase is not properly initialized. Check your configuration.');
    }

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    Logger.info('Attempting to create user account with email:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    Logger.info('User account created successfully:', userCredential.user.uid);
    
    return userCredential;
  } catch (error) {
    Logger.error('Sign up failed:', error.message);
    
    // Provide user-friendly error messages
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists. Please sign in instead.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/weak-password':
        throw new Error('Password should be at least 6 characters long.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your internet connection and try again.');
      default:
        throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  }
};

// Sign in with email and password
const signInWithEmail = async (email, password) => {
  try {
    if (!isFirebaseInitialized) {
      throw new Error('Firebase is not properly initialized. Check your configuration.');
    }

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    Logger.info('Attempting to sign in user with email:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    Logger.info('User signed in successfully:', userCredential.user.uid);
    
    return userCredential;
  } catch (error) {
    Logger.error('Sign in failed:', error.message);
    
    // Provide user-friendly error messages
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email. Please sign up first.');
      case 'auth/wrong-password':
        throw new Error('Incorrect password. Please try again.');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled. Please contact support.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your internet connection and try again.');
      default:
        throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  }
};

// Sign out current user
const signOutUser = async () => {
  try {
    if (!isFirebaseInitialized) {
      throw new Error('Firebase is not properly initialized. Check your configuration.');
    }

    Logger.info('Signing out current user');
    await signOut(auth);
    Logger.info('User signed out successfully');
  } catch (error) {
    Logger.error('Sign out failed:', error.message);
    throw new Error('Failed to sign out. Please try again.');
  }
};

// Get current authentication state
const getCurrentUser = () => {
  if (!isFirebaseInitialized) {
    Logger.warn('Firebase not initialized - getCurrentUser returning null');
    return null;
  }
  return auth.currentUser;
};

// Set up authentication state listener
const onAuthStateChange = (callback) => {
  if (!isFirebaseInitialized) {
    Logger.warn('Firebase not initialized - onAuthStateChange returning empty unsubscribe');
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, (user) => {
    Logger.debug('Auth state changed:', user ? `User: ${user.uid}` : 'No user');
    callback(user);
  });
};

// Check if Firebase is properly initialized
const isInitialized = () => isFirebaseInitialized;

// Export Firebase instances and authentication functions
export { 
  app, 
  auth, 
  db, 
  signUpWithEmail, 
  signInWithEmail, 
  signOutUser,
  getCurrentUser,
  onAuthStateChange,
  isInitialized
};
