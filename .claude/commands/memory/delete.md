---
description: Delete specific memories
argument-hint: <memory-id> [--confirm]
allowed-tools: mcp__openmemory__delete_memories, mcp__openmemory__search_memory, Read
---

# Memory Delete Command

Deletes specific memories from storage.

## Usage

```
/memory/delete <memory-id>
/memory/delete <memory-id> --confirm
```

**Arguments:**
- `memory-id` (required): The ID of the memory to delete
- `--confirm`: Skip confirmation prompt (use with caution)

**Examples:**
```
/memory/delete mem-abc123
/memory/delete mem-xyz789 --confirm
```

## Behavior

1. **Parse arguments:**
   - Extract memory-id (required)
   - Check for `--confirm` flag

2. **Verify memory exists:**
   - Search for the memory by ID if possible
   - If memory not found, report error:
   ```
   ERROR: Memory not found
   ID: <memory-id>

   Use /memory/recall to find valid memory IDs.
   ```

3. **Confirm deletion (unless --confirm):**
   - Display the memory content:
   ```
   DELETE MEMORY?
   ─────────────────────────────────
   ID: <memory-id>
   Content: "<memory content preview>"
   Category: <category>
   Level: <level>
   ─────────────────────────────────

   Type 'yes' to confirm deletion.
   ```

   - Wait for user confirmation
   - If `--confirm` flag present, skip this step

4. **Delete the memory:**
   - Call `mcp__openmemory__delete_memories` with the memory ID
   - Handle any errors from the MCP call

5. **Update sync queue (if applicable):**
   - If the deleted memory had level > 0:
     - Add deletion to sync queue for cloud propagation
   - If level 0:
     - No sync needed (was local-only)

6. **Report result:**
   ```
   MEMORY DELETED
   ID: <memory-id>
   Content: "<content preview...>"

   Note: <sync note>
   ```

   **Sync notes:**
   - "Deletion will sync to cloud on next sync" (level > 0)
   - "Local-only memory removed" (level 0)

## Error Handling

**Memory not found:**
```
ERROR: Memory ID not found
ID: <memory-id>

To find memory IDs:
  /memory/recall "<search query>"
```

**Deletion failed:**
```
ERROR: Failed to delete memory
ID: <memory-id>
Reason: <error message>

The memory was not deleted. Please try again.
```

## Finding Memory IDs

Memory IDs are returned by:
- `/memory/recall` results (shown in brackets)
- `/memory/context` output
- `mcp__openmemory__list_memories` tool

## Safety

- Deletion is permanent for local storage
- Cloud-synced memories (level > 0) will be queued for deletion on sync
- Use `--confirm` only in scripts or when certain
- Consider `/memory/recall` first to verify the right memory

## Notes

- Memory IDs are assigned by OpenMemory MCP
- If unsure of ID, use `/memory/recall` to search first
- Deleting a memory does not affect other memories
- Cloud sync of deletions happens on next `/memory/sync`
