/**
 * Unit tests for model-utils.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseModelDate,
  warnIfModelsStale,
  getModelIdsFromConfig,
} from '../../src/agent/model-utils.js';
import { logger } from '../../src/utils/logger.js';

describe('model-utils', () => {
  describe('parseModelDate', () => {
    it('extracts date from claude-opus-4-20250514', () => {
      const date = parseModelDate('claude-opus-4-20250514');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(4); // 0-indexed, May = 4
      expect(date!.getDate()).toBe(14);
    });

    it('extracts date from claude-3-5-haiku-20241022', () => {
      const date = parseModelDate('claude-3-5-haiku-20241022');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(9); // October = 9
      expect(date!.getDate()).toBe(22);
    });

    it('returns null for model IDs without date suffix', () => {
      expect(parseModelDate('claude-opus-4-latest')).toBeNull();
      expect(parseModelDate('claude-sonnet')).toBeNull();
      expect(parseModelDate('')).toBeNull();
    });

    it('returns null for invalid date in suffix', () => {
      // 20251399 is invalid (month 13, day 99)
      const date = parseModelDate('claude-opus-4-20251399');
      expect(date).toBeNull();
    });
  });

  describe('getModelIdsFromConfig', () => {
    it('returns unique model IDs from config', () => {
      const config = {
        discovery: 'claude-opus-4-20250514',
        iteration: 'claude-3-5-haiku-20241022',
        judge: 'claude-opus-4-20250514',
      };
      const ids = getModelIdsFromConfig(config);
      expect(ids).toHaveLength(2);
      expect(ids).toContain('claude-opus-4-20250514');
      expect(ids).toContain('claude-3-5-haiku-20241022');
    });

    it('returns empty array for empty config', () => {
      expect(getModelIdsFromConfig({})).toEqual([]);
    });

    it('ignores undefined and empty string values', () => {
      const config = {
        discovery: 'claude-opus-4-20250514',
        iteration: undefined,
        judge: '',
      };
      const ids = getModelIdsFromConfig(config);
      expect(ids).toEqual(['claude-opus-4-20250514']);
    });
  });

  describe('warnIfModelsStale', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    });

    it('warns for model older than maxAgeMonths', () => {
      // 2020-01-01 is >6 months old
      warnIfModelsStale(['claude-opus-4-20200101'], 6);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('claude-opus-4-20200101')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('months old')
      );
    });

    it('does not warn for model IDs without date suffix', () => {
      warnIfModelsStale(['claude-opus-4-latest'], 6);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for recent model when maxAgeMonths is large', () => {
      // 2025-05-14 with maxAgeMonths=24 would not warn in Feb 2026
      // Use a future date to ensure no warning regardless of test run date
      warnIfModelsStale(['claude-opus-4-20300101'], 6);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('uses default maxAgeMonths of 6', () => {
      warnIfModelsStale(['claude-opus-4-20200101']);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
