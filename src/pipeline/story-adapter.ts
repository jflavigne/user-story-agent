/**
 * Type bridge adapter: ComponentRow[] → PlannedStory[] for UserStoryAgent multi-pass.
 */

import type { ComponentRow } from "../figma/table-parser.js";

/** Planned story shape for UserStoryAgent (seed, order, componentRef, level). */
export interface PlannedStory {
  seed: string;
  order: number;
  componentRef?: string;
  level?: "atom" | "molecule" | "organism" | "screen";
}

const LEVEL_BASES: Record<string, number> = {
  atom: 1,
  molecule: 1000,
  organism: 2000,
  screen: 3000,
};

const TIER_ORDER = ["atom", "molecule", "organism", "screen"] as const;

type NormalizedLevel = (typeof TIER_ORDER)[number];

function normalizeLevel(level: string): NormalizedLevel {
  const normalized = level
    .trim()
    .toLowerCase()
    .replace(/^\d+\s*-\s*/, "");
  if (
    normalized === "atom" ||
    normalized === "molecule" ||
    normalized === "organism" ||
    normalized === "screen"
  ) {
    return normalized;
  }
  return "atom";
}

function buildSeed(component: string, description?: string): string {
  if (description && description.length > 40) {
    return description;
  }
  return `User interacts with ${component}`;
}

/**
 * Maps component inventory rows to planned stories for multi-pass generation.
 * Normalizes level, builds seed from description or fallback, assigns tiered order.
 *
 * @param rows - ComponentRow array from table parser
 * @returns PlannedStory[] sorted bottom-up (atoms first, then molecules, organisms, screens)
 */
export function adaptComponentRowsToPlannedStories(
  rows: ComponentRow[]
): PlannedStory[] {
  if (rows.length === 0) {
    return [];
  }

  const withLevel = rows.map((row) => ({
    row,
    level: normalizeLevel(row.level),
  }));

  withLevel.sort((a, b) => {
    const tierA = TIER_ORDER.indexOf(a.level);
    const tierB = TIER_ORDER.indexOf(b.level);
    if (tierA !== tierB) return tierA - tierB;
    return 0;
  });

  const counts: Record<NormalizedLevel, number> = {
    atom: 0,
    molecule: 0,
    organism: 0,
    screen: 0,
  };

  return withLevel.map(({ row, level }) => {
    counts[level]++;
    const order = LEVEL_BASES[level] + counts[level] - 1;
    return {
      seed: buildSeed(row.component, row.description),
      order,
      componentRef: row.component,
      level,
    };
  });
}
