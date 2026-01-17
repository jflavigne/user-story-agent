/**
 * Unit tests for skill loader and frontmatter parser
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { parseFrontmatter } from '../../src/shared/frontmatter.js';
import { loadSkill, loadSkills } from '../../src/shared/skill-loader.js';

describe('parseFrontmatter', () => {
  it('should parse simple frontmatter', () => {
    const text = `---
name: Test Skill
id: test-skill
description: A test skill
category: test
order: 1
---

This is the content.`;
    
    const result = parseFrontmatter(text);
    expect(result.data.name).toBe('Test Skill');
    expect(result.data.id).toBe('test-skill');
    expect(result.data.description).toBe('A test skill');
    expect(result.data.category).toBe('test');
    expect(result.data.order).toBe(1);
    expect(result.content.trim()).toBe('This is the content.');
  });

  it('should parse frontmatter with quoted values', () => {
    const text = `---
name: "Test Skill"
id: 'test-skill'
description: "A test skill"
---

Content`;
    
    const result = parseFrontmatter(text);
    expect(result.data.name).toBe('Test Skill');
    expect(result.data.id).toBe('test-skill');
    expect(result.data.description).toBe('A test skill');
  });

  it('should parse numeric values as numbers', () => {
    const text = `---
order: 42
count: 100
---

Content`;
    
    const result = parseFrontmatter(text);
    expect(result.data.order).toBe(42);
    expect(result.data.count).toBe(100);
  });

  it('should handle missing frontmatter', () => {
    const text = `This is just content without frontmatter.`;
    
    const result = parseFrontmatter(text);
    expect(result.data).toEqual({});
    expect(result.content).toBe(text);
  });

  it('should handle empty frontmatter', () => {
    const text = `---
---

Content`;
    
    const result = parseFrontmatter(text);
    expect(result.data).toEqual({});
    expect(result.content.trim()).toBe('Content');
  });

  it('should handle frontmatter with comments', () => {
    const text = `---
# This is a comment
name: Test Skill
# Another comment
id: test-skill
---

Content`;
    
    const result = parseFrontmatter(text);
    expect(result.data.name).toBe('Test Skill');
    expect(result.data.id).toBe('test-skill');
  });

  it('should handle multiline content', () => {
    const text = `---
name: Test
---

Line 1
Line 2
Line 3`;
    
    const result = parseFrontmatter(text);
    expect(result.content).toBe('Line 1\nLine 2\nLine 3');
  });
});

describe('loadSkill', () => {
  const testDir = join(process.cwd(), '.test-skills');
  const skillPath = join(testDir, 'test-skill', 'SKILL.md');

  beforeEach(async () => {
    await mkdir(join(testDir, 'test-skill'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load a skill from a SKILL.md file', async () => {
    const skillContent = `---
name: Test Skill
id: test-skill
description: A test skill
category: test
order: 1
applicableWhen: When testing
applicableTo: all
---

This is the prompt content.`;
    
    await writeFile(skillPath, skillContent, 'utf-8');
    
    const skill = await loadSkill(skillPath);
    expect(skill.metadata.name).toBe('Test Skill');
    expect(skill.metadata.id).toBe('test-skill');
    expect(skill.metadata.description).toBe('A test skill');
    expect(skill.metadata.category).toBe('test');
    expect(skill.metadata.order).toBe(1);
    expect(skill.metadata.applicableWhen).toBe('When testing');
    expect(skill.metadata.applicableTo).toBe('all');
    expect(skill.prompt.trim()).toBe('This is the prompt content.');
  });

  it('should load references from references directory', async () => {
    const skillContent = `---
name: Test Skill
id: test-skill
description: A test skill
category: test
order: 1
---

Prompt`;
    
    await writeFile(skillPath, skillContent, 'utf-8');
    await mkdir(join(testDir, 'test-skill', 'references'), { recursive: true });
    await writeFile(join(testDir, 'test-skill', 'references', 'ref1.md'), 'Reference 1', 'utf-8');
    await writeFile(join(testDir, 'test-skill', 'references', 'ref2.md'), 'Reference 2', 'utf-8');
    
    const skill = await loadSkill(skillPath);
    expect(skill.references.size).toBe(2);
    expect(skill.references.get('ref1.md')).toBe('Reference 1');
    expect(skill.references.get('ref2.md')).toBe('Reference 2');
  });

  it('should handle missing references directory', async () => {
    const skillContent = `---
name: Test Skill
id: test-skill
description: A test skill
category: test
order: 1
---

Prompt`;
    
    await writeFile(skillPath, skillContent, 'utf-8');
    
    const skill = await loadSkill(skillPath);
    expect(skill.references.size).toBe(0);
  });

  it('should parse applicableTo as array', async () => {
    const skillContent = `---
name: Test Skill
id: test-skill
description: A test skill
category: test
order: 1
applicableTo: ["web", "mobile"]
---

Prompt`;
    
    await writeFile(skillPath, skillContent, 'utf-8');
    
    const skill = await loadSkill(skillPath);
    expect(Array.isArray(skill.metadata.applicableTo)).toBe(true);
    expect(skill.metadata.applicableTo).toEqual(['web', 'mobile']);
  });

  it('should throw error for missing required fields', async () => {
    const skillContent = `---
name: Test Skill
id: test-skill
---

Prompt`;
    
    await writeFile(skillPath, skillContent, 'utf-8');
    
    await expect(loadSkill(skillPath)).rejects.toThrow();
  });
});

describe('loadSkills', () => {
  const testDir = join(process.cwd(), '.test-skills-dir');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load multiple skills from directory', async () => {
    // Create skill 1
    await mkdir(join(testDir, 'skill1'), { recursive: true });
    await writeFile(
      join(testDir, 'skill1', 'SKILL.md'),
      `---
name: Skill 1
id: skill1
description: First skill
category: test
order: 2
---

Prompt 1`,
      'utf-8'
    );

    // Create skill 2
    await mkdir(join(testDir, 'skill2'), { recursive: true });
    await writeFile(
      join(testDir, 'skill2', 'SKILL.md'),
      `---
name: Skill 2
id: skill2
description: Second skill
category: test
order: 1
---

Prompt 2`,
      'utf-8'
    );

    // Create directory without SKILL.md (should be skipped)
    await mkdir(join(testDir, 'not-a-skill'), { recursive: true });

    const skills = await loadSkills(testDir);
    expect(skills).toHaveLength(2);
    
    // Should be sorted by order
    expect(skills[0].metadata.id).toBe('skill2');
    expect(skills[1].metadata.id).toBe('skill1');
  });

  it('should return empty array for empty directory', async () => {
    const skills = await loadSkills(testDir);
    expect(skills).toHaveLength(0);
  });

  it('should skip directories without SKILL.md', async () => {
    await mkdir(join(testDir, 'empty-dir'), { recursive: true });
    
    const skills = await loadSkills(testDir);
    expect(skills).toHaveLength(0);
  });
});
