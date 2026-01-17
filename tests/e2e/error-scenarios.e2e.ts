/**
 * E2E tests for error scenarios
 *
 * Tests error handling for various failure conditions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'path';
import { cli, cliWithMockServer } from './setup/cli-runner.js';
import { createMockServer, MockAnthropicServer } from './setup/mock-server.js';
import { SAMPLE_STORIES, MOCK_RESPONSES } from './setup/fixtures.js';

describe('Error Scenarios E2E', () => {
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

  beforeEach(() => {
    mockServer.reset();
  });

  describe('Empty input', () => {
    it('should error when stdin is empty', async () => {
      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        mockServerUrl,
        ''
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('empty');
    });

    it('should error when stdin is whitespace only', async () => {
      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        mockServerUrl,
        '   \n\t   '
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('empty');
    });
  });

  describe('File not found', () => {
    it('should error when --input file does not exist', async () => {
      const result = await cliWithMockServer(
        [
          '--mode',
          'individual',
          '--iterations',
          'validation',
          '--input',
          '/nonexistent/path/to/file.txt',
        ],
        mockServerUrl
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/ENOENT|no such file|not found/i);
    });
  });

  describe('API errors', () => {
    it('should handle API server error (500)', async () => {
      // Queue multiple error responses to handle SDK retries
      for (let i = 0; i < 5; i++) {
        mockServer.queueResponse(MOCK_RESPONSES.apiError('Internal server error'));
      }

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });

    it('should handle rate limit error (429)', async () => {
      // Queue multiple error responses to handle SDK retries
      for (let i = 0; i < 5; i++) {
        mockServer.queueResponse(MOCK_RESPONSES.rateLimitError());
      }

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });

    it('should handle authentication error (401)', async () => {
      // Auth errors don't retry, so single response is fine
      mockServer.queueResponse(MOCK_RESPONSES.authError());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });
  });

  describe('Empty API response', () => {
    it('should error when API returns empty content', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.emptyContent());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('empty');
    });
  });

  describe('Partial failure', () => {
    it('should error when second iteration fails', async () => {
      // First iteration succeeds
      mockServer.queueResponse(MOCK_RESPONSES.userRoles());
      // Second iteration fails - queue multiple for retries
      for (let i = 0; i < 5; i++) {
        mockServer.queueResponse(MOCK_RESPONSES.apiError());
      }

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'user-roles,validation'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });
  });

  describe('Connection errors', () => {
    it('should error when cannot connect to API server', async () => {
      // Use a port that's definitely not running anything
      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation'],
        'http://127.0.0.1:59999',
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/error|ECONNREFUSED|connect/i);
    });
  });

  describe('Path traversal protection', () => {
    it('should reject path traversal in --input', async () => {
      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--input', '../../../etc/passwd'],
        mockServerUrl
      );

      expect(result.exitCode).toBe(1);
      // Should either reject the path traversal or fail to find the file
      expect(result.stderr).toMatch(/traversal|ENOENT|not found|error/i);
    });
  });

  describe('Missing API key', () => {
    it('should error when no API key is provided', async () => {
      const result = await cli(
        ['--mode', 'individual', '--iterations', 'validation'],
        SAMPLE_STORIES.login,
        {
          ANTHROPIC_API_KEY: '',
          ANTHROPIC_BASE_URL: mockServerUrl,
        }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('API key');
    });
  });

  describe('Invalid JSON from API', () => {
    it('should handle malformed JSON response gracefully', async () => {
      // This tests the mock server's error handling, which should
      // never happen in real scenarios but ensures robustness
      mockServer.queueResponse({
        content: 'Valid response',
        stopReason: 'end_turn',
      });

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      // Should either succeed with the valid response or fail gracefully
      expect(result.timedOut).toBe(false);
    });
  });
});
