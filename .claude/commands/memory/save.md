---
description: Save a memory to persistent storage
argument-hint: <content> [--category decision|preference|pattern|learning] [--confidence low|medium|high] [--level 0-3] [--force]
allowed-tools: mcp__openmemory__add_memories, Read
---

# Memory Save Command

Saves a memory to persistent storage with metadata for categorization and retrieval.

## Usage

```
/memory/save "Memory content here" --category decision --confidence high --level 1
```

**Arguments:**
- `content` (required): The memory content to save (quote if contains spaces)
- `--category`: Category for the memory (default: `learning`)
  - `decision` - Architectural or design decisions
  - `preference` - User or project preferences
  - `pattern` - Code patterns or conventions
  - `learning` - General learnings and insights
- `--confidence`: Confidence level (default: `medium`)
  - `low` - Tentative, may need verification
  - `medium` - Reasonably confident
  - `high` - Strongly established
- `--level`: Privacy level (default: `1`)
  - `0` - Local-only, never syncs
  - `1` - Personal, syncs to personal cloud
  - `2` - Team, syncs with team scope
  - `3` - Org, syncs org-wide
- `--force`: Override secret detection warning (auto-sets level 0)

**Examples:**
```
/memory/save "Prefer pytest over unittest for this project"
/memory/save "Always use 4-space indentation" --category preference --confidence high
/memory/save "API keys stored in .env files" --category pattern --level 0
```

## Behavior

1. **Parse arguments:**
   - Extract content (required)
   - Extract `--category` (default: `learning`)
   - Extract `--confidence` (default: `medium`)
   - Extract `--level` (default: `1`)
   - Check for `--force` flag (overrides secret detection)

2. **Validate category (R-013):**
   - Category MUST be one of: `decision`, `preference`, `pattern`, `learning`
   - If invalid category provided:
     ```
     ERROR: Invalid category '{category}'

     Valid categories:
       decision   - Architectural or design decisions
       preference - User or project preferences
       pattern    - Code patterns or conventions
       learning   - General learnings and insights

     Memory NOT saved.
     ```
   - Do NOT proceed if category is invalid

3. **Detect secrets (R-014):**
   - Scan content for secret patterns:
     - API keys: `sk-`, `pk-`, `api_key`, `apikey`, `api-key`
     - Tokens: `token`, `bearer`, `auth_token`
     - Passwords: `password`, `passwd`, `pwd`
     - Credentials: `secret`, `credential`, `private_key`
     - AWS: `AKIA`, `aws_access_key`, `aws_secret`
     - Generic: Strings matching `[a-zA-Z0-9]{32,}` (long random strings)

   - If secret pattern detected AND `--force` not provided:
     ```
     WARNING: Potential secret detected in memory content

     Pattern found: {pattern}

     If this is intentional, use --force to save anyway.
     If this contains actual secrets, consider:
       - Using --level 0 (local-only, never syncs)
       - Removing the sensitive portion

     Memory NOT saved.
     ```

   - If secret detected AND `--force` provided:
     - Auto-set level to 0 (local-only) unless explicitly set higher
     - Show warning: "Secret detected. Forcing save with level 0 (local-only)."
     - Proceed with save

4. **Format memory with metadata:**
   - Construct formatted memory string:
   ```
   [category:<category>][confidence:<confidence>][level:<level>] <content>
   ```
   - For level 0 (local-only), prepend additional marker:
   ```
   [LOCAL-ONLY][category:<category>][confidence:<confidence>][level:0] <content>
   ```

5. **Save to OpenMemory:**
   - Call `mcp__openmemory__add_memories` with formatted text
   - The MCP server handles persistence

6. **Update sync queue (if level > 0):**
   - If `.claude/session/sync-queue.json` exists and level > 0:
     - Add entry to pending queue with action "push"
   - If level == 0:
     - Memory is local-only, skip sync queue

7. **Report result:**
   ```
   MEMORY SAVED
   Content: <content>
   Category: <category>
   Confidence: <confidence>
   Privacy: <level indicator>

   Status: <sync indicator>
   ```

   **Privacy indicators:**
   - Level 0: `Local-only`
   - Level 1: `Personal (syncs)`
   - Level 2: `Team (syncs)`
   - Level 3: `Org-wide (syncs)`

   **Sync indicators:**
   - `Pending sync` (level > 0, not yet synced)
   - `Local-only` (level 0)

## Validation Rules

| Rule | Enforcement | Error Behavior |
|------|-------------|----------------|
| Content not empty | BLOCK | "ERROR: Content cannot be empty" |
| Category valid | BLOCK | Show valid options, do not save |
| Confidence valid | WARN | Default to `medium` if invalid |
| Level valid | WARN | Default to `1` if invalid |
| No secrets | WARN | Block unless `--force` provided |

**Category validation is strict (R-013):** Invalid category = memory NOT saved.
**Secret detection is protective (R-014):** Warns but allows override with `--force`.

## Notes

- Memories are stored via OpenMemory MCP at localhost:8765
- Level 0 memories NEVER sync to cloud (enforced by design)
- Consider using level 0 for sensitive information like credentials patterns
- Use `--category decision` for ADR-worthy choices
- Use `--category pattern` for code conventions to maintain
