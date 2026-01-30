/**
 * Patch orchestrator for advisor section-scope enforcement.
 * Applies only patches whose paths are in the allowed set; rejects and logs others.
 * Validation (ID format, duplicates, bounds) is delegated to PatchValidator.
 */

import type {
  StoryStructure,
  SectionPatch,
  PatchPath,
  Item,
  ImplementationNotes,
  UIMappingItem,
} from '../shared/types.js';
import { PatchValidator } from './patch-validator.js';
import { logger } from '../utils/logger.js';

export { PatchValidator } from './patch-validator.js';

/** Rejection metrics for reporting */
export interface PatchRejectionMetrics {
  totalPatches: number;
  applied: number;
  rejectedPath: number;
  rejectedValidation: number;
  rejectedReasons: string[];
}

/**
 * Applies advisor patches with mechanical section scope enforcement.
 * Rejects patches targeting disallowed paths and logs rejection metrics.
 */
export class PatchOrchestrator {
  private validator: PatchValidator;

  constructor(validator?: PatchValidator) {
    this.validator = validator ?? new PatchValidator();
  }

  /**
   * Applies patches to a copy of the story. Only patches whose path is in
   * allowedPaths are applied; others are rejected and counted.
   *
   * @param story - Current story structure (not mutated)
   * @param patches - Patches from advisors
   * @param allowedPaths - Paths this run allows (e.g. advisor scope)
   * @returns New story structure with patches applied; rejection metrics for logging
   */
  applyPatches(
    story: StoryStructure,
    patches: SectionPatch[],
    allowedPaths: PatchPath[]
  ): { result: StoryStructure; metrics: PatchRejectionMetrics } {
    const allowedSet = new Set(allowedPaths);
    const metrics: PatchRejectionMetrics = {
      totalPatches: patches.length,
      applied: 0,
      rejectedPath: 0,
      rejectedValidation: 0,
      rejectedReasons: [],
    };

    let current = this.deepClone(story);

    for (const patch of patches) {
      if (!allowedSet.has(patch.path)) {
        metrics.rejectedPath++;
        metrics.rejectedReasons.push(`Path not allowed: ${patch.path}`);
        logger.debug(`Patch rejected (path): ${patch.path} by ${patch.metadata?.advisorId ?? 'unknown'}`);
        continue;
      }

      const validation = this.validator.validate(patch, current);
      if (!validation.valid) {
        metrics.rejectedValidation++;
        metrics.rejectedReasons.push(...(validation.errors ?? []));
        logger.debug(`Patch rejected (validation): ${patch.path} - ${validation.errors?.join('; ')}`);
        continue;
      }

      const next = this.applyOne(current, patch);
      if (next !== null) {
        current = next;
        metrics.applied++;
      } else {
        metrics.rejectedValidation++;
        metrics.rejectedReasons.push(`Apply failed for path: ${patch.path}`);
      }
    }

    if (metrics.rejectedPath + metrics.rejectedValidation > 0) {
      logger.debug(
        `PatchOrchestrator: applied=${metrics.applied}, rejectedPath=${metrics.rejectedPath}, rejectedValidation=${metrics.rejectedValidation}`
      );
    }

    return { result: current, metrics };
  }

  /**
   * Applies a single patch. Returns new story or null if apply failed.
   */
  private applyOne(story: StoryStructure, patch: SectionPatch): StoryStructure | null {
    const next = this.deepClone(story);

    if (patch.path === 'story.asA') {
      if (patch.op === 'replace' && patch.item?.text) next.story.asA = patch.item.text;
      return next;
    }
    if (patch.path === 'story.iWant') {
      if (patch.op === 'replace' && patch.item?.text) next.story.iWant = patch.item.text;
      return next;
    }
    if (patch.path === 'story.soThat') {
      if (patch.op === 'replace' && patch.item?.text) next.story.soThat = patch.item.text;
      return next;
    }

    if (patch.path === 'userVisibleBehavior') {
      return this.applyArrayPatch(next, 'userVisibleBehavior', patch, (i) => i) ?? next;
    }
    if (patch.path === 'outcomeAcceptanceCriteria') {
      return this.applyArrayPatch(next, 'outcomeAcceptanceCriteria', patch, (i) => i) ?? next;
    }
    if (patch.path === 'systemAcceptanceCriteria') {
      return this.applyArrayPatch(next, 'systemAcceptanceCriteria', patch, (i) => i) ?? next;
    }
    if (patch.path === 'openQuestions') {
      if (!next.openQuestions) next.openQuestions = [];
      return this.applyArrayPatch(next, 'openQuestions', patch, (i) => i) ?? next;
    }
    if (patch.path === 'edgeCases') {
      if (!next.edgeCases) next.edgeCases = [];
      return this.applyArrayPatch(next, 'edgeCases', patch, (i) => i) ?? next;
    }
    if (patch.path === 'nonGoals') {
      if (!next.nonGoals) next.nonGoals = [];
      return this.applyArrayPatch(next, 'nonGoals', patch, (i) => i) ?? next;
    }

    if (patch.path === 'uiMapping') {
      if (!next.uiMapping) next.uiMapping = [];
      const itemToUi = (item: Item): UIMappingItem => {
        const parts = item.text.split(/\s*\|\s*/);
        return {
          id: item.id,
          productTerm: parts[0]?.trim() ?? item.text,
          componentName: parts[1]?.trim() ?? '',
        };
      };
      return this.applyArrayPatch(next, 'uiMapping', patch, itemToUi) ?? next;
    }

    if (patch.path.startsWith('implementationNotes.')) {
      const key = patch.path.replace('implementationNotes.', '') as keyof ImplementationNotes;
      const arr = next.implementationNotes[key];
      const applied = this.applyToItemArray(arr, patch, (i) => i);
      if (applied === null) return null;
      next.implementationNotes[key] = applied as Item[];
      return next;
    }

    return null;
  }

  private applyArrayPatch<T>(
    story: StoryStructure,
    key: keyof StoryStructure,
    patch: SectionPatch,
    mapItem: (item: Item) => T
  ): StoryStructure | null {
    const raw = story[key];
    const arr = Array.isArray(raw) ? [...raw] : [];
    const applied = this.applyToItemArray(
      arr as (Item | UIMappingItem)[],
      patch,
      (i) => mapItem(i) as Item | UIMappingItem
    );
    if (applied === null) return null;
    const next = this.deepClone(story);
    (next as unknown as Record<string, unknown>)[key] = applied;
    return next;
  }

  private applyToItemArray(
    arr: (Item | UIMappingItem)[],
    patch: SectionPatch,
    mapItem: (item: Item) => Item | UIMappingItem
  ): (Item | UIMappingItem)[] | null {
    const matcher = (entry: Item | UIMappingItem): boolean => {
      if (patch.match?.id && 'id' in entry && entry.id === patch.match.id) return true;
      const text = 'text' in entry ? entry.text : ('productTerm' in entry ? `${(entry as UIMappingItem).productTerm} | ${(entry as UIMappingItem).componentName}` : '');
      if (patch.match?.textEquals && text === patch.match.textEquals) return true;
      return false;
    };

    if (patch.op === 'add' && patch.item) {
      arr.push(mapItem(patch.item));
      return arr;
    }
    if (patch.op === 'replace' && patch.item) {
      const idx = arr.findIndex(matcher);
      if (idx === -1) return null;
      arr[idx] = mapItem(patch.item);
      return arr;
    }
    if (patch.op === 'remove') {
      const idx = arr.findIndex(matcher);
      if (idx === -1) return null;
      arr.splice(idx, 1);
      return arr;
    }
    return null;
  }

  private deepClone(story: StoryStructure): StoryStructure {
    return JSON.parse(JSON.stringify(story)) as StoryStructure;
  }
}
