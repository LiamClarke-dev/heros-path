# Event System Contracts

## Overview

This document defines the event system contracts for Hero's Path MVP, including event types, data structures, and flow patterns. These contracts ensure consistent event handling across the application and provide a foundation for debugging, analytics, and system integration.

**Source**: Generated from repository analysis at `965caea6bcca512353cdc7e4208bc9c3ceb16a0f`  
**Scope**: MVP-focused event contracts for core functionality

---

## Event System Architecture

### Event Flow Pattern

```
Event Source → Event Publisher → Event Bus → Event Handlers → Side Effects
     ↓              ↓              ↓            ↓              ↓
User Action    Service Method   Context     Hook/Component  UI Update
External API   State Change     Provider    Error Handler   Data Sync
System Event   Data Update      Event       Analytics       Notification
```

### Event Categories

1. **User Events** - Direct user interactions
2. **System Events** - Application state changes
3. **Data Events** - Data persistence and synchronization
4. **Navigation Events** - Screen transitions and routing
5. **Error Events** - Error conditions and recovery
6. **Performance Events** - Performance monitoring and optimization

---

## Core Event Contracts

### Base Event Interface

```typescript
interface BaseEvent {
  id: string;              // Unique event identifier
  type: string;            // Event type identifier
  timestamp: Date;         // Event occurrence time
  source: string;          // Event source component/service
  userId?: string;         // Associated user (if applicable)
  sessionId?: string;      // Session identifier
  metadata?: any;          // Additional event data
}
```

### Event Publisher Interface

```typescript
interface EventPublisher {
  publish(event: BaseEvent): void;
  subscribe(eventType: string, handler: EventHandler): Subscription;
  unsubscribe(subscription: Subscription): void;
}

interface EventHandler {
  (event: BaseEvent): void | Promise<void>;
}

interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  unsubscribe(): void;
}
```

---

## User Interaction Events

### Authentication Events

#### User Sign In Event
```typescript
interface UserSignInEvent extends BaseEvent {
  type: 'user.sign_in';
  data: {
    method: 'email' | 'google_oauth';
    userId: string;
    email: string;
    isNewUser: boolean;
    signInTime: Date;
  };
}
```

**Triggers**: Successful authentication  
**Publishers**: UserContext, AuthenticationService  
**Subscribers**: Analytics, UserProfileService, NavigationContext

#### User Sign Out Event
```typescript
interface UserSignOutEvent extends BaseEvent {
  type: 'user.sign_out';
  data: {
    userId: string;
    sessionDuration: number; // seconds
    reason: 'user_initiated' | 'token_expired' | 'forced';
    signOutTime: Date;
  };
}
```

**Triggers**: User logout or session expiration  
**Publishers**: UserContext  
**Subscribers**: Analytics, local data cleanup, NavigationContext

### Journey Tracking Events

#### Journey Started Event
```typescript
interface JourneyStartedEvent extends BaseEvent {
  type: 'journey.started';
  data: {
    journeyId: string;
    userId: string;
    startLocation: Coordinate;
    startTime: Date;
    trackingSettings: {
      backgroundEnabled: boolean;
      accuracyLevel: 'high' | 'medium' | 'low';
    };
  };
}
```

**Triggers**: User starts journey tracking  
**Publishers**: useJourneyTracking hook  
**Subscribers**: BackgroundLocationService, Analytics, PerformanceMonitor

#### Journey Completed Event
```typescript
interface JourneyCompletedEvent extends BaseEvent {
  type: 'journey.completed';
  data: {
    journeyId: string;
    userId: string;
    journey: {
      duration: number;        // seconds
      distance: number;        // meters
      pathPoints: number;      // GPS points collected
      startTime: Date;
      endTime: Date;
      endLocation: Coordinate;
    };
    quality: {
      averageAccuracy: number; // meters
      dataLossPercentage: number;
      signalStrength: 'excellent' | 'good' | 'poor';
    };
  };
}
```

**Triggers**: User stops journey tracking  
**Publishers**: BackgroundLocationService  
**Subscribers**: JourneyService, DiscoveriesService, Analytics

#### Journey Saved Event
```typescript
interface JourneySavedEvent extends BaseEvent {
  type: 'journey.saved';
  data: {
    journeyId: string;
    userId: string;
    name: string;
    isCustomName: boolean;
    saveTime: Date;
    syncStatus: 'local' | 'synced' | 'failed';
  };
}
```

**Triggers**: Journey successfully saved to storage  
**Publishers**: JourneyService  
**Subscribers**: Analytics, UI feedback, data sync service

### Place Discovery Events

#### Discovery Search Event
```typescript
interface DiscoverySearchEvent extends BaseEvent {
  type: 'discovery.search_started';
  data: {
    journeyId: string;
    userId: string;
    searchParameters: {
      routeLength: number;     // meters
      searchRadius: number;    // meters
      categories: string[];
      minimumRating: number;
    };
    apiCallCount: number;
  };
}
```

**Triggers**: Place discovery initiated  
**Publishers**: DiscoveriesService  
**Subscribers**: Performance monitoring, API usage tracking

#### Discovery Results Event
```typescript
interface DiscoveryResultsEvent extends BaseEvent {
  type: 'discovery.results_received';
  data: {
    journeyId: string;
    userId: string;
    results: {
      totalPlaces: number;
      categories: Record<string, number>;
      averageRating: number;
      searchDuration: number;  // milliseconds
    };
    apiUsage: {
      requestCount: number;
      quotaUsed: number;
      cost: number;           // estimated API cost
    };
  };
}
```

**Triggers**: Discovery search completed  
**Publishers**: DiscoveriesService  
**Subscribers**: Analytics, cost monitoring, UI updates

#### Place Saved Event
```typescript
interface PlaceSavedEvent extends BaseEvent {
  type: 'place.saved';
  data: {
    placeId: string;
    userId: string;
    place: {
      googlePlaceId: string;
      name: string;
      category: string;
      rating: number;
      coordinates: Coordinate;
    };
    context: {
      discoveredInJourney: string; // journey ID
      savedFromScreen: string;     // screen name
      userIntent: 'bookmark' | 'visit_later' | 'recommend';
    };
  };
}
```

**Triggers**: User saves a discovered place  
**Publishers**: useSavedPlaces hook  
**Subscribers**: SavedPlacesService, Analytics, recommendation engine

---

## System State Events

### Location Events

#### Location Permission Event
```typescript
interface LocationPermissionEvent extends BaseEvent {
  type: 'location.permission_changed';
  data: {
    permission: 'granted' | 'denied' | 'restricted';
    previousPermission: 'granted' | 'denied' | 'restricted' | 'unknown';
    accuracy: 'precise' | 'approximate' | 'none';
    backgroundAllowed: boolean;
    requestSource: string;   // which component requested
  };
}
```

**Triggers**: Location permission status change  
**Publishers**: useMapPermissions hook, ExpoLocationIntegration  
**Subscribers**: UI permission prompts, feature availability updates

#### Location Update Event
```typescript
interface LocationUpdateEvent extends BaseEvent {
  type: 'location.position_updated';
  data: {
    position: Coordinate;
    previousPosition?: Coordinate;
    movement: {
      distance: number;        // meters from previous
      speed: number;          // m/s
      bearing: number;        // degrees
    };
    quality: {
      accuracy: number;       // meters
      provider: 'gps' | 'network' | 'passive';
      satelliteCount?: number;
    };
    context: {
      isTracking: boolean;
      journeyId?: string;
      backgroundMode: boolean;
    };
  };
}
```

**Triggers**: GPS location update received  
**Publishers**: BackgroundLocationService  
**Subscribers**: Journey tracking, map updates, performance monitoring

### Navigation Events

#### Screen Navigation Event
```typescript
interface ScreenNavigationEvent extends BaseEvent {
  type: 'navigation.screen_changed';
  data: {
    from: {
      screen: string;
      params?: any;
      timeSpent: number;      // milliseconds
    };
    to: {
      screen: string;
      params?: any;
    };
    navigation: {
      method: 'push' | 'replace' | 'goBack' | 'reset';
      trigger: 'user' | 'system' | 'deep_link';
      transitionTime: number; // milliseconds
    };
  };
}
```

**Triggers**: Screen transition completion  
**Publishers**: NavigationContext  
**Subscribers**: Analytics, performance monitoring, user behavior tracking

#### Deep Link Event
```typescript
interface DeepLinkEvent extends BaseEvent {
  type: 'navigation.deep_link_received';
  data: {
    url: string;
    scheme: string;
    path: string;
    params: Record<string, string>;
    source: 'external_app' | 'notification' | 'web_browser';
    handled: boolean;
    handlerName?: string;
    processingTime: number; // milliseconds
  };
}
```

**Triggers**: Deep link URL received and processed  
**Publishers**: DeepLinkService  
**Subscribers**: Analytics, navigation routing, feature usage tracking

---

## Data Events

### Data Synchronization Events

#### Data Sync Started Event
```typescript
interface DataSyncStartedEvent extends BaseEvent {
  type: 'data.sync_started';
  data: {
    syncType: 'journeys' | 'places' | 'profile' | 'full';
    dataTypes: string[];
    localChangeCount: number;
    networkStatus: 'online' | 'offline' | 'limited';
    lastSyncTime?: Date;
  };
}
```

**Triggers**: Data synchronization initiated  
**Publishers**: Data sync services  
**Subscribers**: UI sync indicators, performance monitoring

#### Data Sync Completed Event
```typescript
interface DataSyncCompletedEvent extends BaseEvent {
  type: 'data.sync_completed';
  data: {
    syncType: 'journeys' | 'places' | 'profile' | 'full';
    result: 'success' | 'partial' | 'failed';
    statistics: {
      itemsSynced: number;
      itemsFailed: number;
      dataTransferred: number; // bytes
      syncDuration: number;    // milliseconds
    };
    conflicts?: {
      count: number;
      resolved: number;
      strategy: 'local_wins' | 'remote_wins' | 'merge';
    };
  };
}
```

**Triggers**: Data synchronization completed  
**Publishers**: Data sync services  
**Subscribers**: UI feedback, error handling, analytics

### Cache Events

#### Cache Operation Event
```typescript
interface CacheOperationEvent extends BaseEvent {
  type: 'cache.operation';
  data: {
    operation: 'hit' | 'miss' | 'write' | 'evict' | 'clear';
    cacheType: 'journeys' | 'places' | 'images' | 'api_responses';
    key: string;
    size?: number;          // bytes
    ttl?: number;           // seconds
    hitRate?: number;       // current cache hit rate (0-1)
  };
}
```

**Triggers**: Cache operations  
**Publishers**: Cache managers in services  
**Subscribers**: Performance monitoring, cache optimization

---

## Error Events

### Application Error Event
```typescript
interface ApplicationErrorEvent extends BaseEvent {
  type: 'error.application';
  data: {
    error: {
      name: string;
      message: string;
      stack: string;
      code?: string;
    };
    context: {
      component: string;
      action: string;
      userAction?: string;
      appState: any;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
    recovery?: {
      attempted: boolean;
      successful?: boolean;
      strategy: string;
    };
  };
}
```

**Triggers**: Application errors and exceptions  
**Publishers**: Error boundaries, service error handlers  
**Subscribers**: Error reporting, user feedback, recovery systems

### API Error Event
```typescript
interface APIErrorEvent extends BaseEvent {
  type: 'error.api';
  data: {
    api: 'firebase' | 'google_places' | 'google_maps';
    endpoint: string;
    method: string;
    error: {
      status: number;
      code: string;
      message: string;
      retryable: boolean;
    };
    request: {
      duration: number;       // milliseconds
      retryCount: number;
      rateLimited: boolean;
    };
    impact: {
      feature: string;
      userVisible: boolean;
      fallbackUsed: boolean;
    };
  };
}
```

**Triggers**: External API errors  
**Publishers**: API integration services  
**Subscribers**: Error handling, retry logic, user notifications

---

## Performance Events

### Performance Measurement Event
```typescript
interface PerformanceMeasurementEvent extends BaseEvent {
  type: 'performance.measurement';
  data: {
    metric: 'app_start' | 'screen_render' | 'api_response' | 'user_interaction';
    value: number;          // milliseconds
    target?: number;        // target/goal value
    context: {
      component?: string;
      action?: string;
      deviceInfo: {
        platform: 'ios' | 'android';
        model: string;
        osVersion: string;
        memoryLevel: 'low' | 'medium' | 'high';
      };
    };
    threshold: {
      warning: number;
      critical: number;
      percentile?: number;    // P95, P99, etc.
    };
  };
}
```

**Triggers**: Performance measurements  
**Publishers**: PerformanceMonitor utility  
**Subscribers**: Performance optimization, alerting, analytics

---

## Event Handling Patterns

### Event Subscription Pattern

```typescript
// Service subscribing to events
class JourneyService {
  constructor(eventPublisher: EventPublisher) {
    // Subscribe to journey completion for automatic save
    eventPublisher.subscribe('journey.completed', this.handleJourneyCompleted);
    
    // Subscribe to sync events for conflict resolution
    eventPublisher.subscribe('data.sync_completed', this.handleSyncCompleted);
  }
  
  private handleJourneyCompleted = async (event: JourneyCompletedEvent) => {
    try {
      await this.saveJourney(event.data.journey);
      // Publish journey saved event
      this.eventPublisher.publish({
        type: 'journey.saved',
        data: { journeyId: event.data.journeyId, /* ... */ }
      });
    } catch (error) {
      // Publish error event
      this.eventPublisher.publish({
        type: 'error.application',
        data: { error, context: 'journey_save' }
      });
    }
  };
}
```

### Event Publishing Pattern

```typescript
// Hook publishing events
const useJourneyTracking = () => {
  const eventPublisher = useEventPublisher();
  
  const startTracking = useCallback(async () => {
    try {
      const journeyId = generateJourneyId();
      
      // Publish journey start event
      eventPublisher.publish({
        type: 'journey.started',
        timestamp: new Date(),
        source: 'useJourneyTracking',
        data: {
          journeyId,
          userId: user.uid,
          startLocation: currentLocation,
          startTime: new Date()
        }
      });
      
      await backgroundLocationService.startTracking(journeyId);
      setTrackingState({ isTracking: true, journeyId });
      
    } catch (error) {
      eventPublisher.publish({
        type: 'error.application',
        data: { error, context: 'start_tracking', severity: 'medium' }
      });
    }
  }, [eventPublisher, user, currentLocation]);
};
```

### Event-Driven Side Effects

```typescript
// Analytics service consuming events
class AnalyticsService {
  constructor(eventPublisher: EventPublisher) {
    // Track user engagement
    eventPublisher.subscribe('journey.completed', this.trackJourneyCompletion);
    eventPublisher.subscribe('place.saved', this.trackPlaceSaved);
    
    // Track performance metrics
    eventPublisher.subscribe('performance.measurement', this.trackPerformance);
    
    // Track errors for debugging
    eventPublisher.subscribe('error.application', this.trackError);
  }
  
  private trackJourneyCompletion = (event: JourneyCompletedEvent) => {
    // Send to analytics service
    this.analytics.track('Journey Completed', {
      duration: event.data.journey.duration,
      distance: event.data.journey.distance,
      quality: event.data.quality.averageAccuracy
    });
  };
}
```

---

## Event Testing Contracts

### Event Testing Interface

```typescript
interface EventTestUtils {
  // Simulate events for testing
  publishEvent(event: BaseEvent): void;
  
  // Wait for specific events in tests
  waitForEvent(eventType: string, timeout?: number): Promise<BaseEvent>;
  
  // Verify event was published
  expectEventPublished(eventType: string, matcher?: (event: BaseEvent) => boolean): void;
  
  // Mock event handlers
  mockEventHandler(eventType: string): jest.MockedFunction<EventHandler>;
  
  // Clear event history
  clearEventHistory(): void;
  
  // Get published events for verification
  getPublishedEvents(eventType?: string): BaseEvent[];
}
```

### Event Testing Examples

```typescript
describe('Journey Tracking Events', () => {
  let eventTestUtils: EventTestUtils;
  
  beforeEach(() => {
    eventTestUtils = setupEventTesting();
  });
  
  test('should publish journey started event when tracking begins', async () => {
    const { result } = renderHook(() => useJourneyTracking());
    
    await act(async () => {
      await result.current.startTracking();
    });
    
    eventTestUtils.expectEventPublished('journey.started', (event) => 
      event.data.userId === 'test-user-id'
    );
  });
  
  test('should handle journey completion event', async () => {
    const mockHandler = eventTestUtils.mockEventHandler('journey.completed');
    
    eventTestUtils.publishEvent({
      type: 'journey.completed',
      data: { journeyId: 'test-journey', /* ... */ }
    });
    
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'journey.completed',
        data: expect.objectContaining({
          journeyId: 'test-journey'
        })
      })
    );
  });
});
```

---

## Event Documentation Standards

### Event Documentation Template

For each event type, provide:

1. **Purpose**: What the event represents and why it's published
2. **Triggers**: What conditions or actions cause the event
3. **Publishers**: Which components/services publish the event
4. **Subscribers**: Which components/services consume the event
5. **Data Contract**: Detailed schema with required/optional fields
6. **Side Effects**: What happens as a result of the event
7. **Testing**: How to test the event in isolation and integration
8. **Performance Impact**: Event frequency and processing overhead

### Event Evolution Guidelines

1. **Backward Compatibility**: New events should not break existing subscribers
2. **Schema Evolution**: Add optional fields, avoid removing or changing existing fields
3. **Deprecation**: Mark deprecated events clearly and provide migration path
4. **Versioning**: Use semantic versioning for major event schema changes
5. **Documentation**: Update contracts when event schemas change

---

*These event contracts provide the foundation for reliable, testable, and maintainable event-driven architecture in Hero's Path MVP. All event publishers and subscribers should implement these contracts consistently.*
