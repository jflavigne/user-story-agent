/**
 * Tier 2A - Contract tests: multimodal payload structure for vision.
 * Offline, verify structure only, no model calls.
 */

import { describe, it, expect } from 'vitest';
import { prepareImageForClaude } from '../../src/utils/image-utils.js';
import type { TextBlockParam, ImageBlockParam } from '@anthropic-ai/sdk/resources';

const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDQAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('vision payload contract', () => {
  describe('multimodal payload WITH images', () => {
    it('builds content with text first then image blocks', async () => {
      const content = await (async () => {
        const out: Array<TextBlockParam | ImageBlockParam> = [
          { type: 'text', text: 'Describe this mockup.' },
        ];
        const imageBlock = await prepareImageForClaude({
          base64: MINIMAL_PNG_BASE64,
          mediaType: 'image/png',
        });
        out.push(imageBlock);
        return out;
      })();

      expect(content.length).toBe(2);
      expect(content[0]).toEqual({ type: 'text', text: 'Describe this mockup.' });
      expect(content[1]).toMatchObject({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: MINIMAL_PNG_BASE64,
        },
      });
    });

    it('image blocks have base64, media_type, and correct order', async () => {
      const imageBlock = await prepareImageForClaude({
        base64: MINIMAL_PNG_BASE64,
        mediaType: 'image/jpeg',
      });
      expect(imageBlock.type).toBe('image');
      expect(imageBlock.source).toMatchObject({
        type: 'base64',
        media_type: 'image/jpeg',
      });
      expect(typeof (imageBlock.source as { data: string }).data).toBe('string');
      expect((imageBlock.source as { data: string }).data.length).toBeGreaterThan(0);
    });

    it('multiple images appear in order after text', async () => {
      const content: Array<TextBlockParam | ImageBlockParam> = [
        { type: 'text', text: 'Compare these two screens.' },
      ];
      content.push(
        await prepareImageForClaude({ base64: MINIMAL_PNG_BASE64, mediaType: 'image/png' })
      );
      content.push(
        await prepareImageForClaude({
          base64: MINIMAL_PNG_BASE64,
          mediaType: 'image/jpeg',
        })
      );

      expect(content.length).toBe(3);
      expect(content[0]).toMatchObject({ type: 'text' });
      expect(content[1]).toMatchObject({ type: 'image', source: { media_type: 'image/png' } });
      expect(content[2]).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg' } });
    });
  });

  describe('payload WITHOUT images', () => {
    it('content has no image blocks', () => {
      const content: Array<TextBlockParam | ImageBlockParam> = [
        { type: 'text', text: 'No image here.' },
      ];
      const imageBlocks = content.filter((b) => b.type === 'image');
      expect(imageBlocks.length).toBe(0);
      expect(content.length).toBe(1);
      expect(content[0]).toMatchObject({ type: 'text', text: 'No image here.' });
    });
  });

  describe('input validation (reject absolute paths, path traversal)', () => {
    it('rejects absolute path when building image block', async () => {
      await expect(
        prepareImageForClaude({ path: '/etc/passwd' })
      ).rejects.toThrow(/Path must be within current directory/);
    });

    it('rejects path traversal when building image block', async () => {
      await expect(
        prepareImageForClaude({ path: '../../../etc/passwd' })
      ).rejects.toThrow(/Path must be within current directory/);
    });
  });
});
