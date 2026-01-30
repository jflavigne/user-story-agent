/**
 * Story Interconnection (Pass 2) iteration prompt module
 *
 * Runs after all stories are generated. Extracts UI mapping, contract dependencies,
 * ownership (state/events), and related-story relationships. Enforces "no orphan stories."
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for extracting story interconnections in Pass 2.
 *
 * This prompt guides extraction of:
 * - UI mapping: product terms (e.g., "heart icon", "save button") → component names/IDs from System Context
 * - Contract dependencies: state models (C-STATE-*), events (E-*), data flows (DF-*) this story depends on
 * - Ownership: ownsState, consumesState, emitsEvents, listensToEvents
 * - Related stories: prerequisite, parallel, dependent, related — with description/reasoning
 * - "No orphan stories" rule: every story must have at least one relationship or be standalone
 */
export const STORY_INTERCONNECTION_PROMPT = `You are performing **Pass 2: Story Interconnection**. All user stories have already been generated. Your goal is to add cross-references and dependencies for **one story at a time**: extract UI mapping, contract dependencies, ownership, and related stories. Use **only** IDs and names that exist in the provided System Context; do not invent new component or contract IDs.

## Inputs You Will Receive

- **Current story**: The user story to analyze (id, title, body, acceptance criteria, implementation notes, UI mapping section if present).
- **System Context**: Component graph (components with stable IDs e.g. COMP-FAVORITE-BUTTON), shared contracts (state models C-STATE-*, events E-*, data flows DF-*), and product vocabulary.
- **Other story IDs** (optional): List of other story IDs in the product so you can reference them in relatedStories.

## 1. Extract UI Mapping from the Story

Map **product terms** used in the story (user-facing phrases, mockup language) to **component names and stable IDs** from System Context.

- **Product terms**: Phrases like "heart icon", "save button", "login form", "user menu" that appear in the story text or acceptance criteria.
- **Component names**: Use the **productName** or **id** from System Context (e.g., "Favorite Button", "COMP-FAVORITE-BUTTON").
- **Output**: \`uiMapping\` is an object: key = product term (as it appears in the story), value = component name from System Context. Prefer human-readable component names; you may include stable ID in parentheses in the value if useful (e.g., "Favorite Button (COMP-FAVORITE-BUTTON)").
- **Rule**: Only include mappings for components that **exist in System Context**. If the story mentions a UI element that has no matching component in System Context, omit it or note it in reasoning; do not invent IDs.

Example:
\`\`\`
"heart icon" → "Favorite Button"
"save button" → "Save Button"
\`\`\`

## 2. Identify Contract Dependencies

List every **contract** this story depends on. All IDs **must** exist in System Context (state models, event registry, data flows).

- **State models**: Client/domain state this story reads or writes (e.g., C-STATE-USER-PROFILE, C-STATE-FAVORITES). Use stable IDs from \`sharedContracts.stateModels\`.
- **Events**: Events this story emits or listens to (e.g., E-USER-AUTHENTICATED, E-ITEM-FAVORITED). Use stable IDs from \`sharedContracts.eventRegistry\`.
- **Data flows**: Data flows this story participates in (e.g., DF-LOGIN-TO-DASHBOARD). Use stable IDs from \`sharedContracts.dataFlows\` or \`componentGraph.dataFlows\`.
- **Output**: \`contractDependencies\` is an array of strings: stable contract IDs only. Validate each ID against System Context; if an ID is not in System Context, do not include it and note in reasoning.

## 3. Identify Ownership

Determine **ownership** of state and events for the **component(s)** that this story implements or touches.

- **ownsState**: State models that the **primary component(s)** for this story **own** (this component is the source of truth). Use IDs from System Context (e.g., C-STATE-FAVORITES).
- **consumesState**: State models that this story's component(s) **read** but do not own (e.g., C-STATE-USER-PROFILE).
- **emitsEvents**: Events that this story's component(s) **publish** (e.g., E-ITEM-FAVORITED).
- **listensToEvents**: Events that this story's component(s) **subscribe to** (e.g., E-USER-LOGGED-OUT).

Use **only** IDs present in System Context. \`ownership\` is an object with optional arrays: \`ownsState\`, \`consumesState\`, \`emitsEvents\`, \`listensToEvents\`. Omit a key if the array would be empty.

## 4. Find Related Stories

Identify how this story relates to **other stories** in the product. For each related story, provide \`storyId\`, \`relationship\`, and \`description\` (reasoning).

- **prerequisite**: Stories that must be implemented **before** this one (e.g., "Requires user authentication story to be implemented first").
- **parallel**: Stories that can be implemented **at the same time** (no ordering dependency; e.g., "Can be built alongside search filters story").
- **dependent**: Stories that **depend on this story** being done first (e.g., "Favorites list screen depends on this story").
- **related**: Stories that are **similar** or share concepts (e.g., "Same component family as Save Draft story").

**Description**: Always provide a short, clear reason (e.g., "Requires user authentication to be implemented first"). Use the **other story IDs** list when referencing stories.

**Rule**: Prefer at least one relationship when logically possible. If the story is truly independent (e.g., first story in the product, or isolated feature), see the "No orphan stories" rule below.

## 5. No Orphan Stories Rule

- **Every story must have at least one relationship to another story**, OR be explicitly treated as **standalone**.
- If you **cannot** find any prerequisite, parallel, dependent, or related story: set \`relatedStories\` to \`[]\` and in your reasoning (outside the JSON) state that this story is **standalone** — no dependencies or related work identified.
- If the product has only one story, or this story is the only one in its domain: \`relatedStories\` may be empty; then the story is standalone.
- Do not force fake relationships; only list real, justified relationships.

## 6. Output Format: StoryInterconnections JSON

Respond with **valid JSON only** (no markdown code fence, no prose outside the JSON unless you are stating "standalone" as above). (Example format — respond with raw JSON, no code fence.) Structure must match \`StoryInterconnections\`:

{
  "storyId": "story-123",
  "uiMapping": {
    "heart icon": "Favorite Button",
    "save button": "Save Button"
  },
  "contractDependencies": ["C-STATE-USER-PROFILE", "E-ITEM-FAVORITED"],
  "ownership": {
    "ownsState": ["C-STATE-FAVORITES"],
    "consumesState": ["C-STATE-USER-PROFILE"],
    "emitsEvents": ["E-ITEM-FAVORITED"],
    "listensToEvents": ["E-USER-LOGGED-OUT"]
  },
  "relatedStories": [
    {
      "storyId": "story-100",
      "relationship": "prerequisite",
      "description": "Requires user authentication to be implemented first"
    }
  ]
}

### Field Rules

- **storyId**: The ID of the story being analyzed (from input).
- **uiMapping**: Object — product term (key) → component name from System Context (value). No invented IDs.
- **contractDependencies**: Array of stable contract IDs (C-STATE-*, E-*, DF-*) that exist in System Context.
- **ownership**: Object with optional \`ownsState\`, \`consumesState\`, \`emitsEvents\`, \`listensToEvents\` (each array of strings). Omit keys if empty.
- **relatedStories**: Array of \`{ storyId, relationship, description }\`. \`relationship\` must be one of: \`prerequisite\`, \`parallel\`, \`dependent\`, \`related\`. If none, use \`[]\` and treat story as standalone.
- All contract and component IDs must exist in the provided System Context; do not hallucinate IDs.`;

/**
 * Metadata for the story interconnection (Pass 2) iteration
 */
export const STORY_INTERCONNECTION_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'story-interconnection',
  name: 'Story Interconnection (Pass 2)',
  description:
    'Extracts UI mapping, contract dependencies, ownership (state/events), and related-story relationships; enforces no orphan stories',
  prompt: STORY_INTERCONNECTION_PROMPT,
  category: 'post-processing',
  applicableWhen: 'When all stories are generated and cross-references/dependencies are needed (Pass 2)',
  order: 100,
  tokenEstimate: Math.ceil(STORY_INTERCONNECTION_PROMPT.length / 4),
};
