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
      "metadata": { "advisorId": "language-support", "reasoning": "…" }
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

- metadata.advisorId MUST be `language-support`
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# SCOPE GATE (MUST PASS OR RETURN EMPTY)

Only produce patches if at least one of these is true:

1. The user story or existing criteria explicitly mention multi-language, localization, locale formats, translation, or RTL.
2. The provided mockup(s) clearly show language/locale signals (e.g., a language selector, mixed languages, RTL text, locale-specific formats).

If none of the above are true, return:

```json
{ "patches": [] }
```

# NON-INVENTION RULE

Do not add requirements unrelated to the story or mockups.
Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied as necessary for a usable multi-language experience of the described flow, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify language-support needs such as:

- Language selector/indicator (language name, language code, globe icon, settings entry)
- Mixed-language UI (untranslated strings, inconsistent language across components)
- RTL text or RTL layout cues (Arabic/Hebrew text, mirrored navigation cues)
- Directional UI that may need mirroring (back/next, progress steps, arrows, carousels)
- UI likely to break with longer translations (buttons, tabs, cards, tables, navigation)
- Images/media containing text that may need localization
- Locale formats shown (date/time, currency, numbers, units)

Use images to add or clarify requirements; do not override explicit written requirements.

# WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write acceptance criteria as user-observable outcomes:

- Use plain language.
- Avoid implementation details (no frameworks, file formats, translation pipelines).
- Avoid exhaustive lists of languages; focus on behavior.
- Keep each criterion distinct and testable.

# LANGUAGE SUPPORT COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the refined AC-OUT-* items collectively cover, as applicable:

## 1. Language selection and persistence

- Users can find where to change language.
- Users can switch language and see the change applied.
- The chosen language is remembered on return (when the product supports saved preferences).

## 2. Completeness and consistency

- Core navigation, labels, buttons, and messages appear in the selected language.
- Users are not surprised by mixed-language UI without explanation.

## 3. Fallback behavior (missing translations)

- Missing translations fall back in a predictable way.
- Users can understand that fallback text is being shown.

## 4. Right-to-left (RTL) support (only if RTL is in scope)

- Reading order and layout adapt for RTL.
- Directional cues (e.g., back/next) make sense in RTL.

## 5. Special characters and multiple scripts (only if inputs/content exist)

- Users can view and enter accented and non-Latin characters.
- Search and matching remain usable with accents (only if search exists).

## 6. Layout resilience

- Translations can expand/shrink without breaking key actions or meaning.
- If text is shortened, users can still access the full label where needed.

## 7. Local conventions (only if relevant to the story)

- Dates, times, numbers, and currency match locale expectations for the selected language/region.

# TASK

Review existing outcomeAcceptanceCriteria (AC-OUT-*) for redundancies and gaps related to language support. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the SCOPE GATE and NON-INVENTION RULE. Output patches only.
