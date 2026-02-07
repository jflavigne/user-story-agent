# USA-41: Update System Prompt with Section Rules

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: None
**Size**: Medium (~200 lines)
**Track**: Track 3 (System Prompt & Template)

## Description

Add explicit section separation rules and canonical template to system prompt. This is prompt writing only - integration is blocked on USA-31.

## Tasks

1. Add Story Template section with canonical markdown structure
2. Add section rules (top half = product language, bottom half = technical)
3. Add examples of good/bad phrasing
4. Add instruction to reference System Context
5. Add warning against architectural hallucinations

## Acceptance Criteria

- System prompt clearly defines section separation
- Examples demonstrate product vs technical language
- Template matches canonical markdown structure
- Prompt includes System Context usage instructions

## Files Modified

- `src/prompts/system.ts`

## Files Created

None

## Dependencies

None (prompt writing can start immediately)

## Notes

- This is prompt-writing work only
- Integration into buildContextPrompt() happens in USA-42 (blocked on USA-31)
- Top half sections: story header, User-Visible Behavior, Outcome AC
- Bottom half sections: System AC, Implementation Notes, UI Mapping
