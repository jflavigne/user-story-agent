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
export const INTERACTIVE_ELEMENTS_PROMPT = `Document all interactive UI elements in the mockup or design, including their types, purposes, and interaction states.

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

Provide a comprehensive inventory that:
- Lists all interactive elements by type
- Documents each element's purpose and behavior
- Describes all interaction states with visual details
- Includes accessibility and validation requirements
- Maps elements to user story acceptance criteria`;

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
  tokenEstimate: 907, // ~3626 chars / 4
};
