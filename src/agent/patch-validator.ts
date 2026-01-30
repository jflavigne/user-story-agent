/**
 * Patch validator for ID format, duplicate checking, and bounds enforcement.
 * Enforces mechanical validation rules before patches are applied to StoryStructure.
 */

import type {
  StoryStructure,
  SectionPatch,
  PatchPath,
  Item,
  ImplementationNotes,
  UIMappingItem,
  ValidationResult,
} from '../shared/types.js';

/** Max length for item.text (chars) */
export const MAX_TEXT_LENGTH = 500;

/** Paths that are story lines (no item.id, only text) */
const STORY_LINE_PATHS: PatchPath[] = ['story.asA', 'story.iWant', 'story.soThat'];

/** Expected ID prefix per path (null = no ID required, e.g. story lines) */
const PATH_TO_ID_PREFIX: Record<PatchPath, string | null> = {
  'story.asA': null,
  'story.iWant': null,
  'story.soThat': null,
  userVisibleBehavior: 'UVB-',
  outcomeAcceptanceCriteria: 'AC-OUT-',
  systemAcceptanceCriteria: 'AC-SYS-',
  'implementationNotes.stateOwnership': 'IMPL-STATE-',
  'implementationNotes.dataFlow': 'IMPL-FLOW-',
  'implementationNotes.apiContracts': 'IMPL-API-',
  'implementationNotes.loadingStates': 'IMPL-LOAD-',
  'implementationNotes.performanceNotes': 'IMPL-PERF-',
  'implementationNotes.securityNotes': 'IMPL-SEC-',
  'implementationNotes.telemetryNotes': 'IMPL-TEL-',
  uiMapping: 'UI-MAP-',
  openQuestions: 'QUESTION-',
  edgeCases: 'EDGE-',
  nonGoals: 'NON-GOAL-',
};

/**
 * Returns the expected ID prefix for a patch path, or null for story lines (no ID).
 */
export function getExpectedIdPrefix(path: PatchPath): string | null {
  return PATH_TO_ID_PREFIX[path] ?? null;
}

/**
 * Returns true if the path is a story line (asA / iWant / soThat) with no item.id.
 */
export function isStoryLinePath(path: PatchPath): boolean {
  return STORY_LINE_PATHS.includes(path);
}

/**
 * Gets the array for a path from the story (for duplicate/bounds checks).
 */
function getArrayForPath(
  story: StoryStructure,
  path: PatchPath
): (Item | UIMappingItem)[] | undefined {
  if (path === 'userVisibleBehavior') return story.userVisibleBehavior;
  if (path === 'outcomeAcceptanceCriteria') return story.outcomeAcceptanceCriteria;
  if (path === 'systemAcceptanceCriteria') return story.systemAcceptanceCriteria;
  if (path === 'uiMapping') return story.uiMapping;
  if (path === 'openQuestions') return story.openQuestions;
  if (path === 'edgeCases') return story.edgeCases;
  if (path === 'nonGoals') return story.nonGoals;
  if (path.startsWith('implementationNotes.')) {
    const key = path.replace('implementationNotes.', '') as keyof ImplementationNotes;
    return story.implementationNotes?.[key];
  }
  return undefined;
}

/**
 * Returns true if the given id already exists in the array for path.
 */
export function isDuplicateId(
  id: string,
  path: PatchPath,
  existingStory: StoryStructure
): boolean {
  const array = getArrayForPath(existingStory, path);
  if (!array) return false;
  return array.some(
    (entry) =>
      typeof entry === 'object' && 'id' in entry && (entry as { id?: string }).id === id
  );
}

/**
 * Validates a single patch against the existing story (IDs, duplicates, bounds, required fields).
 */
export class PatchValidator {
  validate(patch: SectionPatch, existingStory: StoryStructure): ValidationResult {
    const errors: string[] = [];

    if (!patch.path || !patch.metadata?.advisorId) {
      errors.push('Patch must have path and metadata.advisorId');
      return { valid: false, errors };
    }

    const storyLine = isStoryLinePath(patch.path);
    const array = getArrayForPath(existingStory, patch.path);

    if (array === undefined && !storyLine) {
      errors.push(`Path "${patch.path}" does not refer to an array or story line`);
      return { valid: false, errors };
    }

    if (patch.op === 'add' || patch.op === 'replace') {
      if (storyLine) {
        if (!patch.item?.text?.trim()) {
          errors.push('Story line patch must provide item.text');
          return { valid: false, errors };
        }
        if (patch.item.text.length > MAX_TEXT_LENGTH) {
          errors.push(`item.text must be at most ${MAX_TEXT_LENGTH} characters`);
        }
      } else {
        // Array path: require id and text
        if (!patch.item?.text?.trim()) {
          errors.push('add/replace patches must provide item.text');
          return { valid: false, errors };
        }
        if (!patch.item?.id?.trim()) {
          errors.push('add/replace patches for array paths must provide item.id');
          return { valid: false, errors };
        }
        if (patch.item.text.length > MAX_TEXT_LENGTH) {
          errors.push(`item.text must be at most ${MAX_TEXT_LENGTH} characters`);
        }
        // ID format: alphanumeric, underscore, hyphen
        if (!/^[a-zA-Z0-9_-]+$/.test(patch.item.id)) {
          errors.push('item.id must be alphanumeric, underscore, or hyphen');
        }
        // ID prefix must match path
        const expectedPrefix = getExpectedIdPrefix(patch.path);
        if (expectedPrefix !== null && !patch.item.id.startsWith(expectedPrefix)) {
          errors.push(
            `item.id must start with "${expectedPrefix}" for path ${patch.path}`
          );
        }
        // Duplicate check for add
        if (patch.op === 'add' && isDuplicateId(patch.item.id, patch.path, existingStory)) {
          errors.push(`Duplicate id "${patch.item.id}" in ${patch.path}`);
        }
      }
    }

    if (patch.op === 'replace' || patch.op === 'remove') {
      // Story line paths (asA, iWant, soThat) are string fields - they only support replace, not remove
      if (isStoryLinePath(patch.path)) {
        if (patch.op === 'remove') {
          errors.push('remove operation not supported on story line paths (use replace instead)');
          return { valid: false, errors };
        }
        // For replace on story lines, no match is needed
      } else if (!patch.match?.id && !patch.match?.textEquals) {
        errors.push('replace/remove must specify match.id or match.textEquals');
        return { valid: false, errors };
      }
      if (array) {
        const hasMatch = array.some((entry) => {
          if (patch.match?.id && typeof entry === 'object' && 'id' in entry) {
            return (entry as { id?: string }).id === patch.match!.id;
          }
          if (patch.match?.textEquals) {
            const text =
              typeof entry === 'object' && 'text' in entry
                ? (entry as { text: string }).text
                : 'productTerm' in entry && typeof entry === 'object'
                  ? `${(entry as UIMappingItem).productTerm} | ${(entry as UIMappingItem).componentName}`
                  : '';
            return text === patch.match!.textEquals;
          }
          return false;
        });
        if (!hasMatch) {
          errors.push(`No matching item to ${patch.op} in ${patch.path}`);
        }
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}
