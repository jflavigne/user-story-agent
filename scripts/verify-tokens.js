const fs = require('fs');

// Read system.ts
const systemContent = fs.readFileSync('src/prompts/system.ts', 'utf8');
const systemMatch = systemContent.match(/export const SYSTEM_PROMPT = `([\s\S]*?)`;/);
if (systemMatch) {
  const systemChars = systemMatch[1].length;
  const systemEstimate = systemChars / 4;
  console.log('SYSTEM_PROMPT:');
  console.log(`  Characters: ${systemChars}`);
  console.log(`  Token estimate (chars/4): ${systemEstimate.toFixed(2)}`);
  console.log(`  Expected: 1188`);
  console.log(`  Match: ${Math.round(systemEstimate) === 1188 ? '✓' : '✗'}`);
}

// Read post-processing.ts
const postContent = fs.readFileSync('src/prompts/post-processing.ts', 'utf8');
const postMatch = postContent.match(/export const POST_PROCESSING_PROMPT = `([\s\S]*?)`;/);
if (postMatch) {
  const postChars = postMatch[1].length;
  const postEstimate = postChars / 4;
  console.log('\nPOST_PROCESSING_PROMPT:');
  console.log(`  Characters: ${postChars}`);
  console.log(`  Token estimate (chars/4): ${postEstimate.toFixed(2)}`);
  console.log(`  Expected: 1052`);
  console.log(`  Match: ${Math.round(postEstimate) === 1052 ? '✓' : '✗'}`);
}
