---
description: Search and retrieve memories
argument-hint: <query> [--limit N] [--category filter]
allowed-tools: mcp__openmemory__search_memory, Read
---

# Memory Recall Command

Searches and retrieves memories matching a query.

## Usage

```
/memory/recall "testing framework preferences"
/memory/recall "auth patterns" --limit 10 --category pattern
```

**Arguments:**
- `query` (required): Search query to find relevant memories
- `--limit`: Maximum number of results (default: `5`)
- `--category`: Filter by category (optional)
  - `decision` - Architectural or design decisions
  - `preference` - User or project preferences
  - `pattern` - Code patterns or conventions
  - `learning` - General learnings and insights

**Examples:**
```
/memory/recall "testing"
/memory/recall "database migrations" --limit 3
/memory/recall "code style" --category preference
```

## Behavior

1. **Parse arguments:**
   - Extract query (required)
   - Extract `--limit` (default: `5`)
   - Extract `--category` (optional filter)

2. **Search memories:**
   - Call `mcp__openmemory__search_memory` with the query
   - OpenMemory returns relevance-ranked results

3. **Filter results (if category specified):**
   - Parse each memory's metadata tags
   - Keep only memories matching `[category:<filter>]`

4. **Apply limit:**
   - Truncate results to `--limit` count

5. **Format and display results:**
   ```
   MEMORY RECALL: "<query>"
   Found: <N> memories

   ─────────────────────────────────────────
   [1] <sync indicator> <category>
       "<memory content>"
       Confidence: <confidence> | Level: <level>

   [2] <sync indicator> <category>
       "<memory content>"
       Confidence: <confidence> | Level: <level>
   ─────────────────────────────────────────

   Showing <displayed> of <total> results
   ```

   **Sync indicators:**
   - `[SYNC]` - Level > 0, synced to cloud
   - `[PEND]` - Level > 0, pending sync
   - `[LOCAL]` - Level 0, local-only

6. **Handle no results:**
   ```
   MEMORY RECALL: "<query>"
   No memories found matching query.

   Try:
   - Broader search terms
   - Removing category filter
   - /memory/context to see all recent memories
   ```

## Parsing Memory Metadata

Memories are stored with inline metadata tags:

```
[LOCAL-ONLY][category:pattern][confidence:high][level:0] API keys in .env
```

Parse these tags to extract:
- `category`: Value after `category:`
- `confidence`: Value after `confidence:`
- `level`: Value after `level:`
- `LOCAL-ONLY`: Present if level 0

The actual content is everything after the last `]`.

## Notes

- Results are ranked by relevance (OpenMemory's semantic search)
- Category filter is applied post-search (client-side)
- Use broad queries for exploratory searches
- Use specific queries for targeted recall
- Combine with `/memory/context` for session setup
