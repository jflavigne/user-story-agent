# USA-53: Add 'system-workflow' Mode

**Status**: BLOCKED (needs all Phase 1-4 tickets)
**Depends on**: USA-32 through USA-52
**Size**: Medium (~200 lines)
**Track**: Track 6 (Integration & Testing)

## Description

Add new AgentMode and orchestrate full workflow.

## Tasks

1. Add `'system-workflow'` to `AgentMode` enum
2. Implement `runSystemWorkflow(stories, referenceDocuments?)` method
3. Orchestrate Pass 0 → Pass 1 (with refinement) → Pass 2 → Pass 2b
4. Return results with all metadata

## Acceptance Criteria

- New mode added to enum
- Full workflow runs end-to-end
- All passes execute correctly
- Results include system context, judge results, consistency report

## Files Modified

- `src/shared/types.ts` (AgentMode)
- `src/agent/user-story-agent.ts`

## Files Created

None

## Dependencies

**Blocked by USA-32 through USA-52** - Needs entire system implemented

## Notes

- This is the final integration ticket
- Workflow: Pass 0 (discovery) → Pass 1a (generation) → Pass 1c (judge) → Pass 1b (rewrite if needed) → refinement loop → Pass 2 (interconnection) → Pass 2b (consistency) → auto-apply fixes
- Returns complete batch results
