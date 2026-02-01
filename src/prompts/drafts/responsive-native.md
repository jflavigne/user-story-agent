# PATH SCOPE

This iteration may modify only these sections (exact values):

- "userVisibleBehavior" (UVB-* items only)
- "systemAcceptanceCriteria" (AC-SYS-* items only)

Any patch targeting other paths must be rejected.

# OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "userVisibleBehavior",
      "item": { "id": "UVB-001", "text": "…" },
      "metadata": { "advisorId": "responsive-native", "reasoning": "…" }
    }
  ]
}
```

# PATCH RULES

Required fields by op:

- **op: "add"**
  - required: `op`, `path`, `item`, `metadata`
  - forbidden: `match`
- **op: "replace"**
  - required: `op`, `path`, `match`, `item`, `metadata`
  - `match` must include: `{ "id": "…" }`
- **op: "remove"**
  - required: `op`, `path`, `match`, `metadata`
  - `match` must include: `{ "id": "…" }`
  - forbidden: `item`

Path and ID constraints:

- If `path == "userVisibleBehavior"`, `item.id` MUST start with "UVB-"
- If `path == "systemAcceptanceCriteria"`, `item.id` MUST start with "AC-SYS-"

Metadata constraints:

- `metadata.advisorId` MUST be "responsive-native"
- `metadata.reasoning` is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied by the described mobile/native user experience, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify native/mobile needs such as:

- Permission triggers (camera, photos, location, notifications, biometrics) and related user prompts
- Mobile navigation conventions (back behavior, tab bars, drawers, swipe gestures)
- Touch-first patterns (tap targets, long-press, pull-to-refresh, swipe actions)
- Offline/poor connection cues (banners, retry, "saved locally", sync indicators)
- Background states (uploading, syncing, "continue later", resumed tasks)
- Orientation and screen-size behavior (phone vs tablet, rotation implications)
- System integrations (share sheet, open in maps, file picker, deep links)
- Platform-specific UI cues (iOS vs Android patterns) if shown or implied

Use images to add or clarify requirements; do not override explicit written requirements.

# WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write items as user-observable outcomes:

- Use plain language.
- Avoid implementation details (OS APIs, libraries, device models).
- Avoid exhaustive feature lists: only cover what the story/mockup implies.
- Keep UVB items behavior-focused; keep AC-SYS items test-focused.
- Distinguish "what users see/do" from "what the system guarantees."

# RESPONSIVE NATIVE COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the combined UVB-* and AC-SYS-* cover, as applicable:

1. **Permissions and fallbacks** (only if capabilities are used)
   - Users understand why a permission is needed.
   - If denied/unavailable, users get a clear alternative (manual input, limited mode) or a clear next step.
   - Users can retry or change the permission later without being blocked unexpectedly.

2. **Platform conventions** (iOS vs Android)
   - Navigation and back behavior matches platform expectations.
   - Common gestures behave as users expect (where applicable).
   - Platform differences do not change outcomes (users can still complete the task).

3. **Touch interactions**
   - Primary actions are easy to trigger on touch.
   - Long-running actions show clear in-progress feedback.
   - Accidental double-taps don't cause duplicate actions.

4. **Offline and sync** (only if relevant)
   - Users can tell when they are offline or on a poor connection.
   - Actions taken offline are handled predictably (queued, saved locally, or blocked with explanation).
   - Users see when content is syncing and when it's done; conflicts are handled clearly if they can occur.

5. **Background and resume behavior** (only if relevant)
   - If a task continues in the background, users can tell what's happening and what to do next.
   - Returning to the app restores users to a sensible state without losing work.

6. **Screen sizes and orientation** (only if relevant)
   - The experience remains usable on common phone sizes; tablet behavior is defined if tablets are in scope.
   - Rotation does not break the flow or lose user progress where supported.

7. **Accessibility on mobile** (only at outcome level, if in scope)
   - Works with screen readers and system text size settings where required by the story.

# TASK

Review existing "userVisibleBehavior" (UVB-) and "systemAcceptanceCriteria" (AC-SYS-) for overlaps, redundancies, and gaps related to responsive native app behavior. Consolidate duplicates, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
