/**
 * Story planner (USA-78): derives planned story seeds and work context from Figma sections.
 * Classifies by ATOM/MOL/ORG from section name prefix, sorts bottom-up, generates one seed per section.
 */

import type { PlannedStory, ProductContext, SystemDiscoveryContext } from '../shared/types.js';
import type { FigmaSectionForPlanning } from '../utils/figma-utils.js';

const LEVEL_ORDER: Record<string, number> = {
  atom: 0,
  molecule: 1,
  organism: 2,
  screen: 3,
};

const LEVEL_PREFIX = /^(ATOM|MOL|ORG)\s*[-–—]\s*/i;
const TRAILING_MARKERS = /\s*[✅✔✓]\s*$/;

/**
 * Infers level from section name (e.g. "ATOM - SpinnerLoading", "ORG - FilterSheet ✅").
 * Returns 'atom' | 'molecule' | 'organism' | 'screen'. Default 'organism' when no prefix.
 */
export function inferLevelFromSectionName(name: string): 'atom' | 'molecule' | 'organism' | 'screen' {
  const match = name.trim().match(LEVEL_PREFIX);
  if (!match) return 'organism';
  const level = match[1].toLowerCase();
  if (level === 'atom') return 'atom';
  if (level === 'mol') return 'molecule';
  if (level === 'org') return 'organism';
  return 'organism';
}

/**
 * Strips level prefix and trailing markers from section name for display.
 * e.g. "ORG - FilterSheet ✅" -> "FilterSheet"
 */
export function displayNameFromSectionName(name: string): string {
  return name
    .replace(LEVEL_PREFIX, '')
    .replace(TRAILING_MARKERS, '')
    .trim() || name;
}

/**
 * Builds a one-line story seed from section name and optional description.
 * Uses description when it's a sentence (e.g. > 40 chars); otherwise generates from display name.
 */
function buildSeed(name: string, description?: string): string {
  const display = displayNameFromSectionName(name);
  if (description && description.length > 40) {
    // Use description as seed; ensure it reads like a user goal
    const trimmed = description.trim();
    if (/^user\s+/i.test(trimmed) || /^as a\s+/i.test(trimmed)) return trimmed;
    if (/^[A-Z]/.test(trimmed) && trimmed.includes('.')) {
      return trimmed.split('.')[0].trim() + '.';
    }
    return `User ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
  }
  // Fallback: generic seed from component name
  const lower = display.toLowerCase();
  if (lower.includes('loading') || lower.includes('spinner')) {
    return `User sees loading feedback while content or filters update.`;
  }
  if (lower.includes('item') && lower.includes('filter')) {
    return `User toggles a single filter option (active/inactive).`;
  }
  if (lower.includes('group') && lower.includes('filter')) {
    return `User expands or collapses a filter category and sees its options.`;
  }
  if (lower.includes('sheet') && lower.includes('filter')) {
    return `User opens the mobile filter sheet, browses categories, and applies or clears filters.`;
  }
  if (lower.includes('bar') && lower.includes('filter')) {
    return `User uses the desktop filter bar to refine the grid and clear filters.`;
  }
  return `User interacts with ${display}.`;
}

/**
 * Plans ordered story seeds from Figma sections (USA-78).
 * Classifies by ATOM/MOL/ORG, sorts bottom-up, assigns order and builds seeds.
 */
export function planStoriesFromFigmaSections(
  sections: FigmaSectionForPlanning[]
): PlannedStory[] {
  if (sections.length === 0) return [];

  const withLevel = sections.map((s) => ({
    ...s,
    level: inferLevelFromSectionName(s.name),
    displayName: displayNameFromSectionName(s.name),
  }));

  const orderKey = (level: string) => LEVEL_ORDER[level] ?? LEVEL_ORDER.organism;
  withLevel.sort((a, b) => {
    const diff = orderKey(a.level) - orderKey(b.level);
    if (diff !== 0) return diff;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
  });

  return withLevel.map((s, index) => ({
    seed: buildSeed(s.name, s.description),
    order: index + 1,
    componentRef: s.displayName || s.name,
    level: s.level,
  }));
}

/**
 * Builds a short work context summary for all passes (USA-78).
 * Includes product name, main components, and story order when available.
 */
export function buildWorkContextSummary(
  productContext: ProductContext | null | undefined,
  plannedStories: PlannedStory[] | undefined,
  componentNames: string[] = []
): string {
  const parts: string[] = [];

  if (productContext?.productName) {
    parts.push(`**${productContext.productName}.**`);
  }

  const names = plannedStories?.map((p) => p.componentRef).filter(Boolean) as string[] ?? componentNames;
  if (names.length > 0) {
    parts.push(
      `We are writing user stories for: ${names.join(', ')}.`
    );
  }

  if (plannedStories && plannedStories.length > 0) {
    const orderList = plannedStories
      .sort((a, b) => a.order - b.order)
      .map((p) => p.componentRef || `story ${p.order}`)
      .join(' → ');
    parts.push(`Stories are ordered bottom-up: ${orderList}.`);
  }

  if (parts.length === 0 && productContext) {
    parts.push(`We are working on user stories for a ${productContext.productType} application.`);
  }

  return parts.join(' ');
}

/**
 * Builds work context summary from system context (components + optional plannedStories).
 * Used when we have discovery result but no Figma sections (e.g. component names only).
 */
export function buildWorkContextSummaryFromSystemContext(
  productContext: ProductContext | null | undefined,
  systemContext: SystemDiscoveryContext
): string {
  const componentNames =
    Object.values(systemContext.componentGraph.components).map((c) => c.productName) ?? [];
  return buildWorkContextSummary(
    productContext,
    systemContext.plannedStories,
    componentNames
  );
}
