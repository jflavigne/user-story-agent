---
id: accessibility
name: Accessibility Requirements
description: Identifies WCAG compliance and accessibility requirements for inclusive design
category: quality
order: 4
applicableWhen: For all mockups to ensure inclusive design
applicableTo: all
allowedPaths: outcomeAcceptanceCriteria, systemAcceptanceCriteria
outputFormat: patches
supportsVision: true
---

# PATH SCOPE

This iteration may modify only these sections (exact values):

- "outcomeAcceptanceCriteria"
- "systemAcceptanceCriteria"

Any patch targeting other paths must be rejected.

# OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "outcomeAcceptanceCriteria",
      "item": { "id": "AC-OUT-001", "text": "…" },
      "metadata": { "advisorId": "accessibility", "reasoning": "…" }
    }
  ]
}
```

# PATCH RULES

**Required fields by op:**

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

**Path and ID constraints:**

- If path == "outcomeAcceptanceCriteria", item.id MUST start with "AC-OUT-"
- If path == "systemAcceptanceCriteria", item.id MUST start with "AC-SYS-"

**Metadata constraints:**

- metadata.advisorId MUST be "accessibility"
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# Scope gate should pass if (choose your policy):

- **Policy A (always-on):** no gate (accessibility always applies).
- **Policy B (conditional):** pass if either:
  - The story mentions accessibility, WCAG, keyboard, screen reader, compliance, or inclusive design; or
  - The mockup includes accessibility-relevant risk signals you expect to capture (forms with errors, icon-only controls, modal dialogs, complex widgets).

If the gate does not pass (Policy B): return `{ "patches": [] }`.

# NON-INVENTION RULE

Do not add new requirements that are unrelated to the provided user story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied as necessary for an accessible user experience of the described flow, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify accessibility-relevant needs such as:

- Focus indicators on interactive elements
- Required/error indicators and how errors are communicated
- Clear structure (headings, lists, form labels) that supports navigation
- Readability (sufficient contrast) without quoting ratios or hex values
- Images/icons that need alternative text (or should be decorative)

Use images to add or clarify requirements; do not override explicit written requirements.

# FUNCTIONAL (NOT OVER-SPECIFIED) WRITING RULES

Write acceptance criteria as user-observable outcomes:

- Use plain language.
- Avoid implementation details.
- Do NOT include exact color values, contrast ratios, pixel sizes, font sizes, or outline widths.
- Prefer functional statements like:
  - "Interactive elements have a clearly visible focus indicator."
  - "Errors are explained in text and are not indicated by color alone."
  - "Form fields have clear labels that screen readers can read."

# ACCESSIBILITY COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the refined criteria (AC-OUT-, AC-SYS-) collectively cover:

1. **Keyboard access**
   - All interactive elements can be reached and used with a keyboard.
   - Focus order is logical and visible.
   - Common patterns work (menus, dialogs, dropdowns, tabs) with expected keys (e.g., Enter/Space to activate, Escape to close where applicable).

2. **Screen reader support**
   - Controls have clear, descriptive names.
   - Labels are correctly associated to inputs.
   - Icon-only controls are understandable via accessible names.
   - Page/section structure supports navigation (e.g., headings where appropriate).

3. **Forms: required + errors**
   - Required fields are communicated clearly and not by color alone.
   - Errors are described in text, linked to the relevant field, and discoverable without relying on vision.
   - Users can understand what went wrong and how to fix it.

4. **Dynamic updates**
   - Status changes (loading, success, failure) are communicated in a way screen reader users can perceive.

5. **Visual clarity**
   - Text is readable with sufficient contrast.
   - States (active/disabled/error) are distinguishable without color alone.

6. **Touch and responsive use (when relevant)**
   - Controls are easy to activate on touch devices.
   - Layout remains usable at different screen sizes and zoom levels.

# TASK

Review existing outcomeAcceptanceCriteria (AC-OUT-) and systemAcceptanceCriteria (AC-SYS-) for redundancies or overlaps. Consolidate duplicates, replace unclear items, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
