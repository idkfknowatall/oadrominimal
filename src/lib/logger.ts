/**
 * Enhanced logging utility with structured logging and different log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class Logger {
  private context: string;
  private isDevelopment: boolean;

  constructor(context: string = 'App') {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, metadata?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private sendToMonitoring(entry: LogEntry): void {
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Placeholder for monitoring service integration
      // Example: Sentry, LogRocket, etc.
      if (entry.level === 'error' && entry.error) {
        // Sentry.captureException(entry.error, { extra: entry.metadata });
      }
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.formatMessage('debug', message, metadata);
    console.debug(`[DEBUG][${this.context}] ${message}`, metadata);
    this.sendToMonitoring(entry);
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    
    const entry = this.formatMessage('info', message, metadata);
    console.log(`[INFO][${this.context}] ${message}`, metadata);
    this.sendToMonitoring(entry);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.formatMessage('warn', message, metadata);
    console.warn(`[WARN][${this.context}] ${message}`, metadata);
    this.sendToMonitoring(entry);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = { ...this.formatMessage('error', message, metadata), error };
    console.error(`[ERROR][${this.context}] ${message}`, { error, ...metadata });
    this.sendToMonitoring(entry);
  }

  withContext(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create context-specific loggers
export const createLogger = (context: string): Logger => new Logger(context);

// Specialized loggers for different parts of the application
export const audioLogger = createLogger('Audio');
export const apiLogger = createLogger('API');
export const uiLogger = createLogger('UI');
export const performanceLogger = createLogger('Performance');