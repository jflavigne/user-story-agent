/**
 * React component extractor: normalizes component name and deduplicates props/slots.
 */

export interface ExtractedProp {
  name: string;
}

export interface ExtractedSlot {
  name: string;
}

export interface ReactExtractResult {
  componentName: string;
  props: ExtractedProp[];
  slots: ExtractedSlot[];
}

/**
 * Normalizes extracted React component data: validates component name and
 * deduplicates props and slots by normalized name (lowercase, trim).
 */
export function extract(
  componentName: string,
  props: ExtractedProp[],
  slots: ExtractedSlot[]
): ReactExtractResult {
  if (!componentName || componentName.trim() === "") {
    componentName = "UnnamedComponent";
  }

  const seenProps = new Set<string>();
  const dedupedProps = props.filter((prop) => {
    const normalized = prop.name.toLowerCase().trim();
    if (seenProps.has(normalized)) return false;
    seenProps.add(normalized);
    return true;
  });

  const seenSlots = new Set<string>();
  const dedupedSlots = slots.filter((slot) => {
    const normalized = slot.name.toLowerCase().trim();
    if (seenSlots.has(normalized)) return false;
    seenSlots.add(normalized);
    return true;
  });

  return {
    componentName,
    props: dedupedProps,
    slots: dedupedSlots,
  };
}
