/**
 * Tests for markdown-generator.ts
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeFilename,
  generateFilename,
  buildDesignReferenceSection,
  fallbackMarkdown,
  enrichStories,
  type EnrichedStory,
} from "./markdown-generator.js";
import type { SystemWorkflowResultStub, ComponentRow } from "./types.js";
import type { PlannedStory } from "./story-adapter.js";

describe("markdown-generator", () => {
  describe("sanitizeFilename", () => {
    it("converts to lowercase and replaces spaces with hyphens", () => {
      expect(sanitizeFilename("Button Component")).toBe("button-component");
    });

    it("removes special characters except hyphens", () => {
      expect(sanitizeFilename("Search@Form#Input!")).toBe("search-form-input");
    });

    it("handles consecutive special characters", () => {
      expect(sanitizeFilename("My___Component***Name")).toBe(
        "my-component-name"
      );
    });

    it("removes leading and trailing hyphens", () => {
      expect(sanitizeFilename("--component--")).toBe("component");
    });

    it("truncates to 80 characters", () => {
      const longName = "a".repeat(100);
      expect(sanitizeFilename(longName)).toHaveLength(80);
    });

    it("handles empty strings", () => {
      expect(sanitizeFilename("")).toBe("");
    });

    it("handles strings with only special characters", () => {
      expect(sanitizeFilename("@#$%^&*()")).toBe("");
    });
  });

  describe("generateFilename", () => {
    it("pads order to 4 digits", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 5,
        componentRef: "button",
      };
      expect(generateFilename(story)).toBe("0005-button.md");
    });

    it("handles large order numbers", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 12345,
        componentRef: "button",
      };
      expect(generateFilename(story)).toBe("12345-button.md");
    });

    it("uses componentRef when available", () => {
      const story: EnrichedStory = {
        id: "story-abc",
        content: "test",
        order: 1,
        componentRef: "Search Button",
      };
      expect(generateFilename(story)).toBe("0001-search-button.md");
    });

    it("falls back to story ID when componentRef missing", () => {
      const story: EnrichedStory = {
        id: "story-xyz",
        content: "test",
        order: 10,
      };
      expect(generateFilename(story)).toBe("0010-story-xyz.md");
    });

    it("sanitizes componentRef in filename", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        componentRef: "Login@Form#Component!",
      };
      expect(generateFilename(story)).toBe("0001-login-form-component.md");
    });
  });

  describe("buildDesignReferenceSection", () => {
    it("includes component image when imagePath is set", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        componentRef: "Button",
        imagePath: "../assets/button-123.png",
      };
      const section = buildDesignReferenceSection(story);
      expect(section).toContain("### Component Preview");
      expect(section).toContain("![Button](../assets/button-123.png)");
    });

    it("omits preview section when imagePath is not set", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        componentRef: "Button",
      };
      const section = buildDesignReferenceSection(story);
      expect(section).not.toContain("### Component Preview");
      expect(section).not.toContain("![");
    });

    it("includes Figma link when figmaNodeLink is set", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        figmaNodeLink: "https://figma.com/file/abc/design?node-id=123",
      };
      const section = buildDesignReferenceSection(story);
      expect(section).toContain("**Figma:**");
      expect(section).toContain(
        "[View Component in Figma](https://figma.com/file/abc/design?node-id=123)"
      );
    });

    it("includes all metadata fields", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        componentRef: "Button",
        level: "atom",
        status: "In Progress",
      };
      const section = buildDesignReferenceSection(story);
      expect(section).toContain("**Component:** Button");
      expect(section).toContain("**Atomic Design Level:** atom");
      expect(section).toContain("**Status:** In Progress");
    });

    it("handles missing optional fields gracefully", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
      };
      const section = buildDesignReferenceSection(story);
      expect(section).toContain("**Component:** N/A");
      expect(section).toContain("**Atomic Design Level:** N/A");
      expect(section).not.toContain("**Status:**");
      expect(section).not.toContain("**Figma:**");
    });

    it("uses fallback text for missing componentRef in image alt", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        imagePath: "../assets/image.png",
      };
      const section = buildDesignReferenceSection(story);
      expect(section).toContain("![Component](../assets/image.png)");
    });
  });

  describe("fallbackMarkdown", () => {
    it("creates valid markdown structure", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "User clicks button",
        order: 1,
        componentRef: "Button",
      };
      const markdown = fallbackMarkdown(story);
      expect(markdown).toMatch(/^# Button\n\n/);
      expect(markdown).toContain("User clicks button");
      expect(markdown).toContain("## Design Reference");
    });

    it("includes story content", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "As a user, I want to submit the form",
        order: 1,
      };
      const markdown = fallbackMarkdown(story);
      expect(markdown).toContain("As a user, I want to submit the form");
    });

    it("includes design reference section", () => {
      const story: EnrichedStory = {
        id: "story-1",
        content: "test",
        order: 1,
        componentRef: "Button",
        level: "atom",
      };
      const markdown = fallbackMarkdown(story);
      expect(markdown).toContain("## Design Reference");
      expect(markdown).toContain("**Component:** Button");
      expect(markdown).toContain("**Atomic Design Level:** atom");
    });

    it("uses story ID as title when componentRef missing", () => {
      const story: EnrichedStory = {
        id: "story-abc",
        content: "test content",
        order: 1,
      };
      const markdown = fallbackMarkdown(story);
      expect(markdown).toMatch(/^# story-abc\n\n/);
    });
  });

  describe("enrichStories", () => {
    it("joins data from result, componentRows, and plannedStories", () => {
      const result: SystemWorkflowResultStub = {
        systemContext: {},
        stories: [
          {
            id: "story-1",
            content: "User story content",
            interconnections: {},
          },
        ],
        consistencyReport: { issues: [], fixes: [] },
        metadata: {
          passesCompleted: [],
          refinementRounds: 0,
          fixesApplied: 0,
          fixesFlaggedForReview: 0,
        },
      };

      const componentRows: ComponentRow[] = [
        {
          component: "Button",
          level: "atom",
          figmaNodeLink: "https://figma.com/file/abc?node-id=123",
          status: "Ready",
        },
      ];

      const plannedStories: PlannedStory[] = [
        {
          seed: "Button interaction",
          order: 5,
          componentRef: "Button",
          level: "atom",
        },
      ];

      const imageMapping = new Map<string, string>();

      const enriched = enrichStories(
        result,
        componentRows,
        plannedStories,
        imageMapping
      );

      expect(enriched).toHaveLength(1);
      expect(enriched[0].id).toBe("story-1");
      expect(enriched[0].content).toBe("User story content");
      expect(enriched[0].order).toBe(5);
      expect(enriched[0].componentRef).toBe("Button");
      expect(enriched[0].level).toBe("atom");
      expect(enriched[0].figmaNodeLink).toBe(
        "https://figma.com/file/abc?node-id=123"
      );
      expect(enriched[0].status).toBe("Ready");
    });

    it("maps componentRef to imagePath via imageMapping", () => {
      const result: SystemWorkflowResultStub = {
        systemContext: {},
        stories: [{ id: "story-1", content: "test", interconnections: {} }],
        consistencyReport: { issues: [], fixes: [] },
        metadata: {
          passesCompleted: [],
          refinementRounds: 0,
          fixesApplied: 0,
          fixesFlaggedForReview: 0,
        },
      };

      const componentRows: ComponentRow[] = [
        {
          component: "Button",
          level: "atom",
          figmaNodeLink: "https://figma.com",
        },
      ];

      const plannedStories: PlannedStory[] = [
        {
          seed: "test",
          order: 1,
          componentRef: "Button",
          level: "atom",
        },
      ];

      const imageMapping = new Map<string, string>([
        ["Button", "../assets/button-123.png"],
      ]);

      const enriched = enrichStories(
        result,
        componentRows,
        plannedStories,
        imageMapping
      );

      expect(enriched[0].imagePath).toBe("../assets/button-123.png");
    });

    it("handles missing componentRef gracefully", () => {
      const result: SystemWorkflowResultStub = {
        systemContext: {},
        stories: [{ id: "story-1", content: "test", interconnections: {} }],
        consistencyReport: { issues: [], fixes: [] },
        metadata: {
          passesCompleted: [],
          refinementRounds: 0,
          fixesApplied: 0,
          fixesFlaggedForReview: 0,
        },
      };

      const componentRows: ComponentRow[] = [];

      const plannedStories: PlannedStory[] = [
        {
          seed: "test",
          order: 1,
        },
      ];

      const imageMapping = new Map<string, string>();

      const enriched = enrichStories(
        result,
        componentRows,
        plannedStories,
        imageMapping
      );

      expect(enriched[0].componentRef).toBeUndefined();
      expect(enriched[0].figmaNodeLink).toBeUndefined();
      expect(enriched[0].imagePath).toBeUndefined();
    });

    it("handles mismatched array lengths", () => {
      const result: SystemWorkflowResultStub = {
        systemContext: {},
        stories: [
          { id: "story-1", content: "test1", interconnections: {} },
          { id: "story-2", content: "test2", interconnections: {} },
        ],
        consistencyReport: { issues: [], fixes: [] },
        metadata: {
          passesCompleted: [],
          refinementRounds: 0,
          fixesApplied: 0,
          fixesFlaggedForReview: 0,
        },
      };

      const componentRows: ComponentRow[] = [
        {
          component: "Button",
          level: "atom",
          figmaNodeLink: "https://figma.com",
        },
      ];

      const plannedStories: PlannedStory[] = [
        {
          seed: "test",
          order: 1,
          componentRef: "Button",
          level: "atom",
        },
      ];

      const imageMapping = new Map<string, string>();

      const enriched = enrichStories(
        result,
        componentRows,
        plannedStories,
        imageMapping
      );

      expect(enriched).toHaveLength(2);
      expect(enriched[0].order).toBe(1);
      expect(enriched[1].order).toBe(2); // Fallback to index + 1
    });

    it("finds matching ComponentRow by componentRef", () => {
      const result: SystemWorkflowResultStub = {
        systemContext: {},
        stories: [{ id: "story-1", content: "test", interconnections: {} }],
        consistencyReport: { issues: [], fixes: [] },
        metadata: {
          passesCompleted: [],
          refinementRounds: 0,
          fixesApplied: 0,
          fixesFlaggedForReview: 0,
        },
      };

      const componentRows: ComponentRow[] = [
        {
          component: "Input",
          level: "atom",
          figmaNodeLink: "https://figma.com/input",
          status: "Draft",
        },
        {
          component: "Button",
          level: "atom",
          figmaNodeLink: "https://figma.com/button",
          status: "Ready",
        },
      ];

      const plannedStories: PlannedStory[] = [
        {
          seed: "test",
          order: 1,
          componentRef: "Button",
          level: "atom",
        },
      ];

      const imageMapping = new Map<string, string>();

      const enriched = enrichStories(
        result,
        componentRows,
        plannedStories,
        imageMapping
      );

      expect(enriched[0].figmaNodeLink).toBe("https://figma.com/button");
      expect(enriched[0].status).toBe("Ready");
    });
  });
});
