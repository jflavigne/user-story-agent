/**
 * USA-56: Functional vision boundary validation
 *
 * Ensures iteration prompts and extracted content stay on the functional side
 * of the boundary: no exact colors, spacing, typography, or dimensions in
 * user stories. Validates prompts include functional guidance and that sample
 * outputs do not contain over-specification patterns.
 */

import { describe, it, expect } from 'vitest';
import { getIterationById } from '../../src/shared/iteration-registry.js';
import { hasOverSpecification } from '../../src/shared/overspecification-patterns.js';

const VISION_ITERATION_IDS = [
  'interactive-elements',
  'responsive-web',
  'accessibility',
  'validation',
  'performance',
  'analytics',
];

const VISION_ITERATION_PROMPTS: Array<{ id: string; prompt: string }> = VISION_ITERATION_IDS.map((id) => {
  const iteration = getIterationById(id);
  if (!iteration) {
    throw new Error(`Iteration ${id} not found in registry`);
  }
  return { id, prompt: iteration.prompt };
});

describe('functional vision boundary', () => {
  describe('iteration prompts include functional guidance sections', () => {
    for (const { id, prompt } of VISION_ITERATION_PROMPTS) {
      it(`${id} contains NON-INVENTION RULE section`, () => {
        expect(prompt).toMatch(/# NON-INVENTION RULE/i);
      });
      it(`${id} contains WRITING RULES section with functional guidance`, () => {
        // Accept either format: "WRITING RULES (FUNCTIONAL..." or "FUNCTIONAL (...) WRITING RULES"
        expect(prompt).toMatch(/WRITING RULES.*FUNCTIONAL|FUNCTIONAL.*WRITING RULES/i);
      });
      it(`${id} contains VISION ANALYSIS section when applicable`, () => {
        // Vision-capable iterations should have vision guidance
        expect(prompt).toMatch(/# VISION ANALYSIS|ONLY WHEN IMAGES ARE PROVIDED/i);
      });
    }
  });

  describe('iteration prompts include iteration-specific guidance', () => {
    it('interactive-elements includes button hierarchy guidance', () => {
      const prompt = getIterationById('interactive-elements')?.prompt ?? '';
      expect(prompt).toMatch(/primary.*action|secondary.*action/i);
      expect(prompt).toMatch(/NON-INVENTION RULE/i);
    });
    it('validation includes error mechanisms guidance', () => {
      const prompt = getIterationById('validation')?.prompt ?? '';
      expect(prompt).toMatch(/error.*feedback|validation.*feedback/i);
      expect(prompt).toMatch(/NON-INVENTION RULE/i);
    });
    it('accessibility includes contrast requirements functionally', () => {
      const prompt = getIterationById('accessibility')?.prompt ?? '';
      expect(prompt).toMatch(/contrast|readability|focus/i);
      expect(prompt).toMatch(/NON-INVENTION RULE/i);
    });
  });

  describe('over-specification detection', () => {
    it('detects exact color values', () => {
      expect(hasOverSpecification('Submit button has #0066CC background').hasExactColor).toBe(true);
      expect(hasOverSpecification('Error border rgb(210, 50, 50)').hasExactColor).toBe(true);
      expect(hasOverSpecification('Primary action uses high-contrast color').hasExactColor).toBe(false);
    });
    it('detects pixel measurements', () => {
      expect(hasOverSpecification('16px padding between items').hasPixelMeasurement).toBe(true);
      expect(hasOverSpecification('2rem gap').hasPixelMeasurement).toBe(true);
      expect(hasOverSpecification('Adequate touch target size').hasPixelMeasurement).toBe(false);
    });
    it('detects font specifications', () => {
      expect(hasOverSpecification('Helvetica 14px').hasFontSpec).toBe(true);
      expect(hasOverSpecification('font-weight: 600').hasFontSpec).toBe(true);
      expect(hasOverSpecification('Heading hierarchy visible').hasFontSpec).toBe(false);
      expect(hasOverSpecification('Arial navigation').hasFontSpec).toBe(false);
    });
  });

  describe('functional extraction examples should not trigger over-spec', () => {
    const functionalExamples = [
      'Submit button is primary action (prominent styling with high contrast), adequate touch target size.',
      'Error state shows clear visual feedback (border and icon) with inline error message.',
      'All interactive elements have a visible focus indicator; errors are indicated by text and icon, not color alone.',
      'Invalid email shows clear error state with inline message explaining the issue.',
      'Navigation is full horizontal bar on wider screens and collapses to a menu trigger on narrow viewports.',
      'Loading indicator is visible until complete; progress is communicated.',
      'Track primary submit action and all main navigation choices.',
    ];
    for (const text of functionalExamples) {
      it(`functional text has no exact color: "${text.slice(0, 50)}..."`, () => {
        expect(hasOverSpecification(text).hasExactColor).toBe(false);
      });
      it(`functional text has no pixel measurement: "${text.slice(0, 50)}..."`, () => {
        expect(hasOverSpecification(text).hasPixelMeasurement).toBe(false);
      });
      it(`functional text has no font spec: "${text.slice(0, 50)}..."`, () => {
        expect(hasOverSpecification(text).hasFontSpec).toBe(false);
      });
    }
  });

  describe('over-specified examples should be detected', () => {
    const overSpecExamples = [
      { text: 'Button has #0066CC background, 16px padding, 8px border-radius', desc: 'color and px' },
      { text: 'Error border 2px solid red; 14px error icon', desc: 'px' },
      { text: 'Helvetica 14px, line-height 1.5', desc: 'font' },
    ];
    for (const { text, desc } of overSpecExamples) {
      it(`over-specified "${desc}" is detected`, () => {
        const r = hasOverSpecification(text);
        expect(r.hasExactColor || r.hasPixelMeasurement || r.hasFontSpec).toBe(true);
      });
    }
  });
});
