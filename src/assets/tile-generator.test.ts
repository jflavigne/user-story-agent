import { describe, it, expect } from "vitest";
import { generateTiles, generateSingleTile } from "./tile-generator.js";

describe("tile-generator path validation", () => {
  describe("generateTiles", () => {
    it("rejects null byte in inputPath", async () => {
      await expect(
        generateTiles({
          inputPath: "valid/path\0evil",
          outputDir: "/out",
          prefix: "p",
        })
      ).rejects.toThrow("Invalid input path: null bytes not allowed");
    });

    it("rejects null byte in outputDir", async () => {
      await expect(
        generateTiles({
          inputPath: "/in",
          outputDir: "/out\0evil",
          prefix: "p",
        })
      ).rejects.toThrow("Invalid output directory: null bytes not allowed");
    });

    it("rejects null byte in prefix", async () => {
      await expect(
        generateTiles({
          inputPath: "/in",
          outputDir: "/out",
          prefix: "p\0evil",
        })
      ).rejects.toThrow("Invalid prefix: null bytes not allowed");
    });

    it("accepts valid paths and optional prefix", async () => {
      await expect(
        generateTiles({
          inputPath: "/in",
          outputDir: "/out",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("generateSingleTile", () => {
    it("rejects null byte in inputPath", async () => {
      await expect(
        generateSingleTile("valid\0evil", "/out/tile.png")
      ).rejects.toThrow("Invalid input path: null bytes not allowed");
    });

    it("rejects null byte in outputPath", async () => {
      await expect(
        generateSingleTile("/in/source.png", "/out\0evil/tile.png")
      ).rejects.toThrow("Invalid output path: null bytes not allowed");
    });

    it("accepts valid paths", async () => {
      await expect(
        generateSingleTile("/in/source.png", "/out/tile.png")
      ).resolves.toBeUndefined();
    });
  });
});
