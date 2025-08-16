# Gamification Integration Points

## Overview

This document outlines the integration points for the Gamification feature within the refactored MapScreen architecture. The gamification system will integrate with the existing hook-based architecture to provide achievement tracking, experience point management, level progression, and visual feedback systems that enhance user engagement while maintaining the modular design principles.

## Hook Extension Points

### 1. useGamification Hook

The core hook for managing gamification functionality, designed to integrate with existing journey and location tracking hooks.

```javascript
/**
 * Custom hook for gamification functionality
 * 
 * Integrates with:
 * - useJourneyTracking for activity tracking and XP calculation
 * - useLocationTracking for route painting and exploration tracking
 * - UserContext for level progression and achievement management
 * 
 * Requirements: 9.1, 9.4
 */
const useGamification = () => {
  // State management
  const [userLevel, setUserLevel] = useState(1);
  const [experience, setExperience] = useState(0);
  const [experienceToNextLevel, setExperienceToNextLevel] = useState(100);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [activeQuests, setActiveQuests] = useState([]);
  const [recentRewards, setRecentRewards] = useState([]);
  const [levelUpAnimation, setLevelUpAnimation] = useState({ visible: false, newLevel: 0 });

  // Service integration
  const gamificationServiceRef = useRef(null);
  const achievementServiceRef = useRef(null);
  const questServiceRef = useRef(null);
  const streakServiceRef = useRef(null);

  // Initialize gamification services
  useEffect(() => {
    gamificationServiceRef.current = new GamificationService();
    achievementServiceRef.current = new AchievementService();
    questServiceRef.current = new QuestService();
    streakServiceRef.current = new StreakService();
    
    loadUserGamificationData();
    return cleanup;
  }, []);

  // Award experience points for activities
  const awardExperience = useCallback(async (amount, source, activityDetails = {}) => {
    try {
      const result = await gamificationServiceRef.current.awardExperience(
        userId,
        amount,
        source
      );

      // Update local state
      setExperience(result.newExperience);
      
      // Check for level up
      if (result.leveledUp) {
        setUserLevel(result.newLevel);
        setExperienceToNextLevel(result.experienceToNextLevel);
        
        // Trigger level up animation
        setLevelUpAnimation({
          visible: true,
          newLevel: result.newLevel,
          rewards: result.levelUpRewards,
        });
        
        // Auto-hide animation after delay
        setTimeout(() => {
          setLevelUpAnimation({ visible: false, newLevel: 0 });
        }, 3000);
      } else {
        setExperienceToNextLevel(result.experienceToNextLevel);
      }

      // Add to recent rewards
      setRecentRewards(prev => [...prev, {
        type: 'experience',
        amount,
        source,
        timestamp: Date.now(),
        details: activityDetails,
      }].slice(-10)); // Keep last 10 rewards

      // Check for achievements
      await checkAchievements(source, activityDetails);

      return result;
    } catch (error) {
      console.error('Failed to award experience:', error);
      return { success: false, error };
    }
  }, [userId]);

  // Check and award achievements
  const checkAchievements = useCallback(async (activityType, activityDetails) => {
    try {
      const newAchievements = await achievementServiceRef.current.checkAchievements(
        userId,
        { type: activityType, details: activityDetails }
      );

      if (newAchievements.length > 0) {
        // Update achievements state
        setAchievements(prev => [...prev, ...newAchievements]);
        
        // Add achievement rewards to recent rewards
        newAchievements.forEach(achievement => {
          setRecentRewards(prev => [...prev, {
            type: 'achievement',
            achievement: achievement.badge,
            timestamp: Date.now(),
          }]);
        });

        // Show achievement notification
        showAchievementNotification(newAchievements);
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  }, [userId]);

  // Update streak for daily activity
  const updateStreak = useCallback(async (activityType) => {
    try {
      const result = await streakServiceRef.current.updateStreak(userId, activityType);
      
      setCurrentStreak(result.currentStreak);
      
      // Check for streak milestones
      if (result.milestoneReached) {
        setRecentRewards(prev => [...prev, {
          type: 'streak',
          milestone: result.milestone,
          reward: result.reward,
          timestamp: Date.now(),
        }]);
      }

      return result;
    } catch (error) {
      console.error('Failed to update streak:', error);
      return { success: false, error };
    }
  }, [userId]);

  // Update quest progress
  const updateQuestProgress = useCallback(async (activityType, activityDetails) => {
    try {
      const updatedQuests = await questServiceRef.current.updateQuestProgress(
        userId,
        activityType,
        activityDetails
      );

      // Update active quests
      setActiveQuests(prev => 
        prev.map(quest => {
          const updated = updatedQuests.find(q => q.questId === quest.questId);
          return updated || quest;
        })
      );

      // Check for completed quests
      const completedQuests = updatedQuests.filter(q => q.status === 'completed');
      if (completedQuests.length > 0) {
        // Award quest rewards
        for (const quest of completedQuests) {
          await awardExperience(quest.rewards.xp, 'quest_completion', {
            questId: quest.questId,
            questName: quest.title,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update quest progress:', error);
    }
  }, [userId, awardExperience]);

  // Track activity and trigger all gamification systems
  const trackActivity = useCallback(async (activityType, activityDetails) => {
    try {
      // Calculate experience for activity
      const xpAmount = calculateExperienceForActivity(activityType, activityDetails);
      
      // Award experience
      if (xpAmount > 0) {
        await awardExperience(xpAmount, activityType, activityDetails);
      }

      // Update streak
      await updateStreak(activityType);

      // Update quest progress
      await updateQuestProgress(activityType, activityDetails);

      // Track activity in service
      await gamificationServiceRef.current.trackActivity(
        userId,
        activityType,
        activityDetails
      );
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }, [awardExperience, updateStreak, updateQuestProgress, userId]);

  // Calculate experience for different activities
  const calculateExperienceForActivity = useCallback((activityType, details) => {
    const xpRates = {
      journey_completed: 50,
      distance_walked: Math.floor(details.distance / 100), // 1 XP per 100m
      place_discovered: 25,
      ping_used: 10,
      route_completed: 75,
      neighborhood_explored: 100,
    };

    return xpRates[activityType] || 0;
  }, []);

  // Load user gamification data
  const loadUserGamificationData = useCallback(async () => {
    try {
      const [profile, userAchievements, userQuests] = await Promise.all([
        gamificationServiceRef.current.getUserProfile(userId),
        achievementServiceRef.current.getUserBadges(userId),
        questServiceRef.current.getActiveQuests(userId),
      ]);

      setUserLevel(profile.level);
      setExperience(profile.experience);
      setExperienceToNextLevel(profile.experienceToNextLevel);
      setCurrentStreak(profile.streakDays);
      setAchievements(userAchievements);
      setActiveQuests(userQuests);
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    }
  }, [userId]);

  // Show achievement notification
  const showAchievementNotification = useCallback((achievements) => {
    // Implementation would show toast/modal notification
    achievements.forEach(achievement => {
      console.log(`Achievement unlocked: ${achievement.badge.name}`);
    });
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (gamificationServiceRef.current) {
      gamificationServiceRef.current.cleanup();
    }
    if (achievementServiceRef.current) {
      achievementServiceRef.current.cleanup();
    }
    if (questServiceRef.current) {
      questServiceRef.current.cleanup();
    }
    if (streakServiceRef.current) {
      streakServiceRef.current.cleanup();
    }
  }, []);

  return {
    // State
    userLevel,
    experience,
    experienceToNextLevel,
    currentStreak,
    achievements,
    activeQuests,
    recentRewards,
    levelUpAnimation,
    
    // Actions
    trackActivity,
    awardExperience,
    updateStreak,
    checkAchievements,
    
    // Computed values
    levelProgress: experience / (experience + experienceToNextLevel),
    hasActiveQuests: activeQuests.length > 0,
    recentAchievements: achievements.filter(a => 
      Date.now() - a.earnedAt < 24 * 60 * 60 * 1000 // Last 24 hours
    ),
    
    // Utilities
    cleanup,
  };
};
```

### 2. Integration with Existing Hooks

#### useJourneyTracking Integration

The journey tracking hook will be enhanced to integrate with gamification systems:

```javascript
// Enhanced useJourneyTracking hook with gamification integration
const useJourneyTracking = () => {
  // Existing journey state...
  const gamification = useGamification();

  // Enhanced journey completion with gamification
  const completeJourney = useCallback(async (journeyName) => {
    try {
      // Complete journey (existing logic)
      const journeyData = await saveJourney({
        name: journeyName,
        distance: totalDistance,
        duration: totalDuration,
        path: currentPath,
        discoveries: journeyDiscoveries,
      });

      // Track gamification activity
      await gamification.trackActivity('journey_completed', {
        journeyId: journeyData.id,
        distance: totalDistance,
        duration: totalDuration,
        discoveries: journeyDiscoveries.length,
        routeLength: currentPath.length,
      });

      // Award distance-based experience
      await gamification.trackActivity('distance_walked', {
        distance: totalDistance,
      });

      // Award discovery-based experience
      for (const discovery of journeyDiscoveries) {
        await gamification.trackActivity('place_discovered', {
          placeId: discovery.placeId,
          placeType: discovery.placeType,
        });
      }

      return { success: true, journey: journeyData };
    } catch (error) {
      console.error('Journey completion with gamification failed:', error);
      throw error;
    }
  }, [saveJourney, totalDistance, totalDuration, currentPath, journeyDiscoveries, gamification]);

  // Track ping usage
  const recordPingUsage = useCallback(async (pingResults) => {
    await gamification.trackActivity('ping_used', {
      resultsCount: pingResults.length,
      location: currentPosition,
    });
  }, [gamification, currentPosition]);

  return {
    // Existing returns...
    completeJourney, // Enhanced with gamification
    recordPingUsage,
  };
};
```

#### useLocationTracking Integration

The location tracking hook will be enhanced to support route painting and exploration tracking:

```javascript
// Enhanced useLocationTracking hook with route painting support
const useLocationTracking = () => {
  // Existing location state...
  const [paintedRoutes, setPaintedRoutes] = useState([]);
  const [exploredNeighborhoods, setExploredNeighborhoods] = useState([]);

  // Service integration
  const routeTrackingServiceRef = useRef(null);
  const neighborhoodServiceRef = useRef(null);

  // Initialize route tracking services
  useEffect(() => {
    routeTrackingServiceRef.current = new RouteTrackingService();
    neighborhoodServiceRef.current = new NeighborhoodService();
    
    loadPaintedRoutes();
    loadExploredNeighborhoods();
  }, []);

  // Update painted routes as user moves
  const updatePaintedRoutes = useCallback(async (newPosition) => {
    try {
      if (isTracking && previousPosition) {
        const routeSegment = {
          path: [previousPosition, newPosition],
          timestamp: Date.now(),
          length: calculateDistance(previousPosition, newPosition),
        };

        // Add to painted routes
        await routeTrackingServiceRef.current.addPaintedRoute(
          userId,
          routeSegment
        );

        // Update local state
        setPaintedRoutes(prev => [...prev, routeSegment]);

        // Check neighborhood exploration
        await updateNeighborhoodExploration(routeSegment);
      }
    } catch (error) {
      console.error('Failed to update painted routes:', error);
    }
  }, [isTracking, previousPosition, userId]);

  // Update neighborhood exploration
  const updateNeighborhoodExploration = useCallback(async (routeSegment) => {
    try {
      const affectedNeighborhoods = await neighborhoodServiceRef.current
        .getNeighborhoodsForRoute(routeSegment.path);

      for (const neighborhood of affectedNeighborhoods) {
        const updatedProgress = await neighborhoodServiceRef.current
          .updateNeighborhoodCompletion(userId, neighborhood.id, routeSegment);

        // Check for completion milestones
        if (updatedProgress.completionPercentage >= 100 && 
            !exploredNeighborhoods.find(n => n.id === neighborhood.id)?.completed) {
          
          // Award neighborhood completion
          await gamification.trackActivity('neighborhood_explored', {
            neighborhoodId: neighborhood.id,
            neighborhoodName: neighborhood.name,
            completionPercentage: updatedProgress.completionPercentage,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update neighborhood exploration:', error);
    }
  }, [userId, exploredNeighborhoods, gamification]);

  // Load painted routes
  const loadPaintedRoutes = useCallback(async () => {
    try {
      const routes = await routeTrackingServiceRef.current.getPaintedRoutes(
        userId,
        currentMapBounds
      );
      setPaintedRoutes(routes);
    } catch (error) {
      console.error('Failed to load painted routes:', error);
    }
  }, [userId, currentMapBounds]);

  // Load explored neighborhoods
  const loadExploredNeighborhoods = useCallback(async () => {
    try {
      const neighborhoods = await neighborhoodServiceRef.current
        .getExploredNeighborhoods(userId);
      setExploredNeighborhoods(neighborhoods);
    } catch (error) {
      console.error('Failed to load explored neighborhoods:', error);
    }
  }, [userId]);

  // Enhanced location update with route painting
  useEffect(() => {
    if (currentPosition) {
      updatePaintedRoutes(currentPosition);
    }
  }, [currentPosition, updatePaintedRoutes]);

  return {
    // Existing returns...
    paintedRoutes,
    exploredNeighborhoods,
    loadPaintedRoutes,
    loadExploredNeighborhoods,
  };
};
```

## Map Overlay System Integration

### 1. Gamification Overlays Component

A new overlay system that integrates with the existing `MapOverlays` component:

```javascript
/**
 * Gamification overlays component
 * 
 * Integrates with MapOverlays for consistent rendering
 * 
 * Requirements: 9.1, 9.4
 */
const GamificationOverlays = ({
  paintedRoutes,
  exploredNeighborhoods,
  activeQuests,
  showPaintedRoutes,
  showNeighborhoods,
  showQuestObjectives,
  mapZoom,
}) => {
  // Render painted routes
  const renderPaintedRoutes = useCallback(() => {
    if (!showPaintedRoutes || mapZoom < 12) return null;

    return paintedRoutes.map((route, index) => (
      <Polyline
        key={`painted-route-${index}`}
        coordinates={route.path}
        strokeColor={getPaintedRouteColor(route.visitCount)}
        strokeWidth={getPaintedRouteWidth(route.visitCount, mapZoom)}
        strokeOpacity={0.8}
        lineCap="round"
        lineJoin="round"
      />
    ));
  }, [paintedRoutes, showPaintedRoutes, mapZoom]);

  // Render neighborhood boundaries
  const renderNeighborhoodBoundaries = useCallback(() => {
    if (!showNeighborhoods || mapZoom < 10) return null;

    return exploredNeighborhoods.map((neighborhood, index) => (
      <Polygon
        key={`neighborhood-${index}`}
        coordinates={neighborhood.boundaries}
        fillColor={getNeighborhoodFillColor(neighborhood.completionPercentage)}
        strokeColor={getNeighborhoodStrokeColor(neighborhood.completionPercentage)}
        strokeWidth={2}
        fillOpacity={0.3}
        strokeOpacity={0.8}
      />
    ));
  }, [exploredNeighborhoods, showNeighborhoods, mapZoom]);

  // Render quest objectives
  const renderQuestObjectives = useCallback(() => {
    if (!showQuestObjectives) return null;

    return activeQuests
      .filter(quest => quest.location)
      .map((quest, index) => (
        <Marker
          key={`quest-${index}`}
          coordinate={quest.location}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.questMarker}>
            <QuestIcon questType={quest.type} />
          </View>
        </Marker>
      ));
  }, [activeQuests, showQuestObjectives]);

  // Color schemes for painted routes
  const getPaintedRouteColor = useCallback((visitCount) => {
    const colors = {
      1: '#4CAF50',    // Green for first visit
      2: '#2196F3',    // Blue for second visit
      3: '#FF9800',    // Orange for third visit
      4: '#F44336',    // Red for frequent visits
    };
    return colors[Math.min(visitCount, 4)] || colors[4];
  }, []);

  const getPaintedRouteWidth = useCallback((visitCount, zoom) => {
    const baseWidth = Math.max(2, zoom - 10);
    return baseWidth + Math.min(visitCount - 1, 3);
  }, []);

  // Color schemes for neighborhoods
  const getNeighborhoodFillColor = useCallback((completionPercentage) => {
    if (completionPercentage >= 100) return '#4CAF50'; // Green for complete
    if (completionPercentage >= 75) return '#8BC34A';  // Light green for near complete
    if (completionPercentage >= 50) return '#FFC107';  // Yellow for half complete
    if (completionPercentage >= 25) return '#FF9800';  // Orange for quarter complete
    return '#9E9E9E'; // Gray for minimal exploration
  }, []);

  const getNeighborhoodStrokeColor = useCallback((completionPercentage) => {
    return completionPercentage >= 100 ? '#2E7D32' : '#616161';
  }, []);

  return (
    <>
      {renderPaintedRoutes()}
      {renderNeighborhoodBoundaries()}
      {renderQuestObjectives()}
    </>
  );
};

const styles = StyleSheet.create({
  questMarker: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
```

### 2. Achievement Notification Overlay

A component for showing achievement notifications on the map:

```javascript
/**
 * Achievement notification overlay component
 */
const AchievementNotificationOverlay = ({ 
  isVisible, 
  achievement, 
  onAnimationComplete 
}) => {
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.sequence([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete?.();
      });
    }
  }, [isVisible, animationValue, onAnimationComplete]);

  if (!isVisible || !achievement) return null;

  return (
    <Animated.View
      style={[
        styles.achievementNotification,
        {
          transform: [
            {
              scale: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
            {
              translateY: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
          opacity: animationValue,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.achievementContent}>
        <Text style={styles.achievementTitle}>Achievement Unlocked!</Text>
        <View style={styles.achievementDetails}>
          <Text style={styles.badgeIcon}>{achievement.icon}</Text>
          <View style={styles.achievementText}>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDescription}>
              {achievement.description}
            </Text>
          </View>
        </View>
        <Text style={styles.experienceReward}>+{achievement.xpReward} XP</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  achievementNotification: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementContent: {
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  achievementDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementText: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  experienceReward: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
```

## MapStatusDisplays Component Integration

### 1. Gamification Status Integration

The existing `MapStatusDisplays` component will be extended with gamification information:

```javascript
/**
 * Enhanced MapStatusDisplays component with gamification support
 * 
 * Integrates gamification status with existing displays
 * 
 * Requirements: 9.1, 9.4
 */
const MapStatusDisplays = ({
  journeyInfo,
  gpsStatus,
  // New gamification-related props
  userLevel,
  experience,
  experienceToNextLevel,
  currentStreak,
  activeQuests,
  levelUpAnimation,
}) => {
  return (
    <>
      {/* Existing status displays */}
      <JourneyInfoDisplay journeyInfo={journeyInfo} />
      
      {/* Gamification status displays */}
      <GamificationStatusDisplay
        userLevel={userLevel}
        experience={experience}
        experienceToNextLevel={experienceToNextLevel}
        currentStreak={currentStreak}
      />
      
      {/* Active quest display */}
      {activeQuests.length > 0 && (
        <ActiveQuestDisplay quest={activeQuests[0]} />
      )}
      
      {/* Level up animation */}
      <LevelUpAnimation
        isVisible={levelUpAnimation.visible}
        newLevel={levelUpAnimation.newLevel}
        rewards={levelUpAnimation.rewards}
      />
    </>
  );
};
```

### 2. Gamification Status Components

#### GamificationStatusDisplay Component

```javascript
/**
 * Gamification status display component
 */
const GamificationStatusDisplay = ({ 
  userLevel, 
  experience, 
  experienceToNextLevel, 
  currentStreak 
}) => {
  const progressPercentage = (experience / (experience + experienceToNextLevel)) * 100;

  return (
    <View style={styles.gamificationStatus}>
      <View style={styles.levelInfo}>
        <Text style={styles.levelText}>Level {userLevel}</Text>
        <Text style={styles.streakText}>🔥 {currentStreak} day streak</Text>
      </View>
      
      <View style={styles.experienceBar}>
        <View style={styles.experienceBarBackground}>
          <View 
            style={[
              styles.experienceBarFill, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.experienceText}>
          {experience} / {experience + experienceToNextLevel} XP
        </Text>
      </View>
    </View>
  );
};
```

#### ActiveQuestDisplay Component

```javascript
/**
 * Active quest display component
 */
const ActiveQuestDisplay = ({ quest }) => {
  const progressPercentage = (quest.progress / 100) * 100;

  return (
    <View style={styles.activeQuest}>
      <View style={styles.questHeader}>
        <QuestIcon questType={quest.type} size={16} />
        <Text style={styles.questTitle}>{quest.title}</Text>
      </View>
      
      <View style={styles.questProgress}>
        <View style={styles.questProgressBar}>
          <View 
            style={[
              styles.questProgressFill, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.questProgressText}>
          {quest.currentValue} / {quest.target}
        </Text>
      </View>
      
      {quest.timeRemaining && (
        <Text style={styles.questTimeRemaining}>
          ⏱️ {formatTimeRemaining(quest.timeRemaining)}
        </Text>
      )}
    </View>
  );
};
```

#### LevelUpAnimation Component

```javascript
/**
 * Level up animation component
 */
const LevelUpAnimation = ({ isVisible, newLevel, rewards }) => {
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.sequence([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, animationValue]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.levelUpAnimation,
        {
          transform: [
            {
              scale: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
          opacity: animationValue,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
      <Text style={styles.levelUpLevel}>Level {newLevel}</Text>
      {rewards && (
        <Text style={styles.levelUpRewards}>
          New rewards unlocked!
        </Text>
      )}
    </Animated.View>
  );
};
```

## Component Integration Examples

### 1. MapScreen Integration

Complete integration showing how gamification fits into the refactored MapScreen:

```javascript
const MapScreen = ({ navigation }) => {
  // Existing hooks
  const mapState = useMapState();
  const locationTracking = useLocationTracking();
  const journeyTracking = useJourneyTracking();
  const savedRoutes = useSavedRoutes();
  const savedPlaces = useSavedPlaces();
  const mapStyle = useMapStyle();
  const permissions = useMapPermissions();
  
  // New gamification hook
  const gamification = useGamification();

  // State for gamification overlays
  const [showPaintedRoutes, setShowPaintedRoutes] = useState(true);
  const [showNeighborhoods, setShowNeighborhoods] = useState(true);
  const [showQuestObjectives, setShowQuestObjectives] = useState(true);

  // Handle journey completion with gamification
  const handleJourneyCompletion = useCallback(async (journeyName) => {
    try {
      // Complete journey (this will trigger gamification tracking)
      const result = await journeyTracking.completeJourney(journeyName);
      
      if (result.success) {
        // Show journey completion with XP gained
        showJourneyCompletionModal({
          journey: result.journey,
          xpGained: gamification.recentRewards
            .filter(r => r.type === 'experience')
            .reduce((total, r) => total + r.amount, 0),
          achievements: gamification.recentAchievements,
        });
      }
    } catch (error) {
      console.error('Journey completion failed:', error);
    }
  }, [journeyTracking, gamification]);

  return (
    <View style={styles.container}>
      <MapRenderer
        mapState={mapState}
        locationTracking={locationTracking}
        savedRoutes={savedRoutes}
        savedPlaces={savedPlaces}
        mapStyle={mapStyle}
        // New gamification overlays
        gamificationOverlays={
          <GamificationOverlays
            paintedRoutes={locationTracking.paintedRoutes}
            exploredNeighborhoods={locationTracking.exploredNeighborhoods}
            activeQuests={gamification.activeQuests}
            showPaintedRoutes={showPaintedRoutes}
            showNeighborhoods={showNeighborhoods}
            showQuestObjectives={showQuestObjectives}
            mapZoom={mapState.zoom}
          />
        }
        achievementNotification={
          <AchievementNotificationOverlay
            isVisible={gamification.recentAchievements.length > 0}
            achievement={gamification.recentAchievements[0]}
            onAnimationComplete={() => {
              // Clear recent achievements after showing
            }}
          />
        }
      />
      
      <MapControls
        onLocateMe={locationTracking.locateMe}
        onToggleTracking={journeyTracking.toggleTracking}
        onToggleMapStyle={mapStyle.toggleSelector}
        onToggleSavedRoutes={savedRoutes.toggleVisibility}
        onToggleSavedPlaces={savedPlaces.toggleVisibility}
        // New gamification controls
        onTogglePaintedRoutes={() => setShowPaintedRoutes(!showPaintedRoutes)}
        onToggleNeighborhoods={() => setShowNeighborhoods(!showNeighborhoods)}
        onOpenAchievements={() => navigation.navigate('Achievements')}
        onOpenQuests={() => navigation.navigate('Quests')}
        trackingState={journeyTracking.state}
        permissions={permissions}
      />
      
      <MapStatusDisplays
        journeyInfo={journeyTracking.currentJourney}
        gpsStatus={locationTracking.gpsStatus}
        // New gamification status
        userLevel={gamification.userLevel}
        experience={gamification.experience}
        experienceToNextLevel={gamification.experienceToNextLevel}
        currentStreak={gamification.currentStreak}
        activeQuests={gamification.activeQuests}
        levelUpAnimation={gamification.levelUpAnimation}
      />
      
      <MapModals
        journeyNaming={{
          ...journeyTracking.namingModal,
          onSave: handleJourneyCompletion, // Enhanced with gamification
        }}
        placeDetail={savedPlaces.detailModal}
        mapStyleSelector={mapStyle.selector}
      />
    </View>
  );
};
```

## Testing Integration Points

### 1. Hook Testing

```javascript
// Test gamification hook integration
describe('useGamification Integration', () => {
  test('should track activity and award experience', async () => {
    const { result } = renderHook(() => useGamification());

    // Track journey completion activity
    await act(async () => {
      await result.current.trackActivity('journey_completed', {
        distance: 1000,
        discoveries: 3,
        duration: 1800,
      });
    });

    expect(result.current.experience).toBeGreaterThan(0);
  });

  test('should trigger level up when experience threshold is reached', async () => {
    const { result } = renderHook(() => useGamification());

    // Mock high experience gain
    await act(async () => {
      await result.current.awardExperience(150, 'test_activity');
    });

    expect(result.current.levelUpAnimation.visible).toBe(true);
  });
});
```

### 2. Component Integration Testing

```javascript
// Test gamification overlays
describe('GamificationOverlays Integration', () => {
  test('should render painted routes when enabled', () => {
    const mockPaintedRoutes = [
      {
        path: [
          { latitude: 37.7749, longitude: -122.4194 },
          { latitude: 37.7849, longitude: -122.4094 },
        ],
        visitCount: 1,
      },
    ];

    const { UNSAFE_getByType } = render(
      <GamificationOverlays
        paintedRoutes={mockPaintedRoutes}
        showPaintedRoutes={true}
        mapZoom={15}
      />
    );

    expect(UNSAFE_getByType('Polyline')).toBeTruthy();
  });
});
```

## Performance Considerations

### 1. Route Painting Performance

- Use level-of-detail rendering based on map zoom level
- Implement route segment clustering for distant views
- Cache painted route data locally to reduce database queries

### 2. Achievement Checking Performance

- Batch achievement checks to avoid excessive API calls
- Use local caching for achievement progress
- Implement debounced achievement checking for rapid activities

### 3. UI Performance

- Use React.memo for gamification components to prevent unnecessary re-renders
- Implement virtualization for achievement and quest lists
- Optimize animation performance with native driver

## Conclusion

The gamification integration points are designed to seamlessly extend the existing modular MapScreen architecture while adding comprehensive engagement features. The integration maintains the established patterns of custom hooks for state management and component composition for UI, ensuring that the gamification features integrate naturally without disrupting the existing codebase structure.

The integration preserves the single responsibility principle, ensures proper separation of concerns, and provides clear extension points for future enhancements while maintaining the performance optimizations and testing strategies established during the MapScreen refactoring. The gamification system enhances user engagement through achievement tracking, experience progression, and visual feedback while maintaining the core exploration experience of Hero's Path.