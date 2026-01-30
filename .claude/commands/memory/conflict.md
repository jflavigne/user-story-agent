---
description: Resolve memory sync conflicts
argument-hint: [--list] [--resolve <conflict-id> <action>]
allowed-tools: mcp__openmemory__add_memories, mcp__openmemory__delete_memories, Read, Write
---

# Memory Conflict Command

Resolves conflicts between local and cloud memory versions.

## Usage

```
/memory/conflict --list
/memory/conflict --resolve <conflict-id> keep-local
/memory/conflict --resolve <conflict-id> keep-cloud
/memory/conflict --resolve <conflict-id> keep-both
```

**Arguments:**
- `--list`: Show all unresolved conflicts
- `--resolve <conflict-id> <action>`: Resolve a specific conflict
  - `keep-local`: Keep local version, overwrite cloud
  - `keep-cloud`: Keep cloud version, overwrite local
  - `keep-both`: Keep both as separate memories

**Examples:**
```
/memory/conflict --list
/memory/conflict --resolve conflict-001 keep-local
/memory/conflict --resolve conflict-002 keep-both
```

## Behavior

### List Conflicts (--list)

1. **Read conflict file:**
   - Load `.claude/session/sync-conflicts.json`
   - If no conflicts, report clean state

2. **Display conflicts:**
   ```
   MEMORY CONFLICTS
   ═══════════════════════════════════════════

   [conflict-001] Modified: 2026-01-18
   ─────────────────────────────────────────
   LOCAL VERSION:
   "[category:decision][confidence:high] Use pytest for testing"
   Modified: 2026-01-18T10:30:00Z

   CLOUD VERSION:
   "[category:decision][confidence:medium] Use pytest or unittest"
   Modified: 2026-01-18T09:45:00Z
   ─────────────────────────────────────────

   [conflict-002] Modified: 2026-01-17
   ─────────────────────────────────────────
   LOCAL VERSION:
   "[category:pattern][confidence:high] 4-space indentation"

   CLOUD VERSION:
   "[category:pattern][confidence:high] 2-space indentation"
   ─────────────────────────────────────────

   ═══════════════════════════════════════════
   Total: 2 conflicts

   Resolve with:
     /memory/conflict --resolve <conflict-id> keep-local|keep-cloud|keep-both
   ```

3. **No conflicts state:**
   ```
   MEMORY CONFLICTS
   No conflicts to resolve.

   Local and cloud are in sync.
   ```

### Resolve Conflict (--resolve)

1. **Parse arguments:**
   - Extract conflict-id
   - Extract action (keep-local, keep-cloud, keep-both)
   - Validate both are provided

2. **Load conflict data:**
   - Read `.claude/session/sync-conflicts.json`
   - Find conflict by ID
   - If not found:
   ```
   ERROR: Conflict not found
   ID: <conflict-id>

   Use /memory/conflict --list to see available conflicts.
   ```

3. **Execute resolution:**

   **keep-local:**
   - Queue local version for push to cloud
   - Mark conflict as resolved
   ```
   RESOLVED: keep-local
   Local version will overwrite cloud on next sync.
   ```

   **keep-cloud:**
   - Update local memory with cloud version
   - Mark conflict as resolved
   ```
   RESOLVED: keep-cloud
   Local memory updated with cloud version.
   ```

   **keep-both:**
   - Keep local memory as-is
   - Add cloud version as new memory with suffix "[from-cloud]"
   - Mark conflict as resolved
   ```
   RESOLVED: keep-both
   Both versions preserved.
   Cloud version saved as new memory.
   ```

4. **Update conflict file:**
   - Remove resolved conflict from `.claude/session/sync-conflicts.json`
   - Update timestamps

5. **Report remaining conflicts:**
   ```
   Resolved: conflict-001
   Remaining: 1 conflict(s)

   Use /memory/conflict --list to see remaining.
   ```

## Conflict File Format

`.claude/session/sync-conflicts.json`:
```json
{
  "conflicts": [
    {
      "id": "conflict-001",
      "local": {
        "memory_id": "local-mem-123",
        "content": "[category:decision]...",
        "modified": "2026-01-18T10:30:00Z"
      },
      "cloud": {
        "memory_id": "cloud-mem-456",
        "content": "[category:decision]...",
        "modified": "2026-01-18T09:45:00Z"
      },
      "detected": "2026-01-18T11:00:00Z"
    }
  ],
  "resolved": [
    {
      "id": "conflict-000",
      "action": "keep-local",
      "resolved": "2026-01-17T15:00:00Z"
    }
  ]
}
```

## Design Principle: AP-3

Per design requirement AP-3 (Adversarial Review Pattern):
> "Never resolve conflicts silently"

This command ensures:
- All conflicts are surfaced to the user
- User must explicitly choose resolution
- No automatic resolution based on timestamp or other heuristics
- Full visibility into both versions before decision

## Error Handling

**Invalid action:**
```
ERROR: Invalid resolution action
Action: <action>

Valid actions:
  keep-local  - Keep local, overwrite cloud
  keep-cloud  - Keep cloud, overwrite local
  keep-both   - Preserve both versions
```

**Resolution failed:**
```
ERROR: Failed to resolve conflict
ID: <conflict-id>
Reason: <error message>

Conflict remains unresolved.
```

## Notes

- Conflicts only occur with cloud sync enabled
- Each conflict must be resolved individually
- Resolution history kept in `resolved` array
- Use `keep-both` when uncertain
- After resolving all conflicts, run `/memory/sync` to complete sync
