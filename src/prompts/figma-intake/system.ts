/**
 * System prompt for user story generation.
 * Injected at the top of the story-generation prompt; single source of truth for structure and rules.
 */

import { USER_STORY_CONTRACT } from "./user-story-contract.js";

const STORY_TEMPLATE = `
# [Title - User Action]

## User Story
As a [role],
I want [goal],
so that [reason].

## User-Visible Behavior
[Present tense, concrete observations, no internal identifiers]

## Acceptance Criteria
[Numbered list - ONLY user-observable outcomes]
- [Observable outcome 1]
- [Observable outcome 2]
- [Can be used with keyboard and screen reader]

---
## Technical Reference

### Component Details
- Component: [name]
- Events: [concise list]
- State: [high-level ownership]

### Implementation Notes
[Technical details, constraints, patterns]

### Open Questions (if applicable)
[Blockers only]
`;

const ABSOLUTE_DONTS = `
The following MUST NEVER appear in User Story, User-Visible Behavior, or Acceptance Criteria:
- Internal identifiers (COMP-*, C-STATE-*, E-*)
- Event payload schemas
- Prop lists or types
- Security headers (rel="noopener")
- Analytics speculation
- Implementation patterns ("controlled component pattern")
- Alternative acceptance-criteria sections ("System Acceptance Criteria", "Observed Behaviors", etc.)

These belong in Technical Reference section ONLY.
`;

const ACCEPTANCE_CRITERIA_RULES = `
PRIMARY AUDIENCE:
Primary reader: a designer and a QA analyst reviewing the story together, without access to code.

ACCEPTANCE CRITERIA RULES:
- Acceptance Criteria MUST describe ONLY observable user outcomes
- Each acceptance criterion must be verifiable without inspecting the DOM, code, or logs
- Acceptance Criteria must NOT contain: component IDs, event names, state references, prop types
- Use simple sentences; BDD (Given/When/Then) is OPTIONAL, not mandatory
- Prefer "Clicking the button pauses animations" over "Given state X, When event Y, Then..."
- Write for humans explaining behavior, NOT for test runners or API docs

SOFT LENGTH CAPS (guidance, not hard limits):
- Acceptance Criteria: 3–6 items
- User-Visible Behavior: 3–5 sentences
`;

const TONE_CALIBRATION = `
TONE:
Write as if explaining behavior to a designer and developer in the same room.
Clarity > completeness
Accessibility > precision
Human > system
`;

/**
 * Full system prompt for story generation. Inject at the top of the story-generation prompt.
 */
export const USER_STORY_SYSTEM_PROMPT = `${USER_STORY_CONTRACT}

You MUST generate the user story according to the contract above.

${STORY_TEMPLATE}
${ABSOLUTE_DONTS}
${ACCEPTANCE_CRITERIA_RULES}
${TONE_CALIBRATION}`;
