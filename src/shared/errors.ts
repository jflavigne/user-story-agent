/**
 * Error hierarchy for the User Story Agent
 *
 * Provides typed error classes for better error handling and classification
 */

/**
 * Base error class for all agent errors
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentError);
    }
  }
}

/**
 * Error representing an API call failure
 */
export class APIError extends AgentError {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean,
    cause?: Error
  ) {
    super(message, `API_${statusCode}`, cause);
    this.name = 'APIError';
  }
}

/**
 * Error representing a validation failure
 */
export class ValidationError extends AgentError {
  constructor(
    message: string,
    public field: string,
    cause?: Error
  ) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error representing a timeout
 */
export class TimeoutError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, 'TIMEOUT', cause);
    this.name = 'TimeoutError';
  }
}
