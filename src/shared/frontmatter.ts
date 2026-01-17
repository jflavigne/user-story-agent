/**
 * Simple YAML frontmatter parser
 * 
 * Parses frontmatter in the format:
 * ---
 * key: value
 * another: value
 * ---
 * 
 * Content here...
 */

/**
 * Result of parsing frontmatter
 */
export interface FrontmatterResult {
  /** Parsed frontmatter data as key-value pairs */
  data: Record<string, string | number>;
  /** Content after the frontmatter delimiter */
  content: string;
}

/**
 * Parses YAML frontmatter from a markdown file
 * 
 * @param text - The file content to parse
 * @returns Frontmatter result with parsed data and remaining content
 */
export function parseFrontmatter(text: string): FrontmatterResult {
  // Check if file starts with frontmatter delimiter
  // Support both: `---\nkey: value\n---` and `---\n---` (empty frontmatter)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)---\s*\n([\s\S]*)$/;
  const match = text.match(frontmatterRegex);

  if (!match) {
    // No frontmatter found, return empty data and full content
    return {
      data: {},
      content: text,
    };
  }

  const frontmatterText = match[1].trim();
  const content = match[2];

  // Parse simple key-value pairs
  const data: Record<string, string | number> = {};
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue; // Skip empty lines and comments
    }

    // Match key: value pattern
    const kvMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let value: string | number = kvMatch[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Try to parse as number (only for non-empty numeric strings)
      const trimmedValue = value.trim();
      if (trimmedValue !== '' && /^-?\d+(\.\d+)?$/.test(trimmedValue)) {
        data[key] = Number(trimmedValue);
      } else {
        data[key] = value;
      }
    }
  }

  return {
    data,
    content,
  };
}
