---
description: Sync memories between local and cloud storage
argument-hint: [--push] [--pull] [--status]
allowed-tools: mcp__openmemory__search_memory, mcp__openmemory__add_memories, Read, Write, Bash(curl:*), Bash(date:*)
---

# Memory Sync Command

Synchronizes memories between local OpenMemory and cloud mem0 storage.

## Usage

```
/memory/sync
/memory/sync --push
/memory/sync --pull
/memory/sync --status
```

**Arguments:**
- `--push`: Only push local changes to cloud
- `--pull`: Only pull cloud changes to local
- `--status`: Show sync status without syncing
- (no args): Full bidirectional sync

**Examples:**
```
/memory/sync              # Full sync
/memory/sync --push       # Push pending changes
/memory/sync --pull       # Pull from cloud
/memory/sync --status     # Check sync status
```

## Behavior

### Prerequisites Check

1. **Check cloud configuration:**
   - Read `.claude/memory/config.json`
   - Verify `cloud.enabled == true`
   - Verify `MEM0_API_KEY` environment variable is set
   - If not configured:
   ```
   SYNC UNAVAILABLE
   Cloud sync is not configured.

   To enable:
   1. Set MEM0_API_KEY environment variable
   2. Update .claude/memory/config.json:
      "cloud": { "enabled": true, ... }
   ```

### Status Mode (--status)

```
SYNC STATUS
═══════════════════════════════════════════

Local:    OpenMemory (localhost:8765)
Cloud:    mem0 (configured)

Pending:  <N> memories to push
          <N> memories to pull
Conflicts: <N> unresolved

Last sync: <timestamp> (<relative time>)
═══════════════════════════════════════════
```

### Push Mode (--push or full sync)

1. **Read sync queue:**
   - Load `.claude/session/sync-queue.json`
   - Get all entries with `action: "push"`

2. **For each pending push:**
   - Skip if `level == 0` (local-only, never syncs)
   - Call mem0 API to create memory
   - On success: Remove from pending queue
   - On failure: Log to `sync_errors` array

3. **Report push results:**
   ```
   PUSH: <N> memories synced to cloud
   Errors: <N> (see .claude/session/sync-queue.json)
   ```

### Pull Mode (--pull or full sync)

1. **Query mem0 for changes:**
   - Get memories newer than `last_sync` timestamp
   - Filter by user/scope based on config

2. **For each cloud memory:**
   - Check if exists locally (by content hash or ID mapping)
   - If new: Add to local OpenMemory
   - If modified: Check for conflict

3. **Handle conflicts:**
   - If local and cloud differ:
     - Add to conflicts list
     - Prompt user via `/memory/conflict`
   - Per AP-3: Never resolve conflicts silently

4. **Report pull results:**
   ```
   PULL: <N> memories synced from cloud
   New: <N> | Updated: <N> | Conflicts: <N>
   ```

### Full Sync (no flags)

1. Execute push first
2. Execute pull second
3. Update `last_sync` timestamp
4. Report combined results

## Sync Queue Format

`.claude/session/sync-queue.json`:
```json
{
  "pending": [
    {
      "id": "local-mem-123",
      "action": "push",
      "content_hash": "abc123...",
      "timestamp": "2026-01-18T10:30:00Z",
      "level": 1
    },
    {
      "id": "local-mem-456",
      "action": "delete",
      "timestamp": "2026-01-18T10:35:00Z"
    }
  ],
  "last_sync": "2026-01-18T10:00:00Z",
  "sync_errors": [
    {
      "id": "local-mem-789",
      "error": "API rate limit exceeded",
      "timestamp": "2026-01-18T10:30:05Z",
      "retries": 2
    }
  ]
}
```

## mem0 API Integration

**Note:** This requires mem0 API key and endpoint.

```bash
# Example mem0 API call (pseudocode)
curl -X POST "https://api.mem0.ai/v1/memories" \
  -H "Authorization: Bearer $MEM0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "...", "metadata": {...}}'
```

Actual implementation will depend on mem0 API documentation.

## Error Handling

**Network errors:**
```
SYNC ERROR: Network unreachable
Pending changes preserved in queue.
Will retry on next sync.
```

**API errors:**
```
SYNC ERROR: mem0 API returned 401
Check MEM0_API_KEY environment variable.
```

**Partial sync:**
```
SYNC PARTIAL
Pushed: 5 of 7 (2 errors)
Pulled: 3 of 3

Errors logged to .claude/session/sync-queue.json
Run /memory/sync again to retry.
```

## Notes

- Level 0 memories NEVER sync (enforced)
- Conflicts require explicit user resolution
- Sync queue persists across sessions
- Failed syncs are retried on next /memory/sync
- Use --status to check before syncing
