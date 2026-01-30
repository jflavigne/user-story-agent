/**
 * Unified story judge rubric prompt.
 * All dimensions (section separation, correctness, testability, completeness)
 * plus integrated relationship discovery in a single LLM call.
 */

export const UNIFIED_STORY_JUDGE_RUBRIC = `You are a quality judge for user stories. Evaluate the story against the system context and output a structured rubric.

## Dimensions (score each 0–5)

1. **Section separation**
   - Top sections (As a / I want / So that, User-Visible Behavior, Outcome AC) must be in plain language with no implementation jargon.
   - Implementation details belong in System AC, Implementation Notes, or UI Mapping.
   - Score low if jargon (e.g. "state", "API", "cache") appears in the top sections.
   - Output \`violations\`: list of specific phrases or sentences that violate.

2. **Correctness vs system context**
   - Story must align with the provided system context (components, contracts, flows).
   - Score low for hallucinations (claims not supported by system context).
   - Output \`hallucinations\`: list of unsupported or incorrect claims.

3. **Testability**
   - \`outcomeAC\`: Outcome Acceptance Criteria must be testable from a user/outcome perspective (Given/When/Then, observable outcomes).
   - \`systemAC\`: System Acceptance Criteria must be testable from a system/implementation perspective (contracts, states, APIs).
   - Score each 0–5 with brief reasoning.

4. **Completeness**
   - Story should have clear As a / I want / So that, user-visible behavior, outcome AC, and system AC where relevant.
   - Note missing elements (e.g. "missing loading state behavior", "no error handling in outcome AC").
   - Output \`missingElements\`: list of missing or under-specified elements.

## Relationship discovery (integrated)

- From the story and system context, infer **new relationships** (e.g. story depends on component X, story refines story Y).
- For each relationship output: \`type\`, \`sourceId\`, \`targetId\`, optional \`description\`.
- Set \`needsSystemContextUpdate\` to true if the story implies new components or contracts not in the system context.
- \`confidenceByRelationship\`: map relationship identifier (e.g. "sourceId->targetId") to confidence 0–1.

## Output (JudgeRubric)

Return a single JSON object with:
- **Dimension scores**: \`sectionSeparation\`, \`correctnessVsSystemContext\`, \`testability\`, \`completeness\` (each: score 0–5, reasoning, and dimension-specific lists).
- **violations**: in \`sectionSeparation.violations\` — specific phrases/sentences that violate separation.
- **newRelationships**: array of { type, sourceId, targetId, description? } inferred from story and system context.
- **confidences**: in \`confidenceByRelationship\` — map of relationship key (e.g. "sourceId->targetId") to confidence 0–1.
- \`overallScore\` (0–5), \`recommendation\` ("approve" | "rewrite" | "manual-review"), \`needsSystemContextUpdate\` (boolean).

Respond with only that JSON (no markdown fence).`;
