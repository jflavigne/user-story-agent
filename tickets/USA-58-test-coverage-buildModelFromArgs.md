# USA-58: Add Unit Tests for buildModelFromArgs

**Type**: Testing
**Priority**: P3
**Status**: Open
**Created**: 2026-01-31

## Problem

The `buildModelFromArgs()` function in `src/cli.ts` has several edge cases but lacks unit tests:

1. Single `--model` flag (backward compatibility)
2. `--quality-tier` preset selection
3. Per-operation overrides (`--model-discovery`, etc.)
4. Combination: preset + overrides
5. No arguments (should default to 'balanced')
6. Invalid quality tier (now validated, but edge case testing still valuable)

## Impact

- **Risk**: Logic errors could silently produce wrong model configs
- **Confidence**: Tests would catch regressions during refactoring
- **Documentation**: Tests serve as usage examples

## Implementation

Create `tests/cli/buildModelFromArgs.test.ts`:

```typescript
describe('buildModelFromArgs', () => {
  it('returns single model when --model provided', () => {
    const result = buildModelFromArgs({ model: 'claude-opus-4-20250514' });
    expect(result).toBe('claude-opus-4-20250514');
  });

  it('returns balanced preset by default', () => {
    const result = buildModelFromArgs({});
    expect(result).toBe('balanced');
  });

  it('returns preset when --quality-tier provided', () => {
    const result = buildModelFromArgs({ qualityTier: 'premium' });
    expect(result).toBe('premium');
  });

  it('merges per-operation overrides with preset', () => {
    const result = buildModelFromArgs({
      qualityTier: 'balanced',
      modelJudge: 'claude-opus-4-20250514',
    });
    expect(result).toMatchObject({
      judge: 'claude-opus-4-20250514',
      iteration: 'claude-3-5-haiku-20241022', // from balanced preset
    });
  });

  it('applies overrides without preset', () => {
    const result = buildModelFromArgs({
      modelDiscovery: 'claude-opus-4-20250514',
      modelIteration: 'claude-3-5-haiku-20241022',
    });
    expect(result).toMatchObject({
      discovery: 'claude-opus-4-20250514',
      iteration: 'claude-3-5-haiku-20241022',
    });
  });

  it('prefers --model over --quality-tier', () => {
    const result = buildModelFromArgs({
      model: 'claude-sonnet-4-20250514',
      qualityTier: 'premium', // should be ignored
    });
    expect(result).toBe('claude-sonnet-4-20250514');
  });
});
```

## Acceptance Criteria

- [ ] Create test file for `buildModelFromArgs`
- [ ] Cover all 6 edge cases listed above
- [ ] Tests pass with `npm test`
- [ ] Test coverage report shows >90% coverage for this function

## Notes

- May need to export `buildModelFromArgs` from `cli.ts` or extract to separate module for testability
- Consider extracting CLI logic to `src/cli/` directory if test setup becomes complex

## Related

- Code review finding #7 from model selection implementation
- Related to USA-57 (model version configuration)
