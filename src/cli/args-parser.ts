/**
 * CLI argument parsing and validation for figma-intake.
 */

import { validateFigmaUrl } from "../figma/url-validator.js";
import { sanitizeFilePath } from "../security/input-sanitizer.js";

export interface ParsedArgs {
  figmaUrl: string;
  tablePath?: string;
  projectRoot: string;
  mcpJson?: string;
  forceRefresh: boolean;
  maxBatchSize: number;
}

export type ParseArgsResult =
  | { ok: true; parsed: ParsedArgs }
  | { ok: false; message: string };

export interface RawOptions {
  table?: string;
  projectRoot?: string;
  mcpJson?: string;
  forceRefresh?: unknown;
  maxBatchSize?: string;
}

/**
 * Parses and validates CLI options and optional figma URL.
 * Returns { ok: true, parsed } or { ok: false, message }.
 */
export function parseArgs(
  options: RawOptions,
  figmaUrl: string | undefined,
  cwd: string
): ParseArgsResult {
  // Fix 1 - URL validation
  if (figmaUrl) {
    const urlResult = validateFigmaUrl(figmaUrl);
    if (!urlResult.valid) return { ok: false, message: urlResult.error ?? "Invalid Figma URL" };
  }

  const projectRootRaw = options.projectRoot ?? cwd;
  const projectRootResult = sanitizeFilePath(projectRootRaw);
  if (!projectRootResult.isValid) {
    return { ok: false, message: "Invalid project-root path" };
  }
  const projectRoot = projectRootResult.sanitized;

  let tablePath: string | undefined;
  if (options.table !== undefined && options.table !== "") {
    const tableResult = sanitizeFilePath(options.table);
    if (!tableResult.isValid) return { ok: false, message: "Invalid table path" };
    tablePath = tableResult.sanitized;
  }

  let mcpJson: string | undefined;
  if (options.mcpJson !== undefined && options.mcpJson !== "") {
    const mcpResult = sanitizeFilePath(options.mcpJson);
    if (!mcpResult.isValid) return { ok: false, message: "Invalid mcp-json path" };
    mcpJson = mcpResult.sanitized;
  }

  // Fix 5 - Boolean coercion
  const rawForce = options.forceRefresh;
  const forceRefresh = rawForce === true || String(rawForce).toLowerCase() === "true";

  const maxBatchSize = Math.max(1, parseInt(String(options.maxBatchSize ?? "19"), 10) || 19);

  const parsed: ParsedArgs = {
    figmaUrl: figmaUrl ?? "",
    tablePath,
    projectRoot,
    mcpJson,
    forceRefresh,
    maxBatchSize,
  };

  return { ok: true, parsed };
}
