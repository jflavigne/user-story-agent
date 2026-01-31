# USA-61: Add Vision Support Metadata to Iteration Registry

**Status:** Open
**Priority:** P2
**Type:** Architecture Improvement
**Created:** 2026-01-31
**Identified By:** Code Review (Post USA-60 implementation)

---

## Problem

Vision iteration support is currently hardcoded as an array in `user-story-agent.ts`:

```typescript
const visionIterationIds = [
  'interactive-elements',
  'responsive-web',
  'accessibility',
  'validation',
  'performance',
  'analytics',
];
```

**Issues:**
1. **Maintenance burden** - Adding new vision-capable iterations requires updating both the iteration definition AND this array
2. **Source of truth duplication** - The iteration registry should be the single source of truth for iteration metadata
3. **Risk of staleness** - Easy to forget to update this list when adding/removing vision support

**Impact:** P2 (Medium) - Creates technical debt but doesn't block current functionality. Future iterations requiring vision support need manual updates in multiple places.

---

## Proposed Solution

### Add `supportsVision` metadata to iteration registry

**Step 1: Update IterationRegistryEntry type**

File: `src/shared/iteration-registry.ts`

Add optional `supportsVision` field to registry entries:

```typescript
export interface IterationRegistryEntry {
  id: string;
  category: IterationCategory;
  metadata: IterationMetadata;
  supportsVision?: boolean; // NEW: Indicates if iteration can use mockup images
  applicability: {
    productTypes: ProductType[];
    required?: boolean;
  };
}
```

**Step 2: Mark vision-capable iterations in registry**

Update iteration metadata exports to include vision support flag:

```typescript
// src/prompts/iterations/interactive-elements.ts
export const INTERACTIVE_ELEMENTS_METADATA: IterationMetadata = {
  id: 'interactive-elements',
  // ... existing fields
  supportsVision: true, // NEW
};

// Repeat for: responsive-web, accessibility, validation, performance, analytics
```

**Step 3: Replace hardcoded array with registry query**

File: `src/agent/user-story-agent.ts` (lines 761-771)

Replace:
```typescript
const visionIterationIds = [
  'interactive-elements',
  'responsive-web',
  'accessibility',
  'validation',
  'performance',
  'analytics',
];
const useVision = Boolean(
  this.config.mockupImages?.length && visionIterationIds.includes(iteration.id)
);
```

With:
```typescript
const useVision = Boolean(
  this.config.mockupImages?.length &&
  iteration.metadata?.supportsVision
);
```

**Step 4: Update iteration registry helper**

Add utility function to query vision-capable iterations:

```typescript
// src/shared/iteration-registry.ts

/**
 * Get all iterations that support vision analysis
 */
export function getVisionCapableIterations(): IterationDefinition[] {
  return ALL_ITERATIONS.filter(iter => iter.metadata?.supportsVision === true);
}
```

---

## Test Plan

### Unit Tests

Create `tests/shared/iteration-registry.test.ts`:

```typescript
describe('Iteration Registry - Vision Support', () => {
  it('should mark 6 iterations as vision-capable', () => {
    const visionIterations = getVisionCapableIterations();
    expect(visionIterations).toHaveLength(6);

    const expectedIds = [
      'interactive-elements',
      'responsive-web',
      'accessibility',
      'validation',
      'performance',
      'analytics',
    ];

    const actualIds = visionIterations.map(i => i.id).sort();
    expect(actualIds).toEqual(expectedIds.sort());
  });

  it('should not mark non-vision iterations as vision-capable', () => {
    const nonVisionIds = ['user-roles', 'security', 'i18n-language'];

    for (const id of nonVisionIds) {
      const iteration = ALL_ITERATIONS.find(i => i.id === id);
      expect(iteration?.metadata?.supportsVision).toBeFalsy();
    }
  });
});
```

### Integration Test

Update `tests/agent/vision-workflow.test.ts`:

```typescript
it('should pass images to iterations with supportsVision=true', async () => {
  const agent = new UserStoryAgent({
    mockupImages: [{ path: 'test.png' }],
    iterations: ['interactive-elements', 'security'], // One vision, one not
  });

  const spy = jest.spyOn(agent as any, 'applyIteration');
  await agent.generateStories();

  // interactive-elements should receive images
  const interactiveCall = spy.mock.calls.find(
    call => call[0].id === 'interactive-elements'
  );
  expect(interactiveCall[1].messageContent).toContainImageBlock();

  // security should NOT receive images
  const securityCall = spy.mock.calls.find(
    call => call[0].id === 'security'
  );
  expect(securityCall[1].messageContent).not.toContainImageBlock();
});
```

---

## Success Criteria

- ✅ `supportsVision` field added to `IterationRegistryEntry` type
- ✅ All 6 vision-capable iterations marked with `supportsVision: true`
- ✅ Hardcoded array in `user-story-agent.ts` removed
- ✅ `getVisionCapableIterations()` helper function created
- ✅ Unit tests confirm correct iterations marked
- ✅ Integration tests verify images passed to correct iterations
- ✅ All existing tests still pass

---

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/shared/iteration-registry.ts` | Add `supportsVision` field, helper function | +15 |
| `src/prompts/iterations/interactive-elements.ts` | Add `supportsVision: true` | +1 |
| `src/prompts/iterations/responsive-web.ts` | Add `supportsVision: true` | +1 |
| `src/prompts/iterations/accessibility.ts` | Add `supportsVision: true` | +1 |
| `src/prompts/iterations/validation.ts` | Add `supportsVision: true` | +1 |
| `src/prompts/iterations/performance.ts` | Add `supportsVision: true` | +1 |
| `src/prompts/iterations/analytics.ts` | Add `supportsVision: true` | +1 |
| `src/agent/user-story-agent.ts` | Replace hardcoded array with metadata check | -8, +3 |
| `tests/shared/iteration-registry.test.ts` | Create vision support tests | +40 |
| `tests/agent/vision-workflow.test.ts` | Update integration test | +20 |

**Total:** ~75 new lines, 8 removed lines, 10 files modified

---

## Estimate

**2-3 hours**

- 30 min: Update types and metadata
- 30 min: Replace hardcoded logic
- 60 min: Write tests
- 30 min: Integration testing and verification

---

## Related Tickets

- **USA-60:** Vision Support for Critical Iterations (parent)
- **USA-62:** Extract Shared Over-Specification Patterns (related P2 improvement)

---

## Notes

This is a quality-of-life improvement that pays off over time. While not urgent, it reduces friction when adding new vision-capable iterations in the future and aligns with the principle of "registry as source of truth."
