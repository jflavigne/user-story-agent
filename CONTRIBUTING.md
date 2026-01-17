# Contributing to User Story Agent

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

## Getting Started

### Prerequisites

- Node.js 20.0.0+
- npm
- Git

### Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/user-story-agent.git
cd user-story-agent

# Install dependencies
npm install

# Verify setup
npm run lint && npm run typecheck && npm test
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes

Follow the coding standards below.

### 3. Test Your Changes

```bash
# Run all quality checks
npm run lint && npm run typecheck && npm test
```

### 4. Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new iteration for X"
git commit -m "fix: handle empty input in Y"
git commit -m "docs: update configuration guide"
```

Commit types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## Coding Standards

### TypeScript

```typescript
// Use explicit types
function processStory(story: string): Promise<StoryResult> { }

// Prefer interfaces for objects
interface StoryResult {
  success: boolean;
  content: string;
}

// Use const for immutable values
const MAX_RETRIES = 3;

// Use PascalCase for types/classes
class UserStoryAgent { }
type IterationId = string;

// Use camelCase for functions/variables
function validateInput(input: string) { }
const iterationCount = 5;
```

### File Organization

```typescript
// 1. External imports
import { z } from 'zod';

// 2. Internal imports
import { processStory } from './processor.js';

// 3. Type imports
import type { StoryResult } from './types.js';

// 4. Constants
const DEFAULT_TIMEOUT = 5000;

// 5. Types (if not in separate file)
interface Options { }

// 6. Implementation
export function createAgent() { }
```

### Error Handling

```typescript
// Use typed errors
class ValidationError extends AgentError {
  constructor(public field: string, message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

// Don't swallow errors
try {
  await processStory(story);
} catch (error) {
  logger.error('Processing failed', { error });
  throw error; // Re-throw or handle appropriately
}
```

### Documentation

```typescript
/**
 * Processes a user story through specified iterations.
 *
 * @param story - The input story text
 * @param options - Processing options
 * @returns The enhanced story with acceptance criteria
 * @throws {ValidationError} If story is empty
 *
 * @example
 * const result = await processStory('Login form', {
 *   iterations: ['validation', 'accessibility'],
 * });
 */
export async function processStory(
  story: string,
  options: ProcessOptions
): Promise<StoryResult> { }
```

## Adding New Iterations

### 1. Create Skill File

Create `.claude/skills/user-story/your-iteration/SKILL.md`:

```markdown
---
id: your-iteration
name: Your Iteration Name
description: Brief description of what this iteration does
category: quality
order: 15
applicableTo: all
---

# Your Iteration Name

[Instructions for Claude on how to apply this iteration]

## Focus Areas

- Focus area 1
- Focus area 2

## Output Requirements

- Requirement 1
- Requirement 2
```

### 2. Add TypeScript Metadata (Optional)

If you need synchronous loading, add to `src/prompts/iterations/`:

```typescript
// src/prompts/iterations/your-iteration.ts
export const YOUR_ITERATION_PROMPT = `
[Your prompt content]
`;

export const YOUR_ITERATION_METADATA = {
  id: 'your-iteration',
  name: 'Your Iteration Name',
  description: 'Brief description',
  prompt: YOUR_ITERATION_PROMPT,
  category: 'quality' as const,
  order: 15,
  tokenEstimate: 800,
};
```

### 3. Register in Registry

Add to `src/shared/iteration-registry.ts`:

```typescript
import { YOUR_ITERATION_METADATA } from '../prompts/iterations/your-iteration.js';

export const WORKFLOW_ORDER = [
  // ... existing iterations
  'your-iteration',
] as const;

export const ITERATION_REGISTRY = {
  // ... existing entries
  'your-iteration': {
    ...YOUR_ITERATION_METADATA,
    applicableTo: 'all', // or specific product types
  },
};
```

### 4. Add Tests

```typescript
// tests/iterations/your-iteration.test.ts
describe('your-iteration', () => {
  it('is registered in ITERATION_REGISTRY', () => {
    const iteration = getIterationById('your-iteration');
    expect(iteration).toBeDefined();
  });

  it('has required metadata', () => {
    const iteration = getIterationById('your-iteration');
    expect(iteration?.name).toBe('Your Iteration Name');
    expect(iteration?.category).toBe('quality');
  });
});
```

### 5. Generate Skill Files

```bash
npm run generate-skills
```

## Project Structure

```
user-story-agent/
├── src/
│   ├── index.ts              # Main exports
│   ├── cli.ts                # CLI implementation
│   ├── agent/                # Core agent
│   │   ├── user-story-agent.ts
│   │   ├── claude-client.ts
│   │   └── state/
│   ├── prompts/              # Prompts
│   │   └── iterations/
│   ├── shared/               # Shared utilities
│   └── utils/                # Utilities
├── tests/                    # Tests
├── docs/                     # Documentation
└── .claude/skills/           # Claude Code skills
```

## Testing

### Run Tests

```bash
# All tests
npm test

# Specific file
npm test -- tests/shared/schemas.test.ts

# With coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('feature', () => {
  it('should do something', () => {
    const result = someFunction();
    expect(result).toBe(expected);
  });
});
```

## Documentation

### Updating Docs

1. Edit files in `docs/`
2. Update `README.md` if needed
3. Verify links work

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep examples up to date
- Use tables for reference information

## Pull Request Guidelines

### PR Title

Use conventional commit format:
```
feat: add support for custom iterations
fix: handle empty product context
docs: add troubleshooting section
```

### PR Description

Include:
- What changed
- Why it changed
- How to test
- Screenshots (if UI-related)

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Types check (`npm run typecheck`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention

## Review Process

1. Automated checks run (lint, typecheck, test)
2. Maintainer reviews code
3. Address feedback
4. Merge when approved

## Questions?

- Open a [Discussion](https://github.com/jflavigne-sidlee/user-story-agent/discussions)
- Check existing [Issues](https://github.com/jflavigne-sidlee/user-story-agent/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
