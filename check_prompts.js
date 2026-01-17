const fs = require('fs');

// Read files
const validationContent = fs.readFileSync('src/prompts/iterations/validation.ts', 'utf8');
const accessibilityContent = fs.readFileSync('src/prompts/iterations/accessibility.ts', 'utf8');

// Extract prompt strings
const validationMatch = validationContent.match(/export const VALIDATION_PROMPT = `([\s\S]*?)`;/);
const accessibilityMatch = accessibilityContent.match(/export const ACCESSIBILITY_PROMPT = `([\s\S]*?)`;/);

if (validationMatch) {
  const chars = validationMatch[1].length;
  const estimatedTokens = Math.round(chars / 4);
  console.log('validation.ts:');
  console.log(`  Characters: ${chars}`);
  console.log(`  Estimated tokens: ${estimatedTokens} (target: 1338)`);
  console.log(`  Match: ${estimatedTokens === 1338 ? '✓' : '✗'}`);
}

if (accessibilityMatch) {
  const chars = accessibilityMatch[1].length;
  const estimatedTokens = Math.round(chars / 4);
  console.log('\naccessibility.ts:');
  console.log(`  Characters: ${chars}`);
  console.log(`  Estimated tokens: ${estimatedTokens} (target: 1862)`);
  console.log(`  Match: ${estimatedTokens === 1862 ? '✓' : '✗'}`);
}
