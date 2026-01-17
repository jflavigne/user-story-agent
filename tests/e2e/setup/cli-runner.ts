/**
 * CLI runner helper for E2E tests
 *
 * Spawns the CLI as a subprocess and captures output, exit codes, and stderr.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * Options for running the CLI
 */
export interface CliRunOptions {
  /** Command line arguments (without the executable) */
  args: string[];
  /** Input to pipe to stdin */
  stdin?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Working directory (default: project root) */
  cwd?: string;
}

/**
 * Result of a CLI execution
 */
export interface CliRunResult {
  /** Exit code (null if terminated by signal) */
  exitCode: number | null;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether the process timed out */
  timedOut: boolean;
  /** Termination signal if killed */
  signal: NodeJS.Signals | null;
}

/**
 * Project root directory
 */
const PROJECT_ROOT = path.resolve(new URL('../../../', import.meta.url).pathname);

/**
 * Runs the CLI with the given options
 *
 * @param options - CLI run options
 * @returns Promise resolving to the CLI result
 */
export async function runCli(options: CliRunOptions): Promise<CliRunResult> {
  const { args, stdin, env = {}, timeout = 30000, cwd = PROJECT_ROOT } = options;

  return new Promise((resolve) => {
    const childEnv = {
      ...process.env,
      ...env,
      // Ensure we don't accidentally use real API key
      // Use hasOwnProperty to allow empty string for testing missing key scenarios
      ANTHROPIC_API_KEY: Object.prototype.hasOwnProperty.call(env, 'ANTHROPIC_API_KEY')
        ? env.ANTHROPIC_API_KEY
        : 'test-e2e-api-key',
    };

    // Spawn tsx to run the CLI
    const child: ChildProcess = spawn('npx', ['tsx', 'src/cli.ts', ...args], {
      cwd,
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let signal: NodeJS.Signals | null = null;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Collect stdout
    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    // Collect stderr
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Write stdin if provided
    if (stdin !== undefined) {
      child.stdin?.write(stdin);
      child.stdin?.end();
    } else {
      // Close stdin immediately if no input
      child.stdin?.end();
    }

    // Handle process exit
    child.on('close', (code, sig) => {
      clearTimeout(timeoutId);
      signal = sig as NodeJS.Signals | null;
      resolve({
        exitCode: code,
        stdout,
        stderr,
        timedOut,
        signal,
      });
    });

    // Handle errors
    child.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: null,
        stdout,
        stderr: stderr + '\n' + err.message,
        timedOut,
        signal: null,
      });
    });
  });
}

/**
 * Runs the CLI with the given arguments and returns only stdout/stderr
 * Convenience wrapper for simple cases.
 *
 * @param args - CLI arguments
 * @param stdin - Optional stdin content
 * @param env - Optional environment variables
 * @returns Promise resolving to the CLI result
 */
export async function cli(
  args: string[],
  stdin?: string,
  env?: Record<string, string>
): Promise<CliRunResult> {
  return runCli({ args, stdin, env });
}

/**
 * Runs the CLI with mock API server URL
 *
 * @param args - CLI arguments
 * @param mockServerUrl - URL of the mock Anthropic server
 * @param stdin - Optional stdin content
 * @returns Promise resolving to the CLI result
 */
export async function cliWithMockServer(
  args: string[],
  mockServerUrl: string,
  stdin?: string
): Promise<CliRunResult> {
  return runCli({
    args,
    stdin,
    env: {
      ANTHROPIC_BASE_URL: mockServerUrl,
      ANTHROPIC_API_KEY: 'test-e2e-api-key',
    },
  });
}

/**
 * Asserts that the CLI exited with the expected code
 *
 * @param result - CLI result
 * @param expectedCode - Expected exit code
 * @throws Error if exit code doesn't match
 */
export function assertExitCode(result: CliRunResult, expectedCode: number): void {
  if (result.exitCode !== expectedCode) {
    throw new Error(
      `Expected exit code ${expectedCode}, got ${result.exitCode}\n` +
        `stdout: ${result.stdout}\n` +
        `stderr: ${result.stderr}`
    );
  }
}

/**
 * Asserts that stdout contains the expected string
 *
 * @param result - CLI result
 * @param expected - Expected substring
 * @throws Error if stdout doesn't contain expected string
 */
export function assertStdoutContains(result: CliRunResult, expected: string): void {
  if (!result.stdout.includes(expected)) {
    throw new Error(
      `Expected stdout to contain "${expected}"\n` +
        `stdout: ${result.stdout}\n` +
        `stderr: ${result.stderr}`
    );
  }
}

/**
 * Asserts that stderr contains the expected string
 *
 * @param result - CLI result
 * @param expected - Expected substring
 * @throws Error if stderr doesn't contain expected string
 */
export function assertStderrContains(result: CliRunResult, expected: string): void {
  if (!result.stderr.includes(expected)) {
    throw new Error(
      `Expected stderr to contain "${expected}"\n` +
        `stdout: ${result.stdout}\n` +
        `stderr: ${result.stderr}`
    );
  }
}
