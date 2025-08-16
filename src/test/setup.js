// React Native testing setup
import '@testing-library/jest-native/extend-expect';

// Mock Firebase config for tests
jest.mock(
    '../config/firebase',
    () => ({
        db: 'mocked-db',
        auth: 'mocked-auth',
        app: 'mocked-app',
    }),
    { virtual: true }
);

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    // Uncomment to ignore a specific log level
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    warn: jest.fn(),
    // error: jest.fn(),
};

// Mock React Native modules that might cause issues in tests
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
