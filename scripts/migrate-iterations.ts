#!/usr/bin/env tsx
/**
 * Migration script to convert iteration prompts to Anthropic Agent Skills format
 * 
 * This script reads iteration prompts from src/prompts/iterations/*.ts
 * and generates SKILL.md files in .claude/skills/user-story/
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * Mapping of iteration IDs to their metadata exports
 */
const ITERATION_MAP = [
  { id: 'user-roles', file: 'user-roles.ts', export: 'USER_ROLES_METADATA' },
  { id: 'interactive-elements', file: 'interactive-elements.ts', export: 'INTERACTIVE_ELEMENTS_METADATA' },
  { id: 'validation', file: 'validation.ts', export: 'VALIDATION_METADATA' },
  { id: 'accessibility', file: 'accessibility.ts', export: 'ACCESSIBILITY_METADATA' },
  { id: 'performance', file: 'performance.ts', export: 'PERFORMANCE_METADATA' },
  { id: 'security', file: 'security.ts', export: 'SECURITY_METADATA' },
  { id: 'responsive-web', file: 'responsive-web.ts', export: 'RESPONSIVE_WEB_METADATA' },
  { id: 'responsive-native', file: 'responsive-native.ts', export: 'RESPONSIVE_NATIVE_METADATA' },
  { id: 'language-support', file: 'language-support.ts', export: 'LANGUAGE_SUPPORT_METADATA' },
  { id: 'locale-formatting', file: 'locale-formatting.ts', export: 'LOCALE_FORMATTING_METADATA' },
  { id: 'cultural-appropriateness', file: 'cultural-appropriateness.ts', export: 'CULTURAL_APPROPRIATENESS_METADATA' },
  { id: 'analytics', file: 'analytics.ts', export: 'ANALYTICS_METADATA' },
] as const;

/**
 * Mapping from iteration-registry applicableTo to skills format
 */
const APPLICABLE_TO_MAP: Record<string, string[] | 'all'> = {
  'user-roles': 'all',
  'interactive-elements': 'all',
  'validation': 'all',
  'accessibility': 'all',
  'performance': 'all',
  'security': 'all',
  'responsive-web': ['web', 'mobile-web', 'desktop'],
  'responsive-native': ['mobile-native'],
  'language-support': 'all',
  'locale-formatting': 'all',
  'cultural-appropriateness': 'all',
  'analytics': 'all',
};

/**
 * Extracts prompt text from a TypeScript file
 */
async function extractPromptFromFile(filePath: string, promptExport: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  
  // Find the prompt export (e.g., export const USER_ROLES_PROMPT = `...`)
  // Handle both single-line and multi-line template literals
  const promptRegex = new RegExp(`export const ${promptExport}\\s*=\\s*\`([\\s\\S]*?)\`;`, 'm');
  const match = content.match(promptRegex);
  
  if (!match) {
    throw new Error(`Could not find ${promptExport} in ${filePath}`);
  }
  
  return match[1].trim();
}

/**
 * Extracts metadata from a TypeScript file
 */
async function extractMetadataFromFile(filePath: string, metadataExport: string): Promise<{
  id: string;
  name: string;
  description: string;
  category: string;
  order: number;
  applicableWhen?: string;
}> {
  const content = await readFile(filePath, 'utf-8');
  
  // Find the metadata export object
  const metadataStart = content.indexOf(`export const ${metadataExport}`);
  if (metadataStart === -1) {
    throw new Error(`Could not find ${metadataExport} in ${filePath}`);
  }

  // Find the equals sign first (to skip past type annotation)
  const equalsSign = content.indexOf('=', metadataStart);
  if (equalsSign === -1) {
    throw new Error(`Could not find assignment for ${metadataExport} in ${filePath}`);
  }

  // Find the opening brace after the equals sign
  const objectStart = content.indexOf('{', equalsSign);
  if (objectStart === -1) {
    throw new Error(`Could not find object start for ${metadataExport} in ${filePath}`);
  }
  
  // Find matching closing brace (handle nested objects)
  let braceCount = 0;
  let objectEnd = objectStart;
  for (let i = objectStart; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        objectEnd = i + 1;
        break;
      }
    }
  }
  
  const objectContent = content.substring(objectStart, objectEnd);
  
  // Extract fields using simpler regex patterns
  const idMatch = objectContent.match(/id:\s*['"]([^'"]+)['"]/);
  const nameMatch = objectContent.match(/name:\s*['"]([^'"]+)['"]/);
  const descMatch = objectContent.match(/description:\s*['"]([^'"]+)['"]/);
  const categoryMatch = objectContent.match(/category:\s*['"]([^'"]+)['"]/);
  const applicableWhenMatch = objectContent.match(/applicableWhen:\s*['"]([^'"]*)['"]/);
  const orderMatch = objectContent.match(/order:\s*(\d+)/);
  
  if (!idMatch || !nameMatch || !descMatch || !categoryMatch || !orderMatch) {
    throw new Error(`Could not extract all required fields from ${metadataExport} in ${filePath}`);
  }
  
  return {
    id: idMatch[1],
    name: nameMatch[1],
    description: descMatch[1],
    category: categoryMatch[1],
    applicableWhen: applicableWhenMatch ? applicableWhenMatch[1] : undefined,
    order: parseInt(orderMatch[1], 10),
  };
}

/**
 * Formats applicableTo for frontmatter
 */
function formatApplicableTo(applicableTo: string[] | 'all'): string {
  if (applicableTo === 'all') {
    return 'all';
  }
  return JSON.stringify(applicableTo);
}

/**
 * Generates SKILL.md content with frontmatter
 */
function generateSkillMarkdown(metadata: {
  id: string;
  name: string;
  description: string;
  category: string;
  order: number;
  applicableWhen?: string;
}, prompt: string, applicableTo: string[] | 'all'): string {
  const frontmatter: string[] = [
    '---',
    `name: ${metadata.name}`,
    `id: ${metadata.id}`,
    `description: ${metadata.description}`,
    `category: ${metadata.category}`,
    `order: ${metadata.order}`,
  ];
  
  if (metadata.applicableWhen) {
    frontmatter.push(`applicableWhen: ${metadata.applicableWhen}`);
  }
  
  frontmatter.push(`applicableTo: ${formatApplicableTo(applicableTo)}`);
  frontmatter.push('---');
  
  return frontmatter.join('\n') + '\n\n' + prompt;
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  const skillsDir = join(ROOT_DIR, '.claude', 'skills', 'user-story');
  
  // Create base directory
  await mkdir(skillsDir, { recursive: true });
  
  console.log(`Migrating iterations to ${skillsDir}...`);
  
  for (const iteration of ITERATION_MAP) {
    const iterationFile = join(ROOT_DIR, 'src', 'prompts', 'iterations', iteration.file);
    const promptExport = iteration.export.replace('_METADATA', '_PROMPT');
    
    try {
      // Extract prompt and metadata
      const [prompt, metadata] = await Promise.all([
        extractPromptFromFile(iterationFile, promptExport),
        extractMetadataFromFile(iterationFile, iteration.export),
      ]);
      
      // Get applicableTo from map
      const applicableTo = APPLICABLE_TO_MAP[iteration.id] || 'all';
      
      // Generate SKILL.md content
      const skillContent = generateSkillMarkdown(metadata, prompt, applicableTo);
      
      // Create skill directory
      const skillDir = join(skillsDir, iteration.id);
      await mkdir(skillDir, { recursive: true });
      
      // Write SKILL.md
      const skillFilePath = join(skillDir, 'SKILL.md');
      await writeFile(skillFilePath, skillContent, 'utf-8');
      
      console.log(`✓ Created ${skillFilePath}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${iteration.id}:`, error);
      throw error;
    }
  }
  
  // Create README.md for the skill family
  const readmeContent = `# User Story Iterations

This directory contains user story iteration prompts in Anthropic's Agent Skills format.

## Skills

Each skill is in its own subdirectory with a \`SKILL.md\` file containing:
- Frontmatter with metadata (name, id, description, category, order, etc.)
- The prompt content

## Available Skills

${ITERATION_MAP.map((iter) => `- **${iter.id}** - See \`${iter.id}/SKILL.md\``).join('\n')}

## Usage

These skills can be loaded using the skill loader in \`src/shared/skill-loader.ts\`:

\`\`\`typescript
import { loadSkills } from './shared/skill-loader.js';

const skills = await loadSkills('.claude/skills/user-story');
\`\`\`

## Migration

These skills were migrated from TypeScript iteration prompts in \`src/prompts/iterations/\`.
See \`scripts/migrate-iterations.ts\` for the migration script.
`;
  
  const readmePath = join(skillsDir, 'README.md');
  await writeFile(readmePath, readmeContent, 'utf-8');
  console.log(`✓ Created ${readmePath}`);
  
  console.log('\nMigration complete!');
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
