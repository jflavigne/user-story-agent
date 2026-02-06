/**
 * Tests for figma-image-cache.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  FigmaImageCache,
  computeHash,
  formatAge,
  parseAge,
  type CacheConfig,
  type CacheEntry,
} from "./figma-image-cache.js";

describe("figma-image-cache", () => {
  let tempDir: string;
  let cacheConfig: CacheConfig;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "figma-cache-test-"));
    cacheConfig = {
      enabled: true,
      cacheDir: tempDir,
      maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxCacheSize: 100 * 1024 * 1024, // 100 MB
    };
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Cleanup failure is non-critical in tests
    }
  });

  describe("FigmaImageCache", () => {
    describe("init", () => {
      it("creates cache directory if missing", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        expect(existsSync(cacheConfig.cacheDir)).toBe(true);
        expect(existsSync(path.join(cacheConfig.cacheDir, "images"))).toBe(true);
      });

      it("creates metadata.json if missing", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const metadataPath = path.join(cacheConfig.cacheDir, "metadata.json");
        expect(existsSync(metadataPath)).toBe(true);

        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));
        expect(content.version).toBe("1.0");
        expect(content.entries).toEqual({});
      });

      it("recovers from corrupted metadata", async () => {
        const metadataPath = path.join(cacheConfig.cacheDir, "metadata.json");
        writeFileSync(metadataPath, "{ invalid json", "utf-8");

        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));
        expect(content.version).toBe("1.0");
        expect(content.entries).toEqual({});
      });

      it("does nothing when cache disabled", async () => {
        const disabledConfig = { ...cacheConfig, enabled: false };
        const cache = new FigmaImageCache(disabledConfig);
        await cache.init();

        // Should not throw, but may not create directory
        expect(true).toBe(true);
      });
    });

    describe("get", () => {
      it("returns null for cache miss", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const result = await cache.get("NonExistentComponent");
        expect(result).toBeNull();
      });

      it("returns entry for cache hit", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        // Create image file
        const imagePath = path.join(cacheConfig.cacheDir, entry.imagePath);
        writeFileSync(imagePath, Buffer.from("fake image"));

        await cache.set("Button", entry);

        const result = await cache.get("Button");
        expect(result).toEqual(entry);
      });

      it("returns null for stale entry (age > maxCacheAge)", async () => {
        const shortCacheConfig = {
          ...cacheConfig,
          maxCacheAge: 100, // 100ms
        };
        const cache = new FigmaImageCache(shortCacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date(Date.now() - 200).toISOString(), // 200ms ago
          fileSize: 1024,
        };

        // Create image file
        const imagePath = path.join(cacheConfig.cacheDir, entry.imagePath);
        writeFileSync(imagePath, Buffer.from("fake image"));

        await cache.set("Button", entry);

        const result = await cache.get("Button");
        expect(result).toBeNull(); // Stale
      });

      it("returns null when cached file deleted from disk", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        await cache.set("Button", entry);
        // Note: We didn't create the actual image file

        const result = await cache.get("Button");
        expect(result).toBeNull();
      });

      it("returns null when cache disabled", async () => {
        const disabledConfig = { ...cacheConfig, enabled: false };
        const cache = new FigmaImageCache(disabledConfig);
        await cache.init();

        const result = await cache.get("Button");
        expect(result).toBeNull();
      });
    });

    describe("set", () => {
      it("saves entry to metadata", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        await cache.set("Button", entry);

        const metadataPath = path.join(cacheConfig.cacheDir, "metadata.json");
        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));
        expect(content.entries["Button"]).toEqual(entry);
      });

      it("updates existing entry", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry1: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "old-hash",
          imagePath: "images/button-old.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        await cache.set("Button", entry1);

        const entry2: CacheEntry = {
          ...entry1,
          hash: "new-hash",
          imagePath: "images/button-new.png",
        };

        await cache.set("Button", entry2);

        const metadataPath = path.join(cacheConfig.cacheDir, "metadata.json");
        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));
        expect(content.entries["Button"].hash).toBe("new-hash");
      });

      it("does nothing when cache disabled", async () => {
        const disabledConfig = { ...cacheConfig, enabled: false };
        const cache = new FigmaImageCache(disabledConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        await cache.set("Button", entry);

        // Should not throw
        expect(true).toBe(true);
      });
    });

    describe("invalidate", () => {
      it("removes entry from metadata", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        await cache.set("Button", entry);
        await cache.invalidate("Button");

        const metadataPath = path.join(cacheConfig.cacheDir, "metadata.json");
        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));
        expect(content.entries["Button"]).toBeUndefined();
      });

      it("deletes image file from disk", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC123",
          hash: "a1b2c3",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        const imagePath = path.join(cacheConfig.cacheDir, entry.imagePath);
        writeFileSync(imagePath, Buffer.from("fake image"));

        await cache.set("Button", entry);
        await cache.invalidate("Button");

        expect(existsSync(imagePath)).toBe(false);
      });

      it("handles missing entry gracefully", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        await expect(cache.invalidate("NonExistent")).resolves.not.toThrow();
      });
    });

    describe("invalidateFile", () => {
      it("removes all entries with matching fileKey", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry1: CacheEntry = {
          nodeId: "123:456",
          fileKey: "FILE-ABC",
          hash: "hash1",
          imagePath: "images/button.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 1024,
        };

        const entry2: CacheEntry = {
          nodeId: "789:012",
          fileKey: "FILE-ABC",
          hash: "hash2",
          imagePath: "images/input.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 2048,
        };

        const entry3: CacheEntry = {
          nodeId: "345:678",
          fileKey: "FILE-XYZ",
          hash: "hash3",
          imagePath: "images/card.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 3072,
        };

        await cache.set("Button", entry1);
        await cache.set("Input", entry2);
        await cache.set("Card", entry3);

        await cache.invalidateFile("FILE-ABC");

        const metadataPath = path.join(cacheConfig.cacheDir, "metadata.json");
        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));

        expect(content.entries["Button"]).toBeUndefined();
        expect(content.entries["Input"]).toBeUndefined();
        expect(content.entries["Card"]).toBeDefined();
      });
    });

    describe("cleanup", () => {
      it("removes entries older than maxCacheAge", async () => {
        const shortCacheConfig = {
          ...cacheConfig,
          maxCacheAge: 100, // 100ms
        };
        const cache = new FigmaImageCache(shortCacheConfig);
        await cache.init();

        const oldEntry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC",
          hash: "old",
          imagePath: "images/old.png",
          downloadedAt: new Date(Date.now() - 200).toISOString(),
          fileSize: 1024,
        };

        const newEntry: CacheEntry = {
          nodeId: "789:012",
          fileKey: "ABC",
          hash: "new",
          imagePath: "images/new.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 2048,
        };

        await cache.set("OldButton", oldEntry);
        await cache.set("NewButton", newEntry);

        const result = await cache.cleanup();

        expect(result.removed).toBeGreaterThan(0);

        const metadataPath = path.join(shortCacheConfig.cacheDir, "metadata.json");
        const content = JSON.parse(readFileSync(metadataPath, "utf-8"));
        expect(content.entries["OldButton"]).toBeUndefined();
        expect(content.entries["NewButton"]).toBeDefined();
      });

      it("returns correct stats", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC",
          hash: "hash",
          imagePath: "images/button.png",
          downloadedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago (stale)
          fileSize: 1024,
        };

        await cache.set("Button", entry);

        const result = await cache.cleanup();

        expect(result.removed).toBe(1);
        expect(result.bytesFreed).toBe(1024);
      });
    });

    describe("getStats", () => {
      it("returns cache statistics", async () => {
        const cache = new FigmaImageCache(cacheConfig);
        await cache.init();

        const entry1: CacheEntry = {
          nodeId: "123:456",
          fileKey: "ABC",
          hash: "hash1",
          imagePath: "images/button.png",
          downloadedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          fileSize: 1024,
        };

        const entry2: CacheEntry = {
          nodeId: "789:012",
          fileKey: "ABC",
          hash: "hash2",
          imagePath: "images/input.png",
          downloadedAt: new Date().toISOString(),
          fileSize: 2048,
        };

        await cache.set("Button", entry1);
        await cache.set("Input", entry2);

        const stats = cache.getStats();

        expect(stats.totalEntries).toBe(2);
        expect(stats.totalDiskUsage).toBe(3072);
        expect(stats.oldestEntry).toBeDefined();
        expect(stats.newestEntry).toBeDefined();
      });
    });
  });

  describe("utilities", () => {
    describe("computeHash", () => {
      it("computes SHA-256 hash", () => {
        const buffer = Buffer.from("test content");
        const hash = computeHash(buffer);

        expect(hash).toHaveLength(64); // SHA-256 = 64 hex chars
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it("produces consistent hashes", () => {
        const buffer = Buffer.from("test content");
        const hash1 = computeHash(buffer);
        const hash2 = computeHash(buffer);

        expect(hash1).toBe(hash2);
      });

      it("produces different hashes for different content", () => {
        const buffer1 = Buffer.from("content A");
        const buffer2 = Buffer.from("content B");

        const hash1 = computeHash(buffer1);
        const hash2 = computeHash(buffer2);

        expect(hash1).not.toBe(hash2);
      });
    });

    describe("formatAge", () => {
      it("formats days", () => {
        expect(formatAge(2 * 24 * 60 * 60 * 1000)).toBe("2d 0h");
      });

      it("formats hours", () => {
        expect(formatAge(5 * 60 * 60 * 1000)).toBe("5h 0m");
      });

      it("formats minutes", () => {
        expect(formatAge(15 * 60 * 1000)).toBe("15m");
      });

      it("formats seconds", () => {
        expect(formatAge(45 * 1000)).toBe("45s");
      });

      it("formats mixed units", () => {
        expect(formatAge(25 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe("1d 1h");
      });
    });

    describe("parseAge", () => {
      it("parses days", () => {
        expect(parseAge("7d")).toBe(7 * 24 * 60 * 60 * 1000);
      });

      it("parses hours", () => {
        expect(parseAge("24h")).toBe(24 * 60 * 60 * 1000);
      });

      it("parses minutes", () => {
        expect(parseAge("30m")).toBe(30 * 60 * 1000);
      });

      it("parses seconds", () => {
        expect(parseAge("60s")).toBe(60 * 1000);
      });

      it("throws on invalid format", () => {
        expect(() => parseAge("invalid")).toThrow();
        expect(() => parseAge("7")).toThrow();
        expect(() => parseAge("7x")).toThrow();
      });
    });
  });
});
