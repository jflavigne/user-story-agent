# USA-29: Evaluator-Optimizer Pattern

**Epic:** USA - User Story Agent
**Type:** Enhancement
**Priority:** Medium
**Dependencies:** USA-26

## Description

Add a verification step after each iteration to validate that outputs meet quality standards. This implements Anthropic's Evaluator-Optimizer pattern where one LLM generates content and another provides feedback and refinement.

## Problem Statement

- No verification that iterations actually enhance the story
- Changes might be destructive or introduce inconsistencies
- No way to detect hallucinated or irrelevant additions
- Quality is entirely dependent on single-pass generation

## Acceptance Criteria

- [ ] Create `src/agent/evaluator.ts` with verification logic
- [ ] Define evaluation criteria schema
- [ ] Add `--verify` CLI flag to enable verification mode
- [ ] After each iteration, optionally verify:
  - Did the iteration actually enhance the story?
  - Are changes coherent and non-destructive?
  - Does output match iteration's stated purpose?
- [ ] Generate verification score (0-1) with reasoning
- [ ] If verification fails, log warning but continue (non-blocking)
- [ ] Add verification results to iteration output
- [ ] Create tests for evaluator

## Files

### New Files
- `src/agent/evaluator.ts` - Verification logic (~120 lines)
- `src/prompts/evaluator-prompt.ts` - Evaluator system prompt
- `tests/agent/evaluator.test.ts` - Evaluator unit tests

### Modified Files
- `src/agent/user-story-agent.ts` - Wire up evaluator after iterations
- `src/agent/types.ts` - Add verification types
- `src/cli.ts` - Add --verify flag
- `src/shared/schemas.ts` - Add verification result schema

## Status: COMPLETE (2026-01-31)

## Technical Notes

### Evaluator Pattern

From Anthropic's documentation:
> "One LLM generates responses while another provides evaluation and feedback"

Our implementation is lightweight: verification is informational, not blocking.

### Verification Types

```typescript
// src/agent/types.ts
export interface VerificationResult {
  passed: boolean;
  score: number; // 0-1
  reasoning: string;
  issues: VerificationIssue[];
}

export interface VerificationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  suggestion?: string;
}
```

### Evaluator Prompt

```typescript
// src/prompts/evaluator-prompt.ts
export const EVALUATOR_SYSTEM_PROMPT = `
You are a quality evaluator for user story enhancements.
Your job is to verify that an iteration improved the story appropriately.

Evaluate based on:
1. ENHANCEMENT: Did the iteration add value to the story?
2. COHERENCE: Are changes consistent with the original story?
3. RELEVANCE: Do changes match the iteration's stated purpose?
4. NON-DESTRUCTIVE: Were important elements preserved?

Respond with JSON:
{
  "passed": true/false,
  "score": 0.0-1.0,
  "reasoning": "Brief explanation",
  "issues": [
    {"severity": "warning", "category": "coherence", "description": "...", "suggestion": "..."}
  ]
}
`;
```

### Evaluator Implementation

```typescript
// src/agent/evaluator.ts
export class Evaluator {
  constructor(private client: ClaudeClient) {}

  async verify(
    originalStory: string,
    enhancedStory: string,
    iterationId: string,
    iterationPurpose: string
  ): Promise<VerificationResult> {
    const response = await this.client.sendMessage([
      {
        role: 'user',
        content: `
Original story:
${originalStory}

Enhanced story (after ${iterationId} iteration):
${enhancedStory}

Iteration purpose: ${iterationPurpose}

Evaluate whether this enhancement is valid.
        `
      }
    ], EVALUATOR_SYSTEM_PROMPT);

    return VerificationResultSchema.parse(JSON.parse(response));
  }
}
```

### Integration

```typescript
// In UserStoryAgent.runIteration()
const result = await this.executeIteration(iteration);

if (this.options.verify) {
  const verification = await this.evaluator.verify(
    previousStory,
    result.enhancedStory,
    iteration.id,
    iteration.description
  );

  result.verification = verification;

  if (!verification.passed) {
    logger.warn(`Verification failed for ${iteration.id}`, {
      score: verification.score,
      issues: verification.issues
    });
  }
}
```

### CLI Usage

```bash
# Enable verification mode
echo "story" | npm run agent -- --verify

# Verification results appear in output
{
  "enhancedStory": "...",
  "changesApplied": [...],
  "verification": {
    "passed": true,
    "score": 0.92,
    "reasoning": "Changes are coherent and match iteration purpose"
  }
}
```

## Cost Considerations

Verification adds one additional API call per iteration. For cost-sensitive usage:
- Default is off (`--verify` must be explicitly enabled)
- Use a smaller/faster model for verification (optional future enhancement)
- Skip verification for low-risk iterations

## Verification

```bash
# Run evaluator tests
npm test -- --grep "evaluator"

# Manual test with verification
echo "As a user I want to login" | npm run agent -- \
  --mode individual --iterations validation --verify

# Should see verification results in debug output
```

## References

- [Building Effective Agents - Evaluator-Optimizer](https://www.anthropic.com/research/building-effective-agents)
