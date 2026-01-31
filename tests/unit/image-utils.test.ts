/**
 * Tier 1 - Unit tests for image-utils (vision support).
 * All tests offline, no API calls.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { prepareImageForClaude } from '../../src/utils/image-utils.js';
import * as path from 'path';
import * as fs from 'fs/promises';

const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDQAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const FIXTURE_RELATIVE = 'tests/fixtures/figma-filter-components.png';

describe('image-utils (vision)', () => {
  beforeAll(async () => {
    const p = path.resolve(process.cwd(), FIXTURE_RELATIVE);
    try {
      const stat = await fs.stat(p);
      if (stat.size === 0) {
        await fs.writeFile(p, Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
      }
    } catch {
      await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
      await fs.writeFile(p, Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
    }
  });

  describe('image loading from relative paths', () => {
    it('loads image from relative path under cwd', async () => {
      const result = await prepareImageForClaude({ path: FIXTURE_RELATIVE });
      expect(result.type).toBe('image');
      expect(result.source).toMatchObject({
        type: 'base64',
        media_type: 'image/png',
      });
      expect((result.source as { data: string }).data).toBeDefined();
      expect((result.source as { data: string }).data.length).toBeGreaterThan(0);
    });
  });

  describe('resize boundary (1568px)', () => {
    it('accepts image under 1568px without error', async () => {
      const result = await prepareImageForClaude({
        base64: MINIMAL_PNG_BASE64,
        mediaType: 'image/png',
      });
      expect(result.type).toBe('image');
      expect((result.source as { data: string }).data).toBe(MINIMAL_PNG_BASE64);
    });
  });

  describe('security', () => {
    it('rejects path traversal (../)', async () => {
      await expect(
        prepareImageForClaude({ path: '../../../etc/passwd' })
      ).rejects.toThrow(/Path must be within current directory/);
    });

    it('rejects path traversal (..)', async () => {
      await expect(
        prepareImageForClaude({ path: 'tests/../../etc/passwd' })
      ).rejects.toThrow(/Path must be within current directory/);
    });

    it('rejects absolute path outside cwd', async () => {
      await expect(
        prepareImageForClaude({ path: '/etc/passwd' })
      ).rejects.toThrow(/Path must be within current directory/);
    });

    it('rejects non-HTTPS URLs', async () => {
      await expect(
        prepareImageForClaude({ url: 'http://example.com/image.png' })
      ).rejects.toThrow(/Only HTTPS URLs are allowed/);
    });

    it('rejects empty base64', async () => {
      await expect(
        prepareImageForClaude({ base64: '', mediaType: 'image/png' })
      ).rejects.toThrow(/ImageInput must provide one of/);
    });

    it('rejects base64 with only whitespace', async () => {
      await expect(
        prepareImageForClaude({ base64: '   ', mediaType: 'image/png' })
      ).rejects.toThrow(/empty or invalid/);
    });
  });

  describe('media type detection', () => {
    it('detects image/png from extension', async () => {
      const result = await prepareImageForClaude({ path: FIXTURE_RELATIVE });
      expect(result.source).toMatchObject({ media_type: 'image/png' });
    });

    it('detects image/png from base64 data URL', async () => {
      const dataUrl = `data:image/png;base64,${MINIMAL_PNG_BASE64}`;
      const result = await prepareImageForClaude({ base64: dataUrl });
      expect(result.source).toMatchObject({ media_type: 'image/png' });
    });

    it('accepts image/jpeg media type', async () => {
      const result = await prepareImageForClaude({
        base64: MINIMAL_PNG_BASE64,
        mediaType: 'image/jpeg',
      });
      expect(result.source).toMatchObject({ media_type: 'image/jpeg' });
    });

    it('accepts image/webp and image/gif', async () => {
      const webp = await prepareImageForClaude({
        base64: MINIMAL_PNG_BASE64,
        mediaType: 'image/webp',
      });
      expect(webp.source).toMatchObject({ media_type: 'image/webp' });
      const gif = await prepareImageForClaude({
        base64: MINIMAL_PNG_BASE64,
        mediaType: 'image/gif',
      });
      expect(gif.source).toMatchObject({ media_type: 'image/gif' });
    });

    it('defaults to image/png for raw base64 when mediaType not provided', async () => {
      const result = await prepareImageForClaude({ base64: MINIMAL_PNG_BASE64 });
      expect(result.source).toMatchObject({ media_type: 'image/png' });
    });
  });

  describe('base64 conversion', () => {
    it('returns ImageBlockParam with base64 source and correct structure', async () => {
      const result = await prepareImageForClaude({
        base64: MINIMAL_PNG_BASE64,
        mediaType: 'image/png',
      });
      expect(result).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: MINIMAL_PNG_BASE64,
        },
      });
    });

    it('strips data URL prefix and uses only payload for data', async () => {
      const dataUrl = `data:image/png;base64,${MINIMAL_PNG_BASE64}`;
      const result = await prepareImageForClaude({ base64: dataUrl });
      expect((result.source as { data: string }).data).toBe(MINIMAL_PNG_BASE64);
    });
  });

  describe('corrupt image handling', () => {
    it('decodes invalid base64 without throwing during decode (may throw on empty buffer)', async () => {
      const invalidBase64 = 'not-valid-base64!!!';
      const decoded = Buffer.from(invalidBase64, 'base64');
      if (decoded.length === 0) {
        await expect(
          prepareImageForClaude({ base64: '!!!', mediaType: 'image/png' })
        ).rejects.toThrow();
        return;
      }
      const result = await prepareImageForClaude({
        base64: invalidBase64,
        mediaType: 'image/png',
      });
      expect(result.type).toBe('image');
      // Base64 gets normalized (decoded then re-encoded), so expect the normalized form
      const normalizedBase64 = decoded.toString('base64');
      expect((result.source as { data: string }).data).toBe(normalizedBase64);
    });

    it('throws when no input source provided', async () => {
      await expect(prepareImageForClaude({})).rejects.toThrow(
        /ImageInput must provide one of/
      );
    });
  });
});
