/**
 * Tests for User Story Contract integration (Figma intake prompts).
 * Verifies contract is properly injected and enforced across all prompts.
 */

import { describe, it, expect } from "vitest";
import { USER_STORY_CONTRACT } from "../../src/prompts/figma-intake/user-story-contract.js";
import { USER_STORY_SYSTEM_PROMPT } from "../../src/prompts/figma-intake/system.js";
import { POST_PROCESSING_PROMPT } from "../../src/prompts/figma-intake/post-processing.js";
import { INTERACTIVE_ELEMENTS_ITERATION_PROMPT } from "../../src/prompts/figma-intake/iterations/interactive-elements.js";
import { readFileSync } from "fs";
import { join } from "path";

describe("User Story Contract Integration (Figma intake)", () => {
  describe("Contract Content", () => {
    it("defines the canonical contract text", () => {
      expect(USER_STORY_CONTRACT).toContain("USER STORY CONTRACT");
      expect(USER_STORY_CONTRACT).toContain("Primary audience");
      expect(USER_STORY_CONTRACT).toContain("Technical Reference");
    });

    it("forbids internal identifiers in user-facing sections", () => {
      expect(USER_STORY_CONTRACT).toContain("MUST NEVER");
      expect(USER_STORY_CONTRACT).toContain("internal identifiers");
    });

    it("specifies technical details section", () => {
      expect(USER_STORY_CONTRACT).toContain('Technical details may exist ONLY in a clearly separated "Technical Reference" section');
    });
  });

  describe("Pass 1: System Prompt", () => {
    it("includes the contract", () => {
      expect(USER_STORY_SYSTEM_PROMPT).toContain(USER_STORY_CONTRACT);
    });

    it("enforces the contract", () => {
      expect(USER_STORY_SYSTEM_PROMPT).toContain("You MUST generate the user story according to the contract");
    });

    it("defines Technical Reference section in template", () => {
      expect(USER_STORY_SYSTEM_PROMPT).toContain("## Technical Reference");
    });

    it("specifies Acceptance Criteria rules", () => {
      expect(USER_STORY_SYSTEM_PROMPT).toContain("Acceptance Criteria MUST describe ONLY observable user outcomes");
    });

    it("lists absolute don'ts", () => {
      expect(USER_STORY_SYSTEM_PROMPT).toContain("MUST NEVER appear in User Story");
      expect(USER_STORY_SYSTEM_PROMPT).toContain("Internal identifiers");
    });
  });

  describe("Pass 0: Functional Discovery (in orchestrator.ts)", () => {
    const orchestratorSource = readFileSync(
      join(process.cwd(), "src/pipeline/orchestrator.ts"),
      "utf-8"
    );

    it("includes the contract in discovery prompt", () => {
      expect(orchestratorSource).toContain("USER_STORY_CONTRACT");
      expect(orchestratorSource).toContain("buildFunctionalDiscoveryPrompt");
    });

    it("clarifies contract applies to generated stories", () => {
      expect(orchestratorSource).toContain("All user stories generated from it MUST obey the User Story Contract");
    });

    it("contains confidence marker containment rules", () => {
      expect(orchestratorSource).toContain("Confidence markers");
      expect(orchestratorSource).toContain("ONLY for Technical Reference");
      expect(orchestratorSource).toContain("NEVER include in user-facing sections");
    });

    it("uses Technical Reference terminology consistently", () => {
      expect(orchestratorSource).toContain("Technical Reference");
      expect(orchestratorSource).not.toContain("Technical Notes");
    });
  });

  describe("Pass 0→1: Seed Formatting (in orchestrator.ts)", () => {
    const orchestratorSource = readFileSync(
      join(process.cwd(), "src/pipeline/orchestrator.ts"),
      "utf-8"
    );

    it("includes contract reference in story generation", () => {
      expect(orchestratorSource).toContain("USER_STORY_CONTRACT");
      expect(orchestratorSource).toContain("USER_STORY_SYSTEM_PROMPT");
    });

    it("clarifies top/bottom half separation in seed instructions", () => {
      expect(orchestratorSource).toContain("TOP HALF");
      expect(orchestratorSource).toContain("BOTTOM HALF");
      expect(orchestratorSource).toContain("Technical Reference");
    });
  });

  describe("Post-Processing Prompt", () => {
    it("includes the contract", () => {
      expect(POST_PROCESSING_PROMPT).toContain(USER_STORY_CONTRACT);
    });

    it("includes verification checklist", () => {
      expect(POST_PROCESSING_PROMPT).toContain("FINAL VERIFICATION");
      expect(POST_PROCESSING_PROMPT).toContain("Acceptance Criteria contain ONLY user-observable outcomes");
      expect(POST_PROCESSING_PROMPT).toContain("NO internal identifiers");
    });

    it("includes remediation approach", () => {
      expect(POST_PROCESSING_PROMPT).toContain("REMEDIATION APPROACH");
      expect(POST_PROCESSING_PROMPT).toContain("MOVE content to the correct section");
    });
  });

  describe("Iteration Prompts", () => {
    it("includes contract in interactive elements iteration", () => {
      expect(INTERACTIVE_ELEMENTS_ITERATION_PROMPT).toContain(USER_STORY_CONTRACT);
    });

    it("clarifies where requirements should go", () => {
      expect(INTERACTIVE_ELEMENTS_ITERATION_PROMPT).toContain("User-facing requirements go in Acceptance Criteria");
      expect(INTERACTIVE_ELEMENTS_ITERATION_PROMPT).toContain("Implementation details go in Technical Reference");
    });

    it("uses Technical Reference terminology consistently", () => {
      expect(INTERACTIVE_ELEMENTS_ITERATION_PROMPT).toContain("Technical Reference");
      expect(INTERACTIVE_ELEMENTS_ITERATION_PROMPT).not.toContain("Technical Notes");
    });
  });

  describe("Terminology Consistency", () => {
    const allPrompts = [
      { name: "System Prompt", content: USER_STORY_SYSTEM_PROMPT },
      { name: "Post-Processing", content: POST_PROCESSING_PROMPT },
      { name: "Interactive Elements", content: INTERACTIVE_ELEMENTS_ITERATION_PROMPT },
    ];

    it('uses "Technical Reference" not "Technical Notes"', () => {
      allPrompts.forEach(({ name, content }) => {
        expect(content, `${name} should not contain "Technical Notes"`).not.toContain("Technical Notes");
      });
    });

    it("all prompts reference the same contract", () => {
      allPrompts.forEach(({ name, content }) => {
        expect(content, `${name} should contain contract`).toContain("USER STORY CONTRACT");
      });
    });
  });
});
