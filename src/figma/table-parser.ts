/**
 * CSV/Markdown table parser for component inventory.
 * Extracts all 8 columns using LLM-based semantic column mapping.
 */

import { mapColumnsByLLM } from "./llm-column-mapper.js";

/** Component row with all 8 fields extracted from CSV. */
export interface ComponentRow {
  /** Optional ID */
  id?: string;
  /** Component name (required) */
  component: string;
  /** Family/group classification */
  familyGroup?: string;
  /** Component level (required) */
  level: string;
  /** Array of dependency component names */
  dependencies?: string[];
  /** Component description */
  description?: string;
  /** Figma node link (required) */
  figmaNodeLink: string;
  /** Component status */
  status?: string;
}

/**
 * Parses CSV or Markdown table input into ComponentRow array.
 * Uses LLM-based semantic column mapping to extract all 8 columns.
 *
 * @param input - CSV or Markdown table string
 * @returns Promise resolving to array of ComponentRow
 * @throws Error if input is empty or headers cannot be mapped
 */
export async function parseTable(input: string): Promise<ComponentRow[]> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Table input is empty");
  }

  // Detect format and extract rows
  const lines = trimmed.split("\n").map((line) => line.trim());
  const isMarkdown = lines[0].startsWith("|");

  const rows = isMarkdown ? parseMarkdownTable(lines) : parseCsvTable(lines);

  if (rows.length === 0) {
    throw new Error("No data rows found in table");
  }

  // Extract headers and data rows
  const headers = rows[0];
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    throw new Error("No data rows found in table");
  }

  // Use LLM to map columns
  const mapping = await mapColumnsByLLM(headers);

  // Extract ComponentRow objects
  return dataRows.map((row) => {
    const component: ComponentRow = {
      component: getCellValue(row, mapping.component),
      level: getCellValue(row, mapping.level),
      figmaNodeLink: getCellValue(row, mapping.figmaNodeLink),
    };

    // Optional fields
    if (mapping.id !== undefined) {
      const idValue = getCellValue(row, mapping.id);
      if (idValue) component.id = idValue;
    }
    if (mapping.familyGroup !== undefined) {
      const familyValue = getCellValue(row, mapping.familyGroup);
      if (familyValue) component.familyGroup = familyValue;
    }
    if (mapping.dependencies !== undefined) {
      const depsValue = getCellValue(row, mapping.dependencies);
      if (depsValue) {
        // Parse "A, B, C" → ["A", "B", "C"]
        component.dependencies = depsValue
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
      }
    }
    if (mapping.description !== undefined) {
      const descValue = getCellValue(row, mapping.description);
      if (descValue) component.description = descValue;
    }
    if (mapping.status !== undefined) {
      const statusValue = getCellValue(row, mapping.status);
      if (statusValue) component.status = statusValue;
    }

    return component;
  });
}

/**
 * Parses CSV format (comma or tab separated).
 * Handles quoted fields with commas inside.
 */
function parseCsvTable(lines: string[]): string[][] {
  return lines
    .filter((line) => line.length > 0)
    .map((line) => {
      // Try comma first, then tab
      const delimiter = line.includes(",") ? "," : "\t";
      
      if (delimiter === ",") {
        // Parse CSV with proper quote handling
        return parseCsvLine(line);
      } else {
        // Simple tab split
        return line.split(delimiter).map((cell) => cell.trim());
      }
    });
}

/**
 * Parses a single CSV line, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      cells.push(currentCell.trim());
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Add the last cell
  cells.push(currentCell.trim());

  return cells;
}

/**
 * Parses Markdown table format.
 */
function parseMarkdownTable(lines: string[]): string[][] {
  return lines
    .filter((line) => line.startsWith("|") && !line.includes("---")) // Skip separator rows
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      // Remove empty first/last cells from leading/trailing pipes
      return cells.filter((cell) => cell.length > 0);
    });
}

/**
 * Gets cell value at index, handling out-of-bounds gracefully.
 */
function getCellValue(row: string[], index: number): string {
  return index >= 0 && index < row.length ? row[index] : "";
}
