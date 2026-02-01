---
id: interactive-elements
name: Interactive Elements
description: Documents buttons, inputs, links, icons and their interaction states
category: elements
order: 2
applicableWhen: When the mockup contains interactive UI components
applicableTo: all
allowedPaths: userVisibleBehavior, outcomeAcceptanceCriteria
outputFormat: patches
supportsVision: true
---

## PATH SCOPE

This iteration may modify only these sections (exact values):

- "userVisibleBehavior" (UVB-* items only)
- "outcomeAcceptanceCriteria" (AC-OUT-* items only)

Any patch targeting other paths must be rejected.

## OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "userVisibleBehavior",
      "item": { "id": "UVB-001", "text": "…" },
      "metadata": { "advisorId": "interactive-elements", "reasoning": "…" }
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

- If path == "userVisibleBehavior", item.id MUST start with "UVB-"
- If path == "outcomeAcceptanceCriteria", item.id MUST start with "AC-OUT-"

Metadata constraints:

- metadata.advisorId MUST be "interactive-elements"
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

Scope gate should pass if:

- The story is about interaction behavior (filters, forms, navigation, submission, selection, editing); or
- The mockup shows interactive controls relevant to the story (buttons, inputs, dropdowns, tabs, modals).

If the gate does not pass: return `{ "patches": [] }`.

## NON-INVENTION RULE

Do not add new features or UI elements not present in the provided user story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied by the described user flow, OR
- supported by visible evidence in provided mockups.

## VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify interactive elements and states such as:

- **Buttons:** primary vs secondary vs text-only vs icon-only (based on prominence and placement)
- **Inputs:** text/email/password/select/checkbox/radio/date/file/search/number (based on labels and appearance)
- **Links:** navigation vs inline vs external (based on context)
- **Icons:** actionable vs decorative vs status (based on affordance and placement)
- **States shown:** default, hover, focus, active/pressed, disabled, selected, error, loading

Use images to add or clarify behaviors; do not override explicit written requirements.

## WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write items as user-observable outcomes:

- Use plain language.
- Avoid exact colors, pixel sizes, font specs, border/shadow specs, or animation timings.
- Describe relative importance (primary vs secondary), what happens, and what feedback appears.
- Keep UVB items behavior-focused; keep AC-OUT items test-focused.

Examples of good phrasing:

- **UVB:** "Primary action is visually distinct from secondary actions."
- **UVB:** "When an action is unavailable, it appears disabled and cannot be activated."
- **AC-OUT:** "Users can reach and use all interactive controls with keyboard and pointer."
- **AC-OUT:** "When an input is invalid, the user sees a clear message explaining what to fix."

## INTERACTIVE ELEMENT COVERAGE CHECKLIST

Ensure the combined UVB-* and AC-OUT-* cover:

1. **Inventory of interactive elements** (only those present)
   - Buttons, inputs, links, actionable icons, menus, tabs, accordions, carousels, modals/dialogs (as applicable)

2. **Purpose and outcomes**
   - What each element does from the user's point of view
   - What changes on screen after activation (navigation, content update, confirmation)

3. **States and feedback**
   - Hover/focus feedback where applicable
   - Disabled behavior (not just appearance)
   - Loading/progress behavior when actions take time
   - Selected/toggled states for controls that hold state

4. **Validation and errors** (if inputs exist)
   - Required vs optional clarity
   - Inline guidance/helper text (if present)
   - Clear error messages and recovery (what users should do next)

5. **Accessibility basics** (only at outcome level)
   - Keyboard access and visible focus for interactive elements
   - Controls have labels users can understand (including icon-only controls)
   - Meaning is not conveyed by color alone (especially errors/status)

6. **Touch/responsive basics** (when relevant)
   - Controls are easy to activate on touch devices
   - Layout remains usable across common screen sizes

## TASK

Review existing "userVisibleBehavior" (UVB-) and "outcomeAcceptanceCriteria" (AC-OUT-) for overlaps, redundancies, and gaps related to interactive elements. Consolidate duplicates, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
