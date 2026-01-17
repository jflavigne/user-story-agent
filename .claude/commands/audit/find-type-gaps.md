# Skill: /find-type-gaps

Find missing or weak types that reduce code safety and IDE support.

## Usage

```
/find-type-gaps [path]
```

**Arguments:**
- `path` (optional): Directory or file to scan. Defaults to `src/`

## What It Finds

| Pattern | Severity | Example |
|---------|----------|---------|
| Missing return type | Medium | `function foo()` vs `function foo(): string` |
| Explicit `any` | Medium | `: any` that could be narrower |
| Implicit `any` | High | Untyped parameters |
| Type assertion abuse | Medium | `as unknown as T` |
| Missing null checks | Medium | `string` when `string \| null` intended |

## Implementation

### 1. TypeScript Compiler (strict mode)

```bash
npx tsc --noEmit --strict
```

Key flags:
- `--noImplicitAny`: Flag untyped parameters
- `--strictNullChecks`: Catch null/undefined issues
- `--noImplicitReturns`: Require explicit returns

### 2. ESLint Rules

```bash
npx eslint src/ --rule '@typescript-eslint/no-explicit-any: warn'
npx eslint src/ --rule '@typescript-eslint/explicit-function-return-type: warn'
```

### 3. ast-grep for any usage

```yaml
id: explicit-any
language: typescript
rule:
  pattern: ": any"
```

## Example Output

```
Type Gap Analysis: src/

TSC ERRORS (--strict) - HIGH:
  src/api/client.ts:45
    Parameter 'data' implicitly has an 'any' type
    Fix: Add type annotation

  src/utils/parser.ts:23
    Object is possibly 'undefined'
    Fix: Add null check or optional chaining

EXPLICIT ANY - MEDIUM:
  src/types/legacy.ts:12
    response: any
    Consider: Define proper response type

  src/utils/helpers.ts:34
    args: any[]
    Consider: Use generics or specific type

TYPE ASSERTIONS - LOW:
  src/api/transform.ts:56
    value as unknown as T
    Warning: Double assertion, verify safety

COVERAGE:
  Functions with return types: 45/50 (90%)
  Explicit any usage: 8 occurrences
  Strict mode clean: No
```

## When to Use

- Before enabling strict mode in CI
- Code review for type safety
- Migrating JavaScript to TypeScript
- As part of `/audit-module`
