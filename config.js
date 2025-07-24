// config.js
// Environment variables are injected by EAS build system
// For local development, these will be undefined and you'll need to use .env file

import Constants from 'expo-constants';
import {
  GOOGLE_MAPS_API_KEY_ANDROID as ENV_GOOGLE_MAPS_API_KEY_ANDROID,
  GOOGLE_MAPS_API_KEY_IOS as ENV_GOOGLE_MAPS_API_KEY_IOS,
  GOOGLE_ROADS_API_KEY as ENV_GOOGLE_ROADS_API_KEY,
  FIREBASE_API_KEY as ENV_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN as ENV_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID as ENV_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET as ENV_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID as ENV_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID as ENV_FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID as ENV_FIREBASE_MEASUREMENT_ID,
  GOOGLE_WEB_CLIENT_ID as ENV_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_REVERSED_CLIENT_ID as ENV_GOOGLE_IOS_REVERSED_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID as ENV_GOOGLE_ANDROID_CLIENT_ID,
} from '@env';

// Get environment variables from EAS build or fallback to .env file
const envMap = {
  'GOOGLE_MAPS_API_KEY_ANDROID': ENV_GOOGLE_MAPS_API_KEY_ANDROID,
  'GOOGLE_MAPS_API_KEY_IOS': ENV_GOOGLE_MAPS_API_KEY_IOS,
  'GOOGLE_ROADS_API_KEY': ENV_GOOGLE_ROADS_API_KEY,
  'FIREBASE_API_KEY': ENV_FIREBASE_API_KEY,
  'FIREBASE_AUTH_DOMAIN': ENV_FIREBASE_AUTH_DOMAIN,
  'FIREBASE_PROJECT_ID': ENV_FIREBASE_PROJECT_ID,
  'FIREBASE_STORAGE_BUCKET': ENV_FIREBASE_STORAGE_BUCKET,
  'FIREBASE_MESSAGING_SENDER_ID': ENV_FIREBASE_MESSAGING_SENDER_ID,
  'FIREBASE_APP_ID': ENV_FIREBASE_APP_ID,
  'FIREBASE_MEASUREMENT_ID': ENV_FIREBASE_MEASUREMENT_ID,
  'GOOGLE_WEB_CLIENT_ID': ENV_GOOGLE_WEB_CLIENT_ID,
  'GOOGLE_IOS_REVERSED_CLIENT_ID': ENV_GOOGLE_IOS_REVERSED_CLIENT_ID,
  'GOOGLE_ANDROID_CLIENT_ID': ENV_GOOGLE_ANDROID_CLIENT_ID,
};

const getEnvVar = (key) => {
  // Try multiple possible locations for EAS environment variables
  const possibleSources = [
    Constants.expoConfig?.extra?.[key],
    Constants.expoConfig?.extra?.eas?.env?.[key],
    Constants.expoConfig?.env?.[key],
    process.env[key]
  ];

  for (let i = 0; i < possibleSources.length; i++) {
    if (possibleSources[i]) {
      return possibleSources[i];
    }
  }

  // Always fall back to @env import if nothing else is found
  if (envMap[key]) {
    return envMap[key];
  }

  return null;
};

export const GOOGLE_MAPS_API_KEY_ANDROID = getEnvVar('GOOGLE_MAPS_API_KEY_ANDROID') || '';
export const GOOGLE_MAPS_API_KEY_IOS = getEnvVar('GOOGLE_MAPS_API_KEY_IOS') || '';
export const GOOGLE_ROADS_API_KEY = getEnvVar('GOOGLE_ROADS_API_KEY') || '';

export const FIREBASE_API_KEY = getEnvVar('FIREBASE_API_KEY') || '';
export const FIREBASE_AUTH_DOMAIN = getEnvVar('FIREBASE_AUTH_DOMAIN') || '';
export const FIREBASE_PROJECT_ID = getEnvVar('FIREBASE_PROJECT_ID') || '';
export const FIREBASE_STORAGE_BUCKET = getEnvVar('FIREBASE_STORAGE_BUCKET') || '';
export const FIREBASE_MESSAGING_SENDER_ID = getEnvVar('FIREBASE_MESSAGING_SENDER_ID') || '';
export const FIREBASE_APP_ID = getEnvVar('FIREBASE_APP_ID') || '';
export const FIREBASE_MEASUREMENT_ID = getEnvVar('FIREBASE_MEASUREMENT_ID') || '';

export const GOOGLE_WEB_CLIENT_ID = getEnvVar('GOOGLE_WEB_CLIENT_ID') || '';
export const GOOGLE_IOS_CLIENT_ID = getEnvVar('GOOGLE_IOS_REVERSED_CLIENT_ID') || '';
export const GOOGLE_ANDROID_CLIENT_ID = getEnvVar('GOOGLE_ANDROID_CLIENT_ID') || '';