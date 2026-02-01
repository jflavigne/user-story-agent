# USA-77: Validate nodeId Before URL Interpolation

**Status:** Ready
**Priority:** P2 (Security Hardening)
**Effort:** 15 minutes
**Created:** 2026-01-31
**Found During:** Code review of USA-64

## Context

The `downloadFigmaScreenshot` function accepts `nodeId: string` as a parameter and directly interpolates it into the URL without validation. If a caller passes a value containing special characters (`&`, `=`, `/`), it can alter the request URL.

## Issue

In `src/utils/figma-utils.ts:250`:

```typescript
export async function downloadFigmaScreenshot(
  fileKey: string,
  nodeId: string,
  accessToken: string
): Promise<Buffer> {
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=${FIGMA_IMAGE_SCALE}`;
```

Risk is low (caller affects their own request), but it's a raw boundary that should be validated.

## Proposed Fix

Validate `nodeId` format before building URL:

```typescript
// Figma node IDs follow pattern: digits, colons, hyphens (e.g., "123:456" or "1-2")
const NODE_ID_PATTERN = /^[\d:-]+$/;

export async function downloadFigmaScreenshot(
  fileKey: string,
  nodeId: string,
  accessToken: string
): Promise<Buffer> {
  if (!NODE_ID_PATTERN.test(nodeId)) {
    throw new Error(`Invalid Figma node ID format: ${nodeId}`);
  }
  
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=${FIGMA_IMAGE_SCALE}`;
```

Alternative: Use `encodeURIComponent(nodeId)` for proper URL encoding.

## Acceptance Criteria

- [ ] Validate nodeId format matches Figma's pattern OR encode for URL safety
- [ ] Reject invalid nodeId values with clear error message
- [ ] Consider same validation for fileKey parameter

## Related

- Found during: USA-64 code review
- Severity: P2 - Low risk but hardens security boundary
