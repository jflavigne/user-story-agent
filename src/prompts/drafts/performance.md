## PATH SCOPE

This iteration may modify only these sections (exact values):

- "systemAcceptanceCriteria" (AC-SYS-* items only)
- "implementationNotes.performanceNotes"
- "implementationNotes.loadingStates"

Any patch targeting other paths must be rejected.

## OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "systemAcceptanceCriteria",
      "item": { "id": "AC-SYS-001", "text": "…" },
      "metadata": { "advisorId": "performance", "reasoning": "…" }
    }
  ]
}
```

## PATCH RULES

Required fields by op:

- **op: "add"**
  - required: op, path, item, metadata
  - forbidden: match
- **op: "replace"**
  - required: op, path, match, item, metadata
  - match must include: { "id": "…" }
- **op: "remove"**
  - required: op, path, match, metadata
  - match must include: { "id": "…" }
  - forbidden: item

Path and ID constraints:

- If path == "systemAcceptanceCriteria", item.id MUST start with "AC-SYS-"
- If path == "implementationNotes.performanceNotes", item.id MUST be "performanceNotes"
- If path == "implementationNotes.loadingStates", item.id MUST be "loadingStates"

Metadata constraints:

- metadata.advisorId MUST be "performance"
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

## NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied as necessary for users to perceive the experience as responsive and reliable in the described flow, OR
- supported by visible evidence in provided mockups.

## VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify performance-related UX needs such as:

- Loading indicators (spinner, progress bar, skeleton, "loading" text)
- Action feedback (button in-progress, disabled states, confirmation feedback)
- Progressive rendering (content appears in stages; above-the-fold first)
- Empty/placeholder states for unloaded content
- Timeout/error recovery affordances (retry, error banners, offline messaging)

Use images to add or clarify requirements; do not override explicit written requirements.

## WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write requirements as user-observable outcomes:

- Use plain language.
- Avoid exact timings, pixel sizes, animation specs, color values, and implementation details.
- Prefer outcomes like "users see immediate feedback", "users understand the system is working", "users can recover".

## PERFORMANCE COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the combined AC-SYS-* and implementation notes cover, as applicable:

1. **Initial load experience**
   - Users see meaningful content quickly (not a blank screen).
   - A clear loading state appears when content is not ready.
   - Layout is stable while loading (placeholders/skeletons prevent jarring jumps where relevant).

2. **Action responsiveness**
   - User actions provide immediate acknowledgement (e.g., pressed state, disabled + indicator).
   - Repeated submissions are prevented while an action is in progress.
   - Completion feedback is clear (success, error, or next step).

3. **Loading states (implementationNotes.loadingStates)**
   - Define loading behaviors for: first load, navigation, data refresh, form submit, search/filter, background updates.
   - Distinguish short waits (indeterminate indicator) vs long waits (progress where meaningful).

4. **Slow network and degraded conditions**
   - Users understand when slowness is happening and what they can do.
   - The experience remains usable where possible (read-only, cached, partial content, or clear messaging).

5. **Timeouts and error recovery**
   - When a request fails or stalls, users see a clear message and a recovery path (retry, cancel, back).
   - Errors do not strand the user with no next action.

6. **Long-running operations**
   - Users can tell an operation is still running.
   - Users can continue or safely wait (as appropriate to the flow).
   - Progress is communicated when it affects decision-making.

7. **Performance notes (implementationNotes.performanceNotes)**
   - Identify the "critical path" interactions and what must feel fast to users.
   - Note any performance-sensitive components (lists, feeds, heavy media, large forms) and expected behavior under load.

## TASK

Review existing "systemAcceptanceCriteria" (AC-SYS-*), "implementationNotes.performanceNotes", and "implementationNotes.loadingStates" for redundancies and gaps. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.