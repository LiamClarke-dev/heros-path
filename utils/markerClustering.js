/**
 * Marker Clustering Utility
 * 
 * Implements Google Maps-style marker clustering for performance optimization
 * when displaying large numbers of saved places markers.
 * 
 * Requirements addressed:
 * - 6.5: Google Marker Clustering for performance with large numbers of markers
 */

/**
 * Default clustering configuration
 */
export const DEFAULT_CLUSTERING_OPTIONS = {
  gridSize: 60, // Size of the grid for clustering
  maxZoom: 15, // Maximum zoom level to cluster at
  minClusterSize: 2, // Minimum number of markers to form a cluster
  averageCenter: true, // Use average position for cluster center
  zoomOnClick: true, // Zoom in when cluster is clicked
};

/**
 * Cluster style configurations for different themes
 */
export const CLUSTER_STYLES = {
  light: [
    {
      textColor: '#FFFFFF',
      textSize: 12,
      backgroundColor: '#4A90E2',
      borderColor: '#FFFFFF',
      borderWidth: 2,
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    {
      textColor: '#FFFFFF',
      textSize: 14,
      backgroundColor: '#2E7D32',
      borderColor: '#FFFFFF',
      borderWidth: 2,
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    {
      textColor: '#FFFFFF',
      textSize: 16,
      backgroundColor: '#D32F2F',
      borderColor: '#FFFFFF',
      borderWidth: 2,
      width: 60,
      height: 60,
      borderRadius: 30,
    },
  ],
  dark: [
    {
      textColor: '#000000',
      textSize: 12,
      backgroundColor: '#64B5F6',
      borderColor: '#2C2C2C',
      borderWidth: 2,
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    {
      textColor: '#000000',
      textSize: 14,
      backgroundColor: '#81C784',
      borderColor: '#2C2C2C',
      borderWidth: 2,
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    {
      textColor: '#000000',
      textSize: 16,
      backgroundColor: '#E57373',
      borderColor: '#2C2C2C',
      borderWidth: 2,
      width: 60,
      height: 60,
      borderRadius: 30,
    },
  ],
  adventure: [
    {
      textColor: '#8B4513',
      textSize: 12,
      backgroundColor: '#FFD700',
      borderColor: '#8B4513',
      borderWidth: 2,
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    {
      textColor: '#8B4513',
      textSize: 14,
      backgroundColor: '#FFA500',
      borderColor: '#8B4513',
      borderWidth: 2,
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    {
      textColor: '#8B4513',
      textSize: 16,
      backgroundColor: '#FF6347',
      borderColor: '#8B4513',
      borderWidth: 2,
      width: 60,
      height: 60,
      borderRadius: 30,
    },
  ],
};

/**
 * Calculate distance between two coordinates in meters
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in meters
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * 
    Math.cos(toRadians(coord2.latitude)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the center point of a group of coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} Center coordinate {latitude, longitude}
 */
function calculateCenter(coordinates) {
  if (coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0];

  let totalLat = 0;
  let totalLng = 0;

  coordinates.forEach(coord => {
    totalLat += coord.latitude;
    totalLng += coord.longitude;
  });

  return {
    latitude: totalLat / coordinates.length,
    longitude: totalLng / coordinates.length,
  };
}

/**
 * Get cluster style based on marker count and theme
 * @param {number} count - Number of markers in cluster
 * @param {string} theme - Theme name ('light', 'dark', 'adventure')
 * @returns {Object} Cluster style object
 */
export function getClusterStyle(count, theme = 'light') {
  const styles = CLUSTER_STYLES[theme] || CLUSTER_STYLES.light;
  
  if (count < 10) {
    return styles[0];
  } else if (count < 100) {
    return styles[1];
  } else {
    return styles[2];
  }
}

/**
 * Cluster markers based on proximity and zoom level
 * @param {Array} markers - Array of marker objects with {latitude, longitude, ...}
 * @param {number} zoom - Current map zoom level
 * @param {Object} options - Clustering options
 * @returns {Object} Object containing clusters and individual markers
 */
export function clusterMarkers(markers, zoom, options = {}) {
  const config = { ...DEFAULT_CLUSTERING_OPTIONS, ...options };
  
  // Don't cluster if zoom is too high or not enough markers
  if (zoom > config.maxZoom || markers.length < config.minClusterSize) {
    return {
      clusters: [],
      markers: markers.map(marker => ({
        ...marker,
        type: 'marker'
      }))
    };
  }

  const clusters = [];
  const processedMarkers = new Set();
  const gridSize = config.gridSize / Math.pow(2, zoom - 1); // Adjust grid size based on zoom

  markers.forEach((marker, index) => {
    if (processedMarkers.has(index)) return;

    const cluster = {
      id: `cluster_${index}_${Date.now()}`,
      type: 'cluster',
      markers: [marker],
      center: { latitude: marker.latitude, longitude: marker.longitude },
      count: 1
    };

    processedMarkers.add(index);

    // Find nearby markers to cluster
    markers.forEach((otherMarker, otherIndex) => {
      if (otherIndex === index || processedMarkers.has(otherIndex)) return;

      const distance = calculateDistance(
        { latitude: marker.latitude, longitude: marker.longitude },
        { latitude: otherMarker.latitude, longitude: otherMarker.longitude }
      );

      // Use a distance threshold based on zoom level
      const threshold = gridSize * 111000; // Convert to meters (rough approximation)
      
      if (distance < threshold) {
        cluster.markers.push(otherMarker);
        cluster.count++;
        processedMarkers.add(otherIndex);
      }
    });

    // Only create cluster if we have enough markers
    if (cluster.count >= config.minClusterSize) {
      // Calculate cluster center
      if (config.averageCenter) {
        cluster.center = calculateCenter(cluster.markers.map(m => ({
          latitude: m.latitude,
          longitude: m.longitude
        })));
      }
      
      clusters.push(cluster);
    } else {
      // Return as individual markers
      cluster.markers.forEach(m => {
        clusters.push({
          ...m,
          type: 'marker'
        });
      });
    }
  });

  // Separate clusters from individual markers
  const finalClusters = clusters.filter(item => item.type === 'cluster');
  const individualMarkers = clusters.filter(item => item.type === 'marker');

  return {
    clusters: finalClusters,
    markers: individualMarkers
  };
}

/**
 * MarkerClusterer class for managing clustering state
 */
export class MarkerClusterer {
  constructor(options = {}) {
    this.options = { ...DEFAULT_CLUSTERING_OPTIONS, ...options };
    this.markers = [];
    this.clusters = [];
    this.zoom = 10;
    this.theme = 'light';
  }

  /**
   * Set markers to be clustered
   * @param {Array} markers - Array of marker objects
   */
  setMarkers(markers) {
    this.markers = markers || [];
    this.updateClusters();
  }

  /**
   * Add a marker to the clusterer
   * @param {Object} marker - Marker object
   */
  addMarker(marker) {
    this.markers.push(marker);
    this.updateClusters();
  }

  /**
   * Remove a marker from the clusterer
   * @param {string} markerId - ID of marker to remove
   */
  removeMarker(markerId) {
    this.markers = this.markers.filter(marker => marker.id !== markerId);
    this.updateClusters();
  }

  /**
   * Update zoom level and recalculate clusters
   * @param {number} zoom - New zoom level
   */
  setZoom(zoom) {
    this.zoom = zoom;
    this.updateClusters();
  }

  /**
   * Update theme and recalculate cluster styles
   * @param {string} theme - Theme name
   */
  setTheme(theme) {
    this.theme = theme;
    this.updateClusters();
  }

  /**
   * Update clustering options
   * @param {Object} options - New options to merge
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    this.updateClusters();
  }

  /**
   * Recalculate clusters based on current state
   */
  updateClusters() {
    const result = clusterMarkers(this.markers, this.zoom, this.options);
    
    // Add theme-aware styling to clusters
    result.clusters = result.clusters.map(cluster => ({
      ...cluster,
      style: getClusterStyle(cluster.count, this.theme)
    }));

    this.clusters = result.clusters;
    this.individualMarkers = result.markers;
  }

  /**
   * Get current clusters
   * @returns {Array} Array of cluster objects
   */
  getClusters() {
    return this.clusters;
  }

  /**
   * Get individual markers (not clustered)
   * @returns {Array} Array of marker objects
   */
  getMarkers() {
    return this.individualMarkers || [];
  }

  /**
   * Get all items (clusters + individual markers)
   * @returns {Array} Array of all items to render
   */
  getAllItems() {
    return [...this.getClusters(), ...this.getMarkers()];
  }

  /**
   * Handle cluster click - zoom in to expand cluster
   * @param {Object} cluster - Cluster object that was clicked
   * @param {Function} onZoomChange - Callback to change zoom level
   */
  onClusterClick(cluster, onZoomChange) {
    if (this.options.zoomOnClick && onZoomChange) {
      const newZoom = Math.min(this.zoom + 2, this.options.maxZoom + 2);
      onZoomChange(newZoom, cluster.center);
    }
  }

  /**
   * Clear all markers and clusters
   */
  clear() {
    this.markers = [];
    this.clusters = [];
    this.individualMarkers = [];
  }
}

export default MarkerClusterer;