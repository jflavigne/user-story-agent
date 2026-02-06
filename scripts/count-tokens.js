const fs = require('fs');

// Read system.ts
const systemContent = fs.readFileSync('src/prompts/system.ts', 'utf8');
const systemMatch = systemContent.match(/export const SYSTEM_PROMPT = `([\s\S]*?)`;/);
if (systemMatch) {
  const systemChars = systemMatch[1].length;
  const systemTokens = Math.round(systemChars / 4);
  console.log(`SYSTEM_PROMPT: ${systemChars} characters, ${systemTokens} tokens`);
}

// Read post-processing.ts
const postContent = fs.readFileSync('src/prompts/post-processing.ts', 'utf8');
const postMatch = postContent.match(/export const POST_PROCESSING_PROMPT = `([\s\S]*?)`;/);
if (postMatch) {
  const postChars = postMatch[1].length;
  const postTokens = Math.round(postChars / 4);
  console.log(`POST_PROCESSING_PROMPT: ${postChars} characters, ${postTokens} tokens`);
}
