---
name: constant-audit
description: Scan codebase for magic literals and produce extraction inventory
---

# Constant Audit Skill

Scan a TypeScript codebase to discover magic literals and produce an actionable inventory for extraction.

## Usage

```
/constant-audit <path> [--level 1|2|3] [--domain <domain>] [--output <file>]
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `<path>` | Directory or file to scan (required) | - |
| `--level` | Extraction threshold | `2` |
| `--domain` | Focus domain | `all` |
| `--output` | Write inventory to JSON file | stdout |

### Levels

| Level | Description | Extraction Threshold |
|-------|-------------|---------------------|
| 1 | Aggressive | Extract all non-trivial literals |
| 2 | Balanced (default) | Extract repeated (3+) and configuration values |
| 3 | Conservative | Only extract widely scattered literals (5+) |

### Domains

| Domain | What It Finds |
|--------|---------------|
| `all` | All categories (default) |
| `ports` | Network port numbers (1024-65535) |
| `timeouts` | Duration values (timeout=, setTimeout, etc.) |
| `strings` | Repeated string literals |
| `api-keys` | Object keys, method names |
| `env` | Environment variable defaults |

## Implementation

### Phase 1: Discovery

Run AST-grep scans using TypeScript rules:

```yaml
# Magic numbers
id: magic-number
language: typescript
rule:
  kind: number
  not:
    any:
      - regex: "^[01]$"  # Skip 0 and 1
      - inside:
          kind: variable_declarator
          has:
            kind: identifier
            regex: "^[A-Z_]+$"  # Already a constant
```

### Phase 2: Classification

Apply the decision framework from `best-practices.md`:

**Extract if:**
- Repeated 3+ times (Level 2) or 2+ times (Level 1)
- Configuration value (timeout, port, limit, threshold)
- Contract string (object key in API response)
- Environment-dependent value

**Skip if:**
- In test file (`*.test.ts`, `*.spec.ts`, `__tests__/`)
- Obvious in context (`0`, `1`, `true`, `false`, `null`, `undefined`, `''`, `[]`, `{}`)
- Single occurrence with no external significance

### Phase 3: Name Suggestion

Generate suggested constant names:

```typescript
// Naming patterns by category
function suggestName(literal: string, category: string, context: string): string {
  if (category === 'port') return `${service.toUpperCase()}_PORT`;
  if (category === 'timeout') return `${context.toUpperCase()}_TIMEOUT_MS`;
  if (category === 'api-key') return `KEY_${literal.toUpperCase()}`;
  return `CONST_${literal}`;
}
```

## Output Format

### Stdout (Human-Readable)

```
=== Constant Audit Report ===
Path: /path/to/scan
Level: 2 (Balanced)

--- Summary ---
Total literals scanned: 245
Recommended for extraction: 67
Keep inline: 178

--- High Priority (5+ occurrences) ---
[PORT] 8765 (7 occurrences)
  → Suggested: WEBSOCKET_PORT
  → Module: constants/network.ts
  → Locations:
    - src/transport/client.ts:42
    - src/daemon/server.ts:88
    - tests/integration/transport.test.ts:15 (SKIP: test file)

[TIMEOUT] 5000 (5 occurrences)
  → Suggested: CONNECTION_TIMEOUT_MS
  → Module: constants/timeouts.ts

--- Skipped ---
0: 34 occurrences (obvious in context)
1: 28 occurrences (obvious in context)
'': 12 occurrences (empty string)
```

## Anti-Patterns

**DO NOT:**
- Extract literals from test files into production constants
- Create constants for `0`, `1`, `true`, `false`, `null`, `undefined`, `''`, `[]`, `{}`
- Merge semantically different values into one constant
- Report literals in comments

**DO:**
- Flag semantic collisions for human review
- Include context snippets in output
- Separate test file occurrences from production code
- Suggest meaningful names based on usage context

## Examples

### Basic Audit
```
/constant-audit src/
```

### Focus on Network Configuration
```
/constant-audit src/ --domain ports --output ports-audit.json
```

### Aggressive Scan for Tech Debt Review
```
/constant-audit . --level 1
```

## Related

- **Best Practices:** `.claude/skills/constants/best-practices.md`
- **Extraction Skill:** `/constant-extract` (use after audit)
