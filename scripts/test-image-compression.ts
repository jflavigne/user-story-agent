#!/usr/bin/env tsx
/**
 * Test image compression with updated image-utils
 */

import { prepareImageForClaude, validateTotalImageSize } from '../src/utils/image-utils.js';
import { existsSync } from 'fs';
import { join } from 'path';

async function testImageCompression() {
  console.log('=== Testing Image Compression ===\n');

  const testImages = [
    'benchmark-assets/figma-component-inventory.png',
    'benchmark-assets/components/filtersheet.png',
    'benchmark-assets/components/filterbar.png',
    'benchmark-assets/components/filtergroup.png',
  ];

  const imageBlocks = [];

  for (const imagePath of testImages) {
    const fullPath = join(process.cwd(), imagePath);

    if (!existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${imagePath} (not found)`);
      continue;
    }

    console.log(`Processing: ${imagePath}`);

    try {
      const imageBlock = await prepareImageForClaude({ path: imagePath });
      imageBlocks.push(imageBlock);

      // Calculate size
      const base64Data = imageBlock.source.type === 'base64' ? imageBlock.source.data : '';
      const sizeBytes = Buffer.from(base64Data, 'base64').length;
      const sizeKB = (sizeBytes / 1024).toFixed(1);

      console.log(`  ✓ Processed: ${sizeKB} KB`);
      console.log(`  Media type: ${imageBlock.source.media_type}`);
      console.log('');
    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
      console.log('');
    }
  }

  // Validate total size
  console.log('=== Total Size Validation ===\n');
  try {
    validateTotalImageSize(imageBlocks);
    console.log('✓ All images validated successfully');
  } catch (error) {
    console.error(`✗ Validation failed: ${error}`);
  }
}

testImageCompression().catch(console.error);
