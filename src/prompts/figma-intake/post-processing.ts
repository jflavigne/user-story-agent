/**
 * Post-processing prompt for user story consolidation.
 * Injects the User Story Contract and a final verification step before returning the consolidated story.
 */

import { USER_STORY_CONTRACT } from "./user-story-contract.js";

const FINAL_VERIFICATION = `
FINAL VERIFICATION:
Verify the output obeys the User Story Contract above.
If violations exist, move technical content to "Technical Reference"
and clean user-facing sections.

Before returning consolidated story, verify:
1. ✓ Acceptance Criteria contain ONLY user-observable outcomes
2. ✓ NO internal identifiers (COMP-*, E-*, C-STATE-*) in top half
3. ✓ Technical details moved to Technical Reference section
4. ✓ Language is plain and accessible (no API documentation style)
5. ✓ No redundant restatement of same behavior at different abstraction levels

REMEDIATION APPROACH:
If any check fails, MOVE content to the correct section without rewriting unless necessary.

Example:
- Found in Acceptance Criteria: "Emits E-CLICK-EVENT with payload {platformId}"
- Action: Move verbatim to Technical Reference → Events section
- Do NOT rewrite as "Triggers appropriate events" (loses specificity)

Move any technical content found in Acceptance Criteria into Technical Reference without rewriting unless necessary.
`;

/**
 * Full post-processing prompt. Use at the start of the post-processing step;
 * append the draft or consolidated story content after this prompt.
 */
export const POST_PROCESSING_PROMPT = `${USER_STORY_CONTRACT}

${FINAL_VERIFICATION}`;
