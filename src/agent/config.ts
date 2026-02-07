/**
 * Configuration utilities for the UserStoryAgent
 */

import type { UserStoryAgentConfig } from './types.js';
import { isQualityPreset, validateModelId } from './types.js';

/**
 * Default model to use for Claude API calls
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Environment variable name for the Anthropic API key
 */
const API_KEY_ENV_VAR = 'ANTHROPIC_API_KEY';

/**
 * Environment variable name for stream creation timeout (milliseconds)
 */
const STREAM_TIMEOUT_MS_ENV_VAR = 'STREAM_TIMEOUT_MS';

/**
 * Loads configuration values from environment variables
 *
 * @returns Partial configuration with values from environment
 */
export function loadConfigFromEnv(): Partial<UserStoryAgentConfig> {
  const config: Partial<UserStoryAgentConfig> = {};

  const apiKey = process.env[API_KEY_ENV_VAR];
  if (apiKey) {
    config.apiKey = apiKey;
  }

  const streamTimeoutMs = process.env[STREAM_TIMEOUT_MS_ENV_VAR];
  if (streamTimeoutMs !== undefined) {
    const parsed = parseInt(streamTimeoutMs, 10);
    if (!isNaN(parsed) && parsed > 0) {
      config.streamTimeout = parsed;
    }
  }

  return config;
}

/**
 * Merges a partial configuration with default values
 *
 * @param partial - Partial configuration to merge
 * @returns Complete configuration with defaults applied
 * @throws {Error} If required fields are missing after merge
 */
export function mergeConfigWithDefaults(
  partial: Partial<UserStoryAgentConfig>
): UserStoryAgentConfig {
  // Load environment config as base
  const envConfig = loadConfigFromEnv();

  // Merge: partial overrides env, which overrides defaults
  const merged: UserStoryAgentConfig = {
    mode: partial.mode ?? 'individual',
    iterations: partial.iterations,
    productContext: partial.productContext,
    apiKey: partial.apiKey ?? envConfig.apiKey,
    model: partial.model ?? 'balanced',
    onIterationSelection: partial.onIterationSelection,
    maxRetries: partial.maxRetries ?? 3,
    streaming: partial.streaming,
    streamTimeout: partial.streamTimeout ?? envConfig.streamTimeout ?? 60000,
    verify: partial.verify,
    strictEvaluation: partial.strictEvaluation ?? true,
    claudeClient: partial.claudeClient,
    artifactConfig: partial.artifactConfig,
  };

  if (typeof merged.model === 'string' && !isQualityPreset(merged.model)) {
    validateModelId(merged.model);
  }

  return merged;
}
