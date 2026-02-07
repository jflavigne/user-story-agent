/**
 * Lightweight logging utility for the User Story Agent
 *
 * Features:
 * - Level-based filtering (silent, error, warn, info, debug)
 * - ISO8601 timestamps (date + time + Z, sortable)
 * - Token and timing accumulation for API calls
 * - All output to stderr (keeps stdout clean for data)
 * - Zero external dependencies
 */

/**
 * Log levels in order of verbosity
 */
export enum LogLevel {
  Silent = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

/**
 * Map of log level names to enum values
 */
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  silent: LogLevel.Silent,
  error: LogLevel.Error,
  warn: LogLevel.Warn,
  info: LogLevel.Info,
  debug: LogLevel.Debug,
};

/**
 * Token usage statistics for a session
 */
export interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalCalls: number;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level: LogLevel;
}

/**
 * Singleton logger instance for the application
 */
class Logger {
  private level: LogLevel = LogLevel.Info;
  private sessionStartTime: number | null = null;
  private tokenStats: TokenStats = {
    inputTokens: 0,
    outputTokens: 0,
    totalCalls: 0,
  };

  /**
   * Formats the current timestamp for log output (ISO8601, sortable)
   */
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Formats a log message with timestamp and level
   */
  private formatMessage(level: string, message: string): string {
    return `[${this.formatTimestamp()}] [${level}] ${message}`;
  }

  /**
   * Sets the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Gets the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Parses a log level from string (env var or CLI arg)
   */
  parseLevel(levelStr: string): LogLevel {
    const normalized = levelStr.toLowerCase().trim();
    return LOG_LEVEL_MAP[normalized] ?? LogLevel.Info;
  }

  /**
   * Starts a new session timer
   */
  startSession(): void {
    this.sessionStartTime = Date.now();
    this.tokenStats = { inputTokens: 0, outputTokens: 0, totalCalls: 0 };
    this.info('Session started');
  }

  /**
   * Ends the session and logs summary
   */
  endSession(): void {
    if (this.sessionStartTime !== null) {
      const durationMs = Date.now() - this.sessionStartTime;
      const durationSec = (durationMs / 1000).toFixed(2);
      this.info(
        `Session ended (${durationSec}s, ${this.tokenStats.totalCalls} API calls, ` +
          `${this.tokenStats.inputTokens} in / ${this.tokenStats.outputTokens} out tokens)`
      );
    }
    this.sessionStartTime = null;
  }

  /**
   * Accumulates token usage from an API call
   */
  addTokenUsage(inputTokens: number, outputTokens: number): void {
    this.tokenStats.inputTokens += inputTokens;
    this.tokenStats.outputTokens += outputTokens;
    this.tokenStats.totalCalls += 1;
  }

  /**
   * Gets the current token statistics
   */
  getTokenStats(): TokenStats {
    return { ...this.tokenStats };
  }

  /**
   * Logs an error message (level 1)
   */
  error(message: string): void {
    if (this.level >= LogLevel.Error) {
      console.error(this.formatMessage('ERROR', message));
    }
  }

  /**
   * Logs a warning message (level 2)
   */
  warn(message: string): void {
    if (this.level >= LogLevel.Warn) {
      console.error(this.formatMessage('WARN', message));
    }
  }

  /**
   * Logs an info message (level 3)
   */
  info(message: string): void {
    if (this.level >= LogLevel.Info) {
      console.error(this.formatMessage('INFO', message));
    }
  }

  /**
   * Logs a debug message (level 4)
   */
  debug(message: string): void {
    if (this.level >= LogLevel.Debug) {
      console.error(this.formatMessage('DEBUG', message));
    }
  }

  /**
   * Checks if a given level would be logged
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.level >= level;
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Initialize logger from environment and/or CLI flags
 *
 * Priority (highest to lowest):
 * 1. Explicit level parameter
 * 2. LOG_LEVEL environment variable
 * 3. Default (Info)
 */
export function initializeLogger(options?: {
  level?: LogLevel;
  verbose?: boolean;
  debug?: boolean;
  quiet?: boolean;
}): void {
  let level = LogLevel.Info;

  // Check environment variable
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel) {
    level = logger.parseLevel(envLevel);
  }

  // CLI flags override environment
  if (options?.quiet) {
    level = LogLevel.Error;
  } else if (options?.debug) {
    level = LogLevel.Debug;
  } else if (options?.verbose) {
    level = LogLevel.Info;
  }

  // Explicit level overrides everything
  if (options?.level !== undefined) {
    level = options.level;
  }

  logger.setLevel(level);
}
