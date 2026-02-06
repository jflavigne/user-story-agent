import { readFileSync } from 'fs';

// Read user-roles.ts
const userRolesContent = readFileSync('src/prompts/iterations/user-roles.ts', 'utf8');
const userRolesMatch = userRolesContent.match(/export const USER_ROLES_PROMPT = `([\s\S]*?)`;/);
if (userRolesMatch) {
  const prompt = userRolesMatch[1];
  const charCount = prompt.length;
  const tokenEstimate = Math.round(charCount / 4);
  console.log('user-roles.ts:');
  console.log(`  Actual chars: ${charCount}`);
  console.log(`  Token estimate (chars/4): ${tokenEstimate}`);
  console.log(`  Expected: 585 tokens (~2340 chars)`);
  console.log(`  Match: ${tokenEstimate === 585 ? '✓' : '✗'}`);
  console.log(`  Difference: ${tokenEstimate - 585} tokens`);
}

// Read interactive-elements.ts
const interactiveContent = readFileSync('src/prompts/iterations/interactive-elements.ts', 'utf8');
const interactiveMatch = interactiveContent.match(/export const INTERACTIVE_ELEMENTS_PROMPT = `([\s\S]*?)`;/);
if (interactiveMatch) {
  const prompt = interactiveMatch[1];
  const charCount = prompt.length;
  const tokenEstimate = Math.round(charCount / 4);
  console.log('\ninteractive-elements.ts:');
  console.log(`  Actual chars: ${charCount}`);
  console.log(`  Token estimate (chars/4): ${tokenEstimate}`);
  console.log(`  Expected: 907 tokens (~3626 chars)`);
  console.log(`  Match: ${tokenEstimate === 907 ? '✓' : '✗'}`);
  console.log(`  Difference: ${tokenEstimate - 907} tokens`);
}
