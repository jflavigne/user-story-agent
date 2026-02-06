/**
 * Iteration prompt for interactive elements: states, feedback, and behavior.
 * Emphasizes observable states and visual/behavioral changes, not implementation.
 */

import { USER_STORY_CONTRACT } from "../user-story-contract.js";

const SCOPE_CLARIFICATION = `
Add requirements to Acceptance Criteria (user-facing section) or Technical Reference (implementation section) appropriately.

- **User-facing:** What the user sees or experiences.
- **Technical:** How it's implemented (event names, component contracts) — keep these in Technical Reference only.
`;

const INTERACTIVE_ELEMENTS_FOCUS = `
**Interactive elements iteration focus:**
- **Do** describe observable states and behavior: e.g. "Button appears dimmed when disabled," "Control shows loading indicator while processing," "Selected option is visually highlighted."
- **Do not** put implementation details in user-facing sections: e.g. "Uses disabled prop in component state," "onClick handler toggles state," "Controlled via useState." Put those in Technical Reference.
- Focus on visual and behavioral changes the user can see or experience, not internal state management or component APIs.
`;

/**
 * Full iteration prompt for interactive elements.
 * Use when refining stories for buttons, toggles, and other stateful controls.
 */
export const INTERACTIVE_ELEMENTS_ITERATION_PROMPT = `Apply refinements WITHOUT violating the User Story Contract below.
User-facing requirements go in Acceptance Criteria.
Implementation details go in Technical Reference.

${USER_STORY_CONTRACT}

${SCOPE_CLARIFICATION}
${INTERACTIVE_ELEMENTS_FOCUS}`;
