/**
 * Input sanitization for paths and user-supplied values.
 */

export interface SanitizeFilePathResult {
  sanitized: string;
  isValid: boolean;
}

/**
 * Sanitizes a file path: rejects path traversal, null bytes, and empty.
 * Returns normalized path and whether it is safe to use.
 */
export function sanitizeFilePath(path: string): SanitizeFilePathResult {
  if (path == null || typeof path !== "string") {
    return { sanitized: "", isValid: false };
  }
  const trimmed = path.trim();
  if (trimmed === "") {
    return { sanitized: "", isValid: false };
  }
  if (trimmed.includes("\0")) {
    return { sanitized: "", isValid: false };
  }
  const normalized = trimmed.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.includes("..")) {
    return { sanitized: "", isValid: false };
  }
  return { sanitized: normalized, isValid: true };
}
