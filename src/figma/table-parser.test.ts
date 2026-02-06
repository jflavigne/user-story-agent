/**
 * Unit tests for table parser with 8-column support.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseTable } from "./table-parser.js";
import * as mapper from "./llm-column-mapper.js";

// Mock LLM column mapper
vi.mock("./llm-column-mapper.js", () => ({
  mapColumnsByLLM: vi.fn(),
  clearCache: vi.fn(),
}));

describe("parseTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses 8-column CSV with all fields", async () => {
    const csv = `ID,Component name,Family group,Level,Dependency,Description,Figma link,Status
1,Button,Core,Atom,Icon,Primary action button,https://figma.com/button,Active
2,Card,Layout,Molecule,"Button, Text",Content container,https://figma.com/card,Draft`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      id: 0,
      component: 1,
      familyGroup: 2,
      level: 3,
      dependencies: 4,
      description: 5,
      figmaNodeLink: 6,
      status: 7,
    });

    const result = await parseTable(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "1",
      component: "Button",
      familyGroup: "Core",
      level: "Atom",
      dependencies: ["Icon"],
      description: "Primary action button",
      figmaNodeLink: "https://figma.com/button",
      status: "Active",
    });
    expect(result[1]).toEqual({
      id: "2",
      component: "Card",
      familyGroup: "Layout",
      level: "Molecule",
      dependencies: ["Button", "Text"],
      description: "Content container",
      figmaNodeLink: "https://figma.com/card",
      status: "Draft",
    });
  });

  it("parses minimal 3-column CSV", async () => {
    const csv = `Component,Level,Figma URL
Button,Atom,https://figma.com/button
Input,Atom,https://figma.com/input`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    const result = await parseTable(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      component: "Button",
      level: "Atom",
      figmaNodeLink: "https://figma.com/button",
    });
    expect(result[1]).toEqual({
      component: "Input",
      level: "Atom",
      figmaNodeLink: "https://figma.com/input",
    });
  });

  it("parses Markdown table format", async () => {
    const markdown = `| Component | Level | Figma Link |
|-----------|-------|------------|
| Button    | Atom  | https://figma.com/button |
| Input     | Atom  | https://figma.com/input  |`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    const result = await parseTable(markdown);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      component: "Button",
      level: "Atom",
      figmaNodeLink: "https://figma.com/button",
    });
  });

  it("parses multiline descriptions", async () => {
    const csv = `Component,Level,Description,Figma Link
Button,Atom,A primary action button for user interactions,https://figma.com/button`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      description: 2,
      figmaNodeLink: 3,
    });

    const result = await parseTable(csv);

    expect(result[0].description).toBe("A primary action button for user interactions");
  });

  it("parses dependency lists correctly", async () => {
    const csv = `Component,Level,Dependencies,Figma Link
Card,Molecule,"Button, Text, Icon",https://figma.com/card
Form,Organism,"Input, Button, Label, Checkbox",https://figma.com/form`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      dependencies: 2,
      figmaNodeLink: 3,
    });

    const result = await parseTable(csv);

    expect(result[0].dependencies).toEqual(["Button", "Text", "Icon"]);
    expect(result[1].dependencies).toEqual(["Input", "Button", "Label", "Checkbox"]);
  });

  it("handles empty optional fields", async () => {
    const csv = `ID,Component,Family,Level,Deps,Desc,Link,Status
,Button,,Atom,,,https://figma.com/button,`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      id: 0,
      component: 1,
      familyGroup: 2,
      level: 3,
      dependencies: 4,
      description: 5,
      figmaNodeLink: 6,
      status: 7,
    });

    const result = await parseTable(csv);

    expect(result[0]).toEqual({
      component: "Button",
      level: "Atom",
      figmaNodeLink: "https://figma.com/button",
    });
    // Empty fields should not be present
    expect(result[0].id).toBeUndefined();
    expect(result[0].familyGroup).toBeUndefined();
    expect(result[0].dependencies).toBeUndefined();
    expect(result[0].description).toBeUndefined();
    expect(result[0].status).toBeUndefined();
  });

  it("handles tab-separated values", async () => {
    const tsv = `Component\tLevel\tLink
Button\tAtom\thttps://figma.com/button
Input\tAtom\thttps://figma.com/input`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    const result = await parseTable(tsv);

    expect(result).toHaveLength(2);
    expect(result[0].component).toBe("Button");
  });

  it("rethrows error when mapColumnsByLLM fails", async () => {
    const csv = `Component,Level,Link
Button,Atom,https://figma.com/button`;
    const mockMapColumns = vi.fn().mockRejectedValue(new Error("LLM service unavailable"));
    vi.mocked(mapper.mapColumnsByLLM).mockImplementation(mockMapColumns);
    await expect(parseTable(csv)).rejects.toThrow("LLM service unavailable");
  });

  it("throws on empty input", async () => {
    await expect(parseTable("")).rejects.toThrow("Table input is empty");
    await expect(parseTable("   ")).rejects.toThrow("Table input is empty");
  });

  it("throws when no data rows found", async () => {
    const csv = `Component,Level,Link`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    await expect(parseTable(csv)).rejects.toThrow("No data rows found in table");
  });

  it("calls mapColumnsByLLM with headers", async () => {
    const csv = `Component Name,Component Level,Figma URL
Button,Atom,https://figma.com/button`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    await parseTable(csv);

    expect(mapper.mapColumnsByLLM).toHaveBeenCalledWith([
      "Component Name",
      "Component Level",
      "Figma URL",
    ]);
  });

  it("handles mixed case headers", async () => {
    const csv = `COMPONENT,level,Figma_Link
Button,Atom,https://figma.com/button`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    const result = await parseTable(csv);

    expect(result[0]).toEqual({
      component: "Button",
      level: "Atom",
      figmaNodeLink: "https://figma.com/button",
    });
  });

  it("handles quoted fields correctly", async () => {
    const csv = `Component,Level,Link
"Button (Primary)",Atom,https://figma.com/button?node=123
"Input, Text Field",Atom,https://figma.com/input`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    const result = await parseTable(csv);

    // CSV parser should remove quotes
    expect(result[0].component).toBe("Button (Primary)");
    expect(result[0].figmaNodeLink).toBe("https://figma.com/button?node=123");
    expect(result[1].component).toBe("Input, Text Field");
  });

  it("handles backwards compatibility with 3-column CSV", async () => {
    const csv = `Component,Level,Figma Link
Button,Atom,https://figma.com/button`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });

    const result = await parseTable(csv);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      component: "Button",
      level: "Atom",
      figmaNodeLink: "https://figma.com/button",
    });
  });

  it("handles single dependency without comma", async () => {
    const csv = `Component,Level,Dependencies,Link
Card,Molecule,Button,https://figma.com/card`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      dependencies: 2,
      figmaNodeLink: 3,
    });

    const result = await parseTable(csv);

    expect(result[0].dependencies).toEqual(["Button"]);
  });

  it("handles rows with fewer columns than headers", async () => {
    const csv = `Component,Level,Link
Button,Atom
Input,Molecule,https://figma.com/input`;
    const mockMapping = { component: 0, level: 1, figmaNodeLink: 2 };
    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue(mockMapping);
    const result = await parseTable(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      component: "Button",
      level: "Atom",
      figmaNodeLink: "",
    });
    expect(result[1]).toEqual({
      component: "Input",
      level: "Molecule",
      figmaNodeLink: "https://figma.com/input",
    });
  });

  it("filters out empty dependency values", async () => {
    const csv = `Component,Level,Dependencies,Link
Card,Molecule,"Button, , Icon,  ",https://figma.com/card`;

    vi.mocked(mapper.mapColumnsByLLM).mockResolvedValue({
      component: 0,
      level: 1,
      dependencies: 2,
      figmaNodeLink: 3,
    });

    const result = await parseTable(csv);

    expect(result[0].dependencies).toEqual(["Button", "Icon"]);
  });
});
