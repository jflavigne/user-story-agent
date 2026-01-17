# Audit Skills

Code audit skills for finding security vulnerabilities, resource leaks, and quality issues in TypeScript/JavaScript codebases.

## Available Skills

| Skill | Purpose | Complexity |
|-------|---------|------------|
| `/find-silent-errors` | Find swallowed exceptions | Easy |
| `/find-dead-code` | Find unreachable/unused code | Easy |
| `/find-injection-risks` | Find command/SQL injection | Medium |
| `/find-hardcoded-secrets` | Find credentials in code | Medium |
| `/find-resource-leaks` | Find unclosed resources | Medium |
| `/find-type-gaps` | Find type safety issues | Medium |
| `/audit-module` | Run all checks combined | Comprehensive |

## Quick Start

```bash
# Run comprehensive audit on a module
/audit-module src/

# Run specific check
/find-injection-risks src/
```

## Implementation

These skills use:
- **ast-grep**: Structural code pattern matching
- **eslint**: TypeScript/JavaScript linting
- **tsc**: Type checking

### ast-grep Rules (TypeScript)

```yaml
# Find empty catch blocks
id: empty-catch
language: typescript
rule:
  kind: catch_clause
  has:
    kind: statement_block
    not:
      has:
        kind: expression_statement
```

## Limitations

1. **Semantic analysis**: Cannot detect logically unreachable code
2. **Dynamic patterns**: Cannot detect runtime-generated code issues
3. **Cross-file analysis**: Limited tracking of data flow across modules
4. **False positives**: Some patterns need human judgment

## Related

- **Best Practices:** `.claude/skills/constants/best-practices.md`
- **ast-grep SKILL:** `.claude/skills/ast-grep/SKILL.md`
