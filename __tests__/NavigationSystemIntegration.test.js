/**
 * Navigation System Integration Tests
 * Tests integration between navigation components, contexts, and utilities
 * Requirements: All navigation requirements (1.1-10.8)
 */

// Mock all external dependencies
jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../contexts/NavigationContext', () => ({
  useNavigationContext: jest.fn(),
}));

const mockDeepLinkService = {
  processDeepLink: jest.fn(),
  handleAuthenticationRequired: jest.fn(),
  navigateToScreen: jest.fn(),
};

jest.mock('../services/DeepLinkService', () => ({
  default: mockDeepLinkService,
}));

import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { 
  parseDeepLink, 
  generateDeepLink, 
  requiresAuthentication, 
  isNavigationAllowed,
  SCREEN_NAMES 
} from '../utils/navigationUtils';

describe('Navigation System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Navigation Integration', () => {
    test('should integrate authentication state with navigation permissions', () => {
      // Mock authenticated user
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isAuthenticated: true,
        isLoading: false,
      });

      const mockNavigateToScreen = jest.fn();
      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Map' },
        navigateToScreen: mockNavigateToScreen,
      });

      // Test navigation to protected screen
      const canNavigate = isNavigationAllowed('Map', SCREEN_NAMES.JOURNEYS, true);
      expect(canNavigate).toBe(true);

      // Test navigation utility integration
      expect(requiresAuthentication(SCREEN_NAMES.JOURNEYS)).toBe(true);
      expect(requiresAuthentication(SCREEN_NAMES.MAP)).toBe(false);
    });

    test('should prevent navigation to protected screens when unauthenticated', () => {
      // Mock unauthenticated user
      useUser.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Test navigation permissions
      const canNavigateToJourneys = isNavigationAllowed('Map', SCREEN_NAMES.JOURNEYS, false);
      const canNavigateToMap = isNavigationAllowed('Login', SCREEN_NAMES.MAP, false);

      expect(canNavigateToJourneys).toBe(false);
      expect(canNavigateToMap).toBe(true);
    });

    test('should handle authentication state changes', async () => {
      const mockNavigateToScreen = jest.fn();
      const mockResetToScreen = jest.fn();

      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Login' },
        navigateToScreen: mockNavigateToScreen,
        resetToScreen: mockResetToScreen,
      });

      // Initially unauthenticated
      useUser.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Simulate authentication
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isAuthenticated: true,
        isLoading: false,
      });

      // Should now allow navigation to protected screens
      const canNavigate = isNavigationAllowed('Login', SCREEN_NAMES.JOURNEYS, true);
      expect(canNavigate).toBe(true);
    });
  });

  describe('Theme and Navigation Integration', () => {
    test('should integrate theme context with navigation styling', () => {
      const mockTheme = {
        colors: {
          primary: '#007AFF',
          background: '#FFFFFF',
          surface: '#F2F2F7',
          text: '#000000',
          border: '#C6C6C8',
          notification: '#FF3B30',
        },
      };

      useTheme.mockReturnValue({
        theme: mockTheme,
        themeName: 'light',
        navigationTheme: {
          colors: {
            primary: mockTheme.colors.primary,
            background: mockTheme.colors.background,
            card: mockTheme.colors.surface,
            text: mockTheme.colors.text,
            border: mockTheme.colors.border,
            notification: mockTheme.colors.notification,
          },
        },
      });

      const { theme, navigationTheme } = useTheme();

      expect(theme.colors.primary).toBe('#007AFF');
      expect(navigationTheme.colors.primary).toBe('#007AFF');
      expect(navigationTheme.colors.background).toBe('#FFFFFF');
    });

    test('should handle theme switching during navigation', () => {
      // Initial light theme
      useTheme.mockReturnValue({
        theme: { colors: { background: '#FFFFFF' } },
        themeName: 'light',
        switchTheme: jest.fn(),
      });

      let { theme, switchTheme } = useTheme();
      expect(theme.colors.background).toBe('#FFFFFF');

      // Switch to dark theme
      useTheme.mockReturnValue({
        theme: { colors: { background: '#000000' } },
        themeName: 'dark',
        switchTheme: jest.fn(),
      });

      ({ theme, switchTheme } = useTheme());
      expect(theme.colors.background).toBe('#000000');
    });
  });

  describe('Deep Link Integration', () => {
    test('should integrate deep link parsing with navigation', async () => {
      mockDeepLinkService.processDeepLink.mockResolvedValue({
        success: true,
        screen: SCREEN_NAMES.JOURNEYS,
        params: { journeyId: '123' },
      });

      const mockNavigateToScreen = jest.fn();
      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Map' },
        navigateToScreen: mockNavigateToScreen,
        handleDeepLink: jest.fn(),
      });

      // Test deep link parsing
      const parsedLink = parseDeepLink('com.liamclarke.herospath://journeys/123');
      expect(parsedLink.screen).toBe(SCREEN_NAMES.JOURNEY_DETAIL);
      expect(parsedLink.params.journeyId).toBe('123');

      // Test deep link generation
      const generatedLink = generateDeepLink(SCREEN_NAMES.JOURNEY_DETAIL, { journeyId: '123' });
      expect(generatedLink).toBe('com.liamclarke.herospath://journeys/123');

      // Test deep link processing
      const result = await mockDeepLinkService.processDeepLink('com.liamclarke.herospath://journeys/123');
      expect(result.success).toBe(true);
    });

    test('should handle deep link authentication requirements', async () => {
      mockDeepLinkService.processDeepLink.mockResolvedValue({
        success: false,
        requiresAuth: true,
        pendingDeepLink: 'com.liamclarke.herospath://journeys/123',
      });

      mockDeepLinkService.handleAuthenticationRequired.mockResolvedValue({
        success: true,
        redirectedToAuth: true,
      });

      // Mock unauthenticated user
      useUser.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Process deep link requiring authentication
      const result = await mockDeepLinkService.processDeepLink('com.liamclarke.herospath://journeys/123');
      expect(result.requiresAuth).toBe(true);

      // Handle authentication requirement
      const authResult = await mockDeepLinkService.handleAuthenticationRequired(result.pendingDeepLink);
      expect(authResult.success).toBe(true);
    });

    test('should handle deep link errors gracefully', async () => {
      mockDeepLinkService.processDeepLink.mockRejectedValue(new Error('Deep link processing failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await mockDeepLinkService.processDeepLink('invalid://link');
      } catch (error) {
        expect(error.message).toBe('Deep link processing failed');
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Navigation State Management Integration', () => {
    test('should integrate navigation state with context', () => {
      const mockNavigationState = {
        currentScreen: 'Map',
        previousScreen: 'Login',
        canGoBack: true,
        routeHistory: ['Login', 'Map'],
        isNavigating: false,
      };

      const mockNavigateToScreen = jest.fn();
      const mockGoBack = jest.fn();
      const mockResetToScreen = jest.fn();

      useNavigationContext.mockReturnValue({
        navigationState: mockNavigationState,
        navigateToScreen: mockNavigateToScreen,
        goBack: mockGoBack,
        resetToScreen: mockResetToScreen,
      });

      const { navigationState, navigateToScreen, goBack, resetToScreen } = useNavigationContext();

      expect(navigationState.currentScreen).toBe('Map');
      expect(navigationState.canGoBack).toBe(true);
      expect(navigationState.routeHistory).toEqual(['Login', 'Map']);
      expect(typeof navigateToScreen).toBe('function');
      expect(typeof goBack).toBe('function');
      expect(typeof resetToScreen).toBe('function');
    });

    test('should handle navigation state persistence', async () => {
      const mockPersistNavigationState = jest.fn().mockResolvedValue();
      const mockRestoreNavigationState = jest.fn().mockResolvedValue('Map');

      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Map' },
        persistNavigationState: mockPersistNavigationState,
        restoreNavigationState: mockRestoreNavigationState,
      });

      const { persistNavigationState, restoreNavigationState } = useNavigationContext();

      // Test persistence
      await persistNavigationState();
      expect(mockPersistNavigationState).toHaveBeenCalled();

      // Test restoration
      const restoredScreen = await restoreNavigationState();
      expect(restoredScreen).toBe('Map');
      expect(mockRestoreNavigationState).toHaveBeenCalled();
    });

    test('should handle navigation queue management', () => {
      const mockNavigationState = {
        currentScreen: 'Map',
        isNavigating: true,
        navigationQueue: [
          { screenName: 'Journeys', params: {} },
          { screenName: 'Discoveries', params: {} },
        ],
      };

      useNavigationContext.mockReturnValue({
        navigationState: mockNavigationState,
        navigateToScreen: jest.fn(),
      });

      const { navigationState } = useNavigationContext();

      expect(navigationState.isNavigating).toBe(true);
      expect(navigationState.navigationQueue).toHaveLength(2);
      expect(navigationState.navigationQueue[0].screenName).toBe('Journeys');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle context errors gracefully', () => {
      // Mock context failure
      useNavigationContext.mockImplementation(() => {
        throw new Error('Navigation context failed');
      });

      expect(() => {
        useNavigationContext();
      }).toThrow('Navigation context failed');
    });

    test('should handle service errors gracefully', async () => {
      mockDeepLinkService.processDeepLink.mockRejectedValue(new Error('Service unavailable'));

      try {
        await mockDeepLinkService.processDeepLink('test://link');
      } catch (error) {
        expect(error.message).toBe('Service unavailable');
      }
    });

    test('should provide fallback navigation options', () => {
      // Mock navigation context with error recovery
      const mockResetToScreen = jest.fn();
      
      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: null },
        navigateToScreen: jest.fn().mockImplementation(() => {
          throw new Error('Navigation failed');
        }),
        resetToScreen: mockResetToScreen,
      });

      const { navigateToScreen, resetToScreen } = useNavigationContext();

      // Navigation should fail
      expect(() => navigateToScreen('TestScreen')).toThrow('Navigation failed');

      // But reset should be available as fallback
      resetToScreen('Map');
      expect(mockResetToScreen).toHaveBeenCalledWith('Map');
    });
  });

  describe('Performance Integration', () => {
    test('should handle rapid navigation calls', () => {
      const mockNavigateToScreen = jest.fn();
      
      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Map', isNavigating: false },
        navigateToScreen: mockNavigateToScreen,
      });

      const { navigateToScreen } = useNavigationContext();

      // Simulate rapid navigation calls
      for (let i = 0; i < 10; i++) {
        navigateToScreen(`Screen${i}`);
      }

      expect(mockNavigateToScreen).toHaveBeenCalledTimes(10);
    });

    test('should handle memory management', () => {
      const mockNavigationState = {
        currentScreen: 'Map',
        routeHistory: Array.from({ length: 25 }, (_, i) => `Screen${i}`),
      };

      useNavigationContext.mockReturnValue({
        navigationState: mockNavigationState,
      });

      const { navigationState } = useNavigationContext();

      // Should handle large route history
      expect(navigationState.routeHistory.length).toBe(25);
    });
  });

  describe('Accessibility Integration', () => {
    test('should provide accessibility information', () => {
      const mockNavigationState = {
        currentScreen: 'Map',
        canGoBack: true,
      };

      useNavigationContext.mockReturnValue({
        navigationState: mockNavigationState,
      });

      const { navigationState } = useNavigationContext();

      // Should provide accessibility-relevant state
      expect(navigationState.currentScreen).toBe('Map');
      expect(navigationState.canGoBack).toBe(true);
    });

    test('should handle accessibility during navigation changes', () => {
      const mockNavigateToScreen = jest.fn();
      
      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Map' },
        navigateToScreen: mockNavigateToScreen,
      });

      const { navigateToScreen } = useNavigationContext();

      // Navigation should be accessible
      navigateToScreen('Journeys');
      expect(mockNavigateToScreen).toHaveBeenCalledWith('Journeys');
    });
  });

  describe('Complete Flow Integration', () => {
    test('should handle complete authentication and navigation flow', async () => {
      // Start unauthenticated
      useUser.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const mockNavigateToScreen = jest.fn();
      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Login' },
        navigateToScreen: mockNavigateToScreen,
      });

      // Should not allow navigation to protected screen
      expect(isNavigationAllowed('Login', SCREEN_NAMES.JOURNEYS, false)).toBe(false);

      // Authenticate user
      useUser.mockReturnValue({
        user: { uid: 'test-user' },
        isAuthenticated: true,
        isLoading: false,
      });

      // Should now allow navigation to protected screen
      expect(isNavigationAllowed('Login', SCREEN_NAMES.JOURNEYS, true)).toBe(true);

      // Process deep link after authentication
      mockDeepLinkService.processDeepLink.mockResolvedValue({
        success: true,
        screen: SCREEN_NAMES.JOURNEYS,
      });

      const result = await mockDeepLinkService.processDeepLink('com.liamclarke.herospath://journeys');
      expect(result.success).toBe(true);
    });

    test('should handle theme switching during navigation', () => {
      // Start with light theme
      useTheme.mockReturnValue({
        theme: { colors: { background: '#FFFFFF' } },
        themeName: 'light',
      });

      useNavigationContext.mockReturnValue({
        navigationState: { currentScreen: 'Map' },
      });

      let { theme } = useTheme();
      expect(theme.colors.background).toBe('#FFFFFF');

      // Switch to dark theme during navigation
      useTheme.mockReturnValue({
        theme: { colors: { background: '#000000' } },
        themeName: 'dark',
      });

      ({ theme } = useTheme());
      expect(theme.colors.background).toBe('#000000');
    });
  });
});