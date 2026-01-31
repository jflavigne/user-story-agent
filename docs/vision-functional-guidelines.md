# Vision-Functional Guidelines

This document explains how to extract **functional implications** from mockups and designs when writing user stories, while avoiding **over-specification** of visual styling. User stories should capture behavior and user experience; exact colors, spacing, typography, and dimensions belong in the design system and Figma Dev Mode.

## Principle: User Stories Capture Behavior, Not Appearance

User stories answer: *What does the user need to do, and what does the system need to do so that the user’s goal is met?* They should not answer: *What exact CSS or design tokens should be used?*

- **In scope:** Functional behaviors, visual feedback mechanisms, interaction affordances, accessibility requirements, relative hierarchy (primary vs secondary), and “what” the UI communicates (e.g. error, loading, success).
- **Out of scope:** Exact hex colors, pixel/rem spacing, font families/sizes, border radii, shadows, and dimensions. Those are design and implementation details.

## The Boundary: Functional Implications vs Styling Details

### Functional implications (include in stories)

- **Primary vs secondary actions** – e.g. “Submit is the primary action; Cancel is secondary.” Not: “Submit is #0066CC, 48px height.”
- **Error and success feedback** – e.g. “Invalid field shows clear error state (e.g. border and message) and is announced to screen readers.” Not: “Red 2px border, 14px icon.”
- **Loading and progress** – e.g. “Long operation shows progress or loading indicator; short action shows immediate feedback.” Not: “24px spinner, 300ms delay.”
- **Touch and interaction** – e.g. “Controls have adequate touch target size and clear focus indicator.” Not: “44px min size, 2px focus ring.”
- **Grouping and hierarchy** – e.g. “Filter controls are grouped; primary CTA is above the fold.” Not: “16px gap, 600px hero.”
- **Accessibility** – e.g. “Focus is visible; errors are not conveyed by color alone; contrast is sufficient.” Not: “4.5:1 ratio, #B22222 for errors.”

### Styling details (exclude from stories)

- Exact color values: `#0066CC`, `rgb(0, 102, 204)`, `hsl(210, 100%, 40%)`, or design tokens like `brand-blue-500`.
- Exact spacing: `16px padding`, `8px gap`, `2rem margin`.
- Typography: `Helvetica 14px`, `font-weight 600`, `line-height 1.5`.
- Dimensions: `48px height`, `320px min-width`, `8px border-radius`.
- Shadows and borders: `box-shadow 0 2px 4px rgba(0,0,0,0.1)`, `2px solid border`.

## When Visual Details *Are* Functional

Some visual details are part of the **function** of the interface and belong in stories when they affect behavior or user experience:

### Semantic color

- **Do include:** “Error state uses red (or equivalent) and is also indicated by icon/text so it’s not color-only.”
- **Do not include:** “Error border is #D32F2F.”

### WCAG and accessibility

- **Do include:** “Text and controls have sufficient contrast for readability”; “Focus indicator is clearly visible.”
- **Do not include:** “4.5:1 contrast ratio”; “Focus ring 2px #005FCC.”

### Affordances

- **Do include:** “Button styling indicates it’s interactive”; “Primary action is visually prominent.”
- **Do not include:** “Button has 8px radius and 16px padding.”

### Layout and priority

- **Do include:** “Primary CTA is above the fold”; “Filters are grouped together”; “Navigation collapses to a menu on narrow viewports.”
- **Do not include:** “Hero 600px”; “16px gap”; “Breakpoint at 768px.”

## Examples by Iteration Type

### Interactive elements

- **Wrong:** “Submit button has #0066CC background, 16px padding, 8px border-radius, white text, 48px height.”
- **Right:** “Submit button is the primary action (prominent, high contrast), has adequate touch target size, shows hover and disabled state, and is disabled when the form is incomplete.”

### Validation

- **Wrong:** “Email field shows #D32F2F 2px border on error, 14px error icon, message 8px below.”
- **Right:** “Invalid email shows a clear error state (e.g. border and icon) with an inline message that explains the issue and is associated with the field and announced to screen readers.”

### Accessibility

- **Wrong:** “Focus ring 2px solid #005FCC; error text #CC0000 14px; touch targets minimum 44px.”
- **Right:** “All interactive elements have a visible focus indicator; errors are indicated by text and icon, not color alone; controls have adequate size for touch and pointer.”

### Responsive web

- **Wrong:** “Navigation 64px height, breaks to hamburger at 768px; touch targets 44px minimum.”
- **Right:** “Navigation is a full horizontal bar on wider screens and collapses to a menu trigger on narrow viewports; interactive elements have adequate touch target size on mobile.”

### Performance

- **Wrong:** “Submit shows 24px blue spinner, disabled with opacity 0.6; progress bar 4px height.”
- **Right:** “Submit shows an in-progress state (e.g. disabled with loading indicator) until the response; user gets clear feedback that the action was registered.”

### Analytics

- **Wrong:** “Track click on submit button (blue, 48px height); track nav items (14px, 24px gap).”
- **Right:** “Track primary submit action and main navigation choices; track step/section in multi-step flows for funnel and drop-off.”

## Anti-Patterns to Avoid

| Avoid in stories | Prefer |
|------------------|--------|
| Exact color values (`#hex`, `rgb()`, `hsl()`) | Functional color role: “error uses red”, “primary uses high-contrast color” |
| Exact spacing (`16px`, `8px gap`, `2rem`) | Functional spacing: “adequate touch target”, “clear separation”, “grouped” |
| Typography specs (`Helvetica 14px`, `font-weight 600`) | Functional typography: “heading hierarchy visible”, “error text readable” |
| Border/shadow specs (`8px radius`, `2px solid`) | Functional: “focus clearly visible”, “modal elevated above content” |
| Pixel dimensions (`48px height`, `320px width`) | Functional: “adequate size for touch”, “content width constrained on large screens” |
| Breakpoint numbers (`768px`, `1024px`) | Functional: “narrow viewports”, “wider screens”, “layout adapts by viewport” |

## Validation and Tooling

- **Tests:** `tests/prompts/functional-vision-boundary.test.ts` checks that iteration prompts include functional vision guidance and that sample “good” text does not match over-specification patterns (exact color, px/rem/em, font specs).
- **Benchmark comparison:** `scripts/compare-vision-benchmarks.ts` scans benchmark result JSON (story content) for the same patterns and reports counts so you can compare text-only vs vision-baseline vs vision-functional runs.

Run the comparison script:

```bash
npx tsx scripts/compare-vision-benchmarks.ts real-benchmark-results.json
# Or compare multiple runs:
npx tsx scripts/compare-vision-benchmarks.ts text-only.json vision-baseline.json vision-functional.json
```

## Summary

- **Stories = behavior and experience.** Describe what the user sees and how the system responds in functional terms (primary/secondary, error/success, loading, focus, grouping, responsiveness).
- **Design system / Figma = appearance.** Exact colors, spacing, type, and dimensions live there, not in user stories.
- **Vision iterations** use mockups to infer functional implications (hierarchy, feedback, affordances, accessibility) while avoiding over-specification. Each vision iteration prompt includes “Functional vision analysis”, “Anti-patterns”, and “Examples” sections to enforce this boundary.
