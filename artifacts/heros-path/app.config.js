const GOOGLE_IOS_CLIENT_ID = "155152959717-a20bfhbkjp05k4kd3cahvasvbneimn7q";

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID}`,
          ],
        },
        {
          CFBundleURLSchemes: ["herospath"],
        },
      ],
      UIBackgroundModes: ["location"],
    },
  },
});
