/**
 * Vitest configuration for E2E tests
 *
 * Separate config for E2E tests with longer timeouts and sequential execution.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only include E2E tests
    include: ['tests/e2e/**/*.e2e.ts'],

    // Exclude unit tests
    exclude: ['tests/**/*.test.ts', 'node_modules'],

    // Run tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Longer timeouts for subprocess execution
    testTimeout: 60000,
    hookTimeout: 30000,

    // Environment
    environment: 'node',

    // Globals
    globals: true,

    // Reporter
    reporters: ['verbose'],

    // Fail fast
    bail: 1,
  },
});
