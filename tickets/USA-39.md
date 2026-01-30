# USA-39: Integrate PatchOrchestrator into User Story Agent

**Status**: BLOCKED (needs USA-32, USA-38)
**Depends on**: USA-32, USA-38
**Size**: Medium (~200 lines)
**Track**: Track 2 (Patch-Based Infrastructure)

## Description

Wire PatchOrchestrator into story generation workflow. After each iteration, apply patches to StoryStructure with mechanical section scope enforcement.

## Tasks

1. Initialize empty `StoryStructure` at start of workflow
2. Call `patchOrchestrator.applyPatches()` after each iteration
3. Pass iteration's `allowedPaths` to orchestrator
4. Log patch rejection metrics
5. Convert final `StoryStructure` to markdown via `StoryRenderer`

## Acceptance Criteria

- PatchOrchestrator enforces section scope
- Out-of-scope patches are rejected and logged
- Final story rendered correctly
- Rejection metrics visible in logs

## Files Modified

- `src/agent/user-story-agent.ts`

## Files Created

None

## Dependencies

**Blocked by USA-32** - Needs PatchValidator module
**Blocked by USA-38** - Needs all iterations to return patches

## Notes

- This completes the patch-based infrastructure integration
- Rejection metrics should be < 5% in normal operation
- Logs should show: `patch_rejected: { path: '...', reason: 'out of scope', advisorId: '...' }`
