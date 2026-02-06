import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, readFileSync, rmSync } from "fs";
import { logLLMCall, isLLMLoggingEnabled } from "./llm-logger.js";
import type { LLMLogEntry } from "./llm-logger.js";

describe("llm-logger", () => {
  const testLogPath = "/tmp/test-llm-calls.jsonl";

  beforeEach(() => {
    // Clean up any existing test file
    if (existsSync(testLogPath)) {
      rmSync(testLogPath);
    }
    delete process.env.LLM_LOG_FILE;
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testLogPath)) {
      rmSync(testLogPath);
    }
    delete process.env.LLM_LOG_FILE;
  });

  describe("isLLMLoggingEnabled", () => {
    it("returns false when LLM_LOG_FILE is not set", () => {
      expect(isLLMLoggingEnabled()).toBe(false);
    });

    it("returns true when LLM_LOG_FILE is set", () => {
      process.env.LLM_LOG_FILE = testLogPath;
      expect(isLLMLoggingEnabled()).toBe(true);
    });

    it("returns false when LLM_LOG_FILE is empty string", () => {
      process.env.LLM_LOG_FILE = "";
      expect(isLLMLoggingEnabled()).toBe(false);
    });
  });

  describe("logLLMCall", () => {
    it("does nothing when logging is disabled", () => {
      const entry: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "test",
        model: "test-model",
        prompt: "test prompt",
        response: "test response",
        tokens: { input: 10, output: 20, total: 30 },
        latencyMs: 100,
      };

      logLLMCall(entry);
      expect(existsSync(testLogPath)).toBe(false);
    });

    it("writes JSONL entry when logging is enabled", () => {
      process.env.LLM_LOG_FILE = testLogPath;

      const entry: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "column-mapper",
        model: "haiku",
        prompt: "test prompt",
        response: "test response",
        tokens: { input: 10, output: 20, total: 30 },
        latencyMs: 150,
      };

      logLLMCall(entry);

      expect(existsSync(testLogPath)).toBe(true);
      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());

      expect(parsed).toEqual(entry);
    });

    it("appends multiple entries on separate lines", () => {
      process.env.LLM_LOG_FILE = testLogPath;

      const entry1: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "pass0-vision",
        model: "sonnet-4.5",
        prompt: "prompt1",
        response: "response1",
        tokens: { input: 100, output: 200, total: 300 },
        latencyMs: 1000,
      };

      const entry2: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:01.000Z",
        step: "story-formatter",
        model: "sonnet-4.5",
        prompt: "prompt2",
        response: "response2",
        tokens: { input: 50, output: 100, total: 150 },
        latencyMs: 500,
      };

      logLLMCall(entry1);
      logLLMCall(entry2);

      const content = readFileSync(testLogPath, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual(entry1);
      expect(JSON.parse(lines[1])).toEqual(entry2);
    });

    it("creates directory if it does not exist", () => {
      const nestedPath = "/tmp/test-llm-logs/nested/llm-calls.jsonl";
      process.env.LLM_LOG_FILE = nestedPath;

      // Clean up if exists from previous run
      if (existsSync("/tmp/test-llm-logs")) {
        rmSync("/tmp/test-llm-logs", { recursive: true });
      }

      const entry: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "test",
        model: "test-model",
        prompt: "test",
        response: "test",
        tokens: { input: 1, output: 1, total: 2 },
        latencyMs: 1,
      };

      logLLMCall(entry);

      expect(existsSync(nestedPath)).toBe(true);

      // Clean up
      rmSync("/tmp/test-llm-logs", { recursive: true });
    });

    it("includes optional metadata when provided", () => {
      process.env.LLM_LOG_FILE = testLogPath;

      const entry: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "pass0-vision",
        model: "sonnet-4.5",
        prompt: "test",
        response: "test",
        tokens: { input: 1, output: 1, total: 2 },
        latencyMs: 1,
        metadata: {
          componentRef: "Button",
          imageCount: 3,
        },
      };

      logLLMCall(entry);

      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata).toEqual({
        componentRef: "Button",
        imageCount: 3,
      });
    });

    it("includes error field when provided", () => {
      process.env.LLM_LOG_FILE = testLogPath;

      const entry: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "story-formatter",
        model: "sonnet-4.5",
        prompt: "test",
        response: "",
        tokens: { input: 0, output: 0, total: 0 },
        latencyMs: 0,
        error: "Network timeout",
      };

      logLLMCall(entry);

      const content = readFileSync(testLogPath, "utf-8");
      const parsed = JSON.parse(content.trim());

      expect(parsed.error).toBe("Network timeout");
    });

    it("handles write errors gracefully without crashing", () => {
      process.env.LLM_LOG_FILE = "/invalid/path/that/cannot/exist/llm.jsonl";

      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

      const entry: LLMLogEntry = {
        timestamp: "2026-02-03T00:00:00.000Z",
        step: "test",
        model: "test",
        prompt: "test",
        response: "test",
        tokens: { input: 1, output: 1, total: 2 },
        latencyMs: 1,
      };

      // Should not throw
      expect(() => logLLMCall(entry)).not.toThrow();

      // Should log warning to stderr
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Failed to write LLM log entry")
      );

      stderrSpy.mockRestore();
    });
  });
});
