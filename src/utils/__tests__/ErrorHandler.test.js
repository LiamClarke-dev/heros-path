import { ErrorHandler, AppError, ERROR_TYPES } from '../ErrorHandler';

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', ERROR_TYPES.NETWORK);
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ERROR_TYPES.NETWORK);
      expect(error.name).toBe('AppError');
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('handleAuthError', () => {
    it('should handle generic auth errors', () => {
      const originalError = new Error('Auth failed');
      const appError = ErrorHandler.handleAuthError(originalError);

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.type).toBe(ERROR_TYPES.AUTHENTICATION);
      expect(appError.originalError).toBe(originalError);
    });

    it('should handle specific Firebase auth error codes', () => {
      const firebaseError = {
        code: 'auth/user-cancelled',
        message: 'User cancelled',
      };
      const appError = ErrorHandler.handleAuthError(firebaseError);

      expect(appError.message).toContain('cancelled');
      expect(appError.type).toBe(ERROR_TYPES.AUTHENTICATION);
    });

    it('should handle network auth errors', () => {
      const networkError = { code: 'auth/network-request-failed' };
      const appError = ErrorHandler.handleAuthError(networkError);

      expect(appError.type).toBe(ERROR_TYPES.NETWORK);
    });
  });

  describe('handleLocationError', () => {
    it('should handle generic location errors', () => {
      const originalError = new Error('Location failed');
      const appError = ErrorHandler.handleLocationError(originalError);

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.type).toBe(ERROR_TYPES.LOCATION);
    });

    it('should handle permission denied errors', () => {
      const permissionError = { code: 'E_LOCATION_PERMISSION_DENIED' };
      const appError = ErrorHandler.handleLocationError(permissionError);

      expect(appError.type).toBe(ERROR_TYPES.PERMISSION);
      expect(appError.message).toContain('permission');
    });
  });

  describe('handleNetworkError', () => {
    it('should handle network errors with response', () => {
      const networkError = {
        response: { status: 404 },
        message: 'Not found',
      };
      const appError = ErrorHandler.handleNetworkError(networkError);

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.type).toBe(ERROR_TYPES.NETWORK);
      expect(appError.message).toContain('not found');
    });

    it('should handle 401 errors as authentication', () => {
      const authError = { response: { status: 401 } };
      const appError = ErrorHandler.handleNetworkError(authError);

      expect(appError.type).toBe(ERROR_TYPES.AUTHENTICATION);
    });
  });

  describe('handleValidationError', () => {
    it('should create validation errors', () => {
      const appError = ErrorHandler.handleValidationError(
        'email',
        'Invalid format'
      );

      expect(appError).toBeInstanceOf(AppError);
      expect(appError.type).toBe(ERROR_TYPES.VALIDATION);
      expect(appError.message).toBe('email: Invalid format');
    });
  });

  describe('getUserMessage', () => {
    it('should return AppError message for AppError instances', () => {
      const appError = new AppError('Custom message');
      const message = ErrorHandler.getUserMessage(appError);

      expect(message).toBe('Custom message');
    });

    it('should return generic message for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const message = ErrorHandler.getUserMessage(unknownError);

      expect(message).toBe('Something went wrong. Please try again.');
    });

    it('should handle network-related error messages', () => {
      const networkError = new Error('Network connection failed');
      const message = ErrorHandler.getUserMessage(networkError);

      expect(message).toBe(
        'Network connection error. Please check your internet connection.'
      );
    });
  });
});
