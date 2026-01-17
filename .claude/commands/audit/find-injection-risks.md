# Skill: /find-injection-risks

Find potential command injection, SQL injection, and template injection vulnerabilities.

## Usage

```
/find-injection-risks [path]
```

**Arguments:**
- `path` (optional): Directory or file to scan. Defaults to `src/`

## What It Finds

| Pattern | Severity | Example |
|---------|----------|---------|
| Template literal in `exec()` | Critical | `` exec(`rm ${path}`) `` |
| Template literal in SQL | Critical | `` query(`SELECT * WHERE id=${id}`) `` |
| User input in `eval()` | Critical | `eval(userInput)` |
| String concat in shell | High | `exec("cmd " + arg)` |

## Implementation

### Pattern 1: exec/spawn with template literals

```yaml
id: exec-template-literal
language: typescript
rule:
  any:
    - pattern: exec(`$$$`)
    - pattern: execSync(`$$$`)
    - pattern: spawn($CMD, `$$$`)
    - pattern: child_process.exec(`$$$`)
```

### Pattern 2: SQL with template literals

```yaml
id: sql-template-literal
language: typescript
rule:
  any:
    - pattern: $DB.query(`$$$`)
    - pattern: $DB.execute(`$$$`)
    - pattern: $CONN.query(`$$$`)
```

### Pattern 3: Dangerous eval

```yaml
id: dangerous-eval
language: typescript
rule:
  any:
    - pattern: eval($INPUT)
    - pattern: new Function($INPUT)
```

## Example Output

```
Injection Risk Analysis: src/

CRITICAL - Command Injection (2):
  src/utils/shell.ts:45
    exec(`git clone ${repoUrl}`)
    Risk: repoUrl from user input
    Mitigation: None - NEEDS FIX

  src/api/deploy.ts:78
    execSync(`docker run ${imageName}`)
    Risk: imageName unvalidated
    Mitigation: None - NEEDS FIX

CRITICAL - SQL Injection (1):
  src/db/queries.ts:23
    db.query(`SELECT * FROM users WHERE id = ${userId}`)
    Risk: userId directly interpolated
    Fix: Use parameterized query

EVAL/Function (0):
  None found
```

## Safe Patterns (Not Flagged)

```typescript
// Safe: Parameterized queries
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// Safe: execFile with array args (no shell)
execFile('git', ['clone', repoUrl]);

// Safe: Validated input
if (isValidId(userId)) {
  db.query(`SELECT * FROM users WHERE id = ${userId}`);
}
```

## When to Use

- Security audits before deployment
- Code review for user-facing features
- Penetration testing preparation
- As part of `/audit-module`
