# USA-26: Structured Output Validation

**Epic:** USA - User Story Agent
**Type:** Enhancement
**Priority:** Critical
**Dependencies:** USA-13, USA-16

## Description

Ensure Claude returns properly structured iteration results using Zod schema validation. Currently, the agent receives raw text output and manually parses it. This ticket adds formal schema validation to guarantee consistent, typed outputs and enable proper tracking of changes applied during each iteration.

## Problem Statement

- No structured output validation means we can't verify Claude produced the expected format
- The `changesApplied` array in `IterationResult` is always empty (no change tracking)
- Parsing failures are silent or cause runtime errors

## Acceptance Criteria

- [ ] Create `src/shared/schemas.ts` with Zod schemas for iteration outputs
- [ ] Define `IterationOutputSchema` with:
  - `enhancedStory: string` (required, non-empty)
  - `changesApplied: array` of `{ category, description, location? }`
  - `confidence: number` (0-1, optional)
- [ ] Modify system prompt to request JSON output format
- [ ] Update `ClaudeClient.sendMessage()` to parse structured output
- [ ] Update `UserStoryAgent.runIteration()` to validate output against schema
- [ ] Add graceful fallback for malformed responses (extract text, log warning)
- [ ] Populate `changesApplied` in `IterationResult` from parsed output
- [ ] Create unit tests for schema validation in `tests/shared/schemas.test.ts`
- [ ] Update E2E tests to verify structured output handling

## Files

### New Files
- `src/shared/schemas.ts` - Zod schemas for iteration outputs (~50 lines)
- `tests/shared/schemas.test.ts` - Unit tests for schema validation

### Modified Files
- `src/prompts/system-prompt.ts` - Add JSON output format instructions
- `src/agent/claude-client.ts` - Parse structured output from response
- `src/agent/user-story-agent.ts` - Validate output, populate changesApplied
- `src/shared/types.ts` - Export schema-derived types

## Technical Notes

### Schema Definition

```typescript
import { z } from 'zod';

export const ChangeAppliedSchema = z.object({
  category: z.string(),
  description: z.string(),
  location: z.string().optional()
});

export const IterationOutputSchema = z.object({
  enhancedStory: z.string().min(1),
  changesApplied: z.array(ChangeAppliedSchema),
  confidence: z.number().min(0).max(1).optional()
});

export type IterationOutput = z.infer<typeof IterationOutputSchema>;
```

### Prompt Modification

Add to system prompt:
```
You MUST respond with a JSON object in the following format:
{
  "enhancedStory": "The complete enhanced user story text...",
  "changesApplied": [
    {"category": "validation", "description": "Added email format validation"},
    {"category": "accessibility", "description": "Added ARIA labels", "location": "form fields"}
  ],
  "confidence": 0.85
}
```

### Fallback Strategy

```typescript
function parseIterationOutput(response: string): IterationOutput {
  try {
    const json = extractJSON(response);
    return IterationOutputSchema.parse(json);
  } catch (error) {
    logger.warn('Failed to parse structured output, using raw text');
    return {
      enhancedStory: response,
      changesApplied: [],
      confidence: undefined
    };
  }
}
```

## Verification

```bash
# Run schema unit tests
npm test -- --grep "schema"

# Run with debug to see changesApplied
echo "As a user I want to login" | LOG_LEVEL=debug npm run agent -- \
  --mode individual --iterations validation

# Should see populated changesApplied in output
```

## References

- [Zod Documentation](https://zod.dev/)
- [Anthropic Structured Outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)
