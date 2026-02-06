/**
 * Pre-flight credential check for Figma Intake Pipeline (D-001).
 * Validates FIGMA_API_KEY or .mcp.json Figma MCP config before MCP health check or API calls.
 */

import { readFileSync } from "fs";
import { resolve, isAbsolute } from "path";

/** Result of pre-flight validation. */
export interface PreflightValidationResult {
  /** true if at least one credential is present (API key or MCP config). */
  ok: boolean;
  /** true if process.env.FIGMA_API_KEY is set and non-empty. */
  hasApiKey: boolean;
  /** true if .mcp.json contains a Figma MCP server config. */
  hasMcpConfig: boolean;
  /** When ok is false, the full error message to display. */
  message?: string;
}

/** Error message shown when both API key and MCP config are missing. */
export const MISSING_CREDENTIALS_MESSAGE = `❌ Missing Figma credentials

To use the Figma Intake Pipeline, you need ONE of:

1. Figma API Token (recommended for most users):
   - Get token: https://www.figma.com/developers/api#access-tokens
   - Set: export FIGMA_API_KEY=your_token_here

2. Figma MCP Server (advanced):
   - Configure .mcp.json with figma-developer-mcp
   - See: docs/figma-mcp-setup.md

For help: https://www.figma.com/developers/api`;

const PREFLIGHT_LOG_EVENT = "pipeline.preflight_check";

/** Known Figma MCP server key in .mcp.json */
const FIGMA_MCP_SERVER_KEY = "figma";

/** Known Figma MCP package identifier in args */
const FIGMA_MCP_PACKAGE_HINT = "figma-developer-mcp";

/** Minimal shape of .mcp.json we care about. */
interface McpJsonShape {
  mcpServers?: Record<
    string,
    { command?: string; args?: string[]; type?: string; url?: string }
  >;
}

/**
 * Returns true if FIGMA_API_KEY is set and non-empty.
 */
function hasFigmaApiKey(): boolean {
  const value = process.env.FIGMA_API_KEY;
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Returns true if the given path points to a valid .mcp.json that configures a Figma MCP server.
 * Accepts either a server key named "figma" or any server with args containing "figma-developer-mcp".
 */
function hasFigmaMcpInFile(mcpJsonPath: string): boolean {
  try {
    const raw = readFileSync(mcpJsonPath, "utf-8");
    const parsed = JSON.parse(raw) as McpJsonShape;
    const servers = parsed.mcpServers;
    if (!servers || typeof servers !== "object") return false;

    if (servers[FIGMA_MCP_SERVER_KEY]) return true;

    for (const entry of Object.values(servers)) {
      const args = entry?.args;
      if (Array.isArray(args) && args.some((a) => String(a).includes(FIGMA_MCP_PACKAGE_HINT)))
        return true;
    }
    return false;
  } catch (err) {
    // Differentiate missing file from malformed JSON
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return false; // File doesn't exist - expected case
    }
    // For other errors (JSON parse, permission, etc), log and return false
    // This prevents misleading "missing credentials" when file is broken
    if (process.env.DEBUG?.includes("pipeline") || process.env.DEBUG === "*") {
      process.stderr.write(`[DEBUG] Failed to read ${mcpJsonPath}: ${String(err)}\n`);
    }
    return false;
  }
}

export interface RunPreflightCheckOptions {
  /** Path to .mcp.json (default: project root .mcp.json). */
  mcpJsonPath?: string;
  /** Project root to resolve .mcp.json (default: cwd). */
  projectRoot?: string;
  /** Optional logger: (event, payload) => void. If provided, logs at DEBUG. */
  log?: (event: string, payload: Record<string, unknown>) => void;
}

/**
 * Runs pre-flight credential validation. Does not perform MCP health check or network calls.
 * Use this at CLI entry point before initializing FigmaDataSource.
 *
 * @param options - Optional paths and logger
 * @returns PreflightValidationResult; if ok is false, message contains the full error to show
 */
export function runPreflightCheck(options: RunPreflightCheckOptions = {}): PreflightValidationResult {
  const projectRoot = options.projectRoot ?? process.cwd();
  // Resolve mcpJsonPath against projectRoot if it's relative
  const mcpJsonPath = options.mcpJsonPath
    ? isAbsolute(options.mcpJsonPath)
      ? options.mcpJsonPath
      : resolve(projectRoot, options.mcpJsonPath)
    : resolve(projectRoot, ".mcp.json");
  const hasApiKey = hasFigmaApiKey();
  const hasMcpConfig = hasFigmaMcpInFile(mcpJsonPath);

  const result: PreflightValidationResult = {
    ok: hasApiKey || hasMcpConfig,
    hasApiKey,
    hasMcpConfig,
  };

  if (!result.ok) result.message = MISSING_CREDENTIALS_MESSAGE;

  if (options.log) {
    options.log(PREFLIGHT_LOG_EVENT, {
      ok: result.ok,
      hasApiKey: result.hasApiKey,
      hasMcpConfig: result.hasMcpConfig,
    });
  }

  return result;
}
