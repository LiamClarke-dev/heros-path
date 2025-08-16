/**
 * Firebase configuration for Hero's Path MVP
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Validate configuration
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase configuration keys: ${missingKeys.join(', ')}. ` +
        'Please check your environment variables.'
    );
  }
};

// Initialize Firebase
let app;
let auth;
let db;

try {
  validateConfig();
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  throw error;
}

export { app, auth, db };
export default app;
