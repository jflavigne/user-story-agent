# USA-73: Add Token Usage Logging to Title Generation

**Status:** Todo
**Priority:** P4 (Observability)
**Effort:** 15 minutes
**Created:** 2026-01-31
**Sprint:** Observability

## Context

Code review identified that `TitleGenerator` doesn't log token usage, unlike other operations (e.g., `applyIteration` logs tokens on line 935-936). This is useful for cost tracking and debugging.

## Task

Add token usage logging to `TitleGenerator.generate()` method.

### Implementation

In `src/agent/title-generator.ts:50-81`:

```typescript
async generate(storyMarkdown: string): Promise<TitleResult> {
  logger.debug('TitleGenerator: generating title');

  const userMessage = `Generate a title for this user story:\n\n---\n\n${storyMarkdown}`;

  let response: { content: string; usage?: { input_tokens?: number; output_tokens?: number } };
  try {
    response = await this.claudeClient.sendMessage({
      systemPrompt: TITLE_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      model: this.resolveModel('titleGeneration'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AgentError(message, 'TITLE_GENERATION_API_ERROR', error instanceof Error ? error : undefined);
  }

  // Log token usage if available
  if (response.usage) {
    logger.debug(`TitleGenerator: tokens used - input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`);
  }

  // ... rest of method unchanged ...
}
```

## Acceptance Criteria

- [ ] Token usage logged at DEBUG level when available
- [ ] Log format consistent with other operations
- [ ] No errors if usage data unavailable
- [ ] Tests verify logging (or mock logger)

## Related

- Parent: USA-65 to USA-70 (Title generation implementation)
- Issue: Code review suggestion #2
