/**
 * USA-62: Shared over-specification detection patterns
 *
 * Centralized regex patterns and detection functions for identifying
 * over-specified content (exact colors, pixel measurements, font specs)
 * in user stories. Used by tests and benchmark scripts.
 */

// Over-specification patterns
export const EXACT_COLOR_PATTERN = /#[\da-fA-F]{3,8}\b|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)/g;
export const PIXEL_MEASUREMENT_PATTERN = /\b\d+px\b|\b\d+rem\b|\b\d+em\b/g;
export const FONT_SPEC_PATTERN = /\bfont-family\s*:\s*["']?(Helvetica|Arial|Inter)["']?|(?:Helvetica|Arial|Inter)\s+\d+px|\d+px\s+(?:Helvetica|Arial|Inter)|font-weight\s*:\s*\d+|font-size\s*:\s*\d+px/gi;

/**
 * Returns boolean flags indicating presence of over-specification patterns.
 * Does NOT use global flag - tests for presence only.
 */
export function hasOverSpecification(text: string): {
  hasExactColor: boolean;
  hasPixelMeasurement: boolean;
  hasFontSpec: boolean;
} {
  // Create non-global versions for boolean testing
  const exactColorTest = /#[\da-fA-F]{3,8}\b|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)/;
  const pixelMeasurementTest = /\b\d+px\b|\b\d+rem\b|\b\d+em\b/;
  const fontSpecTest = /\bfont-family\s*:\s*["']?(Helvetica|Arial|Inter)["']?|(?:Helvetica|Arial|Inter)\s+\d+px|\d+px\s+(?:Helvetica|Arial|Inter)|font-weight\s*:\s*\d+|font-size\s*:\s*\d+px/i;

  return {
    hasExactColor: exactColorTest.test(text),
    hasPixelMeasurement: pixelMeasurementTest.test(text),
    hasFontSpec: fontSpecTest.test(text),
  };
}

/**
 * Counts total matches of over-specification patterns.
 * Uses global flag internally to count all occurrences.
 */
export function countOverSpecification(text: string): {
  exactColor: number;
  pixelMeasurement: number;
  fontSpec: number;
  total: number;
} {
  const exactColor = (text.match(EXACT_COLOR_PATTERN) ?? []).length;
  const pixelMeasurement = (text.match(PIXEL_MEASUREMENT_PATTERN) ?? []).length;
  const fontSpec = (text.match(FONT_SPEC_PATTERN) ?? []).length;

  return {
    exactColor,
    pixelMeasurement,
    fontSpec,
    total: exactColor + pixelMeasurement + fontSpec,
  };
}

/**
 * Extracts sample matches of over-specification patterns.
 * Useful for debugging and reporting.
 *
 * @param text - Text to analyze
 * @param limit - Maximum number of samples per category (default: 3)
 */
export function extractOverSpecSamples(
  text: string,
  limit: number = 3
): {
  color: string[];
  px: string[];
  font: string[];
} {
  return {
    color: (text.match(EXACT_COLOR_PATTERN) ?? []).slice(0, limit),
    px: (text.match(PIXEL_MEASUREMENT_PATTERN) ?? []).slice(0, limit),
    font: (text.match(FONT_SPEC_PATTERN) ?? []).slice(0, limit),
  };
}
