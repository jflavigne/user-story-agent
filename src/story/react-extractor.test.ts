/**
 * Unit tests for React extractor (component name validation, props/slots deduplication).
 */

import { describe, it, expect } from "vitest";
import { extract } from "./react-extractor.js";

describe("extract", () => {
  it("uses component name when non-empty", () => {
    const result = extract("Button", [], []);
    expect(result.componentName).toBe("Button");
  });

  it("uses UnnamedComponent when component name is empty", () => {
    const result = extract("", [], []);
    expect(result.componentName).toBe("UnnamedComponent");
  });

  it("uses UnnamedComponent when component name is whitespace only", () => {
    const result = extract("   \t\n  ", [], []);
    expect(result.componentName).toBe("UnnamedComponent");
  });

  it("keeps component name as-is when non-empty (trim only used for empty check)", () => {
    const result = extract("  Card  ", [], []);
    expect(result.componentName).toBe("  Card  ");
  });

  it("deduplicates props by normalized name (lowercase, trim)", () => {
    const props = [
      { name: "onClick" },
      { name: "ONCLICK" },
      { name: "  onClick  " },
      { name: "label" },
    ];
    const result = extract("X", props, []);
    expect(result.props).toHaveLength(2);
    expect(result.props.map((p) => p.name)).toEqual(["onClick", "label"]);
  });

  it("deduplicates slots by normalized name (lowercase, trim)", () => {
    const slots = [
      { name: "header" },
      { name: "HEADER" },
      { name: "  header  " },
      { name: "footer" },
    ];
    const result = extract("X", [], slots);
    expect(result.slots).toHaveLength(2);
    expect(result.slots.map((s) => s.name)).toEqual(["header", "footer"]);
  });

  it("returns empty arrays when no props or slots", () => {
    const result = extract("C", [], []);
    expect(result.props).toEqual([]);
    expect(result.slots).toEqual([]);
  });

  it("applies both fixes together", () => {
    const props = [{ name: "a" }, { name: "A" }];
    const slots = [{ name: "default" }, { name: "DEFAULT" }];
    const result = extract("", props, slots);
    expect(result.componentName).toBe("UnnamedComponent");
    expect(result.props).toHaveLength(1);
    expect(result.slots).toHaveLength(1);
  });
});
