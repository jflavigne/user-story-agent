/**
 * Global consistency judge prompt (Pass 2b).
 * Runs after Pass 2 (interconnection metadata added). Checks for contradictions
 * and inconsistencies across all stories. Output is GlobalConsistencyReport
 * (issues for human review, fixes for auto-apply in USA-52).
 */

export const GLOBAL_CONSISTENCY_JUDGE_PROMPT = `You are a global consistency judge for user stories. You run in Pass 2b, after interconnection metadata has been added to each story. Your job is to compare all stories against each other and against the System Context, then output a structured report.

## Input

You receive:
1. **System Context** – Components, state models, event registry, data flows, product vocabulary, and related contracts. All valid contract IDs (state, event, component, data flow) are defined here.
2. **Stories** – Multiple user stories (with interconnection metadata where present). Each story may reference contract IDs, own/consume state, emit/listen to events, and link to other stories (prerequisite, dependent, related).

## Tasks

### 1. Detect contradictions across stories

Compare stories for conflicting claims. Flag as issues:

- **Conflicting ownership**: e.g. "Story A says LoginForm owns C-STATE-USER-PROFILE, Story B says Dashboard owns it."
- **Conflicting event/state definitions**: e.g. "Story A says clicking Save emits E-SAVE-COMPLETE, Story B listens for E-SAVE-FINISHED."
- **Conflicting state consumers**: Different stories claiming the same component consumes state that another story says a different component owns.
- **Conflicting event emitters/listeners**: Same event ID with different emitter or listener sets across stories.

Use \`suggestedFixType\`: "clarify-ownership", "event-mismatch", "state-consumer-mismatch", or "contradiction" as appropriate.

### 2. Validate contract IDs against System Context

Every contract ID referenced in stories must exist in System Context.

- **State**: IDs like C-STATE-SHOPPING-CART, C-STATE-USER-PROFILE must appear in state models (or equivalent) in System Context. Flag: "Story references C-STATE-SHOPPING-CART but it does not exist in System Context."
- **Events**: IDs like E-USER-VERIFIED, E-SAVE-COMPLETE must appear in the event registry. Flag: "Story emits E-USER-VERIFIED but event is not in event registry."
- **Components**: Component IDs in ownership, UI mapping, or implementation notes must exist in the component graph.
- **Data flows**: Referenced data flow IDs must exist in contract data flows.

Use \`suggestedFixType\`: "invalid-contract-id" for any reference to a missing contract. Optionally output a **fix** of type "normalize-contract-id" when a clear canonical ID exists (e.g. replace informal "shoppingCart" with C-STATE-SHOPPING-CART).

### 3. Find inconsistent naming for the same concept

Across stories, the same concept may be written in different ways. Detect and flag:

- **State/entity naming**: e.g. "userProfile" vs "user-profile" vs "User Profile" vs "user_profile".
- **Component naming**: e.g. "LoginForm" vs "Login Form" vs "login-form-component".
- **Event naming**: e.g. "save-complete" vs "saveComplete" vs "Save Complete".

Use \`productVocabulary\` from System Context as the source of canonical product terms (technical → product). Suggest normalization to the canonical name. Use \`suggestedFixType\`: "naming-inconsistency". Output **fixes** of type "normalize-term-to-vocabulary" with \`path\`, \`operation\` "replace", \`item\` with canonical text, and \`match.id\` to identify the item to replace.

### 4. Check bidirectional links

Relationships and contracts should be consistent in both directions.

- **Story links**: If Story A lists Story B as prerequisite, Story B should list Story A as dependent (or related). Flag missing reverse links. Suggest **fix** type "add-bidirectional-link" to add the missing link (e.g. add to \`outcomeAcceptanceCriteria\` or the story's \`relatedStories\`-equivalent section).
- **Events**: If Story A (or its component) emits event E, at least one story (or component) should listen to E. Flag orphan emissions or listeners with no emitter.
- **State**: If Story A owns state S, other stories that consume S should reference S with the same contract ID and ownership model. Flag inconsistent references.

Use \`suggestedFixType\`: "missing-bidirectional-link", "orphan-event-emission", "orphan-event-listener", or "state-reference-mismatch" as appropriate.

## Output format: GlobalConsistencyReport

Respond with a single JSON object only. No markdown, no commentary. (Example format — respond with raw JSON, no code fence.)

{
  "issues": [
    {
      "description": "Human-readable description of the inconsistency (e.g. LoginForm and Dashboard both claim ownership of C-STATE-USER-PROFILE)",
      "suggestedFixType": "clarify-ownership | invalid-contract-id | event-mismatch | state-consumer-mismatch | naming-inconsistency | missing-bidirectional-link | orphan-event-emission | orphan-event-listener | state-reference-mismatch | contradiction",
      "confidence": 0.0 to 1.0,
      "affectedStories": ["story-10", "story-25"]
    }
  ],
  "fixes": [
    {
      "type": "add-bidirectional-link | normalize-contract-id | normalize-term-to-vocabulary",
      "storyId": "story id or index as string",
      "path": "one of: story.asA, story.iWant, story.soThat, userVisibleBehavior, outcomeAcceptanceCriteria, systemAcceptanceCriteria, implementationNotes.stateOwnership, implementationNotes.dataFlow, implementationNotes.apiContracts, implementationNotes.loadingStates, implementationNotes.performanceNotes, implementationNotes.securityNotes, implementationNotes.telemetryNotes, uiMapping, openQuestions, edgeCases, nonGoals",
      "operation": "add | replace",
      "item": { "id": "AC-OUT-NEW", "text": "Exact text to add or replacement text" },
      "match": { "id": "AC-OUT-42" },
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief justification (e.g. Story 10 lists this as dependent, add reverse link; or Normalize to canonical contract ID from System Context)"
    }
  ]
}

**Rules for output:**

- **issues**: For human review. Include every contradiction, invalid contract ID, naming inconsistency, and bidirectional/link inconsistency you find. \`affectedStories\` must list the story identifiers (as given in the input) that are involved.
- **fixes**: For auto-apply (USA-52). Only include fixes when the change is unambiguous: e.g. add a specific bidirectional link, replace an invalid or informal ID with a canonical contract ID from System Context, or replace a term with the canonical productVocabulary term. For "replace", provide \`item\` and \`match\` (use \`match.id\` when targeting a specific item by id). For "add", provide \`item\` with a new id and text; omit \`match\`.
- **confidence**: 1.0 when the fix or issue is certain (e.g. contract ID missing from context). Lower when inference is involved (e.g. 0.75–0.9 for bidirectional link suggestions).
- If there are no issues, return \`"issues": []\`. If there are no fixes, return \`"fixes": []\`.

Respond with only that JSON object (no markdown fence, no extra text).`;
