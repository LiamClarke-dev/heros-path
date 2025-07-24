// firebase.js
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// import the native AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

// import Constants from "expo-constants";

// const {
//   FIREBASE_API_KEY,
//   FIREBASE_AUTH_DOMAIN,
//   FIREBASE_PROJECT_ID,
//   FIREBASE_STORAGE_BUCKET,
//   FIREBASE_MESSAGING_SENDER_ID,
//   FIREBASE_APP_ID,
//   FIREBASE_MEASUREMENT_ID,
// } = Constants.manifest.extra;

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

// Debug: Log Firebase config values
Logger.debug('Firebase config values:');
Logger.debug('apiKey:', FIREBASE_API_KEY ? 'SET' : 'EMPTY');
Logger.debug('authDomain:', FIREBASE_AUTH_DOMAIN ? 'SET' : 'EMPTY');
Logger.debug('projectId:', FIREBASE_PROJECT_ID ? 'SET' : 'EMPTY');

// Check if required Firebase config values are available
const requiredConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Check if any required values are missing
const missingValues = Object.entries(requiredConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

let app;
let auth;
let db;

if (missingValues.length > 0) {
  console.error('Missing Firebase configuration values:', missingValues);
  console.error('Firebase initialization will fail. Please check your environment variables.');
  
  // Create a minimal config to prevent crash, but Firebase operations will fail
  const fallbackConfig = {
    apiKey: 'placeholder',
    authDomain: 'placeholder',
    projectId: 'placeholder',
    storageBucket: 'placeholder',
    messagingSenderId: 'placeholder',
    appId: 'placeholder',
    measurementId: FIREBASE_MEASUREMENT_ID || '',
  };
  
  Logger.debug('Using fallback config to prevent crash');
  app = initializeApp(fallbackConfig);
  
  // Initialize auth with error handling
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Auth:', error);
    // Create a mock auth object to prevent crashes
    auth = {
      onAuthStateChanged: (callback) => {
        console.warn('Firebase Auth not properly initialized');
        callback(null);
        return () => {};
      },
      signOut: async () => {
        console.warn('Firebase Auth not properly initialized');
        throw new Error('Firebase Auth not properly initialized');
      }
    };
  }
  
  db = getFirestore(app);
} else {
  // All config values are present, proceed normally
  const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
    measurementId: FIREBASE_MEASUREMENT_ID,
  };

  Logger.debug('Full Firebase config:', {
    apiKey: FIREBASE_API_KEY ? 'SET' : 'EMPTY',
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
    measurementId: FIREBASE_MEASUREMENT_ID,
  });

  app = initializeApp(firebaseConfig);

  // <- HERE: initialize Auth with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  db = getFirestore(app);
}

// Sign up with email and password
async function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Sign in with email and password
async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export { auth, db, signUpWithEmail, signInWithEmail };
