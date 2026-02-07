/**
 * Integration test: CLI exits non-zero when evaluator crashes (strict mode).
 * Verifies AUDIT-002 acceptance criterion: "verify CLI exits non-zero".
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cliWithMockServer } from '../e2e/setup/cli-runner.js';
import { createMockServer } from '../e2e/setup/mock-server.js';
import { MOCK_RESPONSES, SAMPLE_STORIES } from '../e2e/setup/fixtures.js';

describe('evaluator exit code', () => {
  let mockServer: MockAnthropicServer;
  let mockServerUrl: string;

  beforeAll(async () => {
    const { server, url } = await createMockServer();
    mockServer = server;
    mockServerUrl = url;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('CLI exits 1 when evaluator crashes with --verify', async () => {
    mockServer.queueResponses([
      MOCK_RESPONSES.simple('Enhanced story'),
      MOCK_RESPONSES.apiError('API rate limit exceeded'),
    ]);

    const result = await cliWithMockServer(
      ['--mode', 'individual', '--iterations', 'validation', '--verify', '--quiet'],
      mockServerUrl,
      SAMPLE_STORIES.login
    );

    expect(result.exitCode).toBe(1);
  });
});
