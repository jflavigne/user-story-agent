/**
 * Unit tests for CLI args parser (validation and sanitization).
 */

import { describe, it, expect } from "vitest";
import { parseArgs } from "./args-parser.js";

const CWD = process.cwd();

describe("parseArgs", () => {
  it("returns ok: false when figma URL is invalid", () => {
    const result = parseArgs({ projectRoot: "." }, "not-a-url", CWD);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBeDefined();
  });

  it("returns ok: true for valid Figma file URL", () => {
    const result = parseArgs(
      { projectRoot: "." },
      "https://www.figma.com/file/ABC123/Design?node-id=1-2",
      CWD
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.figmaUrl).toBe("https://www.figma.com/file/ABC123/Design?node-id=1-2");
    }
  });

  it("sanitizes projectRoot and rejects invalid path", () => {
    const result = parseArgs({ projectRoot: "../../../etc" }, undefined, CWD);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("project-root");
  });

  it("accepts relative projectRoot", () => {
    const result = parseArgs({ projectRoot: "." }, undefined, CWD);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.projectRoot).toBe(".");
  });

  it("sanitizes table path and rejects invalid", () => {
    const result = parseArgs(
      { projectRoot: ".", table: "..\\..\\etc\\passwd" },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("table");
  });

  it("accepts relative table path", () => {
    const result = parseArgs(
      { projectRoot: ".", table: "./inventory.csv" },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.tablePath).toBe("./inventory.csv");
  });

  it("sanitizes mcpJson path and rejects invalid", () => {
    const result = parseArgs(
      { projectRoot: ".", mcpJson: "..\\..\\.mcp.json" },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("mcp-json");
  });

  it("accepts relative mcp-json path", () => {
    const result = parseArgs(
      { projectRoot: ".", mcpJson: ".mcp.json" },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.mcpJson).toBe(".mcp.json");
  });

  it("coerces forceRefresh from boolean true", () => {
    const result = parseArgs(
      { projectRoot: ".", forceRefresh: true },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.forceRefresh).toBe(true);
  });

  it("coerces forceRefresh from string 'true'", () => {
    const result = parseArgs(
      { projectRoot: ".", forceRefresh: "true" },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.forceRefresh).toBe(true);
  });

  it("coerces forceRefresh to false for string 'false'", () => {
    const result = parseArgs(
      { projectRoot: ".", forceRefresh: "false" },
      "https://www.figma.com/file/abc/Design",
      CWD
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.forceRefresh).toBe(false);
  });

  it("coerces forceRefresh to false when unset", () => {
    const result = parseArgs({ projectRoot: "." }, "https://www.figma.com/file/abc/Design", CWD);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsed.forceRefresh).toBe(false);
  });
});
