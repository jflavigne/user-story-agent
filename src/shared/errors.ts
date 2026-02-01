/**
 * Error hierarchy for the User Story Agent
 *
 * Provides typed error classes for better error handling and classification.
 *
 * ## Error Code Registry
 *
 * Use ERROR_CODES when constructing AgentError (or pass the code key as string).
 * This keeps codes unique and documented in one place. Refactoring existing
 * call sites to use constants is optional and can be done incrementally.
 *
 * Usage:
 *   throw new AgentError(message, ERROR_CODES.TITLE_GENERATION_API_ERROR, cause);
 *   // or with string (must match a key in ERROR_CODES for consistency):
 *   throw new AgentError(message, 'TITLE_GENERATION_API_ERROR', cause);
 */

/**
 * Error Code Registry
 *
 * Centralized documentation of all error codes used across the application.
 * Use these constants when throwing AgentError so codes stay unique and
 * documented. Values are the code strings passed to AgentError; descriptions
 * are in ERROR_CODE_DESCRIPTIONS. APIError uses dynamic codes `API_<statusCode>`
 * (e.g. API_429) and is not listed here.
 */
export const ERROR_CODES = {
  // Title Generation
  TITLE_GENERATION_API_ERROR: 'TITLE_GENERATION_API_ERROR',
  TITLE_GENERATION_PARSE_ERROR: 'TITLE_GENERATION_PARSE_ERROR',

  // Claude client
  API_ERROR: 'API_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // Standard agent errors (used by ValidationError, TimeoutError)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Human-readable descriptions for each error code (for docs, logs, and tooling).
 * Keys must match ERROR_CODES.
 */
export const ERROR_CODE_DESCRIPTIONS: Record<ErrorCode, string> = {
  TITLE_GENERATION_API_ERROR: 'API call failed during title generation',
  TITLE_GENERATION_PARSE_ERROR: 'Failed to parse LLM response as valid JSON',
  API_ERROR: 'Generic Claude API error (no status code or timeout)',
  UNKNOWN_ERROR: 'Unknown error calling Claude API (non-Error thrown)',
  VALIDATION_ERROR: 'Validation failed for a field or payload',
  TIMEOUT: 'Request or operation timed out',
};

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
