/**
 * LLM interaction logger for debugging and optimization.
 * Logs prompts, responses, tokens, and latency to JSONL format when LLM_LOG_FILE env var is set.
 */

import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

/** LLM interaction log entry. */
export interface LLMLogEntry {
  /** ISO timestamp of the call. */
  timestamp: string;
  /** Pipeline step identifier (e.g., "column-mapper", "pass0-vision"). */
  step: string;
  /** Model identifier (e.g., "haiku", "sonnet-4.5"). */
  model: string;
  /** Full prompt sent to the LLM. */
  prompt: string;
  /** Full response received from the LLM. */
  response: string;
  /** Token usage breakdown. */
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  /** Latency in milliseconds. */
  latencyMs: number;
  /** Optional metadata for context. */
  metadata?: {
    componentRef?: string;
    imageCount?: number;
    repairAttempt?: boolean;
    [key: string]: unknown;
  };
  /** Error message if the call failed. */
  error?: string;
}

/**
 * Checks if LLM logging is enabled via environment variable.
 * @returns True if LLM_LOG_FILE is set, false otherwise.
 */
export function isLLMLoggingEnabled(): boolean {
  return !!process.env.LLM_LOG_FILE;
}

/**
 * Logs an LLM interaction to JSONL file.
 * No-op if LLM_LOG_FILE env var is not set.
 * Errors are logged to stderr but never crash the pipeline.
 *
 * @param entry - The log entry to write.
 */
export function logLLMCall(entry: LLMLogEntry): void {
  if (!isLLMLoggingEnabled()) {
    return;
  }

  const logFilePath = process.env.LLM_LOG_FILE!;

  try {
    // Ensure directory exists
    const dir = dirname(logFilePath);
    mkdirSync(dir, { recursive: true });

    // Append JSONL entry (newline-delimited JSON)
    const jsonLine = JSON.stringify(entry) + "\n";
    appendFileSync(logFilePath, jsonLine, "utf-8");
  } catch (err) {
    // Log error to stderr but never crash
    process.stderr.write(
      `Warning: Failed to write LLM log entry to ${logFilePath}: ${String(err)}\n`
    );
  }
}
