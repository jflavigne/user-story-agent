#!/usr/bin/env tsx
/**
 * Test confidence-based Figma component detection
 */

import { config } from 'dotenv';
import { calculateComponentConfidence } from '../src/utils/figma-detection.js';

config();

console.log('=== Confidence-Based Component Detection ===\n');

// Test different component candidates
const candidates = [
  {
    name: 'Button/Primary',
    isApiComponent: true,
    description: 'Primary action button with hover states',
  },
  {
    name: 'ORG - FilterSheet',
    isApiComponent: false,
    type: 'SECTION',
    childCount: 5,
  },
  {
    name: 'MOL - FilterGroup ✅',
    isApiComponent: true,
    description: 'Groups related filter items',
  },
  {
    name: 'Random Frame',
    type: 'FRAME',
    childCount: 2,
  },
  {
    name: 'Card-Large-Variant-1',
    isApiComponent: false,
    description: '',
    childCount: 8,
  },
];

console.log('## Detection Results\n');

for (const candidate of candidates) {
  const result = calculateComponentConfidence(candidate);

  console.log(`\n**${candidate.name}**`);
  console.log(`  Confidence: ${result.confidence}%`);
  console.log(`  Signals: ${result.signals.join(', ')}`);

  if (result.confidence >= 80) {
    console.log('  → HIGH confidence ✓✓');
  } else if (result.confidence >= 50) {
    console.log('  → MEDIUM confidence ✓');
  } else {
    console.log('  → LOW confidence (would be filtered out)');
  }
}

console.log('\n\n## How Confidence Works\n');
console.log('Multiple detection signals are combined:');
console.log('  - Figma Component API: +80 points (definitive)');
console.log('  - Atomic design pattern (ORG/MOL/ATOM): +40 points');
console.log('  - Common component name (button/card/input): +30 points');
console.log('  - SECTION node type: +30 points');
console.log('  - Has description: +20 points');
console.log('  - Structured naming (dashes/slashes): +20 points');
console.log('  - Complexity (has children): +2-10 points\n');

console.log('Minimum threshold: 50% (only components above this are included)\n');
