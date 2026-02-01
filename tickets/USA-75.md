# USA-75: Fix Image Size Enforcement Bypass in downloadFigmaScreenshot

**Status:** Ready
**Priority:** P1 (Security)
**Effort:** 15 minutes
**Created:** 2026-01-31
**Found During:** Code review of USA-64

## Context

The `downloadFigmaScreenshot` function has a size check that can be bypassed when the `Content-Length` header is missing or invalid. This allows a malicious or misconfigured server to cause high memory usage or OOM.

## Issue

In `src/utils/figma-utils.ts:286-294`:

```typescript
const contentLength = imageResponse.headers.get('content-length');
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
  throw new Error(
    `Image too large: ${contentLength} bytes (max ${MAX_IMAGE_SIZE})`
  );
}

return Buffer.from(await imageResponse.arrayBuffer());
```

If the server omits `Content-Length` or sends a non-numeric value, the check is skipped and the full response is read into memory.

## Proposed Fix

Require a valid `Content-Length` header below the cap, or enforce size limit during streaming:

```typescript
const contentLength = imageResponse.headers.get('content-length');
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

if (!contentLength) {
  throw new Error('Image response missing Content-Length header');
}

const size = parseInt(contentLength, 10);
if (Number.isNaN(size)) {
  throw new Error('Image response has invalid Content-Length header');
}

if (size > MAX_IMAGE_SIZE) {
  throw new Error(
    `Image too large: ${size} bytes (max ${MAX_IMAGE_SIZE})`
  );
}

return Buffer.from(await imageResponse.arrayBuffer());
```

## Acceptance Criteria

- [ ] Reject responses without `Content-Length` header
- [ ] Reject responses with invalid (non-numeric) `Content-Length`
- [ ] Enforce size limit before reading response body
- [ ] Clear error messages for each failure case

## Related

- Found during: USA-64 code review
- Severity: P1 - Can cause OOM/DoS
