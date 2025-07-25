/**
 * Centralized logging utility for Hero's Path
 * Provides consistent logging across the application with different log levels
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor() {
    // Set default log level based on environment
    this.logLevel = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  debug(...args) {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.logLevel <= LOG_LEVELS.INFO) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.logLevel <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.logLevel <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  // Convenience method for logging navigation events
  navigation(action, screen, params = {}) {
    this.debug(`Navigation: ${action} -> ${screen}`, params);
  }

  // Convenience method for logging API calls
  api(method, endpoint, data = {}) {
    this.debug(`API: ${method} ${endpoint}`, data);
  }

  // Convenience method for logging user actions
  userAction(action, data = {}) {
    this.info(`User Action: ${action}`, data);
  }
}

// Export a singleton instance
const logger = new Logger();
export default logger;