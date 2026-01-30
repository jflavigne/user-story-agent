---
description: Load relevant context for current session
argument-hint: [--max N] [--project] [--recent]
allowed-tools: mcp__openmemory__search_memory, Read
---

# Memory Context Command

Loads relevant memories for the current session context.

## Usage

```
/memory/context
/memory/context --max 10
/memory/context --project
```

**Arguments:**
- `--max`: Maximum memories to load (default: `12`)
- `--project`: Focus on project-specific memories (uses current directory name as filter)
- `--recent`: Prioritize recently added memories

**Examples:**
```
/memory/context
/memory/context --max 20
/memory/context --project --max 8
```

## Behavior

1. **Parse arguments:**
   - Extract `--max` (default: `12`)
   - Check for `--project` flag
   - Check for `--recent` flag

2. **Build context queries:**

   **Default behavior (no flags):**
   - Query 1: Current project name (from directory)
   - Query 2: "preferences decisions patterns"
   - Merge and deduplicate results

   **With --project:**
   - Focus query on current project name
   - Include "project conventions" query

   **With --recent:**
   - Query for "recent" to get newest memories
   - Note: OpenMemory may or may not support temporal sorting

3. **Execute searches:**
   - Call `mcp__openmemory__search_memory` for each query
   - Collect and deduplicate results by content

4. **Apply max limit:**
   - Truncate to `--max` memories

5. **Format context block:**
   ```
   SESSION CONTEXT LOADED
   ═══════════════════════════════════════════

   DECISIONS (N)
   ─────────────
   - <decision memory 1>
   - <decision memory 2>

   PREFERENCES (N)
   ───────────────
   - <preference memory 1>
   - <preference memory 2>

   PATTERNS (N)
   ────────────
   - <pattern memory 1>
   - <pattern memory 2>

   LEARNINGS (N)
   ─────────────
   - <learning memory 1>
   - <learning memory 2>

   ═══════════════════════════════════════════
   Total: <N> memories loaded
   ```

6. **Handle empty context:**
   ```
   SESSION CONTEXT
   No relevant memories found for this context.

   Start building context with:
     /memory/save "Your first memory here"
   ```

## Categorization

Group memories by their `[category:X]` tag:

| Category | Display Header |
|----------|---------------|
| decision | DECISIONS |
| preference | PREFERENCES |
| pattern | PATTERNS |
| learning | LEARNINGS |
| (no tag) | LEARNINGS |

## Use Cases

1. **Session startup:**
   ```
   /memory/context
   ```
   Load all relevant context before starting work.

2. **Project-focused work:**
   ```
   /memory/context --project
   ```
   Focus on memories specific to current project.

3. **Review recent learnings:**
   ```
   /memory/context --recent --max 5
   ```
   See what was recently learned.

## Notes

- Run at session start to prime context
- Memories appear in Claude's context window
- Grouped display helps scan relevant information quickly
- Project detection uses current working directory basename
- Deduplicated by exact content match
