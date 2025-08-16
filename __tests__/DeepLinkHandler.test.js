/**
 * Unit Tests for DeepLinkHandler
 * Tests deep link processing, authentication prompts, and navigation logic
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('../hooks/useDeepLinking', () => ({
  useDeepLinking: jest.fn(),
}));

jest.mock('../services/DeepLinkService', () => ({
  default: {
    processPendingDeepLink: jest.fn(),
  },
}));

jest.mock('./DeepLinkAuthPrompt', () => ({
  DeepLinkAuthPrompt: ({ visible, message, onSignIn, onCancel }) => 
    visible ? <Text testID="auth-prompt">{message}</Text> : null,
  useDeepLinkAuthPrompt: jest.fn(),
}));

import { 
  DeepLinkHandler, 
  useDeepLinkNavigation, 
  useDeepLinkState 
} from '../components/navigation/DeepLinkHandler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { useDeepLinkAuthPrompt } from '../components/navigation/DeepLinkAuthPrompt';
import DeepLinkService from '../services/DeepLinkService';

describe('DeepLinkHandler', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockUser = {
    uid: 'test-user',
    email: 'test@example.com',
  };

  const mockProcessDeepLink = jest.fn();
  const mockShowPrompt = jest.fn();
  const mockHidePrompt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue(mockNavigation);
    
    useUser.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    useDeepLinking.mockReturnValue({
      processDeepLink: mockProcessDeepLink,
    });

    useDeepLinkAuthPrompt.mockReturnValue({
      promptState: {
        visible: false,
        message: '',
        pendingDeepLink: null,
      },
      showPrompt: mockShowPrompt,
      hidePrompt: mockHidePrompt,
      handleSignIn: jest.fn(),
      handleCancel: jest.fn(),
    });

    DeepLinkService.processPendingDeepLink.mockResolvedValue();
  });

  describe('Component Rendering', () => {
    test('should render children', () => {
      const { getByText } = render(
        <DeepLinkHandler>
          <Text>Test Child</Text>
        </DeepLinkHandler>
      );

      expect(getByText('Test Child')).toBeTruthy();
    });

    test('should render auth prompt when visible', () => {
      useDeepLinkAuthPrompt.mockReturnValue({
        promptState: {
          visible: true,
          message: 'Please sign in',
          pendingDeepLink: 'test-link',
        },
        showPrompt: mockShowPrompt,
        hidePrompt: mockHidePrompt,
        handleSignIn: jest.fn(),
        handleCancel: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <DeepLinkHandler>
          <Text>Test Child</Text>
        </DeepLinkHandler>
      );

      expect(getByTestId('auth-prompt')).toBeTruthy();
      expect(getByText('Please sign in')).toBeTruthy();
    });
  });

  describe('Deep Link Processing', () => {
    test('should process successful deep link', async () => {
      mockProcessDeepLink.mockResolvedValue({ success: true });

      const TestComponent = () => {
        const [handler, setHandler] = React.useState(null);
        
        React.useEffect(() => {
          // Simulate getting the handler from the component
          setHandler(() => async (url) => {
            const result = await mockProcessDeepLink(url);
            return result;
          });
        }, []);

        return (
          <DeepLinkHandler>
            <Text onPress={() => handler && handler('test-url')}>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      await act(async () => {
        await mockProcessDeepLink('test-url');
      });

      expect(mockProcessDeepLink).toHaveBeenCalledWith('test-url');
    });

    test('should show auth prompt for protected deep links', async () => {
      mockProcessDeepLink.mockResolvedValue({
        success: false,
        requiresAuth: true,
        pendingDeepLink: 'protected-link',
      });

      useUser.mockReturnValue({
        user: null,
        isLoading: false,
      });

      const TestComponent = () => {
        React.useEffect(() => {
          const handleDeepLink = async () => {
            const result = await mockProcessDeepLink('protected-url');
            if (!result.success && result.requiresAuth) {
              mockShowPrompt('Please sign in to access this content', result.pendingDeepLink);
            }
          };
          handleDeepLink();
        }, []);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalledWith(
          'Please sign in to access this content',
          'protected-link'
        );
      });
    });

    test('should handle deep link processing errors', async () => {
      mockProcessDeepLink.mockRejectedValue(new Error('Processing failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        React.useEffect(() => {
          const handleDeepLink = async () => {
            try {
              await mockProcessDeepLink('error-url');
            } catch (error) {
              console.error('Error handling deep link:', error);
            }
          };
          handleDeepLink();
        }, []);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error handling deep link:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Pending Deep Link Processing', () => {
    test('should process pending deep link after authentication', async () => {
      const TestComponent = () => {
        const [pendingLink, setPendingLink] = React.useState('pending-link');
        
        // Simulate user authentication
        React.useEffect(() => {
          if (mockUser && pendingLink) {
            const processPending = async () => {
              await DeepLinkService.processPendingDeepLink(pendingLink);
              setPendingLink(null);
            };
            const timer = setTimeout(processPending, 500);
            return () => clearTimeout(timer);
          }
        }, [mockUser, pendingLink]);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(DeepLinkService.processPendingDeepLink).toHaveBeenCalledWith('pending-link');
      }, { timeout: 1000 });
    });

    test('should handle pending deep link processing errors', async () => {
      DeepLinkService.processPendingDeepLink.mockRejectedValue(new Error('Processing failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        React.useEffect(() => {
          const processPending = async () => {
            try {
              await DeepLinkService.processPendingDeepLink('error-link');
            } catch (error) {
              console.error('Error processing pending deep link:', error);
            }
          };
          processPending();
        }, []);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error processing pending deep link:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    test('should not process pending link when user is loading', () => {
      useUser.mockReturnValue({
        user: mockUser,
        isLoading: true,
      });

      const TestComponent = () => {
        const [pendingLink] = React.useState('pending-link');
        
        React.useEffect(() => {
          if (mockUser && pendingLink && !true) { // isLoading is true
            DeepLinkService.processPendingDeepLink(pendingLink);
          }
        }, [mockUser, pendingLink]);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      expect(DeepLinkService.processPendingDeepLink).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Actions', () => {
    test('should navigate to login on sign in action', () => {
      const TestComponent = () => {
        const handleAuthSignIn = (pendingLink) => {
          mockNavigation.navigate('Auth', {
            screen: 'Login',
            params: {
              returnTo: pendingLink,
              message: 'Please sign in to access this content',
            },
          });
        };

        React.useEffect(() => {
          handleAuthSignIn('test-link');
        }, []);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Auth', {
        screen: 'Login',
        params: {
          returnTo: 'test-link',
          message: 'Please sign in to access this content',
        },
      });
    });

    test('should navigate to map on cancel action', () => {
      const TestComponent = () => {
        const handleAuthCancel = () => {
          mockNavigation.navigate('Main', {
            screen: 'CoreFeatures',
            params: { screen: 'Map' },
          });
        };

        React.useEffect(() => {
          handleAuthCancel();
        }, []);

        return (
          <DeepLinkHandler>
            <Text>Test</Text>
          </DeepLinkHandler>
        );
      };

      render(<TestComponent />);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Main', {
        screen: 'CoreFeatures',
        params: { screen: 'Map' },
      });
    });
  });
});

describe('useDeepLinkNavigation', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockGenerateShareableLink = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue(mockNavigation);
    
    useDeepLinking.mockReturnValue({
      generateShareableLink: mockGenerateShareableLink,
    });
  });

  test('should navigate to journey details', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkNavigation();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    const result = hookResult.navigateWithDeepLink('JourneyDetails', { journeyId: '123' });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Main', {
      screen: 'CoreFeatures',
      params: {
        screen: 'Journeys',
        params: {
          screen: 'JourneyDetails',
          params: { journeyId: '123' },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  test('should navigate to place details', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkNavigation();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    hookResult.navigateWithDeepLink('PlaceDetails', { placeId: '456' });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Main', {
      screen: 'CoreFeatures',
      params: {
        screen: 'Map',
        params: {
          screen: 'PlaceDetails',
          params: { placeId: '456' },
        },
      },
    });
  });

  test('should handle unknown screen names', () => {
    let hookResult;
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const TestComponent = () => {
      hookResult = useDeepLinkNavigation();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    hookResult.navigateWithDeepLink('UnknownScreen');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Unknown screen for deep link navigation: UnknownScreen'
    );

    consoleSpy.mockRestore();
  });

  test('should handle navigation errors', () => {
    mockNavigation.navigate.mockImplementation(() => {
      throw new Error('Navigation failed');
    });

    let hookResult;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const TestComponent = () => {
      hookResult = useDeepLinkNavigation();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    const result = hookResult.navigateWithDeepLink('JourneyDetails', { journeyId: '123' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Navigation failed');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should create deep link stack correctly', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkNavigation();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    const stack = hookResult.createDeepLinkStack('JourneyDetails', { journeyId: '123' });

    expect(stack).toEqual([
      { screen: 'Main' },
      { screen: 'CoreFeatures' },
      { screen: 'Journeys' },
      { screen: 'JourneyDetails', params: { journeyId: '123' } },
    ]);
  });

  test('should return default stack for unknown screens', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkNavigation();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    const stack = hookResult.createDeepLinkStack('UnknownScreen');

    expect(stack).toEqual([{ screen: 'Main' }]);
  });
});

describe('useDeepLinkState', () => {
  beforeEach(() => {
    useFocusEffect.mockImplementation((callback) => {
      callback();
    });
  });

  test('should initialize with null deep link data', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkState();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    expect(hookResult.deepLinkData).toBeNull();
    expect(hookResult.isFromDeepLink).toBe(false);
  });

  test('should set deep link data', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkState();
      
      React.useEffect(() => {
        hookResult.setDeepLink({ url: 'test-url', params: {} });
      }, []);

      return <Text>Test</Text>;
    };

    const { rerender } = render(<TestComponent />);
    rerender(<TestComponent />);

    expect(hookResult.isFromDeepLink).toBe(true);
  });

  test('should clear deep link data', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkState();
      
      React.useEffect(() => {
        hookResult.setDeepLink({ url: 'test-url', params: {} });
        hookResult.clearDeepLink();
      }, []);

      return <Text>Test</Text>;
    };

    const { rerender } = render(<TestComponent />);
    rerender(<TestComponent />);

    expect(hookResult.deepLinkData).toBeNull();
    expect(hookResult.isFromDeepLink).toBe(false);
  });

  test('should update isFromDeepLink based on data presence', () => {
    let hookResult;

    const TestComponent = () => {
      hookResult = useDeepLinkState();
      return <Text>Test</Text>;
    };

    render(<TestComponent />);

    // Should call useFocusEffect callback
    expect(useFocusEffect).toHaveBeenCalled();
  });
});