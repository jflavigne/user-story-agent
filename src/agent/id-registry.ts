/**
 * ID Registry: deterministic stable ID minting from canonical names.
 * Pure functions, no LLM involvement.
 */

/** Entity types that get distinct ID prefixes */
export type EntityType = 'component' | 'stateModel' | 'event' | 'dataFlow';

const ENTITY_PREFIX: Record<EntityType, string> = {
  component: 'COMP-',
  stateModel: 'C-STATE-',
  event: 'E-',
  dataFlow: 'DF-',
};

/**
 * Normalizes a canonical name to SNAKE_CASE.
 * - Uppercase
 * - Spaces and hyphens → underscores
 * - Remove non-alphanumeric except underscores
 * - Collapse multiple underscores to one
 */
export function normalizeCanonicalName(canonicalName: string): string {
  if (!canonicalName || typeof canonicalName !== 'string') {
    return '';
  }
  const upper = canonicalName.trim().toUpperCase();
  const withUnderscores = upper.replace(/[\s-]+/g, '_');
  const alphanumericOnly = withUnderscores.replace(/[^A-Z0-9_]/g, '');
  const collapsed = alphanumericOnly.replace(/_+/g, '_').replace(/^_|_$/g, '');
  return collapsed || '';
}

/**
 * Builds the ID body from normalized SNAKE_CASE (underscores → hyphens for ID).
 */
function normalizedToIdBody(normalized: string): string {
  return normalized.replace(/_/g, '-');
}

/**
 * Returns the prefix for an entity type.
 */
export function getPrefix(entityType: EntityType): string {
  return ENTITY_PREFIX[entityType];
}

/**
 * Append-only registry: same (canonicalName, entityType) always gets the same ID;
 * different names that normalize to the same key get base, base_2, base_3.
 */
export class IDRegistry {
  /** key (entityType:normalizedName) → map of exact canonicalName → minted ID */
  private readonly keyToIds = new Map<string, Map<string, string>>();

  /**
   * Returns the minted ID for (entityType, normalizedName, canonicalName) if any.
   */
  get(
    entityType: EntityType,
    normalizedName: string,
    canonicalName: string
  ): string | undefined {
    const key = registryKey(entityType, normalizedName);
    return this.keyToIds.get(key)?.get(canonicalName);
  }

  /**
   * Returns a snapshot of key → (canonicalName → id) for tests / serialization.
   */
  snapshot(): ReadonlyMap<string, ReadonlyMap<string, string>> {
    const out = new Map<string, Map<string, string>>();
    for (const [k, m] of this.keyToIds) {
      out.set(k, new Map(m));
    }
    return out;
  }

  /**
   * Records a new mint for this (entityType, normalizedName, canonicalName).
   * suffixIndex is derived from how many canonical names already exist for this key (1-based).
   */
  record(
    entityType: EntityType,
    normalizedName: string,
    canonicalName: string,
    baseId: string,
    suffixIndex: number
  ): string {
    const key = registryKey(entityType, normalizedName);
    let byCanonical = this.keyToIds.get(key);
    if (!byCanonical) {
      byCanonical = new Map();
      this.keyToIds.set(key, byCanonical);
    }
    const id = suffixIndex <= 1 ? baseId : `${baseId}_${suffixIndex}`;
    byCanonical.set(canonicalName, id);
    return id;
  }

  /** Returns how many distinct canonical names are minted for this key. */
  countForKey(entityType: EntityType, normalizedName: string): number {
    const key = registryKey(entityType, normalizedName);
    return this.keyToIds.get(key)?.size ?? 0;
  }
}

function registryKey(entityType: EntityType, normalizedName: string): string {
  return `${entityType}:${normalizedName}`;
}

/**
 * Mints a stable ID for a canonical name and entity type.
 * Same (canonicalName, entityType) always returns the same ID (deterministic).
 * Different canonical names that normalize to the same key get base, base_2, etc.
 *
 * @param canonicalName - e.g. "Login Button", "user-authenticated"
 * @param entityType - component | stateModel | event | dataFlow
 * @param registry - append-only registry
 * @returns Stable ID e.g. COMP-LOGIN-BUTTON, E-USER-AUTHENTICATED
 */
export function mintStableId(
  canonicalName: string,
  entityType: EntityType,
  registry: IDRegistry
): string {
  const normalized = normalizeCanonicalName(canonicalName);
  const body = normalizedToIdBody(normalized);
  const prefix = getPrefix(entityType);
  const baseId = body ? `${prefix}${body}` : prefix.replace(/-$/, '');

  const existing = registry.get(entityType, normalized, canonicalName);
  if (existing !== undefined) {
    return existing;
  }

  const suffixIndex = registry.countForKey(entityType, normalized) + 1;
  return registry.record(entityType, normalized, canonicalName, baseId, suffixIndex);
}
