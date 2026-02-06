---
id: validation
name: Validation Rules
description: Identifies form field validation rules and user feedback requirements
category: validation
order: 3
applicableWhen: When the mockup contains forms or input fields
applicableTo: all
allowedPaths: outcomeAcceptanceCriteria, systemAcceptanceCriteria
outputFormat: patches
supportsVision: true
---

## PATH SCOPE

This iteration may modify only these sections (exact values):

- `outcomeAcceptanceCriteria` (AC-OUT-* items only)
- `systemAcceptanceCriteria` (AC-SYS-* items only)

Any patch targeting other paths must be rejected.

## OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "outcomeAcceptanceCriteria",
      "item": { "id": "AC-OUT-001", "text": "…" },
      "metadata": { "advisorId": "validation", "reasoning": "…" }
    }
  ]
}
```

## PATCH RULES

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

- If `path == "outcomeAcceptanceCriteria"`, `item.id` MUST start with `"AC-OUT-"`
- If `path == "systemAcceptanceCriteria"`, `item.id` MUST start with `"AC-SYS-"`

Metadata constraints:

- `metadata.advisorId` MUST be `"validation"`
- `metadata.reasoning` is optional but, if present, MUST be ≤ 240 characters and explain why the patch is needed.

## NON-INVENTION RULE

Do not add validation rules that are not supported by the provided user story or mockups.
Only add or refine validation requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied by visible field types and user tasks in the described flow, OR
- required to prevent obvious user errors in the described flow.

## VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify validation needs such as:

- Required field markers (asterisk, "required", "optional")
- Error placements (inline near field, banner/toast, summary list)
- Error and success states (icons, messages, field highlighting)
- Field types implied by labels/affordances (email, password, phone, date, number, file upload)
- Timing cues (real-time hints, on-blur messages, submit-time summary)
- Any "disabled submit until valid" behavior suggested by the UI

Use images to add or clarify requirements; do not override explicit written requirements.

## WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write requirements as user-observable outcomes and system guarantees:

- **Use first-person voice** ("I see", "I can", "I click") in AC-OUT (user-facing) content.
- **Use Gherkin format** for acceptance criteria:
  - **Given** [context] **When** [action] **Then** [outcome]
  - Example: **Given** I entered an invalid email **When** I submit the form **Then** I see an error message next to the email field
- Use plain language and actionable error messaging.
- Avoid implementation details (regex patterns, libraries, internal validation services).
- Avoid exact styling specs (colors, pixels, animation timings).
- Keep AC-OUT focused on what users experience; keep AC-SYS focused on system behavior and guarantees.

## VALIDATION COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the combined AC-OUT-* and AC-SYS-* cover, as applicable:

1. **Required vs optional**
   - Required fields are clearly identified before submission.
   - I can submit only when required information is provided, or I am clearly guided to fix omissions.

2. **Timing of feedback**
   - I receive feedback at the right moment (as I type, when leaving a field, or on submit) based on what the UI/story implies.
   - I am not blocked unexpectedly without an explanation.

3. **Error messages and placement**
   - Errors explain what went wrong and how to fix it.
   - Errors are clearly associated with the relevant field(s).
   - If multiple errors can occur, I can find them efficiently (inline + optional summary where appropriate).

4. **Success/valid states** (only if the UI/story uses them)
   - I can tell when an entry is accepted.
   - The overall form state is clear (ready to submit vs needs fixes).

5. **Format constraints** (only when relevant fields exist)
   - Email, password, phone, date, number ranges, character limits, file type/size.
   - Input guidance is provided where format is easy to misunderstand (examples or helper text).

6. **Submit behavior**
   - Submitting with invalid/missing data produces clear, non-destructive feedback (no loss of entered data).
   - Duplicate submissions are prevented while validation/submission is in progress (if applicable).

7. **Accessibility of validation feedback** (outcome level)
   - I can understand validation feedback without relying on color alone.
   - I can reach and understand errors using keyboard and assistive tech where required.

## TASK

Review existing `outcomeAcceptanceCriteria` (AC-OUT-) and `systemAcceptanceCriteria` (AC-SYS-) for redundancies and gaps related to validation. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
