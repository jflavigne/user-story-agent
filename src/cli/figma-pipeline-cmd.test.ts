/**
 * Tests for figma-pipeline-cmd.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildProductContext, runFigmaPipelineCmd } from "./figma-pipeline-cmd.js";
import type { ComponentRow } from "../figma/table-parser.js";
import type {
  OrchestratorDeps,
  OrchestratorResult,
  SystemWorkflowResultStub,
} from "../pipeline/types.js";

describe("buildProductContext", () => {
  it("returns undefined when no name or description provided", () => {
    const result = buildProductContext({});
    expect(result).toBeUndefined();
  });

  it("returns context with name only", () => {
    const result = buildProductContext({ productName: "MyProduct" });
    expect(result).toEqual({ name: "MyProduct" });
  });

  it("returns context with description only", () => {
    const result = buildProductContext({ productDescription: "My desc" });
    expect(result).toEqual({ description: "My desc" });
  });

  it("returns context with both name and description", () => {
    const result = buildProductContext({
      productName: "MyProduct",
      productDescription: "My desc",
    });
    expect(result).toEqual({ name: "MyProduct", description: "My desc" });
  });
});

describe("runFigmaPipelineCmd", () => {
  const mockRows: ComponentRow[] = [
    {
      id: "BTN-001",
      component: "Button",
      familyGroup: "Core",
      level: "1-Atom",
      dependencies: [],
      description: "Primary button",
      figmaNodeLink: "https://figma.com/file/ABC?node-id=1:1",
      status: "In Progress",
    },
  ];

  const mockResult: SystemWorkflowResultStub = {
    systemContext: {},
    stories: [
      {
        id: "story-1",
        content: "User clicks button",
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
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function createMocks() {
    const mockReadFile = vi.fn().mockReturnValue("csv,content");
    const mockParseTable = vi.fn().mockResolvedValue(mockRows);

    // Mock OrchestratorResult with componentImages
    const mockOrchestratorResult: OrchestratorResult = {
      result: mockResult,
      componentImages: new Map(),
    };
    const mockOrchestrate = vi.fn().mockResolvedValue(mockOrchestratorResult);

    const mockAutoDetect = vi.fn();
    const mockAgent = vi.fn();
    const mockDeps: OrchestratorDeps = {
      autoDetectFigmaComponents: mockAutoDetect,
      UserStoryAgent: mockAgent as unknown as OrchestratorDeps["UserStoryAgent"],
    };

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readFile: mockReadFile as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseTable: mockParseTable as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orchestrate: mockOrchestrate as any,
      deps: mockDeps,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.stdout.write
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  it("reads CSV from file path", async () => {
    const mocks = createMocks();

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
      },
      mocks
    );

    expect(mocks.readFile).toHaveBeenCalledWith("test.csv", "utf-8");
  });

  it("calls parseTable with CSV content", async () => {
    const mocks = createMocks();

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
      },
      mocks
    );

    expect(mocks.parseTable).toHaveBeenCalledWith("csv,content");
  });

  it("passes figmaUrl and figmaToken to orchestrator", async () => {
    const mocks = createMocks();

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "my-api-key",
        figmaUrl: "https://figma.com/file/ABC",
        figmaToken: "figma-token-123",
      },
      mocks
    );

    expect(mocks.orchestrate).toHaveBeenCalledWith(
      mockRows,
      expect.objectContaining({
        apiKey: "my-api-key",
        figmaUrl: "https://figma.com/file/ABC",
        figmaToken: "figma-token-123",
        deps: mocks.deps,
      })
    );
  });

  it("builds ProductContext from CLI args", async () => {
    const mocks = createMocks();
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
        productName: "MyProduct",
        productDescription: "My app",
      },
      mocks
    );

    const output = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain('"name":"MyProduct"');
    expect(output).toContain('"description":"My app"');
  });

  it("outputs results to console", async () => {
    const mocks = createMocks();
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
      },
      mocks
    );

    const output = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Parsed 1 components");
    expect(output).toContain("Generated 1 user stories");
  });

  it("handles missing figmaToken gracefully", async () => {
    const mocks = createMocks();

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
        figmaUrl: "https://figma.com/file/ABC",
        // No figmaToken
      },
      mocks
    );

    expect(mocks.orchestrate).toHaveBeenCalledWith(
      mockRows,
      expect.objectContaining({
        figmaUrl: "https://figma.com/file/ABC",
        figmaToken: undefined,
      })
    );
  });

  it("handles missing productName (no ProductContext)", async () => {
    const mocks = createMocks();
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
      },
      mocks
    );

    const output = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(output).not.toContain("Product context:");
  });

  it("saves to outputDir when specified", async () => {
    const mocks = createMocks();

    // Just verify it doesn't throw - file system operations are tested in integration tests
    await expect(
      runFigmaPipelineCmd(
        {
          tablePath: "test.csv",
          apiKey: "test-key",
          outputDir: "/tmp/test-figma-pipeline-output",
        },
        mocks
      )
    ).resolves.toBeDefined();

    // Clean up test output directory
    const fs = await import("fs");
    try {
      fs.rmSync("/tmp/test-figma-pipeline-output", { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("returns SystemWorkflowResult", async () => {
    const mocks = createMocks();

    const result = await runFigmaPipelineCmd(
      {
        tablePath: "test.csv",
        apiKey: "test-key",
      },
      mocks
    );

    expect(result).toEqual(mockResult);
  });
});
