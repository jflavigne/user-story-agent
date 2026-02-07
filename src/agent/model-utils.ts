/**
 * Model utilities for version pinning and staleness checks.
 */

import { logger } from '../utils/logger.js';
import type { ModelConfig } from './types.js';

/** Regex to extract YYYYMMDD from model IDs like claude-opus-4-20250514 */
const MODEL_DATE_PATTERN = /(\d{8})$/;

/**
 * Parses the date from a model ID if it contains a YYYYMMDD suffix.
 *
 * @param modelId - Model ID (e.g. claude-opus-4-20250514, claude-3-5-haiku-20241022)
 * @returns Parsed date or null if no date suffix
 */
export function parseModelDate(modelId: string): Date | null {
  const match = modelId.match(MODEL_DATE_PATTERN);
  if (!match) return null;
  const yyyymmdd = match[1];
  const year = parseInt(yyyymmdd.slice(0, 4), 10);
  const month = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
  const day = parseInt(yyyymmdd.slice(6, 8), 10);
  const date = new Date(year, month, day);
  if (isNaN(date.getTime()) || date.getFullYear() !== year) return null;
  return date;
}

/**
 * Logs a warning for each model ID older than maxAgeMonths.
 * Only checks model IDs that contain a parseable YYYYMMDD date.
 *
 * @param modelIds - Model IDs to check
 * @param maxAgeMonths - Maximum age in months before warning (default: 6)
 */
export function warnIfModelsStale(
  modelIds: string[],
  maxAgeMonths: number = 6
): void {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - maxAgeMonths);

  for (const id of modelIds) {
    const date = parseModelDate(id);
    if (date && date < cutoff) {
      const monthsOld = Math.round(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      logger.warn(
        `Model ${id} is ~${monthsOld} months old. Consider updating quality presets in src/agent/types.ts.`
      );
    }
  }
}

/**
 * Collects unique model IDs from a ModelConfig.
 */
export function getModelIdsFromConfig(config: ModelConfig): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(config)) {
    if (typeof value === 'string' && value.length > 0) {
      ids.add(value);
    }
  }
  return [...ids];
}
