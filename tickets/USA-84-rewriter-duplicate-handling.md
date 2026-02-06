# USA-84: Add Duplicate Section Handling to Rewriter

## Summary

The story judge now detects duplicate sections (via `completeness.duplicateSections`), but the section-separation rewriter doesn't handle them. This creates a gap in the feedback loop.

## Background

As part of the prompt rework for story consistency (parent work), we added:
1. **Judge rubric** (`unified-story-judge.ts`): Detects duplicate sections and reports them as `{ "section": "<header>", "count": <number> }`
2. **System prompt** (`system.ts`): Anti-duplication rules stating each section header must appear exactly once

However, the rewriter (`section-separation.ts`) was designed only to handle:
- Jargon violations (rephrase or move technical content)
- Voice violations (convert third-person to first-person)

It does NOT handle structural issues like duplicate sections.

## Problem

If a story has duplicate `## UI Mapping` sections (a known issue that prompted this work), the judge will detect it, but the rewriter won't fix it. The feedback loop is incomplete.

## Proposed Solution

Add duplicate section handling to the rewriter prompt:

```markdown
## Additional Task: Duplicate Sections

If the judge reports duplicate sections in `completeness.duplicateSections`:
- Consolidate all instances of the duplicated section into ONE section
- Preserve all unique content from each duplicate
- Place the consolidated section in the correct template order
- Example: Two "## UI Mapping" sections → merge into one with all mappings
```

## Acceptance Criteria

- [ ] Rewriter prompt includes instructions for handling duplicate sections
- [ ] Given a story with duplicate UI Mapping sections, when rewriter runs, then output has single consolidated UI Mapping
- [ ] Content from both duplicate sections is preserved (no data loss)
- [ ] Section appears in correct template order

## Priority

P2 - Enhancement (duplicate detection is working; this completes the fix loop)

## Labels

- `prompt-engineering`
- `rewriter`
- `story-quality`
