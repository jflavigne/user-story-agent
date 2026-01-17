/**
 * Unit tests for retry utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withRetry, type RetryOptions } from '../../src/utils/retry.js';
import { APIError, TimeoutError, ValidationError } from '../../src/shared/errors.js';
import { logger } from '../../src/utils/logger.js';

describe('withRetry', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  // Store original setTimeout before any mocking
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    // Spy on logger.warn to verify retry messages
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  describe('successful operation', () => {
    it('should return result on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
      };

      const result = await withRetry(fn, options);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should work with async functions that return values', async () => {
      const fn = vi.fn().mockResolvedValue({ data: 'test' });
      const options: RetryOptions = {
        maxAttempts: 1,
        baseDelayMs: 100,
        maxDelayMs: 1000,
      };

      const result = await withRetry(fn, options);

      expect(result).toEqual({ data: 'test' });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry on transient failures', () => {
    it('should retry on error and succeed on second attempt', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient error'))
        .mockResolvedValueOnce('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      const result = await withRetry(fn, options);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should retry multiple times until success', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValueOnce('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      const result = await withRetry(fn, options);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff with jitter', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValueOnce('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
      };

      // Capture delays by mocking setTimeout - use original to run callback
      const delays: number[] = [];
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(((
        callback: () => void,
        delay: number
      ) => {
        delays.push(delay);
        // Use queueMicrotask to run callback without re-triggering mock
        queueMicrotask(callback);
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      try {
        await withRetry(fn, options);

        expect(delays.length).toBe(2);
        // First retry: baseDelayMs * 2^0 + jitter = 100 + jitter (0-30)
        expect(delays[0]).toBeGreaterThanOrEqual(100);
        expect(delays[0]).toBeLessThan(130);
        // Second retry: baseDelayMs * 2^1 + jitter = 200 + jitter (0-60)
        expect(delays[1]).toBeGreaterThanOrEqual(200);
        expect(delays[1]).toBeLessThan(260);
      } finally {
        setTimeoutSpy.mockRestore();
      }
    });

    it('should cap delay at maxDelayMs', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10000, // Large base delay
        maxDelayMs: 100, // Small max delay
      };

      const delays: number[] = [];
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(((
        callback: () => void,
        delay: number
      ) => {
        delays.push(delay);
        queueMicrotask(callback);
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      try {
        await withRetry(fn, options);
        expect(delays[0]).toBeLessThanOrEqual(100);
      } finally {
        setTimeoutSpy.mockRestore();
      }
    });
  });

  describe('max retries exceeded', () => {
    it('should throw last error after max attempts', async () => {
      const lastError = new Error('final error');
      const fn = vi.fn().mockRejectedValue(lastError);
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      await expect(withRetry(fn, options)).rejects.toThrow('final error');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledTimes(2); // Warns before retries 2 and 3
    });

    it('should throw with maxAttempts of 1', async () => {
      const error = new Error('immediate failure');
      const fn = vi.fn().mockRejectedValue(error);
      const options: RetryOptions = {
        maxAttempts: 1,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      await expect(withRetry(fn, options)).rejects.toThrow('immediate failure');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled(); // No retries, so no warnings
    });
  });

  describe('non-retryable errors', () => {
    it('should throw immediately if shouldRetry returns false', async () => {
      const error = new ValidationError('invalid input', 'field');
      const fn = vi.fn().mockRejectedValue(error);
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 1000,
        shouldRetry: (err) => {
          return !(err instanceof ValidationError);
        },
      };

      await expect(withRetry(fn, options)).rejects.toThrow('invalid input');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should retry if shouldRetry returns true', async () => {
      const error = new APIError('rate limit', 429, true);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 1000,
        shouldRetry: (err) => {
          return err instanceof APIError && err.retryable;
        },
      };

      const result = await withRetry(fn, options);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should default to retrying if shouldRetry is not provided', async () => {
      const error = new Error('transient error');
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 1000,
        // shouldRetry not provided
      };

      const result = await withRetry(fn, options);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('error types', () => {
    it('should handle APIError', async () => {
      const error = new APIError('API failure', 500, true);
      const fn = vi.fn().mockRejectedValue(error);
      const options: RetryOptions = {
        maxAttempts: 2,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      await expect(withRetry(fn, options)).rejects.toThrow('API failure');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle TimeoutError', async () => {
      const error = new TimeoutError('Request timeout');
      const fn = vi.fn().mockRejectedValue(error);
      const options: RetryOptions = {
        maxAttempts: 2,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      await expect(withRetry(fn, options)).rejects.toThrow('Request timeout');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle generic Error', async () => {
      const error = new Error('generic error');
      const fn = vi.fn().mockRejectedValue(error);
      const options: RetryOptions = {
        maxAttempts: 2,
        baseDelayMs: 10,
        maxDelayMs: 1000,
      };

      await expect(withRetry(fn, options)).rejects.toThrow('generic error');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
