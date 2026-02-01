# USA-76: Add API Response Validation in fetchFigmaComponents

**Status:** Ready
**Priority:** P2 (Robustness)
**Effort:** 10 minutes
**Created:** 2026-01-31
**Found During:** Code review of USA-64

## Context

The `fetchFigmaComponents` function doesn't validate the Figma API response structure before accessing nested properties. If the API returns a different shape, the code fails with an unclear runtime error.

## Issue

In `src/utils/figma-utils.ts:127`:

```typescript
const componentsData = (await componentsResponse.json()) as {
  meta: {
    components: Array<{...}>;
  };
};

// Add all components with confidence scoring
for (const comp of componentsData.meta.components) {
  // ...
}
```

If Figma returns `{ meta: {} }` or `{ meta: { components: null } }`, this throws `TypeError: null/undefined is not iterable` with no clear indication of the issue.

## Proposed Fix

Add explicit validation before iteration:

```typescript
const componentsData = (await componentsResponse.json()) as {
  meta?: {
    components?: Array<{...}>;
  };
};

if (!Array.isArray(componentsData?.meta?.components)) {
  throw new Error('Figma components API returned unexpected response shape');
}

for (const comp of componentsData.meta.components) {
  // ...
}
```

## Acceptance Criteria

- [ ] Validate response structure before accessing nested properties
- [ ] Throw clear error message when response shape is unexpected
- [ ] Apply same pattern to component_sets response (line ~150)

## Related

- Found during: USA-64 code review
- Severity: P2 - Runtime error with unclear message
