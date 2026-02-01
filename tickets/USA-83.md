# USA-83: Add --list-iterations CLI command

## Status
Open

## Priority
P2

## Description
After USA-79, iteration prompts are loaded from .md files, but the CLI has no way to list available iterations. The `--list-skills` command shows skills (from skill-loader), not iteration prompts.

## Current Behavior
- `--list-skills` shows skills from `.claude/skills/user-story/`
- No command to list loaded iteration prompts
- Users must manually check `src/prompts/iterations/*.md`

## Desired Behavior
Add `--list-iterations` command that shows:
```
Available iterations:
  user-roles          User Roles Analysis
  interactive-elements Interactive Elements Documentation
  validation          Validation Rules
  accessibility       Accessibility Requirements
  ...
```

## Implementation
1. Add `--list-iterations` flag to CLI args
2. Add handler after `initializeIterationPrompts()`:
```typescript
if (args.listIterations) {
  const iterations = getAllIterations();
  console.log('Available iterations:');
  for (const iter of iterations) {
    console.log(`  ${iter.id.padEnd(20)} ${iter.name}`);
  }
  process.exit(0);
}
```

## Alternative
Merge with `--list-skills` to show both skills and iterations, since they serve similar purposes.

## Origin
Code review finding F7 from USA-79 implementation
