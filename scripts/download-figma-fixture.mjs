#!/usr/bin/env node
/**
 * Download Figma node as PNG to tests/fixtures/figma-filter-components.png
 * Requires: FIGMA_ACCESS_TOKEN (or see guidance when missing)
 * Usage: npm run download-fixture  or  node scripts/download-figma-fixture.mjs
 * Figma fileKey="MHujefjiDpZQVpSQzE3pq1", nodeId="0:1"
 * Exit codes: 0 = success, 1 = token missing (manual action needed), 2 = API error
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_KEY = 'MHujefjiDpZQVpSQzE3pq1';
const NODE_ID = '0:1';
const OUT_PATH = path.join(__dirname, '..', 'tests', 'fixtures', 'figma-filter-components.png');

function printGuidance() {
  const figmaSettings = 'https://www.figma.com/settings';
  const figmaFile =
    'https://www.figma.com/design/MHujefjiDpZQVpSQzE3pq1/Test_Component-Inventory?node-id=0-1';

  console.error('');
  console.error('⚠️  FIGMA_ACCESS_TOKEN not set - cannot download automatically');
  console.error('');
  console.error('You have 3 options to get the real screenshot:');
  console.error('');
  console.error('┌─────────────────────────────────────────────────────────────────┐');
  console.error('│ OPTION A: Figma Personal Access Token (Recommended - 5 minutes) │');
  console.error('└─────────────────────────────────────────────────────────────────┘');
  console.error('  1. Go to Figma Settings → Personal access tokens:');
  console.error('     ' + figmaSettings);
  console.error('  2. Create a token with "File content" read access.');
  console.error('  3. Run: export FIGMA_ACCESS_TOKEN="your-token"');
  console.error('  4. Run this script again: npm run download-fixture');
  console.error('');
  console.error('┌──────────────────────────────────────────────────────────────┐');
  console.error('│ OPTION B: Manual Save via Figma MCP (Fastest - 1 minute)     │');
  console.error('└──────────────────────────────────────────────────────────────┘');
  console.error('  1. In Cursor/Claude, use the Figma MCP tool to get a screenshot');
  console.error('     of the file (node 0:1).');
  console.error('  2. Save the image from the conversation to:');
  console.error('     ' + OUT_PATH);
  console.error('  3. Verify: file size should be >10KB (not 70 bytes).');
  console.error('');
  console.error('┌──────────────────────────────────────────────────────────────┐');
  console.error('│ OPTION C: Export from Figma Desktop App (2 minutes)          │');
  console.error('└──────────────────────────────────────────────────────────────┘');
  console.error('  1. Open the file in Figma:');
  console.error('     ' + figmaFile);
  console.error('  2. Select the frame (node 0:1), right-click → Export.');
  console.error('  3. Export as PNG, save to:');
  console.error('     ' + OUT_PATH);
  console.error('');
  console.error('Verification: ls -l ' + OUT_PATH + '  (expect >10KB, not 70 bytes)');
  console.error('');
  console.error('See docs/figma-fixture-setup.md for full setup guide.');
  console.error('');
}

const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  printGuidance();
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDQAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(OUT_PATH, minimalPng);
  process.exit(1);
}

const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(NODE_ID)}&format=png`;
const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
if (!res.ok) {
  console.error('Figma API error:', res.status, await res.text());
  process.exit(2);
}
const json = await res.json();
const imageUrl = json?.images?.[NODE_ID];
if (!imageUrl) {
  console.error('No image URL in response:', json);
  process.exit(2);
}
const imageRes = await fetch(imageUrl);
if (!imageRes.ok) {
  console.error('Image fetch failed:', imageRes.status);
  process.exit(2);
}
const buffer = Buffer.from(await imageRes.arrayBuffer());
fs.writeFileSync(OUT_PATH, buffer);
const sizeKB = (buffer.length / 1024).toFixed(1);
console.log('Saved:', OUT_PATH, '(' + sizeKB + ' KB)');
if (buffer.length < 10240) {
  console.warn('Warning: file is <10KB. Expected real screenshot >10KB. Verify source.');
}
process.exit(0);
