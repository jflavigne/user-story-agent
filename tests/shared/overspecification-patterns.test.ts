/**
 * USA-62: Unit tests for shared over-specification patterns
 *
 * Tests the centralized detection functions for over-specified content
 * (exact colors, pixel measurements, font specs).
 */

import { describe, it, expect } from 'vitest';
import {
  hasOverSpecification,
  countOverSpecification,
  extractOverSpecSamples,
  EXACT_COLOR_PATTERN,
  PIXEL_MEASUREMENT_PATTERN,
  FONT_SPEC_PATTERN,
} from '../../src/shared/overspecification-patterns.js';

describe('overspecification-patterns', () => {
  describe('hasOverSpecification', () => {
    describe('exact colors', () => {
      it('detects hex colors', () => {
        expect(hasOverSpecification('Submit button has #0066CC background').hasExactColor).toBe(true);
        expect(hasOverSpecification('Color is #fff').hasExactColor).toBe(true);
        expect(hasOverSpecification('Use #00000080 for transparency').hasExactColor).toBe(true);
      });

      it('detects rgb/rgba colors', () => {
        expect(hasOverSpecification('Error border rgb(210, 50, 50)').hasExactColor).toBe(true);
        expect(hasOverSpecification('Background rgba(0, 0, 0, 0.5)').hasExactColor).toBe(true);
      });

      it('detects hsl/hsla colors', () => {
        expect(hasOverSpecification('Color hsl(120, 100%, 50%)').hasExactColor).toBe(true);
        expect(hasOverSpecification('Background hsla(240, 100%, 50%, 0.5)').hasExactColor).toBe(true);
      });

      it('does not detect color keywords or functional descriptions', () => {
        expect(hasOverSpecification('Primary action uses high-contrast color').hasExactColor).toBe(false);
        expect(hasOverSpecification('Error shown in red').hasExactColor).toBe(false);
        expect(hasOverSpecification('Background is white').hasExactColor).toBe(false);
      });
    });

    describe('pixel measurements', () => {
      it('detects px measurements', () => {
        expect(hasOverSpecification('16px padding between items').hasPixelMeasurement).toBe(true);
        expect(hasOverSpecification('Border is 2px solid').hasPixelMeasurement).toBe(true);
      });

      it('detects rem measurements', () => {
        expect(hasOverSpecification('2rem gap').hasPixelMeasurement).toBe(true);
        expect(hasOverSpecification('Font size 1.5rem').hasPixelMeasurement).toBe(true);
      });

      it('detects em measurements', () => {
        expect(hasOverSpecification('Margin 1.2em').hasPixelMeasurement).toBe(true);
      });

      it('does not detect functional spacing descriptions', () => {
        expect(hasOverSpecification('Adequate touch target size').hasPixelMeasurement).toBe(false);
        expect(hasOverSpecification('Generous padding').hasPixelMeasurement).toBe(false);
        expect(hasOverSpecification('Clear visual spacing').hasPixelMeasurement).toBe(false);
      });
    });

    describe('font specifications', () => {
      it('detects font-family declarations', () => {
        expect(hasOverSpecification('font-family: Helvetica').hasFontSpec).toBe(true);
        expect(hasOverSpecification('font-family: "Arial"').hasFontSpec).toBe(true);
        expect(hasOverSpecification("font-family: 'Inter'").hasFontSpec).toBe(true);
      });

      it('detects font-weight and font-size declarations', () => {
        expect(hasOverSpecification('font-weight: 600').hasFontSpec).toBe(true);
        expect(hasOverSpecification('font-size: 14px').hasFontSpec).toBe(true);
      });

      it('detects font with size patterns', () => {
        expect(hasOverSpecification('Helvetica 14px').hasFontSpec).toBe(true);
        expect(hasOverSpecification('14px Arial').hasFontSpec).toBe(true);
        expect(hasOverSpecification('Inter 16px').hasFontSpec).toBe(true);
      });

      it('does not detect font names in general text (USA-62 requirement)', () => {
        expect(hasOverSpecification('Arial navigation').hasFontSpec).toBe(false);
        expect(hasOverSpecification('Navigate to Helvetica docs').hasFontSpec).toBe(false);
      });

      it('does not detect functional typography descriptions', () => {
        expect(hasOverSpecification('Heading hierarchy visible').hasFontSpec).toBe(false);
        expect(hasOverSpecification('Clear typographic contrast').hasFontSpec).toBe(false);
        expect(hasOverSpecification('Readable font size').hasFontSpec).toBe(false);
      });
    });

    describe('combined patterns', () => {
      it('detects multiple over-spec types in one text', () => {
        const result = hasOverSpecification('Button has #0066CC background, 16px padding, font-family: Helvetica');
        expect(result.hasExactColor).toBe(true);
        expect(result.hasPixelMeasurement).toBe(true);
        expect(result.hasFontSpec).toBe(true);
      });

      it('returns all false for functional text', () => {
        const result = hasOverSpecification('Submit button is primary action with high contrast and adequate touch target size');
        expect(result.hasExactColor).toBe(false);
        expect(result.hasPixelMeasurement).toBe(false);
        expect(result.hasFontSpec).toBe(false);
      });
    });
  });

  describe('countOverSpecification', () => {
    it('counts multiple color matches', () => {
      const result = countOverSpecification('Colors are #fff, #000, and rgb(255, 0, 0)');
      expect(result.exactColor).toBe(3);
      expect(result.total).toBe(3);
    });

    it('counts multiple pixel measurements', () => {
      const result = countOverSpecification('16px padding, 2rem gap, 1.5em margin');
      expect(result.pixelMeasurement).toBe(3);
      expect(result.total).toBe(3);
    });

    it('counts multiple font specs', () => {
      const result = countOverSpecification('font-family: Helvetica, font-weight: 600, font-size: 14px');
      expect(result.fontSpec).toBe(3); // font-family, font-weight, font-size
      expect(result.pixelMeasurement).toBe(1); // 14px from font-size
      expect(result.total).toBe(4); // 3 font + 1 px (14px is counted in both)
    });

    it('counts all types together', () => {
      const result = countOverSpecification(
        'Button: #0066CC background, 16px padding, 2rem margin, Helvetica 14px, font-weight: 600'
      );
      expect(result.exactColor).toBe(1); // #0066CC
      expect(result.pixelMeasurement).toBe(3); // 16px, 2rem, 14px (from "Helvetica 14px")
      expect(result.fontSpec).toBe(2); // Helvetica 14px, font-weight: 600
      expect(result.total).toBe(6); // 1 + 3 + 2
    });

    it('returns zeros for functional text', () => {
      const result = countOverSpecification('Submit button with high contrast and adequate spacing');
      expect(result.exactColor).toBe(0);
      expect(result.pixelMeasurement).toBe(0);
      expect(result.fontSpec).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('extractOverSpecSamples', () => {
    it('extracts color samples', () => {
      const result = extractOverSpecSamples('Colors: #fff, #000, rgb(255, 0, 0), #0066CC');
      expect(result.color).toHaveLength(3); // default limit is 3
      expect(result.color).toContain('#fff');
      expect(result.color).toContain('#000');
    });

    it('extracts pixel measurement samples', () => {
      const result = extractOverSpecSamples('Sizes: 16px, 2rem, 1.5em, 20px, 3rem');
      expect(result.px).toHaveLength(3); // default limit is 3
      expect(result.px[0]).toBe('16px');
    });

    it('extracts font spec samples', () => {
      const result = extractOverSpecSamples('Fonts: Helvetica 14px, font-weight: 600, font-size: 16px, Arial 12px');
      expect(result.font).toHaveLength(3); // default limit is 3
    });

    it('respects custom limit', () => {
      const result = extractOverSpecSamples('Colors: #fff, #000, #111, #222, #333', 5);
      expect(result.color).toHaveLength(5);
    });

    it('returns empty arrays for functional text', () => {
      const result = extractOverSpecSamples('Submit button with high contrast');
      expect(result.color).toHaveLength(0);
      expect(result.px).toHaveLength(0);
      expect(result.font).toHaveLength(0);
    });
  });

  describe('exported patterns', () => {
    it('EXACT_COLOR_PATTERN has global flag', () => {
      expect(EXACT_COLOR_PATTERN.global).toBe(true);
    });

    it('PIXEL_MEASUREMENT_PATTERN has global flag', () => {
      expect(PIXEL_MEASUREMENT_PATTERN.global).toBe(true);
    });

    it('FONT_SPEC_PATTERN has global flag', () => {
      expect(FONT_SPEC_PATTERN.global).toBe(true);
    });
  });
});
