# USA-64: Extract Figma Magic Number to Constant

**Status**: Open
**Priority**: P3 (Nice-to-have)
**Type**: Code Quality
**Effort**: Trivial (5 min)

## Context

Code review identified a magic number in Figma screenshot download logic.

## Issue

In `src/utils/figma-utils.ts:243`:
```typescript
const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`;
```

The `scale=2` parameter is a magic number that should be a named constant.

## Proposed Fix

```typescript
// At top of file with other constants
const FIGMA_IMAGE_SCALE = 2; // 2x retina resolution for high-quality screenshots

// In downloadFigmaScreenshot function:
const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=${FIGMA_IMAGE_SCALE}`;
```

## Acceptance Criteria

- [ ] `FIGMA_IMAGE_SCALE` constant defined at top of figma-utils.ts
- [ ] Constant includes JSDoc comment explaining purpose
- [ ] URL construction uses constant instead of hardcoded `2`
- [ ] Tests still pass
