# Skill: /find-hardcoded-secrets

Find hardcoded passwords, API keys, tokens, and other secrets in source code.

## Usage

```
/find-hardcoded-secrets [path]
```

**Arguments:**
- `path` (optional): Directory or file to scan. Defaults to `src/`

## What It Finds

| Pattern | Severity | Example |
|---------|----------|---------|
| `password = "..."` | Critical | Hardcoded credentials |
| `apiKey = "sk-..."` | Critical | API keys in code |
| `token = "..."` | Critical | Auth tokens |
| `secret = "..."` | High | Generic secrets |
| AWS/GCP/Azure keys | Critical | Cloud provider credentials |

## Implementation

### Pattern 1: Password/secret assignments

```yaml
id: hardcoded-password
language: typescript
rule:
  any:
    - pattern: password = "$SECRET"
    - pattern: PASSWORD = "$SECRET"
    - pattern: secret = "$SECRET"
    - pattern: SECRET = "$SECRET"
```

### Pattern 2: API keys

```yaml
id: hardcoded-api-key
language: typescript
rule:
  any:
    - pattern: apiKey = "$KEY"
    - pattern: API_KEY = "$KEY"
    - pattern: secretKey = "$KEY"
```

### Pattern 3: Connection strings (regex-based)

Use Grep for complex patterns:
```regex
# AWS Access Key
AKIA[0-9A-Z]{16}

# GitHub Token
ghp_[a-zA-Z0-9]{36}

# OpenAI Key
sk-[a-zA-Z0-9]{32,}

# Generic secret-looking strings
["'][a-zA-Z0-9]{32,}["']
```

## Execution Steps

1. Run ast-grep for variable assignment patterns
2. Run grep for regex patterns (API key formats)
3. Filter out:
   - Environment variable reads: `process.env.PASSWORD`
   - Placeholder values: `"changeme"`, `"xxx"`, `"your-key-here"`
   - Test files (unless requested)
4. Classify by severity

## Example Output

```
Hardcoded Secrets Scan: src/

CRITICAL (1):
  src/config/api.ts:23
    const API_KEY = "sk-abc123..."
    Risk: OpenAI API key exposed
    Fix: Use process.env.OPENAI_API_KEY

MEDIUM - Default Credentials (1):
  src/config/defaults.ts:12
    const DEFAULT_PASSWORD = "admin"
    Note: Default password for dev setup
    Risk: May leak to production

INFO - Environment Variable Usage (good practice):
  src/config/index.ts:45
    const apiKey = process.env.API_KEY || ''
    Status: ✓ Reads from env var
```

## Safe Patterns (Not Flagged)

```typescript
// Environment variable reads
const password = process.env.PASSWORD;
const apiKey = process.env.API_KEY ?? '';

// Placeholder values
const password = "changeme";
const apiKey = "your-api-key-here";

// Type annotations only
let password: string;
```

## When to Use

- Before committing code
- CI/CD pipeline checks
- Security audits
- As part of `/audit-module`
