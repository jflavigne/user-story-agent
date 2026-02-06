---
id: cultural-appropriateness
name: Cultural Appropriateness
description: Identifies cultural sensitivity requirements focusing on user experience of culturally appropriate interfaces
category: i18n
order: 11
applicableWhen: When analyzing an application that will be used by users from diverse cultural backgrounds
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
      "metadata": { "advisorId": "cultural-appropriateness", "reasoning": "…" }
    }
  ]
}
```

# PATCH RULES

**Required fields by op:**

- `op: "add"`
  - required: op, path, item, metadata
  - forbidden: match
- `op: "replace"`
  - required: op, path, match, item, metadata
  - match must include: `{ "id": "…" }`
- `op: "remove"`
  - required: op, path, match, metadata
  - match must include: `{ "id": "…" }`
  - forbidden: item

**Path and ID constraints:**

- path MUST be `"outcomeAcceptanceCriteria"`
- item.id MUST start with `"AC-OUT-"`

**Metadata constraints:**

- metadata.advisorId MUST be `"cultural-appropriateness"`
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# Scope gate should pass if:

- The story mentions global markets, localization, regions/countries, cultural sensitivity, brand safety, or "international"; or
- The mockup includes culturally loaded signals (flags, country selector, culturally specific imagery/holidays, hand gestures, religious symbols, region-specific formats, region names).

If the gate does not pass: return `{ "patches": [] }`.


# NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied as necessary to avoid cultural harm or confusion in the described user experience, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify culturally sensitive or culture-dependent elements such as:

- Color-coded meaning (success, error, warning, celebration, mourning)
- Icons, gestures, symbols, flags, maps, animals, hand signs, and metaphors
- Photos/illustrations of people, clothing, settings, holidays, food, or rituals
- Names, titles, honorifics, and the way people are addressed
- Dates, times, calendars, numbers, currencies, measurement units
- Workflows that assume specific norms (weekends, holidays, business customs, family structures)

Use images to add or clarify requirements; do not override explicit written requirements.

# FUNCTIONAL (NOT OVER-SPECIFIED) WRITING RULES

Write acceptance criteria as user-observable outcomes:

- **Use first-person voice** ("I see", "I can", "I click") in all user-facing content.
- **Use Gherkin format** for acceptance criteria:
  - **Given** [context] **When** [action] **Then** [outcome]
  - Example: **Given** I entered an invalid email **When** I submit the form **Then** I see an error message next to the email field
- Use plain language.
- Avoid country-by-country exhaustive lists.
- Avoid implementation details (no "use i18n library", no internal data models).
- Prefer outcome statements like:
  - "I can understand meaning even when color is not the only cue."
  - "I find icons and symbols clear and not offensive."
  - "I see imagery that avoids stereotypes and represents people respectfully."

# CULTURAL APPROPRIATENESS COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the refined AC-OUT-* items collectively cover:

1. **Meaning and clarity across cultures**
   - Key status/meaning is not communicated only through culturally dependent color or symbolism.
   - When meaning could vary by culture, the UI provides a clear text cue.

2. **Icons, symbols, and gestures**
   - Icons and gestures avoid common offensive interpretations in target markets.
   - Any potentially ambiguous symbol includes a text label or tooltip-style clarification.

3. **Imagery and representation**
   - People and cultures are represented respectfully and without stereotypes.
   - Imagery does not rely on culturally narrow references that would confuse users in target markets (unless intentionally localized).

4. **Language and tone**
   - Copy avoids idioms, slang, or humor that may not translate well (unless intentionally localized).
   - Terms that can be culturally sensitive are reviewed and adjusted for the audience.

5. **Names and forms of address (if names/titles appear)**
   - Name fields and display do not assume a single naming convention.
   - Titles/honorifics are optional and culturally appropriate where used.

6. **Dates, times, numbers, money, and units (if present)**
   - Date/time formats, week starts, and number formats match locale expectations.
   - Currency and units are presented in a way users in the target market understand.

7. **Cultural assumptions in workflows**
   - The flow does not assume specific holidays, weekends, work hours, family structures, or business norms without an alternative.

# TASK

Review existing outcomeAcceptanceCriteria (AC-OUT-*) for redundancies and gaps related to cultural appropriateness. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
