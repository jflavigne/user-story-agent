---
description: Clean up stale worktrees
argument-hint: [--force] [--dry-run]
allowed-tools: Bash, Read, AskUserQuestion
---

# /github/worktree-clean

Remove stale worktrees (merged branches, abandoned work) with confirmation.

## Arguments

- `--force`: Skip confirmation prompt
- `--dry-run`: Show what would be removed without removing

## Instructions

### Step 1: Identify Stale Worktrees

A worktree is stale if ANY of these conditions are true:

**Condition 1: Merged and old (>7 days)**
```bash
# Check if branch is merged to main
git branch --merged main | grep -q "<branch>"
# AND last commit > 7 days ago
```

**Condition 2: Abandoned (>14 days)**
```bash
# Last commit > 14 days ago, regardless of merge status
```

**Condition 3: Missing directory**
```bash
# Worktree path no longer exists
[ ! -d "<path>" ]
```

### Step 2: Check for Blockers

For each stale worktree, check:

**Has uncommitted changes?**
```bash
git -C "<path>" status --porcelain 2>/dev/null | grep -q .
```
If dirty: SKIP with message "Skipping <path> - has uncommitted changes"

**Is locked?**
```bash
git worktree list --porcelain | grep -A1 "worktree <path>" | grep -q "locked"
```
If locked: SKIP with message "Skipping <path> - worktree is locked"

### Step 3: Present Candidates

```
Stale worktrees found:

  1. ../dev-agent-agent-old
     Branch: agent/old-feature
     Reason: Merged to main, 14 days old

  2. ../dev-agent-agent-experiment
     Branch: agent/experiment
     Reason: Abandoned (21 days, no commits)

Remove these worktrees? (y/n):
```

If `--dry-run`: Show list and exit without prompting.

### Step 4: Confirm and Remove

Use AskUserQuestion to get confirmation (unless --force):

```
question: "Remove [N] stale worktrees?"
options:
  - "Yes, remove them"
  - "No, keep them"
  - "Let me review the list first"
```

### Step 5: Remove Worktrees

For each confirmed worktree:

```bash
# Remove worktree
git worktree remove "<path>" --force

# Delete branch if merged
if git branch --merged main | grep -q "<branch>"; then
  git branch -d "<branch>"
fi
```

### Step 6: Prune and Report

```bash
# Clean up worktree references
git worktree prune
```

Report results:
```
Removed:
  ✓ ../dev-agent-agent-old (branch agent/old-feature deleted)
  ✓ ../dev-agent-agent-experiment (branch kept - not merged)

Cleaned 2 worktrees
```

## Safety Rules

1. **NEVER remove without confirmation** (unless --force)
2. **NEVER remove dirty worktrees** (uncommitted changes)
3. **NEVER remove locked worktrees**
4. **NEVER remove the main worktree**

## Error Handling

| Situation | Action |
|-----------|--------|
| No stale worktrees | "No stale worktrees found. All worktrees are active." |
| All candidates dirty | "Found [N] stale worktrees but all have uncommitted changes." |
| Removal fails | Show error, continue with others |

## Examples

```bash
# Interactive cleanup
/github/worktree-clean

# See what would be removed
/github/worktree-clean --dry-run

# Remove without confirmation
/github/worktree-clean --force
```
