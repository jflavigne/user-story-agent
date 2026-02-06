/**
 * Unit tests for LLM-based column mapping.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mapColumnsByLLM, clearCache } from "./llm-column-mapper.js";
import Anthropic from "@anthropic-ai/sdk";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk");

const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY;

describe("mapColumnsByLLM", () => {
  beforeEach(() => {
    clearCache();
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY !== undefined) {
      process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("maps 8-column CSV headers using LLM", async () => {
    const headers = [
      "ID",
      "Component name",
      "Family group",
      "Level",
      "Dependency",
      "Description",
      "Figma link",
      "Status",
    ];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: 0,
            component: 1,
            familyGroup: 2,
            level: 3,
            dependencies: 4,
            description: 5,
            figmaNodeLink: 6,
            status: 7,
          }),
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    const mapping = await mapColumnsByLLM(headers);

    expect(mapping).toEqual({
      id: 0,
      component: 1,
      familyGroup: 2,
      level: 3,
      dependencies: 4,
      description: 5,
      figmaNodeLink: 6,
      status: 7,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: expect.stringContaining("CSV column headers"),
        },
      ],
    });
  });

  it("maps minimal 3-column CSV headers", async () => {
    const headers = ["Component", "Level", "Figma URL"];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            familyGroup: null,
            level: 1,
            dependencies: null,
            description: null,
            figmaNodeLink: 2,
            status: null,
          }),
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    const mapping = await mapColumnsByLLM(headers);

    expect(mapping).toEqual({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });
  });

  it("caches mapping results", async () => {
    const headers = ["Component", "Level", "Link"];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            familyGroup: null,
            level: 1,
            dependencies: null,
            description: null,
            figmaNodeLink: 2,
            status: null,
          }),
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    // First call
    const mapping1 = await mapColumnsByLLM(headers);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Second call with same headers should use cache
    const mapping2 = await mapColumnsByLLM(headers);
    expect(mockCreate).toHaveBeenCalledTimes(1); // Still only 1 call

    expect(mapping1).toEqual(mapping2);
  });

  it("uses different cache keys for different headers", async () => {
    const headers1 = ["Component", "Level", "Link"];
    const headers2 = ["Name", "Tier", "URL"];

    const mockResponse1 = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            familyGroup: null,
            level: 1,
            dependencies: null,
            description: null,
            figmaNodeLink: 2,
            status: null,
          }),
        },
      ],
    };

    const mockResponse2 = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            familyGroup: null,
            level: 1,
            dependencies: null,
            description: null,
            figmaNodeLink: 2,
            status: null,
          }),
        },
      ],
    };

    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce(mockResponse1)
      .mockResolvedValueOnce(mockResponse2);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    await mapColumnsByLLM(headers1);
    await mapColumnsByLLM(headers2);

    expect(mockCreate).toHaveBeenCalledTimes(2); // Different headers = 2 calls
  });

  it("falls back to substring matching when LLM fails", async () => {
    const headers = ["Component Name", "Level", "Figma Link"];

    const mockCreate = vi.fn().mockRejectedValue(new Error("API error"));
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    const mapping = await mapColumnsByLLM(headers);

    expect(mapping).toEqual({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });
  });

  it("falls back on invalid LLM response", async () => {
    const headers = ["Component", "Level", "Link"];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: "invalid json",
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    const mapping = await mapColumnsByLLM(headers);

    expect(mapping).toEqual({
      component: 0,
      level: 1,
      figmaNodeLink: 2,
    });
  });

  it("throws when LLM fails and fallback cannot identify required columns", async () => {
    const headers = ["Column A", "Column B", "Column C"];

    const mockCreate = vi.fn().mockRejectedValue(new Error("API error"));
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    await expect(mapColumnsByLLM(headers)).rejects.toThrow(
      "LLM mapping failed and fallback could not identify required columns"
    );
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const headers = ["Component", "Level", "Link"];

    await expect(mapColumnsByLLM(headers)).rejects.toThrow(
      "ANTHROPIC_API_KEY environment variable is required"
    );
  });

  it("validates LLM response has required fields", async () => {
    const headers = ["Component", "Level", "Link"];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            // Missing level and figmaNodeLink
          }),
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    // Should fall back to substring matching
    const mapping = await mapColumnsByLLM(headers);
    expect(mapping.component).toBeDefined();
    expect(mapping.level).toBeDefined();
    expect(mapping.figmaNodeLink).toBeDefined();
  });

  it("falls back to substring matching when LLM returns empty content array", async () => {
    const headers = ["Component Name", "Level", "Figma Link"];
    const mockResponse = { content: [] };
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };
    const mapping = await mapColumnsByLLM(headers);
    expect(mapping.component).toBe(0);
    expect(mapping.level).toBe(1);
    expect(mapping.figmaNodeLink).toBe(2);
  });

  it("handles optional fields correctly", async () => {
    const headers = ["Component", "Level", "Link", "Description"];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            familyGroup: null,
            level: 1,
            dependencies: null,
            description: 3,
            figmaNodeLink: 2,
            status: null,
          }),
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    const mapping = await mapColumnsByLLM(headers);

    expect(mapping.description).toBe(3);
    expect(mapping.id).toBeUndefined();
    expect(mapping.familyGroup).toBeUndefined();
    expect(mapping.dependencies).toBeUndefined();
    expect(mapping.status).toBeUndefined();
  });
});

describe("clearCache", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("clears the mapping cache", async () => {
    clearCache();
    const headers = ["Component", "Level", "Link"];

    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: null,
            component: 0,
            familyGroup: null,
            level: 1,
            dependencies: null,
            description: null,
            figmaNodeLink: 2,
            status: null,
          }),
        },
      ],
    };

    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    (Anthropic as unknown as { prototype: { messages: { create: typeof mockCreate } } }).prototype.messages = {
      create: mockCreate,
    };

    process.env.ANTHROPIC_API_KEY = "test-key";

    // First call
    await mapColumnsByLLM(headers);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Clear cache
    clearCache();

    // Second call should hit API again
    await mapColumnsByLLM(headers);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
