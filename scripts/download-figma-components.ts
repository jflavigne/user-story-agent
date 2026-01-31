#!/usr/bin/env tsx
/**
 * Download Individual Figma Components for Benchmark
 *
 * Downloads each component as a separate screenshot for better vision analysis
 */

import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Load .env file
config();

const FIGMA_FILE_KEY = 'MHujefjiDpZQVpSQzE3pq1';

// Component node IDs from the Figma metadata
const COMPONENTS = [
  {
    id: '1:156',
    name: 'FilterSheet',
    type: 'organism',
    description: 'Mobile bottom sheet with accordion filter groups',
  },
  {
    id: '1:405',
    name: 'FilterBar',
    type: 'organism',
    description: 'Desktop horizontal filter bar',
  },
  {
    id: '1:459',
    name: 'FilterGroup',
    type: 'molecule',
    description: 'Category grouping with toggle and filter items',
  },
  {
    id: '1:498',
    name: 'FilterItem',
    type: 'molecule',
    description: 'Individual selectable filter option',
  },
  {
    id: '1:510',
    name: 'SpinnerLoading',
    type: 'atom',
    description: 'Loading spinner indicator',
  },
];

async function downloadComponent(
  accessToken: string,
  nodeId: string,
  filename: string
): Promise<void> {
  console.log(`  Downloading ${filename}...`);

  // Get image URL from Figma API
  const url = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${nodeId}&format=png&scale=2`;

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': accessToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { images: Record<string, string> };
  const imageUrl = data.images[nodeId];

  if (!imageUrl) {
    throw new Error(`No image URL returned for node ${nodeId}`);
  }

  // Download the actual image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download error: ${imageResponse.status}`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // Save to file
  writeFileSync(filename, imageBuffer);

  console.log(`    ✓ Saved (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
}

async function downloadAllComponents() {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('ERROR: FIGMA_ACCESS_TOKEN environment variable not set');
    console.error('Get a token from: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  console.log('=== Downloading Individual Figma Components ===\n');
  console.log(`File: ${FIGMA_FILE_KEY}`);
  console.log(`Components: ${COMPONENTS.length}\n`);

  // Ensure directory exists
  const componentsDir = join(process.cwd(), 'benchmark-assets', 'components');
  mkdirSync(componentsDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (const component of COMPONENTS) {
    try {
      console.log(`[${component.type.toUpperCase()}] ${component.name}`);
      console.log(`  ${component.description}`);

      const filename = join(componentsDir, `${component.name.toLowerCase()}.png`);
      await downloadComponent(accessToken, component.id, filename);

      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
      failCount++;
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log(`✓ Downloaded: ${successCount}/${COMPONENTS.length}`);
  if (failCount > 0) {
    console.log(`✗ Failed: ${failCount}`);
  }
  console.log(`\nComponents saved to: ${componentsDir}/`);
}

downloadAllComponents();
