# Skill: /audit-module

Comprehensive code audit that runs all security and quality checks on a module.

## Usage

```
/audit-module <path> [--level 1|2|3]
```

**Arguments:**
- `path` (required): Directory or file to audit
- `--level` (optional): Audit depth
  - Level 1: Quick scan (silent errors, injection risks only)
  - Level 2: Standard (all checks except type gaps) - DEFAULT
  - Level 3: Comprehensive (all checks including strict types)

## What It Runs

| Check | Level 1 | Level 2 | Level 3 |
|-------|---------|---------|---------|
| `/find-silent-errors` | ✓ | ✓ | ✓ |
| `/find-injection-risks` | ✓ | ✓ | ✓ |
| `/find-hardcoded-secrets` | | ✓ | ✓ |
| `/find-resource-leaks` | | ✓ | ✓ |
| `/find-dead-code` | | ✓ | ✓ |
| `/find-type-gaps` | | | ✓ |
| eslint check | ✓ | ✓ | ✓ |
| Test coverage check | | ✓ | ✓ |

## Implementation

### Execution Order

```
1. Static Analysis (parallel)
   ├── ast-grep: silent-errors
   ├── ast-grep: injection-risks
   ├── ast-grep: resource-leaks
   ├── ast-grep: hardcoded-secrets
   └── eslint

2. Type Analysis (if level 3)
   └── tsc --strict --noEmit

3. Coverage Analysis (if level 2+)
   └── npm test -- --coverage (dry-run for coverage %)

4. Aggregate & Report
```

### Report Format

```markdown
# Audit Report: <module>

**Date:** YYYY-MM-DD
**Level:** 2 (Standard)
**Verdict:** NEEDS ATTENTION (3 high, 5 medium issues)

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 0 | 1 | 0 | 0 |
| Resources | 0 | 1 | 0 | 0 |
| Quality | 0 | 0 | 3 | 2 |
| Types | 0 | 1 | 2 | 0 |
| **Total** | **0** | **3** | **5** | **2** |

## High Issues (3)

### H1: Command Injection Risk
- **File:** utils/shell.ts:45
- **Check:** /find-injection-risks
- **Issue:** Template literal in exec()
- **Fix:** Use execFile with array args

### H2: Resource Leak
- **File:** services/websocket.ts:102
- **Check:** /find-resource-leaks
- **Issue:** Event listener never removed
- **Fix:** Add cleanup in disconnect handler

## Recommendations

1. **Immediate:** Fix H1 (security) before any public API exposure
2. **Soon:** Fix H2 (leaks) before long-running deployments
3. **Later:** Address medium/low issues in next sprint

## Metrics

- Lines of Code: 1,200
- Test Coverage: 85%
- Lint Errors: 0
- Type Coverage: 95%
```

## Example Execution

```bash
# Quick security scan
/audit-module src/ --level 1

# Standard audit (recommended)
/audit-module src/

# Full audit with strict types
/audit-module src/ --level 3
```

## When to Use

- Before major releases
- During security reviews
- After significant refactoring
- Onboarding to new codebase
- Regular scheduled audits (weekly/monthly)
