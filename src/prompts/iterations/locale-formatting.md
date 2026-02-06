---
id: locale-formatting
name: Locale Formatting
description: Identifies locale-specific formatting requirements focusing on user experience of formatted data
category: i18n
order: 10
applicableWhen: When analyzing an application that needs to display dates, numbers, currency, addresses, or measurements for international users
applicableTo: all
allowedPaths: outcomeAcceptanceCriteria
outputFormat: patches
---

# PATH SCOPE

This iteration may modify only this section (exact value):

- `outcomeAcceptanceCriteria` (AC-OUT-* items only)

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
      "metadata": { "advisorId": "locale-formatting", "reasoning": "…" }
    }
  ]
}
```

# PATCH RULES

## Required fields by op

- **op: "add"**
  - required: op, path, item, metadata
  - forbidden: match
- **op: "replace"**
  - required: op, path, match, item, metadata
  - match must include: `{ "id": "…" }`
- **op: "remove"**
  - required: op, path, match, metadata
  - match must include: `{ "id": "…" }`
  - forbidden: item

## Path and ID constraints

- path MUST be `outcomeAcceptanceCriteria`
- item.id MUST start with `AC-OUT-`

## Metadata constraints

- metadata.advisorId MUST be `locale-formatting`
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied as necessary for users to correctly read and enter formatted values in the described flow, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify locale-formatting needs such as:

- Dates/times shown in UI (deadlines, schedules, history, "last updated", relative time)
- Numbers that could be misread across locales (totals, prices, quantities, percentages)
- Currency symbols and amounts (price lists, carts, invoices)
- Address or phone fields and examples (shipping, contact, profile)
- Units and measurements (distance, weight, temperature, volume)
- Any inline examples, placeholders, helper text, or validation messages that imply format expectations

Use images to add or clarify requirements; do not override explicit written requirements.

# WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write acceptance criteria as user-observable outcomes:

- **Use first-person voice** ("I see", "I can", "I click") in all user-facing content.
- **Use Gherkin format** for acceptance criteria:
  - **Given** [context] **When** [action] **Then** [outcome]
  - Example: **Given** I entered an invalid email **When** I submit the form **Then** I see an error message next to the email field
- Use plain language.
- Avoid implementation details (no libraries, locale APIs, backend formats).
- Avoid listing many specific formats; describe correct behavior by user locale/region.
- Make each criterion distinct and testable.
- Focus on preventing confusion and input errors caused by formatting differences.

# LOCALE FORMATTING COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the refined AC-OUT-* items collectively cover, as applicable:

## 1. Dates and times

- Display matches the user's locale expectations (date order, separators, 12/24-hour).
- Time zone handling is clear when relevant (users understand what time zone is shown).
- Relative time (e.g., "yesterday", "2 hours ago") is understandable in the selected locale.

## 2. Date/time input (if users enter them)

- Input guidance matches the expected locale format (examples or labels).
- Users get a clear message when an entered value is not understood.
- The system prevents accidental misinterpretation (e.g., ambiguous dates) when possible.

## 3. Numbers and percentages

- Decimal and thousands separators match the user's locale expectations.
- Percentages are displayed in a clear, familiar format for the locale.

## 4. Currency (if money is shown)

- Currency symbol/code and placement are clear.
- Users can tell which currency they are seeing when multiple currencies are possible.
- Currency amounts use locale-appropriate separators and grouping.

## 5. Addresses and phone numbers (if collected)

- Address fields support country-appropriate formats without forcing a single structure.
- Phone numbers support international formats and make it clear what format is expected.

## 6. Measurement units (if measurements are shown or entered)

- Units match the user's locale expectations (metric vs imperial where applicable).
- If conversion is offered, users can understand both the value and the unit.

## 7. Errors and validation messages

- Format-related errors explain what to enter in plain language.
- Examples in guidance and errors match the user's locale.

# TASK

Review existing outcomeAcceptanceCriteria (AC-OUT-*) for redundancies and gaps related to locale formatting. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
