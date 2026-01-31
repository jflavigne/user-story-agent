/**
 * Unit tests for config.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadConfigFromEnv,
  mergeConfigWithDefaults,
  DEFAULT_MODEL,
} from '../../src/agent/config.js';

describe('Config Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DEFAULT_MODEL', () => {
    it('should be a valid model string', () => {
      expect(DEFAULT_MODEL).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('loadConfigFromEnv', () => {
    it('should return empty config when no env vars set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const config = loadConfigFromEnv();

      expect(config).toEqual({});
    });

    it('should load API key from environment', () => {
      process.env.ANTHROPIC_API_KEY = 'test-env-api-key';
      const config = loadConfigFromEnv();

      expect(config.apiKey).toBe('test-env-api-key');
    });
  });

  describe('mergeConfigWithDefaults', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should apply default mode', () => {
      const config = mergeConfigWithDefaults({});

      expect(config.mode).toBe('individual');
    });

    it('should apply default model', () => {
      const config = mergeConfigWithDefaults({});

      expect(config.model).toBe('balanced');
    });

    it('should override defaults with provided values', () => {
      const config = mergeConfigWithDefaults({
        mode: 'workflow',
        model: 'claude-opus-4',
        apiKey: 'custom-api-key',
      });

      expect(config.mode).toBe('workflow');
      expect(config.model).toBe('claude-opus-4');
      expect(config.apiKey).toBe('custom-api-key');
    });

    it('should use env var for API key when not explicitly provided', () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';

      const config = mergeConfigWithDefaults({
        mode: 'individual',
      });

      expect(config.apiKey).toBe('env-api-key');
    });

    it('should prefer explicit API key over env var', () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';

      const config = mergeConfigWithDefaults({
        apiKey: 'explicit-api-key',
      });

      expect(config.apiKey).toBe('explicit-api-key');
    });

    it('should preserve iterations when provided', () => {
      const config = mergeConfigWithDefaults({
        iterations: ['validation', 'accessibility'],
      });

      expect(config.iterations).toEqual(['validation', 'accessibility']);
    });

    it('should preserve productContext when provided', () => {
      const productContext = {
        productName: 'TestApp',
        productType: 'web',
        clientInfo: 'Client',
        targetAudience: 'Users',
        keyFeatures: [],
        businessContext: 'Context',
      };

      const config = mergeConfigWithDefaults({
        productContext,
      });

      expect(config.productContext).toEqual(productContext);
    });

    it('should preserve onIterationSelection when provided', () => {
      const callback = async () => [];

      const config = mergeConfigWithDefaults({
        mode: 'interactive',
        onIterationSelection: callback,
      });

      expect(config.onIterationSelection).toBe(callback);
    });
  });
});
