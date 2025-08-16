/**
 * Logger utility for Hero's Path
 * Provides centralized logging with different levels and error reporting
 * Requirements: 10.7
 */

class Logger {
  constructor() {
    this.logLevel = __DEV__ ? 'debug' : 'error';
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  /**
   * Log levels in order of severity
   */
  static LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Set the minimum log level
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * Add a log entry
   */
  _addLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    // Add to memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output in development
    if (__DEV__ || Logger.LEVELS[level] >= Logger.LEVELS[this.logLevel]) {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 
                           level === 'info' ? 'info' : 'log';
      
      if (data) {
        console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data);
      } else {
        console[consoleMethod](`[${level.toUpperCase()}] ${message}`);
      }
    }

    return logEntry;
  }

  /**
   * Debug level logging
   */
  debug(message, data = null) {
    return this._addLog('debug', message, data);
  }

  /**
   * Info level logging
   */
  info(message, data = null) {
    return this._addLog('info', message, data);
  }

  /**
   * Warning level logging
   */
  warn(message, data = null) {
    return this._addLog('warn', message, data);
  }

  /**
   * Error level logging
   */
  error(message, data = null) {
    return this._addLog('error', message, data);
  }

  /**
   * Log navigation errors specifically
   */
  navigationError(error, context = {}) {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    this.error('Navigation Error', errorData);
    
    // In production, you might want to send this to a crash reporting service
    // Example: Crashlytics.recordError(error);
    
    return errorData;
  }

  /**
   * Log authentication errors
   */
  authError(error, context = {}) {
    const errorData = {
      name: error.name,
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.error('Authentication Error', errorData);
    return errorData;
  }

  /**
   * Log network errors
   */
  networkError(error, context = {}) {
    const errorData = {
      name: error.name,
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.error('Network Error', errorData);
    return errorData;
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      logLevel: this.logLevel,
      totalLogs: this.logs.length,
      logs: this.logs,
    };
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;