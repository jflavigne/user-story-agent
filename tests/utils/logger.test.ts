/**
 * Unit tests for logger utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogLevel, initializeLogger } from '../../src/utils/logger.js';

describe('Logger', () => {
  const originalEnv = process.env;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.LOG_LEVEL;
    // Reset logger to default state
    logger.setLevel(LogLevel.Info);
    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
  });

  describe('LogLevel', () => {
    it('should have correct level values', () => {
      expect(LogLevel.Silent).toBe(0);
      expect(LogLevel.Error).toBe(1);
      expect(LogLevel.Warn).toBe(2);
      expect(LogLevel.Info).toBe(3);
      expect(LogLevel.Debug).toBe(4);
    });
  });

  describe('setLevel and getLevel', () => {
    it('should set and get log level', () => {
      logger.setLevel(LogLevel.Debug);
      expect(logger.getLevel()).toBe(LogLevel.Debug);

      logger.setLevel(LogLevel.Error);
      expect(logger.getLevel()).toBe(LogLevel.Error);
    });
  });

  describe('parseLevel', () => {
    it('should parse valid level strings', () => {
      expect(logger.parseLevel('silent')).toBe(LogLevel.Silent);
      expect(logger.parseLevel('error')).toBe(LogLevel.Error);
      expect(logger.parseLevel('warn')).toBe(LogLevel.Warn);
      expect(logger.parseLevel('info')).toBe(LogLevel.Info);
      expect(logger.parseLevel('debug')).toBe(LogLevel.Debug);
    });

    it('should be case-insensitive', () => {
      expect(logger.parseLevel('DEBUG')).toBe(LogLevel.Debug);
      expect(logger.parseLevel('Info')).toBe(LogLevel.Info);
      expect(logger.parseLevel('ERROR')).toBe(LogLevel.Error);
    });

    it('should default to Info for unknown levels', () => {
      expect(logger.parseLevel('unknown')).toBe(LogLevel.Info);
      expect(logger.parseLevel('')).toBe(LogLevel.Info);
    });
  });

  describe('level filtering', () => {
    it('should log messages at or below current level', () => {
      logger.setLevel(LogLevel.Info);

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    });

    it('should filter messages above current level', () => {
      logger.setLevel(LogLevel.Warn);

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      // Only error and warn should be logged
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('should log nothing at Silent level', () => {
      logger.setLevel(LogLevel.Silent);

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log everything at Debug level', () => {
      logger.setLevel(LogLevel.Debug);

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('isLevelEnabled', () => {
    it('should return true for enabled levels', () => {
      logger.setLevel(LogLevel.Info);

      expect(logger.isLevelEnabled(LogLevel.Error)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.Warn)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.Info)).toBe(true);
    });

    it('should return false for disabled levels', () => {
      logger.setLevel(LogLevel.Info);

      expect(logger.isLevelEnabled(LogLevel.Debug)).toBe(false);
    });
  });

  describe('message formatting', () => {
    it('should include timestamp and level in output', () => {
      logger.setLevel(LogLevel.Info);
      logger.info('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];

      // Check format: [ISO8601] [LEVEL] message
      expect(output).toMatch(
        /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] test message$/
      );
    });

    it('should use correct level labels', () => {
      logger.setLevel(LogLevel.Debug);

      logger.error('e');
      logger.warn('w');
      logger.info('i');
      logger.debug('d');

      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('[WARN]');
      expect(consoleErrorSpy.mock.calls[2][0]).toContain('[INFO]');
      expect(consoleErrorSpy.mock.calls[3][0]).toContain('[DEBUG]');
    });
  });

  describe('token statistics', () => {
    beforeEach(() => {
      // Reset stats by starting a new session
      logger.startSession();
    });

    it('should accumulate token usage', () => {
      logger.addTokenUsage(100, 50);
      logger.addTokenUsage(200, 75);

      const stats = logger.getTokenStats();
      expect(stats.inputTokens).toBe(300);
      expect(stats.outputTokens).toBe(125);
      expect(stats.totalCalls).toBe(2);
    });

    it('should return a copy of stats', () => {
      logger.addTokenUsage(100, 50);
      const stats = logger.getTokenStats();

      // Modify returned object
      stats.inputTokens = 999;

      // Original should be unchanged
      expect(logger.getTokenStats().inputTokens).toBe(100);
    });
  });

  describe('session tracking', () => {
    it('should log session start and end', () => {
      logger.setLevel(LogLevel.Info);

      logger.startSession();
      logger.addTokenUsage(100, 50);
      logger.endSession();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Session started');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('Session ended');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('1 API calls');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('100 in / 50 out tokens');
    });

    it('should reset stats on session start', () => {
      logger.addTokenUsage(100, 50);
      logger.startSession();

      const stats = logger.getTokenStats();
      expect(stats.inputTokens).toBe(0);
      expect(stats.outputTokens).toBe(0);
      expect(stats.totalCalls).toBe(0);
    });
  });

  describe('initializeLogger', () => {
    it('should use default level when no options', () => {
      initializeLogger();
      expect(logger.getLevel()).toBe(LogLevel.Info);
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      initializeLogger();
      expect(logger.getLevel()).toBe(LogLevel.Debug);
    });

    it('should set Error level with quiet flag', () => {
      initializeLogger({ quiet: true });
      expect(logger.getLevel()).toBe(LogLevel.Error);
    });

    it('should set Debug level with debug flag', () => {
      initializeLogger({ debug: true });
      expect(logger.getLevel()).toBe(LogLevel.Debug);
    });

    it('should set Info level with verbose flag', () => {
      logger.setLevel(LogLevel.Error);
      initializeLogger({ verbose: true });
      expect(logger.getLevel()).toBe(LogLevel.Info);
    });

    it('should prioritize quiet over debug', () => {
      initializeLogger({ quiet: true, debug: true });
      expect(logger.getLevel()).toBe(LogLevel.Error);
    });

    it('should prioritize explicit level over flags', () => {
      initializeLogger({ level: LogLevel.Warn, debug: true });
      expect(logger.getLevel()).toBe(LogLevel.Warn);
    });

    it('should prioritize CLI flags over env var', () => {
      process.env.LOG_LEVEL = 'debug';
      initializeLogger({ quiet: true });
      expect(logger.getLevel()).toBe(LogLevel.Error);
    });
  });
});
