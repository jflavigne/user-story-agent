/**
 * Unit tests for pre-flight credential check (D-001).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runPreflightCheck, MISSING_CREDENTIALS_MESSAGE } from "./preflight.js";

const ORIGINAL_ENV = process.env.FIGMA_API_KEY;

describe("runPreflightCheck", () => {
  beforeEach(() => {
    delete process.env.FIGMA_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) process.env.FIGMA_API_KEY = ORIGINAL_ENV;
    else delete process.env.FIGMA_API_KEY;
  });

  it("fails when neither API key nor MCP config exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    try {
      const result = runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: join(dir, ".mcp.json"),
      });
      expect(result.ok).toBe(false);
      expect(result.hasApiKey).toBe(false);
      expect(result.hasMcpConfig).toBe(false);
      expect(result.message).toBe(MISSING_CREDENTIALS_MESSAGE);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("passes when FIGMA_API_KEY is set", () => {
    process.env.FIGMA_API_KEY = "figd_test_token";
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    try {
      const result = runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: join(dir, "nonexistent.json"),
      });
      expect(result.ok).toBe(true);
      expect(result.hasApiKey).toBe(true);
      expect(result.message).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("passes when .mcp.json has figma server key", () => {
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    const mcpPath = join(dir, ".mcp.json");
    writeFileSync(
      mcpPath,
      JSON.stringify({
        mcpServers: {
          figma: { command: "npx", args: ["-y", "figma-developer-mcp", "--stdio"] },
        },
      }),
      "utf-8"
    );
    try {
      const result = runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: mcpPath,
      });
      expect(result.ok).toBe(true);
      expect(result.hasMcpConfig).toBe(true);
      expect(result.hasApiKey).toBe(false);
      expect(result.message).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("passes when .mcp.json has server with figma-developer-mcp in args", () => {
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    const mcpPath = join(dir, ".mcp.json");
    writeFileSync(
      mcpPath,
      JSON.stringify({
        mcpServers: {
          design: { command: "npx", args: ["-y", "figma-developer-mcp", "--stdio"] },
        },
      }),
      "utf-8"
    );
    try {
      const result = runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: mcpPath,
      });
      expect(result.ok).toBe(true);
      expect(result.hasMcpConfig).toBe(true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("passes when both API key and MCP config exist", () => {
    process.env.FIGMA_API_KEY = "figd_ok";
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    const mcpPath = join(dir, ".mcp.json");
    writeFileSync(
      mcpPath,
      JSON.stringify({ mcpServers: { figma: { command: "npx", args: ["figma-developer-mcp"] } } }),
      "utf-8"
    );
    try {
      const result = runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: mcpPath,
      });
      expect(result.ok).toBe(true);
      expect(result.hasApiKey).toBe(true);
      expect(result.hasMcpConfig).toBe(true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("fails when FIGMA_API_KEY is empty string", () => {
    process.env.FIGMA_API_KEY = "";
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    try {
      const result = runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: join(dir, ".mcp.json"),
      });
      expect(result.ok).toBe(false);
      expect(result.hasApiKey).toBe(false);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("calls log with pipeline.preflight_check when provided", () => {
    const dir = mkdtempSync(join(tmpdir(), "preflight-"));
    const logCalls: Array<{ event: string; payload: Record<string, unknown> }> = [];
    try {
      runPreflightCheck({
        projectRoot: dir,
        mcpJsonPath: join(dir, ".mcp.json"),
        log: (event: string, payload: Record<string, unknown>) => {
          logCalls.push({ event, payload });
        },
      });
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0].event).toBe("pipeline.preflight_check");
      expect(logCalls[0].payload).toEqual({
        ok: false,
        hasApiKey: false,
        hasMcpConfig: false,
      });
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
