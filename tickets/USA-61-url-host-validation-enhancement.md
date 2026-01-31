# USA-61: Add Host Validation for Mockup Image URLs

**Type**: Security Enhancement
**Priority**: P3
**Status**: Open
**Created**: 2026-01-31
**Parent**: Vision Support (USA-59)

## Problem

The image loading utility validates that URLs use HTTPS (preventing HTTP SSRF), but doesn't validate the hostname. This allows potential SSRF attacks against internal HTTPS services:

- Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x)
- Localhost (localhost, 127.0.0.1, ::1)
- Metadata endpoints (169.254.169.254 - AWS/GCP/Azure metadata)
- Internal hostnames

**Current code** (`src/utils/image-utils.ts:101-108`):
```typescript
// Validate URL to prevent SSRF
const url = new URL(input.url);
if (url.protocol !== 'https:') {
  throw new Error(`Only HTTPS URLs are allowed for image fetching. Got: ${url.protocol}`);
}

const res = await fetch(input.url);
```

## Risk Assessment

**Severity:** Medium
**Likelihood:** Low (requires attacker control of CLI arguments)

**Why not critical:**
- This is a CLI tool, not a web service
- Attacker must control `--mockup-images` parameter
- Most use cases involve file paths, not URLs
- Users typically trust their own URL inputs

**Why still worth fixing:**
- Defense-in-depth security principle
- Prevents accidental misuse (e.g., user copying URL from internal network)
- Protects against social engineering (malicious scripts with URL injection)

## Solution

Add hostname validation to block private/internal addresses.

### Implementation

**File:** `src/utils/image-utils.ts`

```typescript
// After existing URL validation (line 101-106)
const url = new URL(input.url);

// Validate protocol
if (url.protocol !== 'https:') {
  throw new Error(`Only HTTPS URLs are allowed for image fetching. Got: ${url.protocol}`);
}

// Validate hostname is not private/internal
const hostname = url.hostname.toLowerCase();

// Block localhost
if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
  throw new Error('Cannot fetch images from localhost');
}

// Block private IP ranges
if (isPrivateIP(hostname)) {
  throw new Error(`Cannot fetch images from private IP address: ${hostname}`);
}

// Block cloud metadata endpoints
if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
  throw new Error('Cannot fetch images from metadata endpoints');
}

const res = await fetch(input.url);
```

### Helper Function

```typescript
/**
 * Checks if a hostname is a private IP address
 * Blocks: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
 */
function isPrivateIP(hostname: string): boolean {
  // Handle IPv4
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (!match) {
    return false; // Not an IP address (could be domain name)
  }

  const [, a, b, c, d] = match.map(Number);

  // Validate octets are 0-255
  if (a > 255 || b > 255 || c > 255 || d > 255) {
    return false;
  }

  // Check private ranges
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // 127.0.0.0/8 (loopback)

  return false;
}
```

## Acceptance Criteria

- [ ] HTTPS-only validation remains (existing)
- [ ] Localhost blocked (localhost, 127.0.0.1, ::1)
- [ ] Private IPv4 ranges blocked (10.x, 172.16-31.x, 192.168.x, 127.x)
- [ ] Cloud metadata endpoints blocked (169.254.169.254, metadata.google.internal)
- [ ] Domain names allowed (e.g., images.example.com)
- [ ] Public IPs allowed (e.g., 8.8.8.8 - though unusual for images)
- [ ] Clear error messages indicate why URL was blocked
- [ ] Tests added for each validation case

## Testing

```typescript
describe('URL host validation', () => {
  it('allows public HTTPS URLs', async () => {
    const input = { url: 'https://example.com/image.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).resolves.toBeDefined();
  });

  it('blocks localhost', async () => {
    const input = { url: 'https://localhost/image.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('localhost');
  });

  it('blocks 127.0.0.1', async () => {
    const input = { url: 'https://127.0.0.1/image.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('localhost');
  });

  it('blocks private IP 10.x.x.x', async () => {
    const input = { url: 'https://10.0.0.1/image.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('private IP');
  });

  it('blocks private IP 192.168.x.x', async () => {
    const input = { url: 'https://192.168.1.1/image.png', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('private IP');
  });

  it('blocks metadata endpoint', async () => {
    const input = { url: 'https://169.254.169.254/latest/meta-data', mediaType: 'image/png' as const };
    await expect(loadImageFromSource(input)).rejects.toThrow('metadata');
  });
});
```

## Alternative Approach: Allowlist

Instead of blocklist, use an allowlist of trusted domains:

```typescript
const ALLOWED_DOMAINS = [
  'figma.com',
  'cdn.example.com',
  // ... user-configurable list
];

const hostname = url.hostname.toLowerCase();
const isAllowed = ALLOWED_DOMAINS.some(domain =>
  hostname === domain || hostname.endsWith('.' + domain)
);

if (!isAllowed) {
  throw new Error(`Domain not in allowlist: ${hostname}`);
}
```

**Pros:** More secure (default deny)
**Cons:** Less flexible, requires configuration

## Implementation Effort

- **Time:** 2-4 hours
- **Files:** src/utils/image-utils.ts (add validation + helper)
- **Tests:** tests/utils/image-utils.test.ts (add 6-8 test cases)

## Related

- USA-59: Vision support implementation
- USA-62: URL response size limiting (complementary security enhancement)
