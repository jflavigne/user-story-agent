/**
 * Interactive Elements iteration prompt module
 * 
 * This prompt guides documentation of interactive UI elements and their states.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for documenting interactive UI elements and their states.
 * 
 * This prompt guides documentation of:
 * - Buttons (primary, secondary, icon buttons)
 * - Inputs (text, password, email, textarea, select, checkbox, radio)
 * - Links (navigation, inline, external)
 * - Icons (actionable vs decorative)
 * - States for each: default, hover, focus, active, disabled, error
 */
export const INTERACTIVE_ELEMENTS_PROMPT = `# PATH SCOPE
This iteration is allowed to modify only these sections:
- userVisibleBehavior (UVB-* items)
- outcomeAcceptanceCriteria (AC-OUT-* items)

All patches MUST target only these paths. Patches targeting other sections will be rejected.

# OUTPUT FORMAT
Respond with valid JSON only (no markdown code fence, no prose):
{
  "patches": [
    {
      "op": "add",
      "path": "userVisibleBehavior",
      "item": { "id": "UVB-001", "text": "..." },
      "metadata": { "advisorId": "interactive-elements", "reasoning": "..." }
    }
  ]
}

Required fields:
- op: "add" | "replace" | "remove"
- path: Must be one of the allowed paths above
- item: { id: string, text: string } for add/replace
- match: { id?: string, textEquals?: string } for replace/remove
- metadata: { advisorId: "interactive-elements", reasoning?: string }

---

# VISION ANALYSIS (when images provided)

If mockup images are provided, use visual evidence to identify:
- **Button types**: Primary (prominent, filled) vs secondary (outline, subtle) vs icon-only from styling and placement
- **Input types**: Text, password, email, select, checkbox, radio from field appearance and labels
- **Links**: Navigation vs inline vs external from context and styling
- **Icons**: Actionable (clickable) vs decorative from placement and affordance
- **States**: Default, hover, focus, disabled, error from any shown variants in the image

Prioritize what you see in the image over text descriptions when both are present.

## FUNCTIONAL VISION ANALYSIS

Extract functional implications from visual design:

1. **Visual Hierarchy → User Priority**
   - Primary actions (prominent): "Submit button is primary action"
   - Secondary actions (subtle): "Cancel link is secondary"
   - DO NOT specify exact colors/sizes - describe relative importance

2. **Visual State → User Feedback**
   - Error indication: "Error state shows visual feedback (red border, icon)"
   - Loading feedback: "Loading state displays progress indicator"
   - DO NOT specify border widths, icon sizes - describe feedback mechanism

3. **Visual Grouping → Functional Relationships**
   - Related controls: "Filter controls are visually grouped"
   - DO NOT specify spacing values - describe grouping intent

4. **Visual Affordance → Interaction Model**
   - Clickable elements: "Button appearance indicates it's interactive"
   - DO NOT describe exact styling - describe interaction capability

---

## ANTI-PATTERNS: What NOT to Extract (Interactive Elements)

❌ **Exact color values**: "#0066CC", "rgb(0, 102, 204)", "brand-blue-500"
✓ **Functional color**: "Primary action uses high-contrast color", "Error state uses red"

❌ **Exact spacing**: "16px padding", "8px gap between items"
✓ **Functional spacing**: "Adequate touch target size", "Clear visual separation between button group"

❌ **Typography details**: "Helvetica 14px", "line-height 1.5", "font-weight 600"
✓ **Functional typography**: "Button label clearly readable", "Heading hierarchy visible"

❌ **Border/shadow specs**: "8px border-radius", "2px solid border"
✓ **Functional borders**: "Focus indicator clearly visible", "Primary button visually distinct from secondary"

---

## EXAMPLES: Functional vs Visual Extraction (Interactive Elements)

**WRONG (Over-specified):**
"Submit button has #0066CC background, 16px padding, 8px border-radius,
white text, 48px height, box-shadow 0 2px 4px rgba(0,0,0,0.1)"

**RIGHT (Functional):**
"Submit button is primary action (prominent styling with high contrast),
adequate touch target size, hover state provides visual feedback,
disabled state prevents submission when form incomplete"

**WRONG:** "Error state: red border 2px, 14px error icon left of message"
**RIGHT:** "Error state shows clear visual feedback (border and icon) with inline error message; feedback is accessible to screen readers"

---

Document all interactive UI elements in the mockup or design, including their types, purposes, and interaction states.

## Element Types

1. **Buttons**: Identify and document all button types:
   - Primary buttons (main actions, typically prominent styling)
   - Secondary buttons (alternative actions, less prominent)
   - Icon buttons (buttons with icons only, no text labels)
   - Text buttons (minimal styling, text-only)
   - Button groups or button bars
   - Floating action buttons (FABs)

2. **Input Fields**: Document all form input types:
   - Text inputs (single-line text)
   - Password inputs (masked text)
   - Email inputs (with email validation)
   - Textarea (multi-line text)
   - Select dropdowns (single or multi-select)
   - Checkboxes (single or groups)
   - Radio buttons (exclusive selection groups)
   - Date/time pickers
   - File upload inputs
   - Search inputs
   - Number inputs

3. **Links**: Identify all link types:
   - Navigation links (menu items, breadcrumbs)
   - Inline links (within content)
   - External links (to external sites)
   - Call-to-action links
   - Footer links
   - Social media links

4. **Icons**: Distinguish between icon types:
   - Actionable icons (clickable, perform actions)
   - Decorative icons (visual only, not interactive)
   - Status icons (indicators, badges)
   - Navigation icons (hamburger menus, arrows)

## Interaction States

5. **State Documentation**: For each interactive element, document all visible states:
   - **Default**: Normal, unselected, unactivated state
   - **Hover**: State when cursor hovers over element
   - **Focus**: State when element receives keyboard focus
   - **Active**: State when element is being clicked/pressed
   - **Disabled**: State when element is unavailable
   - **Error**: State when validation fails or error occurs
   - **Selected**: State for checkboxes, radio buttons, tabs
   - **Loading**: State when action is in progress

6. **State Indicators**: Note visual indicators for each state:
   - Color changes
   - Opacity changes
   - Border or outline changes
   - Shadow or elevation changes
   - Icon or text changes
   - Animation or transition effects

## Element Properties

7. **Labels and Accessibility**: Document:
   - Text labels for all interactive elements
   - Placeholder text for inputs
   - Helper text or hints
   - Error messages or validation feedback
   - ARIA labels or accessibility attributes (if visible in design)
   - Required field indicators

8. **Grouping and Relationships**: Identify:
   - Form field groupings
   - Related button groups
   - Input and label relationships
   - Error message associations
   - Helper text connections

## User Story Integration

9. **Story Requirements**: For each interactive element, determine:
   - What user action triggers the interaction?
   - What happens when the element is activated?
   - What validation or constraints apply?
   - What feedback is provided to the user?
   - What error handling is needed?

10. **Acceptance Criteria**: Document acceptance criteria that cover:
    - All interaction states and their visual appearance
    - User feedback for each interaction
    - Validation rules and error messages
    - Accessibility requirements
    - Keyboard navigation support
    - Mobile/touch interactions (if applicable)

## Output

Return AdvisorOutput only: a JSON object with a "patches" array. Each patch must target userVisibleBehavior or outcomeAcceptanceCriteria. Add or replace items to document:
- Interactive elements by type (buttons, inputs, links, icons)
- Each element's purpose and behavior
- Interaction states with visual details
- Accessibility and validation requirements
- Acceptance criteria for interactions (AC-OUT-* in outcomeAcceptanceCriteria)`;

/**
 * Metadata for the interactive elements iteration
 */
export const INTERACTIVE_ELEMENTS_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'interactive-elements',
  name: 'Interactive Elements',
  description: 'Documents buttons, inputs, links, icons and their interaction states',
  prompt: INTERACTIVE_ELEMENTS_PROMPT,
  category: 'elements',
  applicableWhen: 'When the mockup contains interactive UI components',
  order: 2,
  tokenEstimate: 1150, // prompt length / 4 (PATH SCOPE + OUTPUT FORMAT + body)
};
