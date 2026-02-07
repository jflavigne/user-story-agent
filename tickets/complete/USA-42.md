# USA-42: Add Context Manager Support for System Context

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-31, USA-41
**Size**: Small (~100 lines)
**Track**: Track 3 (System Prompt & Template)

## Description

Update buildContextPrompt() to inject SystemDiscoveryContext. This integrates the system prompt updates from USA-41.

## Tasks

1. Accept `systemContext` parameter in `buildContextPrompt()`
2. Format system context as readable text
3. Inject into context prompt
4. Add unit tests

## Acceptance Criteria

- `buildContextPrompt()` accepts and formats system context
- System context included in prompts
- Unit tests pass

## Files Modified

- `src/agent/state/context-manager.ts`
- `tests/agent/state/context-manager.test.ts`

## Files Created

None

## Dependencies

**Blocked by USA-31** - Needs SystemDiscoveryContext schema fixes
**Blocked by USA-41** - Needs updated system prompt to integrate

## Notes

- System context formatting should be human-readable (not raw JSON)
- Include component graph, contracts, vocabulary mappings
- Used by all LLM calls (story generation, judging, rewriting)
