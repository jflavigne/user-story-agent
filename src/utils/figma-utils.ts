/**
 * Figma API integration for automatic component detection
 *
 * Extracts component hierarchy from Figma files and downloads individual screenshots
 */

import type { ImageBlockParam } from '@anthropic-ai/sdk/resources';
import { calculateComponentConfidence, MIN_CONFIDENCE_THRESHOLD } from './figma-detection.js';
import { prepareImageForClaude } from './image-utils.js';
import { logger } from './logger.js';

/**
 * Image scale factor for Figma screenshots.
 * 2x provides retina resolution for high-quality screenshots without excessive file size.
 */
const FIGMA_IMAGE_SCALE = 2;

/** Figma node IDs follow pattern: digits, colons, hyphens (e.g., "123:456" or "1-2") */
const NODE_ID_PATTERN = /^[\d:-]+$/;

/** Figma document node structure (API response shape) */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  [key: string]: unknown;
}

/** Figma file API response root (has document) */
export interface FigmaDocument {
  document: FigmaNode;
}

export interface FigmaComponent {
  id: string;
  name: string;
  key: string; // Component key from Figma API
  type: 'component' | 'component_set' | 'section' | 'frame';
  description?: string;
  confidence: number; // 0-100, combined score from multiple signals
  signals: string[]; // What detection methods contributed
}

export interface FigmaFileInfo {
  fileKey: string;
  nodeId?: string;
  isValid: boolean;
}

/**
 * Extracts Figma file key and node ID from a URL or path.
 * Uses URL parsing and hostname validation to avoid accepting
 * malicious URLs like evil.com/figma.com/design/malicious.
 */
export function extractFigmaInfo(input: string): FigmaFileInfo {
  try {
    const url = new URL(input);
    if (url.hostname !== 'figma.com' && url.hostname !== 'www.figma.com') {
      return { fileKey: '', isValid: false };
    }

    const pathPatterns = [
      /^\/design\/([a-zA-Z0-9]+)/,
      /^\/file\/([a-zA-Z0-9]+)/,
      /^\/proto\/([a-zA-Z0-9]+)/,
    ];

    for (const pattern of pathPatterns) {
      const match = url.pathname.match(pattern);
      if (match?.[1]) {
        const nodeMatch = url.searchParams.get('node-id');
        return {
          fileKey: match[1],
          nodeId: nodeMatch?.replace(/-/g, ':'),
          isValid: true,
        };
      }
    }
    return { fileKey: '', isValid: false };
  } catch {
    // Not a valid URL, try file key pattern below
  }

  if (/^[a-zA-Z0-9]{15,25}$/.test(input)) {
    return { fileKey: input, isValid: true };
  }

  return { fileKey: '', isValid: false };
}

/**
 * Fetches all components from a Figma file using the components API
 */
export async function fetchFigmaComponents(
  fileKey: string,
  accessToken: string
): Promise<FigmaComponent[]> {
  if (!accessToken || accessToken.trim().length === 0) {
    throw new Error('Figma access token is required but not provided');
  }
  if (!fileKey || fileKey.trim().length === 0) {
    throw new Error('Figma file key is required but not provided');
  }

  const components: FigmaComponent[] = [];

  // Fetch components from the dedicated API endpoint
  const componentsUrl = `https://api.figma.com/v1/files/${fileKey}/components`;
  const componentsResponse = await fetch(componentsUrl, {
    headers: { 'X-Figma-Token': accessToken },
  });

  if (!componentsResponse.ok) {
    throw new Error(`Figma components API error: ${componentsResponse.status}`);
  }

  const componentsData = (await componentsResponse.json()) as {
    meta?: {
      components?: Array<{
        key: string;
        name: string;
        description: string;
        node_id: string;
      }>;
    };
  };

  if (!Array.isArray(componentsData?.meta?.components)) {
    throw new Error('Figma components API returned unexpected response shape');
  }

  // Add all components with confidence scoring
  // Type assertion safe here: we validated the array above
  const validatedComponents = componentsData.meta.components!;
  for (const comp of validatedComponents) {
    const { confidence, signals } = calculateComponentConfidence({
      isApiComponent: true,
      name: comp.name,
      description: comp.description,
    });

    components.push({
      id: comp.node_id,
      key: comp.key,
      name: comp.name,
      type: 'component',
      description: comp.description || undefined,
      confidence,
      signals,
    });
  }

  // Also fetch component sets (variants)
  let setsData: {
    meta?: {
      component_sets?: Array<{
        key: string;
        name: string;
        description: string;
        node_id: string;
      }>;
    };
  } | null = null;
  let setsResponse: Response | null = null;
  try {
    const componentSetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    setsResponse = await fetch(componentSetsUrl, {
      headers: { 'X-Figma-Token': accessToken },
    });
  } catch (error) {
    logger.warn(`[Figma] Component sets API request failed: ${String(error)}`);
  }

  if (setsResponse?.ok) {
    setsData = (await setsResponse.json()) as {
      meta?: {
        component_sets?: Array<{
          key: string;
          name: string;
          description: string;
          node_id: string;
        }>;
      };
    };
    if (!Array.isArray(setsData?.meta?.component_sets)) {
      throw new Error('Figma component_sets API returned unexpected response shape');
    }

    // Type assertion safe here: we validated the array above
    const validatedComponentSets = setsData.meta.component_sets!;
    for (const set of validatedComponentSets) {
      const { confidence, signals } = calculateComponentConfidence({
        isApiComponentSet: true,
        name: set.name,
        description: set.description,
      });

      components.push({
        id: set.node_id,
        key: set.key,
        name: set.name,
        type: 'component_set',
        description: set.description || undefined,
        confidence,
        signals,
      });
    }
  }

  return components;
}

/**
 * Fallback: Parses sections/frames from file structure when no components found
 */
function parseSectionsFromFileData(fileData: FigmaDocument): FigmaComponent[] {
  const sections: FigmaComponent[] = [];

  function traverseNode(node: FigmaNode): void {
    if (!node) return;

    // Look for SECTION nodes (Figma's organizational structure)
    if (node.type === 'SECTION') {
      const childCount = Array.isArray(node.children) ? node.children.length : 0;
      const { confidence, signals } = calculateComponentConfidence({
        name: node.name,
        type: 'SECTION',
        childCount,
      });

      sections.push({
        id: node.id,
        key: node.id, // Use ID as key for sections
        name: node.name,
        type: 'section',
        confidence,
        signals,
      });
    }

    // Recursively check children
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverseNode(child);
      }
    }
  }

  traverseNode(fileData.document);
  return sections;
}

/**
 * Section with optional description for story planning (USA-78).
 * Parsed from Figma document SECTION nodes; description from first direct TEXT child.
 */
export interface FigmaSectionForPlanning {
  id: string;
  name: string;
  description?: string;
}

/**
 * Parses SECTION nodes from a Figma document with name and optional description.
 * Description is taken from the first direct child of type TEXT (characters).
 * Used by story planner to derive planned stories in bottom-up order.
 *
 * @param fileData - Figma file API response (document)
 * @returns Array of sections with id, name, and optional description
 */
export function parseSectionsWithDescriptions(fileData: FigmaDocument): FigmaSectionForPlanning[] {
  const result: FigmaSectionForPlanning[] = [];

  function traverseNode(node: FigmaNode): void {
    if (!node) return;

    if (node.type === 'SECTION') {
      let description: string | undefined;
      const children = Array.isArray(node.children) ? node.children : [];
      const textBlocks = children
        .filter((c) => c.type === 'TEXT')
        .map((c) => (c as FigmaNode & { characters?: string }).characters)
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim());
      if (textBlocks.length > 0) {
        description = textBlocks.reduce((a, b) => (a.length >= b.length ? a : b));
      }
      result.push({
        id: node.id,
        name: node.name ?? '',
        description,
      });
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverseNode(child);
      }
    }
  }

  traverseNode(fileData.document);
  return result;
}

/**
 * Downloads a screenshot from Figma using the images API
 */
export async function downloadFigmaScreenshot(
  fileKey: string,
  nodeId: string,
  accessToken: string
): Promise<Buffer> {
  if (!NODE_ID_PATTERN.test(nodeId)) {
    throw new Error(`Invalid Figma node ID format: ${nodeId}`);
  }

  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${FIGMA_IMAGE_SCALE}`;

  const response = await fetch(url, {
    headers: { 'X-Figma-Token': accessToken },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { images: Record<string, string> };
  const imageUrl = data.images[nodeId];

  if (!imageUrl) {
    throw new Error(`No image URL returned for node ${nodeId}`);
  }

  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:') {
      throw new Error('Image URL must use HTTPS');
    }

    // Allow Figma domains and Figma's S3 buckets
    const isValidHostname =
      url.hostname.includes('figma.com') ||
      /^figma-[a-z0-9-]+\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname);

    if (!isValidHostname) {
      throw new Error(`Unexpected image hostname: ${url.hostname}`);
    }
  } catch (err) {
    throw new Error(
      `Invalid image URL from Figma API: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const contentLength = imageResponse.headers.get('content-length');
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

  if (!contentLength) {
    throw new Error('Image response missing Content-Length header');
  }

  const size = parseInt(contentLength, 10);
  if (Number.isNaN(size)) {
    throw new Error('Image response has invalid Content-Length header');
  }

  if (size > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image too large: ${size} bytes (max ${MAX_IMAGE_SIZE})`
    );
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

/**
 * Automatically detects and downloads Figma components using multiple strategies
 *
 * Strategy 1: Figma Components API (most reliable - actual components)
 * Strategy 2: Sections/Frames (organizational structure)
 * Strategy 3: Name patterns (fallback for custom naming conventions)
 *
 * @param figmaUrl - Figma file URL or file key
 * @param accessToken - Figma access token from environment
 * @param getFileData - Optional function to fetch full file data for fallback detection
 * @returns Array of image blocks for each component + full page
 */
export async function autoDetectFigmaComponents(
  figmaUrl: string,
  accessToken: string,
  getFileData?: (fileKey: string) => Promise<FigmaDocument>
): Promise<{ images: ImageBlockParam[]; components: FigmaComponent[] }> {
  // Extract file info
  const fileInfo = extractFigmaInfo(figmaUrl);
  if (!fileInfo.isValid) {
    throw new Error(`Invalid Figma URL or file key: ${figmaUrl}`);
  }

  const nodeId = fileInfo.nodeId || '0:1'; // Default to page root
  let components: FigmaComponent[] = [];

  // Strategy 1: Use Figma's components API (best method)
  logger.info('[Figma] Strategy 1: Checking for components via API...');
  try {
    const apiComponents = await fetchFigmaComponents(fileInfo.fileKey, accessToken);
    components.push(...apiComponents);
    if (apiComponents.length > 0) {
      logger.info(`[Figma] Found ${apiComponents.length} components via API`);
      // Log confidence breakdown
      for (const comp of apiComponents) {
        logger.info(`  - ${comp.name} (confidence: ${comp.confidence}%, signals: ${comp.signals.join(', ')})`);
      }
    }
  } catch (error) {
    logger.warn(`[Figma] Components API failed: ${String(error)}`);
  }

  // Strategy 2: Fallback to file structure (sections/frames)
  if (getFileData) {
    logger.info('[Figma] Strategy 2: Parsing file structure for additional candidates...');
    try {
      const fileData = await getFileData(fileInfo.fileKey);
      const sections = parseSectionsFromFileData(fileData);
      if (sections.length > 0) {
        logger.info(`[Figma] Found ${sections.length} sections/frames`);
        // Merge with existing components (dedup by ID)
        const existingIds = new Set(components.map((c) => c.id));
        const newSections = sections.filter((s) => !existingIds.has(s.id));
        components.push(...newSections);
        for (const section of newSections) {
          logger.info(`  - ${section.name} (confidence: ${section.confidence}%, signals: ${section.signals.join(', ')})`);
        }
      }
    } catch (error) {
      logger.warn(
        `[Figma] File structure parsing failed for fileKey=${fileInfo.fileKey}: ${String(error)}`
      );
    }
  }

  // Filter by minimum confidence threshold
  const originalCount = components.length;
  components = components.filter((c) => c.confidence >= MIN_CONFIDENCE_THRESHOLD);
  components.sort((a, b) => b.confidence - a.confidence); // Highest confidence first

  if (components.length < originalCount) {
    logger.info(
      `[Figma] Filtered to ${components.length}/${originalCount} components (min confidence: ${MIN_CONFIDENCE_THRESHOLD}%)`
    );
  }

  const images: ImageBlockParam[] = [];

  // Download full page screenshot first (global context)
  logger.info('[Figma] Downloading full page screenshot...');
  try {
    const fullPageBuffer = await downloadFigmaScreenshot(fileInfo.fileKey, nodeId, accessToken);
    const fullPageImage = await prepareImageForClaude({
      base64: fullPageBuffer.toString('base64'),
      mediaType: 'image/png',
    });
    images.push(fullPageImage);
  } catch (error) {
    logger.warn(
      `[Figma] Failed to download full page screenshot (fileKey=${fileInfo.fileKey}, nodeId=${nodeId}): ${String(error)}`
    );
  }

  // Download individual component screenshots with rate limiting
  const DELAY_MS = 250; // 250ms delay between requests to avoid rate limits
  for (const component of components) {
    logger.info(`[Figma] Downloading ${component.type}: ${component.name}`);
    try {
      const buffer = await downloadFigmaScreenshot(fileInfo.fileKey, component.id, accessToken);
      const image = await prepareImageForClaude({
        base64: buffer.toString('base64'),
        mediaType: 'image/png',
      });
      images.push(image);

      // Rate limiting: wait before next request
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      logger.warn(`[Figma] Failed to download ${component.name}: ${String(error)}`);

      // If rate limited, wait longer before continuing
      if (error instanceof Error && error.message.includes('429')) {
        logger.warn('[Figma] Rate limited - waiting 2 seconds before retry');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  return { images, components };
}

/**
 * Creates a structured description of Figma components for the vision prompt
 */
export function createComponentContext(components: FigmaComponent[]): string {
  if (components.length === 0) {
    return '';
  }

  const byType = {
    component: [] as FigmaComponent[],
    component_set: [] as FigmaComponent[],
    section: [] as FigmaComponent[],
    frame: [] as FigmaComponent[],
  };

  for (const component of components) {
    byType[component.type].push(component);
  }

  const lines: string[] = [
    '# Figma Design Structure',
    '',
    'This design file contains the following elements:',
    '',
  ];

  if (byType.component.length > 0) {
    lines.push('## Components (Reusable Design Elements):');
    for (const comp of byType.component) {
      lines.push(`- **${comp.name}**${comp.description ? `: ${comp.description}` : ''}`);
    }
    lines.push('');
  }

  if (byType.component_set.length > 0) {
    lines.push('## Component Sets (Variants):');
    for (const comp of byType.component_set) {
      lines.push(`- **${comp.name}**${comp.description ? `: ${comp.description}` : ''}`);
    }
    lines.push('');
  }

  if (byType.section.length > 0) {
    lines.push('## Sections (Organizational Structure):');
    for (const comp of byType.section) {
      lines.push(`- ${comp.name}`);
    }
    lines.push('');
  }

  if (byType.frame.length > 0) {
    lines.push('## Frames:');
    for (const comp of byType.frame) {
      lines.push(`- ${comp.name}`);
    }
    lines.push('');
  }

  lines.push('Each component screenshot is provided separately for detailed analysis.');

  return lines.join('\n');
}
