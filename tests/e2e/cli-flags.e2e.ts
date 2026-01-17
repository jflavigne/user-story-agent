/**
 * E2E tests for CLI flags and argument validation
 *
 * Tests --help, --version, and argument validation without needing the mock server.
 */

import { describe, it, expect } from 'vitest';
import { cli } from './setup/cli-runner.js';

describe('CLI Flags E2E', () => {
  describe('--help', () => {
    it('should print usage information and exit with code 0', async () => {
      const result = await cli(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('User Story Agent');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('--mode');
      expect(result.stdout).toContain('--iterations');
      expect(result.stdout).toContain('--product-type');
    });

    it('should show available iteration IDs', async () => {
      const result = await cli(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('user-roles');
      expect(result.stdout).toContain('validation');
      expect(result.stdout).toContain('accessibility');
    });

    it('should work with -h shorthand', async () => {
      const result = await cli(['-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });
  });

  describe('--version', () => {
    it('should print version number and exit with code 0', async () => {
      const result = await cli(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/User Story Agent v\d+\.\d+\.\d+/);
    });

    it('should work with -v shorthand', async () => {
      const result = await cli(['-v']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/User Story Agent v\d+\.\d+\.\d+/);
    });
  });

  describe('Missing required arguments', () => {
    it('should error when --mode is missing', async () => {
      const result = await cli([], 'Some story');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Missing required argument: --mode');
    });

    it('should error when individual mode lacks --iterations', async () => {
      const result = await cli(['--mode', 'individual'], 'Some story');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Individual mode requires --iterations');
    });

    it('should error when workflow mode lacks --product-type', async () => {
      const result = await cli(['--mode', 'workflow'], 'Some story');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Workflow mode requires --product-type');
    });
  });

  describe('Invalid argument values', () => {
    it('should error on invalid mode', async () => {
      const result = await cli(['--mode', 'invalid-mode'], 'Some story');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid mode');
      expect(result.stderr).toContain('invalid-mode');
    });

    it('should error on invalid iteration ID', async () => {
      const result = await cli(
        ['--mode', 'individual', '--iterations', 'not-a-real-iteration'],
        'Some story'
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid iteration ID');
      expect(result.stderr).toContain('not-a-real-iteration');
    });

    it('should error on invalid product type', async () => {
      const result = await cli(
        ['--mode', 'workflow', '--product-type', 'invalid-product'],
        'Some story'
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid product type');
      expect(result.stderr).toContain('invalid-product');
    });

    it('should list available options when iteration ID is invalid', async () => {
      const result = await cli(
        ['--mode', 'individual', '--iterations', 'fake-iteration'],
        'Some story'
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Available:');
      expect(result.stderr).toContain('validation');
    });
  });

  describe('Multiple invalid iterations', () => {
    it('should list all invalid iteration IDs', async () => {
      const result = await cli(
        ['--mode', 'individual', '--iterations', 'bad1,validation,bad2'],
        'Some story'
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('bad1');
      expect(result.stderr).toContain('bad2');
    });
  });

  describe('Help suggestion on error', () => {
    it('should suggest --help on validation error', async () => {
      const result = await cli(['--mode', 'invalid'], 'Some story');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--help');
    });
  });
});
