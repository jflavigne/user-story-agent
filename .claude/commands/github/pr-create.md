---
description: Create a PR for the current branch
argument-hint: [--title <title>] [--draft] [--skip-checks]
allowed-tools: Bash, Read, Write
---

# /github/pr-create

Create a GitHub PR with auto-generated description, linked tickets, and design docs.

## Arguments

- `--title <title>`: Custom PR title (default: generated from branch/commits)
- `--draft`: Create as draft PR
- `--skip-checks`: Skip review/gates verification (use with caution)

## Preconditions

Before creating a PR, these must be true (unless --skip-checks):

1. **Review approved**: `.claude/.review_verdict.json` shows "Approved"
2. **Gates passed**: `.claude/.gates_status.json` shows "PASS"
3. **Not on protected branch**: Current branch is not main/master

## Instructions

### Step 1: Verify Preconditions

```bash
# Check current branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  ERROR "Cannot create PR from protected branch. Use /github/worktree-new first."
fi
```

**Check review status:**
```bash
REVIEW_VERDICT=$(cat .claude/.review_verdict.json 2>/dev/null | jq -r '.verdict')
if [[ "$REVIEW_VERDICT" != "Approved" ]]; then
  ERROR "Review not approved. Run /review first."
fi
```

**Check gates status:**
```bash
GATES_STATUS=$(cat .claude/.gates_status.json 2>/dev/null | jq -r '.status')
if [[ "$GATES_STATUS" != "PASS" ]]; then
  ERROR "Gates not passed. Run /gates first."
fi
```

### Step 2: Check GitHub Auth

```bash
# Verify correct account (from CLAUDE.md guidance)
gh auth status

# If wrong account, prompt to switch
gh auth switch --user jflavigne-sidlee
```

### Step 3: Gather Context

**Get commits:**
```bash
git log main..HEAD --oneline --no-merges
```

**Extract linked tickets:**
```bash
# Look for T-###, #123, JIRA-### patterns in commit messages
git log main..HEAD --format=%B | grep -oE '(T-[0-9]+|#[0-9]+|[A-Z]+-[0-9]+)' | sort -u
```

**Find design docs:**
```bash
# Check for design docs in this branch's changes
git diff --name-only main..HEAD | grep -E 'design/.*\.(md|yaml)'
```

### Step 4: Generate PR Title

If no --title provided:
```bash
# Use branch name or first commit subject
if [[ "$BRANCH" == agent/* ]]; then
  TITLE="feat: ${BRANCH#agent/}" | sed 's/-/ /g'
else
  TITLE=$(git log -1 --format=%s)
fi
```

### Step 5: Generate PR Body

```markdown
## Summary

<!-- Auto-generated from commits -->
${COMMIT_SUMMARIES}

## Test Plan

- [x] Quality gates passed (pytest, ruff, mypy)
- [x] Code review approved

## Linked Artifacts

${TICKETS_SECTION}
${DESIGN_DOCS_SECTION}

---
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 6: Push Branch (if needed)

```bash
# Check if branch has upstream
if ! git rev-parse --abbrev-ref @{upstream} &>/dev/null; then
  git push -u origin "$BRANCH"
fi
```

### Step 7: Create PR

```bash
gh pr create \
  --title "$TITLE" \
  --body "$BODY" \
  ${DRAFT:+--draft} \
  --base main
```

### Step 8: Report Success

```
PR created successfully!

  Title: ${TITLE}
  Branch: ${BRANCH} → main
  URL: ${PR_URL}

  Linked:
    - Tickets: ${TICKETS}
    - Design: ${DESIGN_DOCS}

Next steps:
  - Share PR link for review
  - Address any CI feedback
  - Request merge when ready
```

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| E-030 | Review not approved | Run /review first |
| E-031 | Gates not passed | Run /gates first |
| E-032 | On protected branch | Use /github/worktree-new |
| E-033 | PR already exists | Shows existing PR link |
| E-034 | GitHub auth failed | Run `gh auth login` |
| E-035 | Network timeout | Retry |
| E-036 | PR body too large | Truncate description |

## Examples

```bash
# Create PR with auto-generated title
/github/pr-create

# Create with custom title
/github/pr-create --title "feat: Add user authentication"

# Create as draft
/github/pr-create --draft

# Skip verification (dangerous)
/github/pr-create --skip-checks
```
