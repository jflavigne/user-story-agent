# USA-62: Add Response Size Limiting for Mockup Image URLs

**Type**: Security Enhancement
**Priority**: P4
**Status**: Open
**Created**: 2026-01-31
**Parent**: Vision Support (USA-59)

## Problem

When fetching mockup images from URLs, there's no limit on response size. A malicious or misconfigured URL could serve an extremely large file causing memory exhaustion.

**Current code** (`src/utils/image-utils.ts:108-113`):
```typescript
const res = await fetch(input.url);
if (!res.ok) {
  throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
}
const arrayBuffer = await res.arrayBuffer();
return { buffer: Buffer.from(arrayBuffer), mediaType };
```

**Vulnerability:**
- No size limit before downloading
- Entire response loaded into memory with `arrayBuffer()`
- Could cause out-of-memory errors
- Could be used for DoS (if attacker controls CLI args)

## Risk Assessment

**Severity:** Low
**Likelihood:** Very Low

**Why not critical:**
- CLI tool, not web service
- Attacker must control `--mockup-images` parameter
- Node.js has memory limits (crashes before system exhaustion)
- Most use cases involve file paths, not URLs

**Why still worth fixing:**
- Prevents accidental issues (user provides wrong URL)
- Defense-in-depth security
- Better user experience (fail fast with clear error)

## Solution

Check `Content-Length` header before downloading, or stream with size limit.

### Option 1: Content-Length Check (Simple)

```typescript
const res = await fetch(input.url);
if (!res.ok) {
  throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
}

// Check Content-Length header
const contentLength = res.headers.get('content-length');
if (contentLength) {
  const sizeInBytes = parseInt(contentLength, 10);
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

  if (sizeInBytes > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image URL response too large: ${(sizeInBytes / 1024 / 1024).toFixed(2)} MB (max: ${MAX_IMAGE_SIZE / 1024 / 1024} MB)`
    );
  }
}

const arrayBuffer = await res.arrayBuffer();
return { buffer: Buffer.from(arrayBuffer), mediaType };
```

**Pros:**
- Simple, minimal code change
- Fast (fails before downloading)

**Cons:**
- Relies on server providing accurate Content-Length
- Attacker can omit Content-Length header

### Option 2: Streaming with Size Limit (Robust)

```typescript
const res = await fetch(input.url);
if (!res.ok) {
  throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const chunks: Buffer[] = [];
let totalSize = 0;

for await (const chunk of res.body!) {
  const buffer = Buffer.from(chunk);
  totalSize += buffer.length;

  if (totalSize > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image URL response exceeded size limit during download (max: ${MAX_IMAGE_SIZE / 1024 / 1024} MB)`
    );
  }

  chunks.push(buffer);
}

const buffer = Buffer.concat(chunks);
return { buffer, mediaType };
```

**Pros:**
- Works even if Content-Length missing
- Enforces hard limit during download

**Cons:**
- More complex
- Slightly slower (streaming)

### Option 3: Hybrid (Recommended)

Use both: check Content-Length first, then enforce streaming limit as backup.

```typescript
const res = await fetch(input.url);
if (!res.ok) {
  throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

// First check: Content-Length header
const contentLength = res.headers.get('content-length');
if (contentLength) {
  const sizeInBytes = parseInt(contentLength, 10);
  if (sizeInBytes > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image URL response too large: ${(sizeInBytes / 1024 / 1024).toFixed(2)} MB (max: ${MAX_IMAGE_SIZE / 1024 / 1024} MB)`
    );
  }
}

// Second check: enforce limit during streaming (defense against missing/lying Content-Length)
const chunks: Buffer[] = [];
let totalSize = 0;

for await (const chunk of res.body!) {
  const buffer = Buffer.from(chunk);
  totalSize += buffer.length;

  if (totalSize > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image URL response exceeded size limit during download (max: ${MAX_IMAGE_SIZE / 1024 / 1024} MB)`
    );
  }

  chunks.push(buffer);
}

const buffer = Buffer.concat(chunks);
return { buffer, mediaType };
```

## Configuration

Consider making the size limit configurable:

**Environment variable:**
```bash
MAX_MOCKUP_IMAGE_SIZE_MB=10 npm run agent -- --mockup-images https://example.com/huge.png
```

**CLI flag:**
```bash
npm run agent -- --mockup-images https://example.com/image.png --max-image-size 10
```

**Config option:**
```typescript
export interface UserStoryAgentConfig {
  // ... existing fields
  maxImageSizeBytes?: number; // Default: 10 MB
}
```

## Acceptance Criteria

- [ ] Content-Length header checked if present
- [ ] Streaming size limit enforced (handles missing Content-Length)
- [ ] Default limit: 10 MB (configurable)
- [ ] Clear error message indicates size limit exceeded
- [ ] Tests for both Content-Length and streaming scenarios
- [ ] Documentation updated with size limit info

## Testing

```typescript
describe('URL response size limiting', () => {
  it('allows images under 10 MB', async () => {
    // Mock server with 5 MB image
    const input = { url: 'https://example.com/5mb.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).resolves.toBeDefined();
  });

  it('blocks images over 10 MB via Content-Length', async () => {
    // Mock server with Content-Length: 15000000
    const input = { url: 'https://example.com/15mb.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('too large');
  });

  it('blocks images over 10 MB during streaming (no Content-Length)', async () => {
    // Mock server with no Content-Length header, streams 15 MB
    const input = { url: 'https://example.com/streaming-15mb.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('exceeded size limit');
  });

  it('respects custom size limit', async () => {
    // Test with 5 MB limit
    const input = { url: 'https://example.com/8mb.png', mediaType: 'image/png' as const, maxSizeBytes: 5 * 1024 * 1024 };
    await expect(loadImageFromSource(input)).rejects.toThrow('too large');
  });
});
```

## Recommended Size Limits

| Image Type | Typical Size | Recommended Limit |
|------------|--------------|-------------------|
| Mockup screenshot (PNG) | 200-500 KB | 10 MB |
| Mockup wireframe (PNG) | 50-200 KB | 10 MB |
| High-res design (PNG) | 1-3 MB | 10 MB |
| Uncompressed (BMP) | 5-20 MB | 20 MB (if supported) |

**Default: 10 MB** - Accommodates most mockups while preventing abuse

## Implementation Effort

- **Time:** 2-3 hours
- **Files:** src/utils/image-utils.ts (add size checks + streaming)
- **Tests:** tests/utils/image-utils.test.ts (add 4-5 test cases)

## Related

- USA-59: Vision support implementation
- USA-61: URL host validation (complementary security enhancement)

## Notes

- This is a nice-to-have enhancement, not critical
- Most users will use file paths, not URLs
- Enhances defense-in-depth and user experience
- Could prevent accidental issues (wrong URL, large video file, etc.)
