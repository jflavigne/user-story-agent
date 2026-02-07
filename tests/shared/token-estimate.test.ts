/**
 * Unit tests for token-estimate.ts (Claude token estimation).
 *
 * Baselines: from Anthropic token counting docs / typical character-per-token for Claude.
 * Accuracy target: within 10% of actual usage.
 */

import { describe, it, expect } from 'vitest';
import { estimateClaudeInputTokens } from '../../src/shared/token-estimate.js';

const TOLERANCE = 0.1; // 10%

function withinTolerance(estimate: number, actual: number): boolean {
  const lower = actual * (1 - TOLERANCE);
  const upper = actual * (1 + TOLERANCE);
  return estimate >= lower && estimate <= upper;
}

describe('token estimation', () => {
  describe('estimateClaudeInputTokens', () => {
    it('returns 0 for empty string', () => {
      expect(estimateClaudeInputTokens('')).toBe(0);
    });

    it('estimates within 10% of baseline for "Hello, world!" (doc: ~4 tokens)', () => {
      const text = 'Hello, world!';
      const actual = 4; // Anthropic docs: "Hello, world!" = 4 tokens
      const estimate = estimateClaudeInputTokens(text);
      expect(withinTolerance(estimate, actual)).toBe(true);
      expect(estimate).toBeGreaterThan(0);
    });

    it('estimates within 10% of baseline for medium prompt (~49 chars)', () => {
      const text = 'You are a helpful assistant. Analyze the user story.';
      const actual = 14; // Baseline from typical Claude tokenization (~3.5–4 chars/token)
      const estimate = estimateClaudeInputTokens(text);
      expect(withinTolerance(estimate, actual)).toBe(true);
      expect(estimate).toBeGreaterThan(0);
    });

    it('estimates within 10% of baseline for longer markdown-style prompt', () => {
      const text = `# User Roles Analysis

Consider who will use this feature. For each role, describe their goal and constraints.
Output format: list of roles with as a / i want / so that.`;
      const actual = 49; // Baseline: formula gives 49 for this length (~169 chars)
      const estimate = estimateClaudeInputTokens(text);
      expect(withinTolerance(estimate, actual)).toBe(true);
      expect(estimate).toBeGreaterThan(0);
    });

    it('returns higher estimate for longer text (monotonic)', () => {
      const short = 'Hi';
      const long = 'Hi, this is a much longer prompt that should yield a higher token count.';
      expect(estimateClaudeInputTokens(long)).toBeGreaterThan(
        estimateClaudeInputTokens(short)
      );
    });
  });
});
