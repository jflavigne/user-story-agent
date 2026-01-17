/**
 * E2E tests for individual mode
 *
 * Tests the CLI in individual mode with mock API server.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { cliWithMockServer } from './setup/cli-runner.js';
import { createMockServer, MockAnthropicServer } from './setup/mock-server.js';
import { SAMPLE_STORIES, MOCK_RESPONSES } from './setup/fixtures.js';

describe('Individual Mode E2E', () => {
  let mockServer: MockAnthropicServer;
  let mockServerUrl: string;
  let tempDir: string;

  beforeAll(async () => {
    // Start mock server
    const { server, url } = await createMockServer();
    mockServer = server;
    mockServerUrl = url;

    // Create temp directory for file tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'user-story-e2e-'));
  });

  afterAll(async () => {
    // Stop mock server
    await mockServer.stop();

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Reset mock server state between tests
    mockServer.reset();
  });

  describe('Single iteration via stdin', () => {
    it('should process a story with validation iteration', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.validation());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Validation Requirements');
      expect(result.stdout).toContain('Email format');
    });

    it('should process a story with user-roles iteration', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.userRoles());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'user-roles', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('User Roles');
      expect(result.stdout).toContain('Guest');
      expect(result.stdout).toContain('Admin');
    });

    it('should process a story with accessibility iteration', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.accessibility());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'accessibility', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Accessibility');
      expect(result.stdout).toContain('WCAG');
    });
  });

  describe('Multiple iterations', () => {
    it('should process multiple iterations in sequence', async () => {
      mockServer.queueResponses([MOCK_RESPONSES.userRoles(), MOCK_RESPONSES.validation()]);

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'user-roles,validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);
      // Should have final output from last iteration
      expect(result.stdout).toContain('Validation');

      // Verify both iterations were called
      const requests = mockServer.getRecordedRequests();
      expect(requests).toHaveLength(2);
    });

    it('should pass output from first iteration to second', async () => {
      const firstResponse = 'Story enhanced with user roles';
      mockServer.queueResponses([
        MOCK_RESPONSES.simple(firstResponse),
        MOCK_RESPONSES.simple('Final story with validation'),
      ]);

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'user-roles,validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);

      // Verify second call received output from first
      const requests = mockServer.getRecordedRequests();
      expect(requests).toHaveLength(2);

      // Second request should contain the enhanced story
      const secondRequestBody = requests[1].body;
      const messages = secondRequestBody.messages as Array<{ content: string }>;
      expect(messages[0].content).toContain(firstResponse);
    });
  });

  describe('File I/O', () => {
    it('should read story from --input file', async () => {
      const inputFile = path.join(tempDir, 'input-story.txt');
      await fs.writeFile(inputFile, SAMPLE_STORIES.checkout);

      mockServer.queueResponse(MOCK_RESPONSES.validation());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--input', inputFile, '--quiet'],
        mockServerUrl
      );

      expect(result.exitCode).toBe(0);

      // Verify the input story was used
      const requests = mockServer.getRecordedRequests();
      const messages = requests[0].body.messages as Array<{ content: string }>;
      expect(messages[0].content).toContain('complete my purchase');
    });

    it('should write output to --output file', async () => {
      const outputFile = path.join(tempDir, 'output-story.txt');
      const expectedOutput = 'Enhanced story for output test';

      mockServer.queueResponse(MOCK_RESPONSES.simple(expectedOutput));

      const result = await cliWithMockServer(
        [
          '--mode',
          'individual',
          '--iterations',
          'validation',
          '--output',
          outputFile,
          '--quiet',
        ],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);

      // Verify output file was written
      const fileContent = await fs.readFile(outputFile, 'utf-8');
      expect(fileContent).toContain(expectedOutput);
    });

    it('should support both --input and --output together', async () => {
      const inputFile = path.join(tempDir, 'combined-input.txt');
      const outputFile = path.join(tempDir, 'combined-output.txt');
      const expectedOutput = 'Combined I/O test output';

      await fs.writeFile(inputFile, SAMPLE_STORIES.registration);
      mockServer.queueResponse(MOCK_RESPONSES.simple(expectedOutput));

      const result = await cliWithMockServer(
        [
          '--mode',
          'individual',
          '--iterations',
          'validation',
          '--input',
          inputFile,
          '--output',
          outputFile,
          '--quiet',
        ],
        mockServerUrl
      );

      expect(result.exitCode).toBe(0);

      // Verify output file contains expected content
      const fileContent = await fs.readFile(outputFile, 'utf-8');
      expect(fileContent).toContain(expectedOutput);
    });
  });

  describe('Special characters handling', () => {
    it('should handle stories with special characters', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.simple('Enhanced story with special chars'));

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.special
      );

      expect(result.exitCode).toBe(0);

      // Verify special characters were passed correctly
      const requests = mockServer.getRecordedRequests();
      const messages = requests[0].body.messages as Array<{ content: string }>;
      expect(messages[0].content).toContain('@');
      expect(messages[0].content).toContain('#');
      expect(messages[0].content).toContain('&');
    });

    it('should handle multi-line stories', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.simple('Enhanced multi-line story'));

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.multiLine
      );

      expect(result.exitCode).toBe(0);

      // Verify multi-line story was passed correctly
      const requests = mockServer.getRecordedRequests();
      const messages = requests[0].body.messages as Array<{ content: string }>;
      expect(messages[0].content).toContain('Create a new project');
      expect(messages[0].content).toContain('Add team members');
    });
  });

  describe('Logging flags', () => {
    it('should suppress output with --quiet', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.validation());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);
      // stderr should not have info-level logs
      expect(result.stderr).not.toContain('[INFO]');
      expect(result.stderr).not.toContain('Processed');
    });

    it('should show debug output with --debug', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.validation());

      const result = await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--debug'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      expect(result.exitCode).toBe(0);
      // stderr should have debug-level logs
      expect(result.stderr).toContain('DEBUG');
    });
  });

  describe('API request verification', () => {
    it('should send correct model in API request', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.validation());

      await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      const requests = mockServer.getRecordedRequests();
      expect(requests[0].body.model).toBe('claude-sonnet-4-20250514');
    });

    it('should include system prompt in API request', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.validation());

      await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      const requests = mockServer.getRecordedRequests();
      expect(requests[0].body.system).toBeDefined();
      expect(typeof requests[0].body.system).toBe('string');
    });

    it('should include API key in Authorization header', async () => {
      mockServer.queueResponse(MOCK_RESPONSES.validation());

      await cliWithMockServer(
        ['--mode', 'individual', '--iterations', 'validation', '--quiet'],
        mockServerUrl,
        SAMPLE_STORIES.login
      );

      const requests = mockServer.getRecordedRequests();
      const authHeader = requests[0].headers['x-api-key'];
      expect(authHeader).toBeDefined();
    });
  });
});
