/**
 * Unit tests for prompt-loader.ts (iteration prompts from markdown + frontmatter)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadIterationPrompt, loadIterationPrompts } from '../../src/shared/prompt-loader.js';

describe('prompt-loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `prompt-loader-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  describe('loadIterationPrompt', () => {
    it('loads valid markdown with full frontmatter and returns LoadedIterationPrompt', async () => {
      const fixturePath = join(
        process.cwd(),
        'tests',
        'fixtures',
        'prompt-loader',
        'minimal-iteration.md'
      );
      const result = await loadIterationPrompt(fixturePath);
      expect(result.metadata.id).toBe('minimal-iteration');
      expect(result.metadata.name).toBe('Minimal Test Iteration');
      expect(result.metadata.description).toBe(
        'A minimal iteration for prompt-loader tests'
      );
      expect(result.metadata.category).toBe('quality');
      expect(result.metadata.order).toBe(99);
      expect(result.metadata.applicableWhen).toBe('When testing');
      expect(result.metadata.applicableTo).toBe('all');
      expect(result.metadata.allowedPaths).toEqual([
        'outcomeAcceptanceCriteria',
        'systemAcceptanceCriteria',
      ]);
      expect(result.metadata.outputFormat).toBe('patches');
      expect(result.metadata.supportsVision).toBe(false);
      expect(result.prompt).toContain('# Minimal prompt body');
      expect(result.prompt).toContain('This is the prompt content for testing.');
    });

    it('throws when required field is missing', async () => {
      const mdPath = join(tempDir, 'missing-id.md');
      await writeFile(
        mdPath,
        `---
name: No Id
description: Missing id
category: quality
order: 1
---

Body
`,
        'utf-8'
      );
      await expect(loadIterationPrompt(mdPath)).rejects.toThrow(/Missing required field "id"/);
    });

    it('throws when category is invalid', async () => {
      const mdPath = join(tempDir, 'bad-category.md');
      await writeFile(
        mdPath,
        `---
id: bad-cat
name: Bad Category
description: Invalid category
category: invalid-category
order: 1
---

Body
`,
        'utf-8'
      );
      await expect(loadIterationPrompt(mdPath)).rejects.toThrow(/Invalid category/);
    });

    it('normalizes applicableTo: all', async () => {
      const mdPath = join(tempDir, 'applicable-all.md');
      await writeFile(
        mdPath,
        `---
id: applicable-all
name: All
description: For all
category: quality
order: 1
applicableTo: all
---

Body
`,
        'utf-8'
      );
      const result = await loadIterationPrompt(mdPath);
      expect(result.metadata.applicableTo).toBe('all');
    });

    it('normalizes applicableTo as comma-separated list', async () => {
      const mdPath = join(tempDir, 'applicable-list.md');
      await writeFile(
        mdPath,
        `---
id: applicable-list
name: List
description: For web and desktop
category: quality
order: 1
applicableTo: web, desktop
---

Body
`,
        'utf-8'
      );
      const result = await loadIterationPrompt(mdPath);
      expect(result.metadata.applicableTo).toEqual(['web', 'desktop']);
    });

    it('allowedPaths in frontmatter (comma-separated) appear in metadata', async () => {
      const result = await loadIterationPrompt(
        join(process.cwd(), 'tests', 'fixtures', 'prompt-loader', 'minimal-iteration.md')
      );
      expect(result.metadata.allowedPaths).toBeDefined();
      expect(result.metadata.allowedPaths).toContain('outcomeAcceptanceCriteria');
      expect(result.metadata.allowedPaths).toContain('systemAcceptanceCriteria');
    });

    it('parses supportsVision true/false', async () => {
      const mdPath = join(tempDir, 'vision-true.md');
      await writeFile(
        mdPath,
        `---
id: vision-true
name: Vision
description: With vision
category: quality
order: 1
supportsVision: true
---

Body
`,
        'utf-8'
      );
      const result = await loadIterationPrompt(mdPath);
      expect(result.metadata.supportsVision).toBe(true);
    });
  });

  describe('loadIterationPrompts', () => {
    it('loads all .md files from directory and sorts by order', async () => {
      await writeFile(
        join(tempDir, 'second.md'),
        `---
id: second
name: Second
description: Second
category: quality
order: 2
---

Second body
`,
        'utf-8'
      );
      await writeFile(
        join(tempDir, 'first.md'),
        `---
id: first
name: First
description: First
category: quality
order: 1
---

First body
`,
        'utf-8'
      );
      const results = await loadIterationPrompts(tempDir);
      expect(results).toHaveLength(2);
      expect(results[0].metadata.id).toBe('first');
      expect(results[1].metadata.id).toBe('second');
    });

    it('throws on duplicate id across files', async () => {
      await writeFile(
        join(tempDir, 'a.md'),
        `---
id: dup
name: A
description: A
category: quality
order: 1
---

A
`,
        'utf-8'
      );
      await writeFile(
        join(tempDir, 'b.md'),
        `---
id: dup
name: B
description: B
category: quality
order: 2
---

B
`,
        'utf-8'
      );
      await expect(loadIterationPrompts(tempDir)).rejects.toThrow(/Duplicate iteration id "dup"/);
    });
  });
});
