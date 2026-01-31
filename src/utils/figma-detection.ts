/**
 * Confidence-based Figma component detection
 * Combines multiple signals to increase detection accuracy
 */

const CONFIDENCE_WEIGHTS = {
  API_COMPONENT: 80,
  API_COMPONENT_SET: 80,
  ATOMIC_DESIGN_PATTERN: 40,
  COMMON_COMPONENT_NAME: 30,
  SECTION_NODE: 30,
  FRAME_NODE: 20,
  HAS_DESCRIPTION: 20,
  STRUCTURED_NAMING: 20,
  MAX_CHILD_COMPLEXITY_BONUS: 10,
} as const;

/** Minimum confidence (0-100) for a component to be included in results */
export const MIN_CONFIDENCE_THRESHOLD = 50;

/**
 * Calculates confidence score for a potential component
 * Combines multiple detection signals:
 * - Figma API: 80 points (definitive)
 * - Name patterns: 40 points (strong hint)
 * - Section/Frame type: 30 points (structural hint)
 * - Description: 20 points (documented)
 * - Size/complexity: 10 points (likely reusable)
 */
export function calculateComponentConfidence(candidate: {
  isApiComponent?: boolean;
  isApiComponentSet?: boolean;
  name: string;
  type?: string;
  description?: string;
  childCount?: number;
}): { confidence: number; signals: string[] } {
  let confidence = 0;
  const signals: string[] = [];

  // Signal 1: Figma API confirmation (HIGHEST confidence)
  if (candidate.isApiComponent) {
    confidence += CONFIDENCE_WEIGHTS.API_COMPONENT;
    signals.push('Figma Component API');
  } else if (candidate.isApiComponentSet) {
    confidence += CONFIDENCE_WEIGHTS.API_COMPONENT_SET;
    signals.push('Figma Component Set API');
  }

  // Signal 2: Name pattern matching (atomic design or common patterns)
  const nameLower = candidate.name.toLowerCase();
  const nameUpper = candidate.name.toUpperCase();

  if (
    nameUpper.includes('ORG') ||
    nameUpper.includes('ORGANISM') ||
    nameUpper.includes('MOL') ||
    nameUpper.includes('MOLECULE') ||
    nameUpper.includes('ATOM')
  ) {
    confidence += CONFIDENCE_WEIGHTS.ATOMIC_DESIGN_PATTERN;
    signals.push('Atomic design pattern');
  } else if (
    nameLower.includes('component') ||
    nameLower.includes('button') ||
    nameLower.includes('input') ||
    nameLower.includes('card') ||
    nameLower.includes('modal') ||
    nameLower.includes('dropdown') ||
    nameLower.includes('menu')
  ) {
    confidence += CONFIDENCE_WEIGHTS.COMMON_COMPONENT_NAME;
    signals.push('Common component name');
  } else if (candidate.name.includes('-') || candidate.name.includes('/')) {
    confidence += CONFIDENCE_WEIGHTS.STRUCTURED_NAMING;
    signals.push('Structured naming (with separator)');
  }

  // Signal 3: Structural type
  if (candidate.type === 'SECTION') {
    confidence += CONFIDENCE_WEIGHTS.SECTION_NODE;
    signals.push('Section node (organizational)');
  } else if (candidate.type === 'FRAME') {
    confidence += CONFIDENCE_WEIGHTS.FRAME_NODE;
    signals.push('Frame node');
  }

  // Signal 4: Has description
  if (candidate.description && candidate.description.trim().length > 0) {
    confidence += CONFIDENCE_WEIGHTS.HAS_DESCRIPTION;
    signals.push('Has description');
  }

  // Signal 5: Complexity (likely reusable if has children)
  if (candidate.childCount && candidate.childCount > 0) {
    confidence += Math.min(
      CONFIDENCE_WEIGHTS.MAX_CHILD_COMPLEXITY_BONUS,
      candidate.childCount * 2
    );
    signals.push(`Has ${candidate.childCount} children`);
  }

  return { confidence: Math.min(100, confidence), signals };
}
