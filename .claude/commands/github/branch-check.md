---
description: Check if a branch is safe to push
argument-hint: [<branch-name>]
allowed-tools: Bash, Read
---

# /github/branch-check

Verify a branch is safe for push operations. Blocks protected branches and checks GitHub auth.

## Arguments

- `<branch-name>`: Branch to check (default: current branch)

## Instructions

### Step 1: Get Branch Name

```bash
# Use provided branch or get current
BRANCH="${1:-$(git branch --show-current)}"
```

### Step 2: Check Protected Branches

**BLOCKED branches (cannot push directly):**
- `main`
- `master`

**WARNING branches (proceed with caution):**
- `develop`
- `staging`
- `production`

```bash
case "$BRANCH" in
  main|master)
    echo "BLOCKED"
    ;;
  develop|staging|production)
    echo "WARNING"
    ;;
  *)
    echo "OK"
    ;;
esac
```

### Step 3: Check Worktree Status

```bash
# Is this branch checked out in another worktree?
OTHER_WORKTREE=$(git worktree list | grep "\[$BRANCH\]" | grep -v "$(pwd)" | head -1)
```

### Step 4: Check GitHub Auth

```bash
# Get current GitHub account
GH_USER=$(gh auth status 2>&1 | grep "Logged in to" | head -1)
```

### Step 5: Report Status

**For safe branches:**
```
Branch: agent/auth
Status: ✓ Safe to push

  ✓ Not a protected branch
  ✓ Not checked out in another worktree
  ✓ GitHub auth: jflavigne-sidlee
```

**For BLOCKED branches:**
```
Branch: main
Status: ✗ BLOCKED

  ✗ Protected branch - cannot push directly

To work on this codebase:
  /github/worktree-new <feature-name>

This creates an agent/* branch that can be pushed and PR'd.
```

**For WARNING branches:**
```
Branch: develop
Status: ⚠ WARNING

  ⚠ Semi-protected branch - use caution
  ✓ Not checked out in another worktree
  ✓ GitHub auth: jflavigne-sidlee

Consider creating a feature branch instead:
  /github/worktree-new <feature-name> --from develop
```

### Step 6: Auth Mismatch Warning

If the expected auth (from CLAUDE.md or .git/config) differs from current:

```
⚠ GitHub auth mismatch
  Current: @other-account
  Expected: @jflavigne-sidlee

Switch with: gh auth switch --user jflavigne-sidlee
```

## Integration

This check is automatically called by `/github/pr-create` before creating PRs.

## Examples

```bash
# Check current branch
/github/branch-check

# Check specific branch
/github/branch-check main

# Check feature branch
/github/branch-check agent/auth
```
