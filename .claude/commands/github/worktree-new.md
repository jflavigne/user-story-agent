---
description: Create a new worktree for parallel development
argument-hint: <feature-name> [--from <base-branch>]
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# /github/worktree-new

Create a parallel worktree with an `agent/*` branch for isolated development.

## Arguments

- `<feature-name>`: Name for the feature (will be slugified)
- `--from <branch>`: Base branch to create from (default: main)

## Instructions

### Step 1: Parse Arguments

Extract feature name and base branch from arguments.
- Default base branch: `main`
- Slugify feature name: lowercase, replace spaces with dashes

### Step 2: Generate Names

```bash
# Get project name from current directory
PROJECT_NAME=$(basename $(pwd))

# Generate branch name
BRANCH="agent/<feature-slug>"

# Generate worktree path
WORKTREE_PATH="../${PROJECT_NAME}-${BRANCH//\//-}"
```

### Step 3: Validate

Run these checks in order:

**Check 1: Branch not in another worktree**
```bash
git worktree list | grep -q "\[${BRANCH}\]"
```
If found: ERROR "Branch ${BRANCH} is already checked out in another worktree"

**Check 2: Worktree count limit**
```bash
WORKTREE_COUNT=$(git worktree list | wc -l)
```
- If count >= 10: ERROR "Maximum worktrees (10) reached. Run /github/worktree-clean first."
- If count >= 6: WARNING "You have ${count} worktrees. Consider cleaning up stale ones."

**Check 3: File overlap detection**
```bash
# Get files modified in other agent/* worktrees
for wt in $(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2); do
  branch=$(git -C "$wt" branch --show-current 2>/dev/null)
  if [[ "$branch" == agent/* ]]; then
    git -C "$wt" diff --name-only main 2>/dev/null
  fi
done | sort -u > /tmp/other-worktree-files.txt

# This is informational - we'll check after creation
```

### Step 4: Create Worktree

```bash
# Create branch and worktree
git worktree add "${WORKTREE_PATH}" -b "${BRANCH}" "${BASE_BRANCH}"
```

If fails:
- "fatal: '${BRANCH}' is already checked out" → Error E-001
- "fatal: invalid reference" → Error E-003 (base branch doesn't exist)
- Other errors → Show error message

### Step 5: Setup CLAUDE.md Symlink

```bash
# Get absolute path to main CLAUDE.md
MAIN_CLAUDE_MD=$(pwd)/CLAUDE.md

# Create symlink in worktree
ln -sf "${MAIN_CLAUDE_MD}" "${WORKTREE_PATH}/CLAUDE.md"
```

### Step 6: Report Success

```
Created worktree:
  Path: ${WORKTREE_PATH}
  Branch: ${BRANCH}
  Base: ${BASE_BRANCH}

Switch with: cd ${WORKTREE_PATH} && claude
```

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| E-001 | Branch exists in another worktree | Use existing worktree or choose different name |
| E-002 | Parent directory not writable | Check permissions |
| E-003 | Base branch doesn't exist | Specify valid --from branch |
| E-004 | Max worktrees reached (10) | Run /github/worktree-clean first |

## Examples

```bash
# Create worktree for auth feature
/github/worktree-new auth

# Create from specific branch
/github/worktree-new bugfix --from develop

# Create with multi-word name
/github/worktree-new "user authentication"
# → Creates agent/user-authentication branch
```
