---
description: List all active worktrees with status
argument-hint: [--verbose]
allowed-tools: Bash, Read
---

# /github/worktree-list

Display all active worktrees with their branch, age, and status.

## Arguments

- `--verbose`: Show additional details (last commit, dirty files)

## Instructions

### Step 1: Get Worktree Data

```bash
git worktree list --porcelain
```

Parse each worktree entry:
- `worktree <path>` - The worktree path
- `HEAD <sha>` - Current commit
- `branch refs/heads/<name>` - Branch name

### Step 2: Enrich Each Worktree

For each worktree, gather:

**Branch name:**
```bash
git -C "<path>" branch --show-current 2>/dev/null || echo "(detached)"
```

**Age (days since last commit):**
```bash
LAST_COMMIT=$(git -C "<path>" log -1 --format=%ct 2>/dev/null)
NOW=$(date +%s)
AGE_DAYS=$(( (NOW - LAST_COMMIT) / 86400 ))
```

**Status:**
```bash
# Check if dirty (uncommitted changes)
git -C "<path>" status --porcelain 2>/dev/null | head -1
```

**Stale detection:**
A worktree is stale if:
- Branch is merged to main AND age > 7 days
- OR age > 14 days (abandoned)

```bash
# Check if merged
git branch --merged main | grep -q "<branch>"
```

### Step 3: Format Output

```
WORKTREES ([count] active)
┌──────────────────────────────────────────────────────────────┐
│ PATH                         BRANCH              AGE   STATUS│
├──────────────────────────────────────────────────────────────┤
│ /path/to/project            main                 -          │
│ ../project-agent-auth       agent/auth          2d    dirty │
│ ../project-agent-fix        agent/fix           8d    stale │
└──────────────────────────────────────────────────────────────┘

Summary: [X] active | [Y] stale | [Z] dirty
```

### Step 4: Show Cleanup Suggestion

If stale worktrees exist:
```
Tip: Run /github/worktree-clean to remove stale worktrees
```

## Status Indicators

| Status | Meaning |
|--------|---------|
| (blank) | Clean, active |
| dirty | Has uncommitted changes |
| stale | Merged or abandoned (>14 days) |
| locked | Worktree is locked (won't auto-prune) |

## Examples

```bash
# List all worktrees
/github/worktree-list

# Show verbose output
/github/worktree-list --verbose
```

## Output Example

```
WORKTREES (3 active)
┌──────────────────────────────────────────────────────────────┐
│ PATH                         BRANCH              AGE   STATUS│
├──────────────────────────────────────────────────────────────┤
│ .                           main                 -          │
│ ../dev-agent-agent-auth     agent/auth          2d    dirty │
│ ../dev-agent-agent-old      agent/old          15d    stale │
└──────────────────────────────────────────────────────────────┘

Summary: 2 active | 1 stale | 1 dirty

Tip: Run /github/worktree-clean to remove stale worktrees
```
