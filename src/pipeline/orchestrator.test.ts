/**
 * Tests for orchestrator.ts: ComponentRow[] → UserStoryAgent with vision support
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ImageBlockParam } from "@anthropic-ai/sdk/resources";
import { orchestrate, imageBlockParamsToImageInputs } from "./orchestrator.js";
import type {
  OrchestratorDeps,
  OrchestratorAgentInstance,
  FigmaDetectResult,
  SystemWorkflowResultStub,
} from "./types.js";
import type { ComponentRow } from "../figma/table-parser.js";

// Mock modules (paths relative to src/pipeline/ so orchestrator's dynamic imports resolve to these)
vi.mock("../utils/figma-utils.js", () => ({
  extractFigmaInfo: vi.fn((url: string) => ({
    isValid: url.includes("figma.com"),
    fileKey: "ABC",
    nodeId: "1:1",
  })),
  downloadFigmaScreenshot: vi.fn().mockResolvedValue(Buffer.from("mock-image-data")),
}));

vi.mock("../utils/image-utils.js", () => ({
  prepareImageForClaude: vi.fn().mockResolvedValue({
    type: "image",
    source: {
      type: "base64",
      data: "mockImageData==",
      media_type: "image/png",
    },
  }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              classification: {
                canonicalNameSuggestion: "Button",
                componentType: "atom",
                uiCategory: "button",
                boundaries: "Single button component",
                basis: "observed",
              },
              userActions: [
                {
                  action: "Click button",
                  trigger: "Mouse click",
                  emittedEvent: "onClick",
                  outcome: "Action triggered",
                  basis: "observed",
                },
              ],
              stateModel: {
                states: [{ state: "default", basis: "observed" }],
                transitions: [],
                dataRequirements: [],
              },
              dataContract: {
                likelyProps: [],
                likelyEvents: [],
              },
              accessibility: {
                ariaRole: "button",
                keyboardNav: ["Enter", "Space"],
                screenReaderExpectations: "Button announces label",
                focusManagement: "Receives focus",
                basis: "standard-pattern",
              },
              edgeCases: [],
              assumptionsAndQuestions: {
                assumptions: [],
                openQuestions: [],
              },
              evidenceAnchors: {
                primaryImage: "Button mockup",
                contextImages: [],
                confidence: "high",
              },
              warnings: [],
            }),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

describe("imageBlockParamsToImageInputs", () => {
  it("converts base64 ImageBlockParam to ImageInput", () => {
    const blocks: ImageBlockParam[] = [
      {
        type: "image",
        source: {
          type: "base64",
          data: "abc123==",
          media_type: "image/png",
        },
      },
    ];

    const result = imageBlockParamsToImageInputs(blocks);

    expect(result).toEqual([
      {
        base64: "abc123==",
        mediaType: "image/png",
      },
    ]);
  });

  it("converts url ImageBlockParam to ImageInput", () => {
    const blocks: ImageBlockParam[] = [
      {
        type: "image",
        source: {
          type: "url",
          url: "https://example.com/image.png",
        },
      },
    ];

    const result = imageBlockParamsToImageInputs(blocks);

    expect(result).toEqual([{ url: "https://example.com/image.png" }]);
  });

  it("handles mixed base64 and url blocks", () => {
    const blocks: ImageBlockParam[] = [
      {
        type: "image",
        source: {
          type: "base64",
          data: "data1",
          media_type: "image/jpeg",
        },
      },
      {
        type: "image",
        source: {
          type: "url",
          url: "https://example.com/img.jpg",
        },
      },
    ];

    const result = imageBlockParamsToImageInputs(blocks);

    expect(result).toEqual([
      { base64: "data1", mediaType: "image/jpeg" },
      { url: "https://example.com/img.jpg" },
    ]);
  });

  it("returns empty array for empty input", () => {
    const result = imageBlockParamsToImageInputs([]);
    expect(result).toEqual([]);
  });
});

describe("orchestrate", () => {
  const mockRows: ComponentRow[] = [
    {
      id: "BTN-001",
      component: "Button",
      familyGroup: "Core",
      level: "1-Atom",
      dependencies: [],
      description: "Primary interactive button with hover states",
      figmaNodeLink: "https://figma.com/file/ABC?node-id=1:1",
      status: "In Progress",
    },
    {
      id: "FLD-001",
      component: "InputField",
      familyGroup: "Core",
      level: "2-Molecule",
      dependencies: ["Button"],
      description: "Text input field with validation",
      figmaNodeLink: "https://figma.com/file/ABC?node-id=2:1",
      status: "In Progress",
    },
  ];

  function createMockDeps(): OrchestratorDeps {
    const mockAgent: OrchestratorAgentInstance = {
      runSystemWorkflow: vi.fn().mockResolvedValue({
        systemContext: {},
        stories: [
          {
            id: "story-1",
            content: "# Button Story\n\nUser clicks button",
            interconnections: {},
          },
        ],
        consistencyReport: { issues: [], fixes: [] },
        metadata: {
          passesCompleted: ["Pass 0", "Pass 1"],
          refinementRounds: 0,
          fixesApplied: 0,
          fixesFlaggedForReview: 0,
        },
      } as SystemWorkflowResultStub),
    };

    const mockAutoDetect = vi.fn().mockResolvedValue({
      images: [],
      components: [],
    } as FigmaDetectResult);

    const MockAgentClass = vi.fn().mockImplementation(() => mockAgent);

    return {
      autoDetectFigmaComponents: mockAutoDetect,
      UserStoryAgent: MockAgentClass as unknown as new (
        config: unknown
      ) => OrchestratorAgentInstance,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes components with vision-first Pass 0 flow", async () => {
    const deps = createMockDeps();

    const { result, componentImages } = await orchestrate(mockRows, {
      apiKey: "test-key",
      figmaUrl: "https://figma.com/file/ABC",
      figmaToken: "test-token",
      deps,
    });

    // Verify agent was called for each component
    expect(deps.UserStoryAgent).toHaveBeenCalledTimes(2);

    // Verify agent received vision config
    expect(deps.UserStoryAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "system-workflow",
        apiKey: "test-key",
        mockupImages: expect.arrayContaining([
          expect.objectContaining({
            base64: expect.any(String),
            mediaType: "image/png",
          }),
        ]),
        productContext: expect.objectContaining({
          productType: "web",
        }),
      })
    );

    // Verify result structure
    expect(result).toMatchObject({
      stories: expect.any(Array),
      systemContext: expect.any(Object),
      consistencyReport: { issues: [], fixes: [] },
      metadata: expect.objectContaining({
        passesCompleted: expect.arrayContaining([
          "pass0-functional-discovery",
          "pass1-story-generation",
        ]),
        totalComponents: 2,
      }),
    });

    // Verify component images are tracked for markdown embedding
    expect(componentImages).toBeInstanceOf(Map);
    expect(componentImages.size).toBe(2);
    expect(componentImages.get("Button")).toBeDefined();
    expect(componentImages.get("InputField")).toBeDefined();
  });

  it("creates stub stories when images are missing", async () => {
    const deps = createMockDeps();
    const rowsWithoutFigma: ComponentRow[] = [
      {
        id: "BTN-001",
        component: "Button",
        familyGroup: "Core",
        level: "1-Atom",
        dependencies: [],
        description: "Button without Figma link",
        figmaNodeLink: "n/a",
        status: "In Progress",
      },
    ];

    const { result, componentImages } = await orchestrate(rowsWithoutFigma, {
      apiKey: "test-key",
      figmaUrl: undefined,
      figmaToken: undefined,
      deps,
    });

    // Should create stub story
    expect(result.stories).toHaveLength(1);
    expect(result.stories[0]).toMatchObject({
      id: "Button",
      content: expect.stringContaining("MISSING EVIDENCE"),
      interconnections: {},
      needsManualReview: {
        reason: "Missing visual evidence",
        score: 0,
      },
    });

    // Should NOT call agent for stub stories
    expect(deps.UserStoryAgent).not.toHaveBeenCalled();

    // Component images map has entry with empty array for stub path
    expect(componentImages.get("Button")).toEqual([]);
  });

  it("passes formatted brief as seed to runSystemWorkflow", async () => {
    const deps = createMockDeps();

    const { result } = await orchestrate([mockRows[0]], {
      apiKey: "test-key",
      figmaUrl: "https://figma.com/file/ABC",
      figmaToken: "test-token",
      deps,
    });

    const agentInstance = (deps.UserStoryAgent as unknown as ReturnType<typeof vi.fn>).mock
      .results[0].value;

    // Verify seed format includes Pass 0 brief sections
    const seedArg = (agentInstance.runSystemWorkflow as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(seedArg).toHaveLength(1);
    expect(seedArg[0]).toContain("Functional Discovery Brief");
    expect(seedArg[0]).toContain("Classification");
    expect(seedArg[0]).toContain("User Actions");
    expect(seedArg[0]).toContain("State Model");
    expect(seedArg[0]).toContain("Props & Events");
    expect(seedArg[0]).toContain("Accessibility");

    expect(result.stories).toBeDefined();
  });

  it("handles empty rows array", async () => {
    const deps = createMockDeps();

    const { result, componentImages } = await orchestrate([], {
      apiKey: "test-key",
      figmaUrl: "https://figma.com/file/ABC",
      figmaToken: "test-token",
      deps,
    });

    expect(result.stories).toEqual([]);
    expect(result.metadata.totalComponents).toBe(0);
    expect(componentImages.size).toBe(0);
    expect(deps.UserStoryAgent).not.toHaveBeenCalled();
  });

  it("processes family context images", async () => {
    const deps = createMockDeps();
    const rowsWithFamily: ComponentRow[] = [
      {
        id: "BTN-001",
        component: "PrimaryButton",
        familyGroup: "Buttons",
        level: "1-Atom",
        dependencies: [],
        description: "Primary button",
        figmaNodeLink: "https://figma.com/file/ABC?node-id=1:1",
        status: "In Progress",
      },
      {
        id: "BTN-002",
        component: "SecondaryButton",
        familyGroup: "Buttons",
        level: "1-Atom",
        dependencies: [],
        description: "Secondary button",
        figmaNodeLink: "https://figma.com/file/ABC?node-id=1:2",
        status: "In Progress",
      },
    ];

    const { result, componentImages } = await orchestrate(rowsWithFamily, {
      apiKey: "test-key",
      figmaUrl: "https://figma.com/file/ABC",
      figmaToken: "test-token",
      deps,
    });

    // Each component should be processed
    expect(deps.UserStoryAgent).toHaveBeenCalledTimes(2);
    expect(result.stories.length).toBe(2);
    expect(componentImages.size).toBe(2);
  });
});
