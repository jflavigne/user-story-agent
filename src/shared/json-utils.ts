/**
 * Utility functions for extracting and parsing JSON from text responses
 */

/**
 * Extracts JSON from a text string that may contain markdown code blocks or other text.
 * Attempts to find JSON objects or arrays in the text.
 *
 * @param text - The text to extract JSON from
 * @returns The parsed JSON object or array, or null if no valid JSON found
 *
 * @example
 * ```typescript
 * const text = "Here's the result:\n```json\n{\"key\": \"value\"}\n```";
 * const json = extractJSON(text); // { key: "value" }
 * ```
 */
export function extractJSON(text: string): unknown {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // First, try to parse the entire text as JSON
  try {
    return JSON.parse(text.trim());
  } catch {
    // If that fails, look for JSON in code blocks
  }

  // Look for JSON in markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Continue searching
    }
  }

  // Look for JSON objects or arrays in the text (between { } or [ ])
  // Greedy match so nested structures are captured (non-greedy would stop at first } or ])
  const jsonObjectRegex = /\{[\s\S]*\}/;
  const jsonArrayRegex = /\[[\s\S]*\]/;

  const objectMatch = text.match(jsonObjectRegex);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // Continue searching
    }
  }

  const arrayMatch = text.match(jsonArrayRegex);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // No valid JSON found
    }
  }

  return null;
}
