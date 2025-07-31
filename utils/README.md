# Utilities

This directory contains utility functions used throughout the Hero's Path application.

## Route Encoder (`routeEncoder.js`)

The Route Encoder utility provides functions for converting GPS coordinates to Google's encoded polyline format, which is required for the Search Along Route (SAR) feature.

### Key Functions

- **`validateCoordinates(coordinates)`** - Validates an array of GPS coordinates
- **`encodeRoute(coordinates)`** - Converts GPS coordinates to Google's encoded polyline format
- **`calculateRouteDistance(coordinates)`** - Calculates the total distance of a route in meters
- **`isRouteLongEnoughForSAR(coordinates, minLength)`** - Checks if a route meets minimum length requirements for SAR
- **`simplifyRoute(coordinates, tolerance)`** - Simplifies a route by removing redundant points

### Usage Example

```javascript
import { encodeRoute, validateCoordinates, isRouteLongEnoughForSAR } from './utils/routeEncoder';

const route = [
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.7849, longitude: -122.4094 }
];

// Validate coordinates
if (validateCoordinates(route)) {
  // Check if route is long enough for SAR
  if (isRouteLongEnoughForSAR(route)) {
    // Encode for Google Places API
    const encodedPolyline = encodeRoute(route);
    console.log('Encoded polyline:', encodedPolyline);
  }
}
```

### Testing

The Route Encoder includes comprehensive tests covering:
- Various route patterns (straight lines, curves, complex paths)
- Edge cases (single points, duplicate points, extreme coordinates)
- Performance tests with large datasets
- Error handling and validation

Run tests with:
```bash
npm test -- __tests__/routeEncoder.test.js
```

### Requirements Satisfied

This implementation satisfies the following requirements from the Search Along Route specification:
- **3.1**: Properly handles straight lines, curves, and complex path patterns
- **3.2**: Validates coordinates to ensure they are within valid latitude/longitude ranges
- **3.3**: Encodes the entire route as a single polyline
- **3.4**: Handles routes of varying lengths and complexities
- **3.5**: Follows Google's polyline encoding algorithm specifications