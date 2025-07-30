# Google OAuth Configuration - CRITICAL

**⚠️ DO NOT MODIFY - WORKING CONFIGURATION ⚠️**

This document contains the **working Google OAuth configuration** for Hero's Path. Modifying these settings will break authentication.

## Working Configuration Summary

✅ **WORKING** - Google authentication is fully functional with this setup:

- **Client ID Selection**: Uses iOS/Android client IDs (NOT web client ID)
- **Redirect URI**: Custom scheme `com.liamclarke.herospath://` (NOT Expo proxy)
- **OAuth Flow**: Authorization code flow with PKCE disabled
- **Platform**: Development builds (not Expo Go)

## Critical Implementation Details

### 1. Client ID Selection (`utils/GoogleOAuthConfig.js`)
```javascript
// ✅ CORRECT - Use platform-specific client IDs
if (Platform.OS === 'ios' && iosClientId) {
  clientId = iosClientId;
} else if (Platform.OS === 'android' && androidClientId) {
  clientId = androidClientId;
}

// ❌ WRONG - Do not use web client ID for development builds
// clientId = webClientId;
```

### 2. Redirect URI (`utils/GoogleOAuthConfig.js`)
```javascript
// ✅ CORRECT - Custom scheme for development builds
redirectUri = AuthSession.makeRedirectUri({
  scheme: 'com.liamclarke.herospath',
  useProxy: false, // CRITICAL: Do not use proxy
});

// ❌ WRONG - Do not use Expo proxy for development builds
// useProxy: true
```

### 3. OAuth Flow Configuration (`utils/GoogleOAuthConfig.js`)
```javascript
// ✅ CORRECT - Authorization code flow without PKCE
return {
  clientId,
  scopes: ['openid', 'profile', 'email'],
  redirectUri,
  responseType: AuthSession.ResponseType.Code,
  usePKCE: false, // CRITICAL: PKCE must be disabled
  additionalParameters: {
    'access_type': 'offline',
    'prompt': 'select_account',
  },
};
```

## Google Cloud Console Configuration

**Required OAuth Clients:**

1. **iOS Client**: `[PROJECT_ID]-[ios-client-id].apps.googleusercontent.com`
   - Bundle ID: `com.liamclarke.herospath`
   - Used for iOS development builds

2. **Android Client**: `[PROJECT_ID]-[android-client-id].apps.googleusercontent.com`
   - Package name: `com.liamclarke.herospath`
   - Used for Android development builds

3. **Web Client**: `[PROJECT_ID]-[web-client-id].apps.googleusercontent.com`
   - NOT used in current working configuration
   - Keep for potential future Expo Go compatibility

## Environment Variables

Required in `.env` (NOT committed to GitHub):
```
GOOGLE_WEB_CLIENT_ID=[your-web-client-id].apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=[your-ios-client-id].apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=[your-android-client-id].apps.googleusercontent.com
```

**⚠️ SECURITY NOTE**: 
- These client IDs are stored in `.env` file which is in `.gitignore` and NOT committed to GitHub
- For EAS builds, these are configured as environment variables in the EAS dashboard
- Never hardcode these values in source code

## Common Mistakes to Avoid

❌ **Do NOT change these settings:**
- Do not use web client ID for development builds
- Do not enable PKCE (`usePKCE: true`)
- Do not use Expo proxy (`useProxy: true`)
- Do not use implicit flow for development builds

❌ **Do NOT use these redirect URIs:**
- `https://auth.expo.io/@liamclarke-dev/heros-path`
- `https://auth.expo.io/@liamclarke-dev/heros-path-app`

## Troubleshooting

If authentication breaks, verify:
1. Using iOS/Android client ID (not web)
2. PKCE is disabled (`usePKCE: false`)
3. Custom scheme redirect URI is used
4. App scheme matches `com.liamclarke.herospath`

## Testing Verification

Working authentication shows these logs:
```
Using iOS client ID for development build
Using custom scheme redirect URI for development build
Generated redirect URI: com.liamclarke.herospath://
Making OAuth request with config: {"usePKCE": false}
OAuth flow result: success
Token exchange successful, creating Firebase credential
Google sign-in successful: [user-id]
```

**Last Updated**: January 2025  
**Status**: ✅ WORKING - Do not modify