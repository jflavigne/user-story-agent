/**
 * Skill Loader
 * 
 * Loads skills from Anthropic's Agent Skills format (SKILL.md files with frontmatter)
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { parseFrontmatter } from './frontmatter.js';

/**
 * Metadata for a skill (from frontmatter)
 */
export interface SkillMetadata {
  /** Human-readable name */
  name: string;
  /** Unique identifier */
  id: string;
  /** Description of what this skill does */
  description: string;
  /** Category this skill belongs to */
  category: string;
  /** Order for processing (lower numbers first) */
  order: number;
  /** Optional description of when this skill applies */
  applicableWhen?: string;
  /** Product types this skill applies to, or 'all' */
  applicableTo?: string[] | 'all';
}

/**
 * A loaded skill with its metadata and prompt content
 */
export interface LoadedSkill {
  /** Parsed frontmatter metadata */
  metadata: SkillMetadata;
  /** The prompt content (after frontmatter) */
  prompt: string;
  /** Map of reference file names to their content */
  references: Map<string, string>;
}

/**
 * Loads all skills from a directory
 * 
 * Skills are expected to be in subdirectories, each containing a SKILL.md file:
 * skills/
 *   skill-name/
 *     SKILL.md
 *     references/
 *       file1.md
 *       file2.md
 * 
 * @param skillsDir - Directory containing skill subdirectories
 * @returns Array of loaded skills
 */
export async function loadSkills(skillsDir: string): Promise<LoadedSkill[]> {
  const skills: LoadedSkill[] = [];
  const entries = await readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = join(skillsDir, entry.name);
    const skillFile = join(skillPath, 'SKILL.md');

    try {
      // Check if SKILL.md exists
      await stat(skillFile);
      const skill = await loadSkill(skillFile);
      skills.push(skill);
    } catch (error) {
      // Skip directories without SKILL.md
      continue;
    }
  }

  // Sort by order
  skills.sort((a, b) => a.metadata.order - b.metadata.order);

  return skills;
}

/**
 * Loads a single skill from a SKILL.md file
 * 
 * @param skillPath - Path to the SKILL.md file
 * @returns Loaded skill with metadata and prompt
 */
export async function loadSkill(skillPath: string): Promise<LoadedSkill> {
  const content = await readFile(skillPath, 'utf-8');
  const { data, content: promptContent } = parseFrontmatter(content);

  // Validate required fields
  if (!data.name || !data.id || !data.description || !data.category || typeof data.order !== 'number') {
    throw new Error(
      `Invalid skill metadata in ${skillPath}. Required fields: name, id, description, category, order`
    );
  }

  const metadata: SkillMetadata = {
    name: String(data.name),
    id: String(data.id),
    description: String(data.description),
    category: String(data.category),
    order: Number(data.order),
    applicableWhen: data.applicableWhen ? String(data.applicableWhen) : undefined,
    applicableTo: parseApplicableTo(data.applicableTo),
  };

  // Load references from references/ subdirectory if it exists
  const skillDir = dirname(skillPath);
  const referencesDir = join(skillDir, 'references');
  const references = await loadReferences(referencesDir).catch(() => new Map<string, string>());

  return {
    metadata,
    prompt: promptContent.trim(),
    references,
  };
}

/**
 * Parses the applicableTo field from frontmatter
 * 
 * @param value - Value from frontmatter (string, array, or 'all')
 * @returns Parsed applicableTo value
 */
function parseApplicableTo(value: unknown): string[] | 'all' {
  if (value === 'all' || value === undefined) {
    return 'all';
  }
  if (typeof value === 'string') {
    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // Not JSON, treat as single value in array
      return [value];
    }
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return 'all';
}

/**
 * Loads reference files from a references directory
 * 
 * @param referencesDir - Path to references directory
 * @returns Map of file names to their content
 */
async function loadReferences(referencesDir: string): Promise<Map<string, string>> {
  const references = new Map<string, string>();

  try {
    const entries = await readdir(referencesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = join(referencesDir, entry.name);
        const content = await readFile(filePath, 'utf-8');
        references.set(entry.name, content);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read - return empty map
    // This is expected for skills without references
  }

  return references;
}
