# USA-62: Extract Shared Over-Specification Patterns

**Status:** Open
**Priority:** P2
**Type:** Code Quality / Consistency
**Created:** 2026-01-31
**Identified By:** Code Review (Post USA-60 implementation)

---

## Problem

Over-specification detection patterns are duplicated across two files with inconsistent flags:

**File 1:** `tests/prompts/functional-vision-boundary.test.ts` (lines 28-30)
```typescript
const EXACT_COLOR_REGEX = /#[\da-fA-F]{3,8}\b|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)/;
const PIXEL_MEASUREMENT_REGEX = /\b\d+px\b|\b\d+rem\b|\b\d+em\b/;
const FONT_SPEC_REGEX = /\bfont-family\s*:\s*["']?(Helvetica|Arial|Inter)["']?|.../i;
```

**File 2:** `scripts/compare-vision-benchmarks.ts` (lines 24-26)
```typescript
const EXACT_COLOR_REGEX = /#[\da-fA-F]{3,8}\b|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)/g;
const PIXEL_MEASUREMENT_REGEX = /\b\d+px\b|\b\d+rem\b|\b\d+em\b/g;
const FONT_SPEC_REGEX = /\bfont-family\s*:\s*["']?(Helvetica|Arial|Inter)["']?|.../gi;
```

**Issues:**
1. **Flag inconsistency** - Test file lacks `g` flag, benchmark script has it
2. **Duplication** - Same patterns maintained in two places
3. **Maintenance burden** - Changes to patterns need to be synchronized manually
4. **Purpose mismatch** - Tests check presence (boolean), script counts matches (need `g` flag)

**Impact:** P2 (Medium) - Creates confusion and potential drift. If patterns diverge, tests won't validate what benchmarks measure.

---

## Proposed Solution

### Extract patterns to shared module

**Step 1: Create shared pattern module**

File: `src/shared/overspecification-patterns.ts` (~80 lines)

```typescript
/**
 * Over-Specification Detection Patterns
 *
 * Shared regex patterns for detecting styling details that should NOT appear
 * in user stories (belong in design system instead).
 *
 * @see docs/vision-functional-guidelines.md for rationale
 */

/**
 * Exact color values (hex, rgb, rgba, hsl, hsla)
 * Examples: #0066CC, rgb(255,0,0), rgba(0,0,0,0.5)
 */
export const EXACT_COLOR_PATTERN = /#[\da-fA-F]{3,8}\b|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)/;

/**
 * Pixel/rem/em measurements
 * Examples: 16px, 2rem, 1.5em
 */
export const PIXEL_MEASUREMENT_PATTERN = /\b\d+px\b|\b\d+rem\b|\b\d+em\b/;

/**
 * Font specifications (font-family, font-size, font-weight with values)
 * Examples: font-family: Helvetica, Helvetica 14px, font-size: 16px
 */
export const FONT_SPEC_PATTERN = /\bfont-family\s*:\s*["']?(Helvetica|Arial|Inter)["']?|(?:Helvetica|Arial|Inter)\s+\d+px|\d+px\s+(?:Helvetica|Arial|Inter)|font-weight\s*:\s*\d+|font-size\s*:\s*\d+px/;

/**
 * Check if text contains over-specification patterns.
 *
 * @param text - Text to analyze
 * @returns Object with boolean flags for each pattern type
 */
export function hasOverSpecification(text: string): {
  hasExactColor: boolean;
  hasPixelMeasurement: boolean;
  hasFontSpec: boolean;
  hasAny: boolean;
} {
  const hasExactColor = EXACT_COLOR_PATTERN.test(text);
  const hasPixelMeasurement = PIXEL_MEASUREMENT_PATTERN.test(text);
  const hasFontSpec = FONT_SPEC_PATTERN.test(text);

  return {
    hasExactColor,
    hasPixelMeasurement,
    hasFontSpec,
    hasAny: hasExactColor || hasPixelMeasurement || hasFontSpec,
  };
}

/**
 * Count over-specification pattern matches in text.
 *
 * @param text - Text to analyze
 * @returns Object with match counts for each pattern type
 */
export function countOverSpecification(text: string): {
  exactColor: number;
  pixelMeasurement: number;
  fontSpec: number;
  total: number;
} {
  // Create global versions for counting
  const colorRegex = new RegExp(EXACT_COLOR_PATTERN.source, 'g');
  const pixelRegex = new RegExp(PIXEL_MEASUREMENT_PATTERN.source, 'g');
  const fontRegex = new RegExp(FONT_SPEC_PATTERN.source, 'gi');

  const exactColor = (text.match(colorRegex) || []).length;
  const pixelMeasurement = (text.match(pixelRegex) || []).length;
  const fontSpec = (text.match(fontRegex) || []).length;

  return {
    exactColor,
    pixelMeasurement,
    fontSpec,
    total: exactColor + pixelMeasurement + fontSpec,
  };
}

/**
 * Extract sample matches for debugging.
 *
 * @param text - Text to analyze
 * @param limit - Max samples per pattern (default: 3)
 * @returns Object with sample matches for each pattern type
 */
export function extractOverSpecSamples(
  text: string,
  limit = 3
): {
  exactColor: string[];
  pixelMeasurement: string[];
  fontSpec: string[];
} {
  const colorRegex = new RegExp(EXACT_COLOR_PATTERN.source, 'g');
  const pixelRegex = new RegExp(PIXEL_MEASUREMENT_PATTERN.source, 'g');
  const fontRegex = new RegExp(FONT_SPEC_PATTERN.source, 'gi');

  return {
    exactColor: (text.match(colorRegex) || []).slice(0, limit),
    pixelMeasurement: (text.match(pixelRegex) || []).slice(0, limit),
    fontSpec: (text.match(fontRegex) || []).slice(0, limit),
  };
}
```

**Step 2: Update test file**

File: `tests/prompts/functional-vision-boundary.test.ts`

Replace local regexes (lines 27-30) with import:

```typescript
import { hasOverSpecification } from '../../src/shared/overspecification-patterns.js';

describe('Over-specification detection', () => {
  it('detects exact color values', () => {
    const result = hasOverSpecification('Button has #0066CC background');
    expect(result.hasExactColor).toBe(true);
  });

  it('does not flag functional color descriptions', () => {
    const result = hasOverSpecification('Error state uses red color');
    expect(result.hasExactColor).toBe(false);
  });

  // ... etc
});
```

**Step 3: Update benchmark script**

File: `scripts/compare-vision-benchmarks.ts`

Replace local regexes (lines 24-26) with import:

```typescript
import { countOverSpecification, extractOverSpecSamples } from '../src/shared/overspecification-patterns.js';

function analyzeStoryContent(content: string) {
  const counts = countOverSpecification(content);
  const samples = extractOverSpecSamples(content, 5);

  return {
    counts,
    samples,
    hasAnyOverSpec: counts.total > 0,
  };
}
```

---

## Test Plan

### Unit Tests

Create `tests/shared/overspecification-patterns.test.ts`:

```typescript
describe('Overspecification Patterns', () => {
  describe('hasOverSpecification', () => {
    it('detects exact color values', () => {
      expect(hasOverSpecification('#0066CC').hasExactColor).toBe(true);
      expect(hasOverSpecification('rgb(255, 0, 0)').hasExactColor).toBe(true);
      expect(hasOverSpecification('red color').hasExactColor).toBe(false);
    });

    it('detects pixel measurements', () => {
      expect(hasOverSpecification('16px padding').hasPixelMeasurement).toBe(true);
      expect(hasOverSpecification('2rem margin').hasPixelMeasurement).toBe(true);
      expect(hasOverSpecification('large padding').hasPixelMeasurement).toBe(false);
    });

    it('detects font specifications', () => {
      expect(hasOverSpecification('font-family: Helvetica').hasFontSpec).toBe(true);
      expect(hasOverSpecification('Helvetica 14px').hasFontSpec).toBe(true);
      expect(hasOverSpecification('Arial navigation').hasFontSpec).toBe(false); // Should not match
    });
  });

  describe('countOverSpecification', () => {
    it('counts multiple matches', () => {
      const text = 'Button has #0066CC with 16px padding and 2rem margin';
      const counts = countOverSpecification(text);

      expect(counts.exactColor).toBe(1);
      expect(counts.pixelMeasurement).toBe(2); // 16px + 2rem
      expect(counts.total).toBe(3);
    });

    it('returns zero for functional descriptions', () => {
      const text = 'Primary button is prominent with adequate touch target';
      const counts = countOverSpecification(text);

      expect(counts.total).toBe(0);
    });
  });

  describe('extractOverSpecSamples', () => {
    it('extracts sample matches', () => {
      const text = '#0066CC button with #FF0000 text and 16px padding';
      const samples = extractOverSpecSamples(text);

      expect(samples.exactColor).toEqual(['#0066CC', '#FF0000']);
      expect(samples.pixelMeasurement).toEqual(['16px']);
    });

    it('limits samples', () => {
      const text = '16px 20px 24px 32px 40px';
      const samples = extractOverSpecSamples(text, 2);

      expect(samples.pixelMeasurement).toHaveLength(2);
    });
  });
});
```

### Integration Tests

Update `tests/prompts/functional-vision-boundary.test.ts` to use shared module:

```typescript
import { hasOverSpecification } from '../../src/shared/overspecification-patterns.js';

describe('Functional vision extraction boundaries', () => {
  describe('Interactive Elements', () => {
    it('prompt contains functional guidance', async () => {
      const prompt = INTERACTIVE_ELEMENTS_METADATA.systemPrompt;

      expect(prompt).toContain('FUNCTIONAL VISION ANALYSIS');
      expect(prompt).toContain('ANTI-PATTERNS');
      expect(prompt).toContain('EXAMPLES');
    });

    // Validate examples in prompt don't trigger over-spec
    it('good examples in prompt pass over-spec check', () => {
      const goodExample = 'Submit button is primary action (prominent styling)';
      expect(hasOverSpecification(goodExample).hasAny).toBe(false);
    });

    it('bad examples in prompt trigger over-spec check', () => {
      const badExample = 'Button has #0066CC background, 16px padding';
      expect(hasOverSpecification(badExample).hasAny).toBe(true);
    });
  });
});
```

---

## Success Criteria

- ✅ `src/shared/overspecification-patterns.ts` created with 3 exported patterns
- ✅ `hasOverSpecification()` helper returns boolean flags
- ✅ `countOverSpecification()` helper counts matches
- ✅ `extractOverSpecSamples()` helper extracts sample matches
- ✅ Test file imports shared module (no local regexes)
- ✅ Benchmark script imports shared module (no local regexes)
- ✅ Unit tests cover all 3 helpers with edge cases
- ✅ Integration tests validate prompt examples against patterns
- ✅ All existing tests still pass

---

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/shared/overspecification-patterns.ts` | CREATE shared pattern module | +120 |
| `tests/shared/overspecification-patterns.test.ts` | CREATE unit tests | +80 |
| `tests/prompts/functional-vision-boundary.test.ts` | Import shared module, remove local regexes | -20, +10 |
| `scripts/compare-vision-benchmarks.ts` | Import shared module, remove local regexes | -25, +10 |
| `src/shared/index.ts` | Export new module | +1 |

**Total:** ~200 new lines, 45 removed lines, 5 files modified

---

## Estimate

**2-3 hours**

- 45 min: Create shared module with 3 helpers
- 60 min: Write comprehensive unit tests
- 30 min: Update test file and benchmark script
- 30 min: Integration testing and verification

---

## Related Tickets

- **USA-60:** Vision Support for Critical Iterations (parent)
- **USA-61:** Add Vision Support Registry Metadata (related P2 improvement)

---

## Benefits

### Immediate
- Single source of truth for over-spec patterns
- Consistent detection across test and benchmark
- Easier to maintain (change once, apply everywhere)

### Long-term
- Can be reused by future linting tools
- Can be exposed via CLI for manual checks
- Foundation for VS Code extension (real-time over-spec detection)

---

## Notes

While this is P2 (not urgent), it's a quick win that prevents pattern drift and makes future pattern changes easier. The shared module also provides a natural place to document WHY these patterns exist (link to vision-functional-guidelines.md).
