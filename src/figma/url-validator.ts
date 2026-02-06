/**
 * Figma URL validation (design/file node links).
 */

export interface ValidateFigmaUrlResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a Figma design or file URL (e.g. https://www.figma.com/file/... or .../design/...).
 */
export function validateFigmaUrl(url: string): ValidateFigmaUrlResult {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTPS" };
    }
    const host = u.hostname.toLowerCase();
    if (host !== "www.figma.com" && host !== "figma.com") {
      return { valid: false, error: "URL must be a figma.com or www.figma.com link" };
    }
    if (!/^\/file\/[^/]+(\/.*)?(\?.*)?$/.test(u.pathname) && !/^\/design\/[^/]+(\?.*)?$/.test(u.pathname)) {
      return { valid: false, error: "URL must be a Figma file or design link (/file/... or /design/...)" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL" };
  }
}
