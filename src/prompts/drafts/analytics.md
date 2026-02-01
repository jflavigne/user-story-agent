# PATH SCOPE

This iteration may modify only these sections (exact values):

- `systemAcceptanceCriteria` (AC-SYS-* items only)
- `implementationNotes.telemetryNotes`

Any patch targeting other paths must be rejected.

# OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "systemAcceptanceCriteria",
      "item": { "id": "AC-SYS-001", "text": "…" },
      "metadata": { "advisorId": "analytics", "reasoning": "…" }
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

- If path == `"systemAcceptanceCriteria"`, item.id MUST start with `"AC-SYS-"`
- If path == `"implementationNotes.telemetryNotes"`, item MUST be omitted and use:
  - op: `"replace"`
  - match: `{ "textEquals": "…" }` OR match: `{ "id": "…" }` (only if telemetryNotes is itemized)
  - item: `{ "id": "telemetryNotes", "text": "…" }` (single text blob convention)

**Metadata constraints:**

- metadata.advisorId MUST be `"analytics"`
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

Scope gate should pass if:

- The story mentions measurement, telemetry, analytics, funnel, conversion, drop-off, experimentation, KPI, or reporting; or
- The mockup shows explicit measurement intent (stepper funnel, checkout flow, onboarding steps, "success" confirmation screens, key conversions).

If the gate does not pass: return `{ "patches": [] }`.



# NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.

Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied as necessary to understand user behavior for the described flow, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify analytics needs such as:

- Trackable interactions: buttons, links, form submissions, toggles, tabs, carousels, expandable sections
- Key screens/sections: distinct views or steps that can be milestones (e.g., step 1/step 2)
- Conversion points: primary actions (submit, sign up, purchase) and critical secondary actions (cancel, back)
- Navigation structure: menus, breadcrumbs, back controls that define user paths
- Content engagement cues: scrolling sections, lists, cards, media controls, "load more", filters

Use images to add or clarify requirements; do not override explicit written requirements.

# FUNCTIONAL (NOT OVER-SPECIFIED) WRITING RULES

Write requirements as outcomes and questions the telemetry must answer:

- Use plain language.
- Avoid vendor names and implementation details (no GA4/Segment/Mixpanel specifics).
- Do NOT include exact styling, pixel sizes, colors, animation timings, or event schema internals.
- Prefer functional statements like:
  - "We can tell which primary action a user chose."
  - "We can measure drop-off by step in a multi-step flow."
  - "We can identify which filters are used and which results are selected."

# ANALYTICS COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the combined AC-SYS-* and telemetryNotes cover:

1. **Core actions (events)**
   - Primary CTAs (submit/confirm/purchase/sign up) and key secondary actions (cancel/back)
   - Repeated interactions (add/remove, expand/collapse, open/close)

2. **Navigation and journey**
   - Which screen/step/section the user is on
   - Entry points and common paths
   - Where users exit or abandon (drop-off)

3. **Forms and validation outcomes (if forms exist)**
   - Start vs completion
   - Error occurrence (what stopped completion) without capturing sensitive values
   - Ability to find "most common friction points"

4. **Search, sort, filter (if present)**
   - Which filters/sorts are used
   - Whether users clear/refine and what they choose from results

5. **Engagement (if content browsing exists)**
   - Which content units are viewed and selected (cards/items/tabs)
   - Depth signals where relevant (e.g., scroll into section, expand details)

6. **Timing (only where meaningful)**
   - Time to first key action
   - Time on step/task for multi-step flows
   - Load/wait experience as perceived by the user (started waiting vs finished)

7. **Data responsibility**
   - Do not record passwords, payment details, or form field values that can identify a person
   - Record only what's needed to understand behavior and improve the experience

# TASK

Review systemAcceptanceCriteria (AC-SYS-*) and implementationNotes.telemetryNotes for redundancies and gaps. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
