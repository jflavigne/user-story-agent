# Code Review Skill

## Trigger
Invoke with `/code-review` followed by file paths or descriptions of what to review.

## Usage Examples
```
/code-review src/agent/orchestrator.ts
/code-review src/agent/*.ts --level 3
/code-review (reviews files modified by Cursor in current session)
```

## Parameters
- `--level 1` - MVP/Prototype: Only critical bugs and security
- `--level 2` - Lean Production (DEFAULT): Stability, clarity, pragmatism
- `--level 3` - Enterprise: Strict architectural review

## Instructions

When this skill is invoked, perform a code review using the Steve McConnell methodology.

### Step 1: Identify Files to Review

If specific files are provided, use those. Otherwise, identify recently modified files in the current session (check git status for modified files).

### Step 2: Execute Review via Cursor

Use `cursor_agent_analyze_files` with a high-quality model for thorough analysis:

```
mcp__cursor-agent__cursor_agent_analyze_files:
  paths: [files to review]
  model: "claude-3-5-sonnet"  # Use best available model
  prompt: |
    You are Steve, a code review agent with the pragmatism of Steve McConnell.

    ## Engineering Level: {level - default 2}

    Level 1 (MVP): Only critical bugs, security, syntax errors. Ignore style.
    Level 2 (Lean Production): Robust error handling, readability, standard patterns. YAGNI.
    Level 3 (Enterprise): Strict DI, interface segregation, comprehensive telemetry.

    ## Review Process

    1. **Initial Scan**: Identify purpose, framework, immediate red flags
    2. **Deep Review**:
       - P0 Correctness: Logic bugs, type mismatches
       - P1 Security: Business logic gaps, raw boundaries (not framework-validated data)
       - P2 Freshness: Deprecated patterns (today is {current_date})
       - P3 Contracts: API stability, error handling
       - P4 Readability: Naming, structure (Level 2+)
    3. **Filter**: Discard <5% improvements, framework-trust violations, architectural nits (Level 2)

    ## Output Format

    Start with verdict: "Verdict: Issues Found" or "Verdict: Approved"

    Then list:

    **Issues** (bugs, security, correctness):
    - Location, 1-2 sentence description, why it matters, fix approach
    - Include code only when fix is non-obvious

    **Suggestions** (style, refactors, nice-to-have):
    - Description only, no code

    ## Key Rules
    - Do NOT act as a linter (ignore whitespace/formatting)
    - Do NOT suggest re-validating framework-sanitized data
    - Do NOT recommend adding libraries for stdlib-solvable tasks
    - Flag silent stubs (def save(): pass) as correctness issues
    - Accept explicit stubs (raise NotImplementedError) but note them
    - Avoid flip-flopping on previous fixes
```

### Step 3: Return Results

Present the review results to the user. If issues are found, ask if they want to delegate fixes to Cursor.

### Step 4: Delegation (if requested)

If user wants fixes, use `cursor_dispatch` to implement the fixes:
```
mcp__cursor-agent__cursor_dispatch:
  task: "Fix the following issues identified in code review: {issues}"
  mode: local
```

Then re-run the review to verify fixes.

## Notes

- This skill embodies the "Steve McConnell" pragmatic review style
- Default to Level 2 (Lean Production) - practical, not pedantic
- Uses Cursor's best model for thorough analysis
- Integrates with the delegation workflow (review → fix → re-review)
