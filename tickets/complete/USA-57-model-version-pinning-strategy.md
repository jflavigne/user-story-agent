# USA-57: Model Version Pinning Strategy

**Type**: Maintenance
**Priority**: P3
**Status**: COMPLETE (implementation verified 2026-02-06)
**Created**: 2026-01-31

## Problem

The quality presets use hardcoded model version strings in `src/agent/types.ts`:

```typescript
const OPUS_4_5 = 'claude-opus-4-20250514';
const SONNET_4_5 = 'claude-sonnet-4-20250514';
const HAIKU_4_5 = 'claude-3-5-haiku-20241022';
```

These model IDs are now 8+ months old (as of 2026-01-31). When newer model versions are released, the presets will continue using older versions.

## Impact

- **Low urgency**: Current models work correctly
- **Future risk**: Missing improvements from newer model versions
- **Maintenance burden**: Requires code changes to update model versions

## Options

### Option 1: Extract to Configuration
Move model IDs to `config.ts` or environment variables:
```typescript
export const MODEL_VERSIONS = {
  OPUS: process.env.OPUS_MODEL ?? 'claude-opus-4-20250514',
  SONNET: process.env.SONNET_MODEL ?? 'claude-sonnet-4-20250514',
  HAIKU: process.env.HAIKU_MODEL ?? 'claude-3-5-haiku-20241022',
};
```

**Pros**: Easy to update without code changes
**Cons**: Adds configuration complexity

### Option 2: Use Latest Aliases (if available)
If Anthropic provides "latest" aliases like `claude-opus-4-latest`:
```typescript
const OPUS_4_5 = 'claude-opus-4-latest';
```

**Pros**: Automatic updates to latest versions
**Cons**: Less reproducibility, may introduce breaking changes

### Option 3: Document Intentional Pinning
Add documentation explaining why specific versions are pinned:
```typescript
/**
 * Model IDs for quality presets.
 *
 * These are intentionally pinned to specific versions for reproducibility
 * and stability. Update manually after testing new versions.
 *
 * Last updated: 2026-01-31
 */
const OPUS_4_5 = 'claude-opus-4-20250514';
```

**Pros**: No code changes, clear intent
**Cons**: Still requires manual updates

## Recommendation

Start with **Option 3** (document pinning) for now. Consider Option 1 or 2 if:
- Users frequently request newer models
- Anthropic provides stable "latest" aliases
- Model versions change more than quarterly

## Acceptance Criteria

- [x] Add documentation explaining version pinning strategy
- [x] Include "Last updated" date in comments
- [x] Add to README how users can override model versions
- [x] Consider adding warning log if using models >6 months old

## Implementation Summary

**Option 3** implemented. Added:

- JSDoc and `MODEL_PINNING_LAST_UPDATED` in `src/agent/types.ts`
- "Model Overrides" subsection in README (quality presets, CLI flags, programmatic API)
- `src/agent/model-utils.ts` with `parseModelDate`, `warnIfModelsStale`, `getModelIdsFromConfig`
- Stale-model warning at agent creation when models are >6 months old
- Unit tests in `tests/agent/model-utils.test.ts`

## Related

- Code review finding #3 from model selection implementation
