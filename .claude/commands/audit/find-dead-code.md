# Skill: /find-dead-code

Find unreachable code and unused declarations.

## Usage

```
/find-dead-code [path]
```

**Arguments:**
- `path` (optional): Directory or file to scan. Defaults to `src/`

## What It Finds

| Pattern | Tool | Example |
|---------|------|---------|
| Unused imports | eslint | `import { unused } from 'lib'` |
| Unused variables | eslint | `const x = 1; // never read` |
| Unreachable code | tsc | Code after `return`/`throw` |
| Unused exports | ts-prune | `export function unused()` |

## Implementation

### 1. ESLint Rules

```bash
npx eslint src/ --rule '@typescript-eslint/no-unused-vars: error'
```

### 2. TypeScript Compiler

```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

### 3. ast-grep for structural patterns

```yaml
# Code after return
id: unreachable-after-return
language: typescript
rule:
  kind: statement_block
  has:
    kind: return_statement
    follows:
      kind: expression_statement
```

## Example Output

```
Dead Code Analysis: src/

UNUSED IMPORTS (via eslint):
  src/utils/helpers.ts:1
    import { deprecatedFn } from './legacy'
    Imported but never used

UNUSED VARIABLES (via eslint):
  src/api/client.ts:45
    const tempResult = await fetch(...)
    Assigned but never read

UNREACHABLE CODE (via tsc):
  src/core/processor.ts:78
    return result;
    console.log('done'); // Never executes

UNUSED EXPORTS (via ts-prune):
  src/types/index.ts:12
    export interface LegacyConfig
    Exported but never imported
```

## Limitations

- Cannot detect semantic dead code (functions never called)
- ast-grep catches structural patterns only
- For full dead code analysis, use `ts-prune` or `knip`

## When to Use

- Before major refactors
- Periodic codebase cleanup
- As part of `/audit-module`
