/**
 * Configuration utilities for the UserStoryAgent
 */

import type { UserStoryAgentConfig } from './types.js';

/**
 * Default model to use for Claude API calls
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Environment variable name for the Anthropic API key
 */
const API_KEY_ENV_VAR = 'ANTHROPIC_API_KEY';

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
    model: partial.model ?? DEFAULT_MODEL,
    onIterationSelection: partial.onIterationSelection,
  };

  return merged;
}
