#!/usr/bin/env tsx
/**
 * Download Figma Screenshot for Benchmark
 *
 * Downloads screenshot from Figma using the Figma API
 */

import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Load .env file
config();

const FIGMA_FILE_KEY = 'MHujefjiDpZQVpSQzE3pq1';
const FIGMA_NODE_ID = '0:1';

async function downloadFigmaScreenshot() {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('ERROR: FIGMA_ACCESS_TOKEN environment variable not set');
    console.error('Get a token from: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  console.log('Downloading screenshot from Figma...');
  console.log(`File: ${FIGMA_FILE_KEY}`);
  console.log(`Node: ${FIGMA_NODE_ID}\n`);

  try {
    // Get image URL from Figma API
    const url = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${FIGMA_NODE_ID}&format=png&scale=2`;

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { images: Record<string, string> };
    const imageUrl = data.images[FIGMA_NODE_ID];

    if (!imageUrl) {
      throw new Error('No image URL returned from Figma API');
    }

    console.log('Downloading image from:', imageUrl);

    // Download the actual image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Image download error: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Ensure directory exists
    const assetsDir = join(process.cwd(), 'benchmark-assets');
    mkdirSync(assetsDir, { recursive: true });

    // Save to file
    const outputPath = join(assetsDir, 'figma-component-inventory.png');
    writeFileSync(outputPath, imageBuffer);

    console.log(`✓ Screenshot saved to: ${outputPath}`);
    console.log(`  Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

  } catch (error) {
    console.error('Failed to download screenshot:', error);
    process.exit(1);
  }
}

downloadFigmaScreenshot();
