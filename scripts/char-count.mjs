import { readFileSync } from 'fs';

const system = readFileSync('temp-system-prompt.txt', 'utf8');
const post = readFileSync('temp-post-processing-prompt.txt', 'utf8');

console.log(`SYSTEM_PROMPT: ${system.length} chars, ${(system.length / 4).toFixed(0)} tokens (expected: 1188)`);
console.log(`POST_PROCESSING_PROMPT: ${post.length} chars, ${(post.length / 4).toFixed(0)} tokens (expected: 1052)`);
