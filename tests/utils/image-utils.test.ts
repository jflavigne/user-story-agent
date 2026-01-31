/**
 * Unit tests for image-utils (vision support)
 */

import { describe, it, expect } from 'vitest';
import { prepareImageForClaude } from '../../src/utils/image-utils.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/** Minimal 1x1 PNG in base64 (smallest valid PNG) */
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDQAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Image preprocessing (prepareImageForClaude)', () => {
  it('returns ImageBlockParam with type image and base64 source for base64 input', async () => {
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

  it('detects media type from base64 data URL', async () => {
    const dataUrl = `data:image/png;base64,${MINIMAL_PNG_BASE64}`;
    const result = await prepareImageForClaude({ base64: dataUrl });

    expect(result.source).toMatchObject({
      type: 'base64',
      media_type: 'image/png',
    });
    expect((result.source as { data: string }).data).toBe(MINIMAL_PNG_BASE64);
  });

  it('defaults to image/png for raw base64 when mediaType not provided', async () => {
    const result = await prepareImageForClaude({ base64: MINIMAL_PNG_BASE64 });

    expect(result.source).toMatchObject({
      type: 'base64',
      media_type: 'image/png',
    });
  });

  it('loads image from file path when fixture exists', async () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/mockup-login.png');
    try {
      await fs.access(fixturePath);
    } catch {
      // Fixture not present; skip (create with: node -e "require('fs').writeFileSync('tests/fixtures/mockup-login.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDQAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))")
      return;
    }

    const result = await prepareImageForClaude({ path: 'tests/fixtures/mockup-login.png' });

    expect(result.type).toBe('image');
    expect(result.source).toMatchObject({
      type: 'base64',
      media_type: 'image/png',
    });
    expect(typeof (result.source as { data: string }).data).toBe('string');
    expect((result.source as { data: string }).data.length).toBeGreaterThan(0);
  });

  it('rejects path traversal for relative path escaping cwd', async () => {
    await expect(
      prepareImageForClaude({ path: '../../../etc/passwd' })
    ).rejects.toThrow(/Path must be within current directory/);
  });

  it('accepts image/jpeg media type', async () => {
    const result = await prepareImageForClaude({
      base64: MINIMAL_PNG_BASE64,
      mediaType: 'image/jpeg',
    });
    expect(result.source).toMatchObject({ media_type: 'image/jpeg' });
  });

  it('accepts image/webp and image/gif media types', async () => {
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

  it('throws when no input source provided', async () => {
    await expect(prepareImageForClaude({})).rejects.toThrow(
      /ImageInput must provide one of/
    );
  });
});
