import { readFileSync } from 'fs';

// Read and extract SYSTEM_PROMPT
const systemContent = readFileSync('src/prompts/system.ts', 'utf8');
const systemMatch = systemContent.match(/export const SYSTEM_PROMPT = `([\s\S]*?)`;/);
if (systemMatch) {
  const systemChars = systemMatch[1].length;
  const systemTokens = Math.round(systemChars / 4);
  console.log(`SYSTEM_PROMPT: ${systemChars} characters, ${systemTokens} tokens`);
} else {
  console.error('Could not extract SYSTEM_PROMPT');
}

// Read and extract POST_PROCESSING_PROMPT
const postContent = readFileSync('src/prompts/post-processing.ts', 'utf8');
const postMatch = postContent.match(/export const POST_PROCESSING_PROMPT = `([\s\S]*?)`;/);
if (postMatch) {
  const postChars = postMatch[1].length;
  const postTokens = Math.round(postChars / 4);
  console.log(`POST_PROCESSING_PROMPT: ${postChars} characters, ${postTokens} tokens`);
} else {
  console.error('Could not extract POST_PROCESSING_PROMPT');
}
