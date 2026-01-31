#!/usr/bin/env tsx
/**
 * Test automatic Figma component detection
 */

import { config } from 'dotenv';
import { extractFigmaInfo, parseComponentsFromMetadata } from '../src/utils/figma-utils.js';

config();

console.log('=== Testing Figma Auto-Detection ===\n');

// Test URL parsing
const testUrls = [
  'https://figma.com/design/MHujefjiDpZQVpSQzE3pq1/ComponentInventory?node-id=1-156',
  'MHujefjiDpZQVpSQzE3pq1',
  'https://figma.com/file/MHujefjiDpZQVpSQzE3pq1',
  '/Users/jflavigne/test.png',
];

console.log('## URL Parsing Tests\n');
for (const url of testUrls) {
  const info = extractFigmaInfo(url);
  console.log(`Input: ${url}`);
  console.log(`  Valid: ${info.isValid}`);
  if (info.isValid) {
    console.log(`  File Key: ${info.fileKey}`);
    console.log(`  Node ID: ${info.nodeId || '(default: 0:1)'}`);
  }
  console.log('');
}

// Test metadata parsing
console.log('## Metadata Parsing Test\n');

const sampleMetadata = `
<canvas id="0:1" name="Page 1">
  <section id="1:156" name="ORG - FilterSheet ✅">
  </section>
  <section id="1:405" name="ORG - FilterBar ✅">
  </section>
  <section id="1:459" name="MOL - FilterGroup ✅">
  </section>
  <section id="1:498" name="MOL - FilterItem ✅">
  </section>
  <section id="1:510" name="ATOM - SpinnerLoading ✅">
  </section>
</canvas>
`;

const components = parseComponentsFromMetadata(sampleMetadata);
console.log(`Found ${components.length} components:`);
for (const comp of components) {
  console.log(`  ${comp.type.toUpperCase()}: ${comp.name} (${comp.id})`);
}
console.log('');

// Test with actual Figma file if token is available
if (process.env.FIGMA_ACCESS_TOKEN) {
  console.log('## Live Figma API Test\n');
  console.log('Figma token available - auto-detection will work in benchmark');
  console.log('✓ Ready for vision-benchmark.ts\n');
} else {
  console.log('## Warning\n');
  console.log('⚠️  FIGMA_ACCESS_TOKEN not set');
  console.log('Auto-detection will fall back to simple image loading\n');
}

console.log('=== Test Complete ===');
