/**
 * Pass 2b: Global Consistency Judge Prompt
 * Runs after Pass 2 (interconnection metadata added). Checks for contradictions,
 * validates contract references, finds naming inconsistencies, and checks
 * bidirectional links. Output is GlobalConsistencyReport (issues for human
 * review, fixes for auto-apply in USA-52).
 */

import type { StoryInterconnections, SystemDiscoveryContext } from '../../shared/types.js';

/** Story with interconnection metadata for Pass 2b input */
export interface StoryWithInterconnections {
  id: string;
  title: string;
  content: string;
  interconnections: StoryInterconnections;
}

/**
 * Pass 2b: Builds the global consistency judge prompt with formatted stories
 * and system context. Use this when running the judge over a batch of
 * interconnected stories.
 */
export function buildGlobalConsistencyPrompt(
  stories: StoryWithInterconnections[],
  systemContext: SystemDiscoveryContext
): string {
  return `You are checking global consistency across a batch of user stories.

## Stories with Interconnections

${formatStoriesWithInterconnections(stories)}

## System Context

${formatSystemContextForJudge(systemContext)}

## Task

Identify consistency issues and suggest fixes.

### 1. Cross-Story Contradictions

Check for:
- Same component described differently in different stories
- Conflicting ownership claims (two stories both claim to own same state)
- Incompatible behavior descriptions

Example issue:
\`\`\`json
{
  "description": "USA-001 says Login owns C-STATE-USER, but USA-002 also claims ownership",
  "suggestedFixType": "contradiction",
  "affectedStories": ["USA-001", "USA-002"],
  "confidence": 0.9
}
\`\`\`

### 2. Contract ID Validation

Check for:
- Referenced contract IDs that don't exist in system context
- Component IDs in UI mapping that don't exist in component graph
- Dangling references to non-existent state models/events/data flows

Example issue:
\`\`\`json
{
  "description": "USA-003 references C-STATE-PROFILE which doesn't exist in system context",
  "suggestedFixType": "invalid-reference",
  "affectedStories": ["USA-003"],
  "confidence": 1.0
}
\`\`\`

### 3. Naming Inconsistencies

Check for:
- Same concept referred to by different names across stories
- Product vocabulary violations (using raw names instead of canonical terms)
- Inconsistent capitalization or formatting

Example issue:
\`\`\`json
{
  "description": "USA-001 uses 'login button' but USA-002 uses 'sign-in button' for same component",
  "suggestedFixType": "naming-inconsistency",
  "affectedStories": ["USA-001", "USA-002"],
  "confidence": 0.8
}
\`\`\`

### 4. Bidirectional Link Validation

Check for:
- If Story A lists Story B as prerequisite, Story B should list A as dependent
- If Story A lists Story B as parallel, Story B should list A as parallel
- Missing reverse links

Example issue:
\`\`\`json
{
  "description": "USA-001 lists USA-002 as prerequisite, but USA-002 doesn't list USA-001 as dependent",
  "suggestedFixType": "missing-link",
  "affectedStories": ["USA-001", "USA-002"],
  "confidence": 1.0
}
\`\`\`

## Fixes

For each issue, suggest a fix only when confidence > 0.8 and the fix is unambiguous.

Allowed fix types:
- \`add-bidirectional-link\`: Add missing reverse relationship (path: outcomeAcceptanceCriteria or relatedStories section; operation: add; provide item with id and text).
- \`normalize-contract-id\`: Replace invalid ID with valid one from system context (path as appropriate; operation: replace; provide item and match.id).
- \`normalize-term-to-vocabulary\`: Replace raw term with canonical term from product vocabulary (path as appropriate; operation: replace; provide item and match.id).

Example fix (add-bidirectional-link):
\`\`\`json
{
  "type": "add-bidirectional-link",
  "storyId": "USA-002",
  "path": "outcomeAcceptanceCriteria",
  "operation": "add",
  "item": { "id": "AC-OUT-LINK-1", "text": "Depends on USA-001 (prerequisite)." },
  "confidence": 1.0,
  "reasoning": "USA-001 lists USA-002 as prerequisite; add reverse link to USA-002."
}
\`\`\`

## Output Format

Return a single JSON object (no markdown fence):

\`\`\`json
{
  "issues": [
    {
      "description": "...",
      "suggestedFixType": "contradiction" | "invalid-reference" | "naming-inconsistency" | "missing-link",
      "affectedStories": ["USA-001", ...],
      "confidence": 0.0-1.0
    }
  ],
  "fixes": [
    {
      "type": "add-bidirectional-link" | "normalize-contract-id" | "normalize-term-to-vocabulary",
      "storyId": "USA-001",
      "path": "one of: story.asA, story.iWant, story.soThat, userVisibleBehavior, outcomeAcceptanceCriteria, systemAcceptanceCriteria, implementationNotes.*, uiMapping, openQuestions, edgeCases, nonGoals",
      "operation": "add" | "replace",
      "item": { "id": "...", "text": "..." },
      "match": { "id": "..." },
      "confidence": 0.0-1.0,
      "reasoning": "..."
    }
  ]
}
\`\`\`

IMPORTANT: Only suggest fixes with high confidence (>0.8) and allowed fix types. Complex issues should be flagged in \`issues\` but not auto-fixed in \`fixes\`. If no issues, return \`"issues": []\`. If no fixes, return \`"fixes": []\`.`;
}

/**
 * Formats stories with their interconnection metadata for the judge prompt.
 */
function formatStoriesWithInterconnections(
  stories: StoryWithInterconnections[]
): string {
  return stories
    .map((s) => {
      const ic = s.interconnections;
      const uiTerms =
        Object.keys(ic.uiMapping ?? {}).length > 0
          ? Object.entries(ic.uiMapping)
              .map(([term, comp]) => `${term}→${comp}`)
              .join(', ')
          : 'none';
      const ownsState = ic.ownership?.ownsState?.join(', ') ?? 'none';
      const emitsEvents = ic.ownership?.emitsEvents?.join(', ') ?? 'none';
      const prerequisite =
        ic.relatedStories
          ?.filter((r) => r.relationship === 'prerequisite')
          .map((r) => r.storyId)
          .join(', ') ?? 'none';
      const dependent =
        ic.relatedStories
          ?.filter((r) => r.relationship === 'dependent')
          .map((r) => r.storyId)
          .join(', ') ?? 'none';
      const parallel =
        ic.relatedStories
          ?.filter((r) => r.relationship === 'parallel')
          .map((r) => r.storyId)
          .join(', ') ?? 'none';
      return `### ${s.id}: ${s.title}

Content: ${s.content.substring(0, 300)}${s.content.length > 300 ? '...' : ''}

Interconnections:
- UI Mapping: ${uiTerms}
- Owns State: ${ownsState}
- Emits Events: ${emitsEvents}
- Related Stories: prerequisite=${prerequisite}, dependent=${dependent}, parallel=${parallel}`;
    })
    .join('\n\n');
}

/**
 * Formats system context (components, state models, events, data flows,
 * product vocabulary) for the global consistency judge.
 */
function formatSystemContextForJudge(context: SystemDiscoveryContext): string {
  const components =
    Object.entries(context.componentGraph.components)
      .map(([id, comp]) => `- ${id}: ${comp.productName}`)
      .join('\n') || '(none)';
  const stateModels =
    context.sharedContracts.stateModels
      .map((sm) => `- ${sm.id}: ${sm.name}`)
      .join('\n') || '(none)';
  const events =
    context.sharedContracts.eventRegistry
      .map((e) => `- ${e.id}: ${e.name}`)
      .join('\n') || '(none)';
  const dataFlows =
    context.sharedContracts.dataFlows
      .map((df) => `- ${df.id}: ${df.source} → ${df.target}`)
      .join('\n') || '(none)';
  const vocab =
    Object.entries(context.productVocabulary ?? {}).length > 0
      ? Object.entries(context.productVocabulary)
          .map(([raw, canonical]) => `- "${raw}" → "${canonical}"`)
          .join('\n')
      : '(none)';
  return `### Components\n${components}\n\n### State Models\n${stateModels}\n\n### Events\n${events}\n\n### Data Flows\n${dataFlows}\n\n### Product Vocabulary\n${vocab}`;
}

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
