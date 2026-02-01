---
id: responsive-web
name: Responsive Web Requirements
description: Identifies responsive design requirements for web applications focusing on functional behaviors across breakpoints
category: responsive
order: 7
applicableWhen: When analyzing a web application or website that needs to work across different screen sizes
applicableTo: web, mobile-web, desktop
allowedPaths: userVisibleBehavior, systemAcceptanceCriteria
outputFormat: patches
supportsVision: true
---

# PATH SCOPE

This iteration may modify only these sections (exact values):

- `userVisibleBehavior` (UVB-* items only)
- `systemAcceptanceCriteria` (AC-SYS-* items only)

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
      "metadata": { "advisorId": "responsive-web", "reasoning": "…" }
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
  - match must include: `{ "id": "…" }`
- **op: "remove"**
  - required: op, path, match, metadata
  - match must include: `{ "id": "…" }`
  - forbidden: item

**Path and ID constraints:**

- If path == `userVisibleBehavior`, item.id MUST start with `UVB-`
- If path == `systemAcceptanceCriteria`, item.id MUST start with `AC-SYS-`

**Metadata constraints:**

- metadata.advisorId MUST be `responsive-web`
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.

Only add or refine requirements that are:

- explicitly stated in the story/criteria, OR
- clearly implied by the described responsive web user experience, OR
- supported by visible evidence in provided mockups.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify responsive behavior needs such as:

- Layout adaptation (multi-column to single-column, stacking, sidebars collapsing)
- Navigation patterns by viewport (full nav vs collapsed menu, tabs, bottom nav)
- Touch readiness (controls that must be tappable on mobile)
- Content reflow and reading order (what appears first on small screens)
- Forms and tables behavior on small screens (stacking, alternative views, scroll)
- Orientation cues (portrait vs landscape considerations)
- Any device frames or viewport hints in the mockup

Use images to add or clarify behaviors; do not override explicit written requirements.

# WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write items as user-observable outcomes:

- Use plain language.
- Avoid pixel breakpoints, exact dimensions, font specs, color values, animation timings, and implementation details.
- Keep UVB items behavior-focused; keep AC-SYS items test-focused.
- Prefer outcomes like "users can still complete the task on mobile", "navigation remains reachable", "content remains readable".

# RESPONSIVE WEB COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the combined UVB-* and AC-SYS-* cover, as applicable:

1. **Layout and content reflow**
   - Content remains readable and usable on narrow, medium, and wide viewports.
   - Reading order and grouping remain logical when content stacks.
   - Important actions remain visible or easily discoverable on small screens.

2. **Navigation across viewports**
   - Users can access primary navigation on all viewports (collapsed menu when needed).
   - Users can tell where they are in the site/app (current section/page).
   - Navigation state behaves predictably when moving between layouts (no "lost menu" or broken state).

3. **Touch and pointer inputs**
   - Controls are easy to activate on touch devices.
   - Hover-only interactions have a usable alternative on touch (no hidden-required hover actions).
   - Click/tap feedback is clear (users know the action was registered).

4. **Forms on different viewports** (if forms exist)
   - Fields, labels, and errors remain usable on mobile and desktop.
   - Virtual keyboard does not block critical controls without a way to proceed.

5. **Tables and dense data** (if present)
   - Wide data remains accessible on small screens (scroll, stacking, or alternative presentation).
   - Users can still understand key values without losing context.

6. **Media and interactive components** (if present)
   - Images/video/carousels scale appropriately without blocking content or controls.
   - Interaction patterns remain usable on mobile (swipe where appropriate, buttons still accessible).

7. **Resize and orientation changes** (if relevant)
   - Resizing or rotating does not lose user progress or break the current task.
   - Content remains stable and usable after layout changes.

8. **Performance and perceived responsiveness** (only if relevant to the story)
   - Users receive clear feedback during loading or long operations on all viewports.

# TASK

Review existing `userVisibleBehavior` (UVB-) and `systemAcceptanceCriteria` (AC-SYS-) for overlaps, redundancies, and gaps related to responsive web behavior. Consolidate duplicates, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
