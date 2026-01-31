/**
 * Image preprocessing for Claude vision API
 *
 * Prepares images from path, URL, or base64 for the Anthropic API.
 * Claude vision limit: 1568x1568 pixels. Supported formats: PNG, JPG, WEBP, GIF.
 */

import type { ImageBlockParam } from '@anthropic-ai/sdk/resources';
import * as fs from 'fs/promises';
import * as path from 'path';

const CLAUDE_MAX_DIMENSION = 1568;

/** Supported image media types for Claude */
const SUPPORTED_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(s: string): s is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(s);
}

export interface ImageInput {
  /** File path to load image from */
  path?: string;
  /** HTTP(S) URL to fetch image from */
  url?: string;
  /** Base64-encoded image data */
  base64?: string;
  /** MIME type: image/png, image/jpeg, image/webp, image/gif */
  mediaType?: string;
}

const EXT_TO_MEDIA: Record<string, SupportedMediaType> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Detects media type from file extension or base64 data URL.
 */
function detectMediaType(input: ImageInput): SupportedMediaType {
  if (input.mediaType && isSupportedMediaType(input.mediaType)) {
    return input.mediaType;
  }
  if (input.path) {
    const ext = path.extname(input.path).toLowerCase();
    const mapped = EXT_TO_MEDIA[ext];
    if (mapped) return mapped;
  }
  if (input.base64) {
    const match = input.base64.match(/^data:(image\/[a-z]+);base64,/i);
    if (match && isSupportedMediaType(match[1])) return match[1];
    // Raw base64 without data URL prefix - default to PNG for safety
    return 'image/png';
  }
  if (input.url) {
    try {
      const u = new URL(input.url);
      const pathname = u.pathname.toLowerCase();
      for (const [ext, mediaTypeFromExt] of Object.entries(EXT_TO_MEDIA)) {
        if (pathname.endsWith(ext)) return mediaTypeFromExt;
      }
    } catch {
      // ignore
    }
    return 'image/png';
  }
  return 'image/png';
}

/**
 * Loads image buffer and optional metadata from path, URL, or base64.
 */
async function loadImageBuffer(input: ImageInput): Promise<{ buffer: Buffer; mediaType: SupportedMediaType }> {
  const mediaType = detectMediaType(input);

  if (input.path) {
    const resolved = path.isAbsolute(input.path)
      ? path.resolve(input.path)
      : path.resolve(process.cwd(), input.path);
    const base = path.resolve(process.cwd());

    // ALWAYS check traversal, not just for relative paths
    if (!resolved.startsWith(base)) {
      throw new Error(`Path must be within current directory: ${input.path}`);
    }

    const buffer = await fs.readFile(resolved);
    return { buffer, mediaType };
  }

  if (input.url) {
    // Validate URL to prevent SSRF
    const url = new URL(input.url);
    if (url.protocol !== 'https:') {
      throw new Error(`Only HTTPS URLs are allowed for image fetching. Got: ${url.protocol}`);
    }

    const res = await fetch(input.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mediaType };
  }

  if (input.base64) {
    let data = input.base64;
    if (data.includes(',')) {
      data = data.split(',')[1] ?? data;
    }

    // Validate data is non-empty
    if (!data || data.trim().length === 0) {
      throw new Error('Base64 image data is empty or invalid');
    }

    const buffer = Buffer.from(data, 'base64');

    // Additional validation: check buffer is not empty
    if (buffer.length === 0) {
      throw new Error('Base64 decoded to empty buffer');
    }

    return { buffer, mediaType };
  }

  throw new Error('ImageInput must provide one of: path, url, or base64');
}

/**
 * Resizes image if either dimension exceeds Claude's limit (1568px).
 * Returns buffer and metadata; uses sharp when available.
 */
async function resizeIfNeeded(
  buffer: Buffer,
  mediaType: SupportedMediaType
): Promise<{ buffer: Buffer; mediaType: SupportedMediaType }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const sharp = require('sharp') as typeof import('sharp');
    const image = sharp(buffer);
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    if (width <= CLAUDE_MAX_DIMENSION && height <= CLAUDE_MAX_DIMENSION) {
      return { buffer, mediaType };
    }

    const resized = await image
      .resize(CLAUDE_MAX_DIMENSION, CLAUDE_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    return { buffer: resized, mediaType };
  } catch (error) {
    // Log warning that image may be too large
    console.warn(
      `Warning: Could not resize image (sharp unavailable or failed). Image may exceed Claude's 1568x1568 limit.`
    );
    console.warn(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { buffer, mediaType };
  }
}

/**
 * Prepares an image for the Claude API: load, optionally resize, and return ImageBlockParam.
 * Claude vision limit: 1568x1568 pixels. Supported formats: PNG, JPG, WEBP, GIF.
 *
 * @param input - path, url, or base64 image input
 * @returns ImageBlockParam for use in messages content
 */
export async function prepareImageForClaude(input: ImageInput): Promise<ImageBlockParam> {
  const { buffer, mediaType } = await loadImageBuffer(input);
  const { buffer: finalBuffer } = await resizeIfNeeded(buffer, mediaType);
  const data = finalBuffer.toString('base64');

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data,
    },
  };
}
