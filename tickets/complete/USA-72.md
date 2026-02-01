# USA-72: Track Title Generation Failures in System Workflow Metadata

**Status:** Todo
**Priority:** P3 (Observability)
**Effort:** 30 minutes
**Created:** 2026-01-31
**Sprint:** Observability

## Context

Code review identified that when title generation fails in `runSystemWorkflow()`, failures are logged but not tracked in result metadata. Operators may not notice if many titles fail to generate in a batch.

## Problem

Currently in `src/agent/user-story-agent.ts:1461-1481`:
- Title generation errors are caught and logged
- Stories continue with "Untitled"
- No count of failures in SystemWorkflowResult metadata
- Operators may miss failures in verbose logs

## Task

Add failure tracking to system workflow results:

### 1. Update SystemWorkflowResult type

Add to metadata in `src/agent/types.ts`:

```typescript
export interface SystemWorkflowResult {
  // ... existing fields ...
  metadata: {
    passesCompleted: number;
    refinementRounds: number;
    totalStories: number;
    titleGenerationFailures?: number; // NEW
  };
}
```

### 2. Track failures in runSystemWorkflow

In `src/agent/user-story-agent.ts:1461-1481`:

```typescript
let titleGenerationFailures = 0;
finalStories = await Promise.all(
  finalStories.map(async (story) => {
    // ... existing logic ...
    } catch (error) {
      titleGenerationFailures++;
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`runSystemWorkflow: title generation failed for ${story.id} (continuing): ${message}`);
      return story;
    }
  })
);

return {
  // ... existing fields ...
  metadata: {
    // ... existing fields ...
    titleGenerationFailures,
  },
};
```

### 3. Update tests

Add assertions in system workflow tests to verify failure tracking.

## Acceptance Criteria

- [ ] SystemWorkflowResult type includes `titleGenerationFailures` in metadata
- [ ] Failures counted and returned in workflow result
- [ ] Tests verify failure count accuracy
- [ ] No breaking changes to existing consumers

## Related

- Parent: USA-65 to USA-70 (Title generation implementation)
- Issue: Code review finding #5
