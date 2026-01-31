/**
 * Accessibility Requirements iteration prompt module
 * 
 * This prompt guides analysis of WCAG compliance and accessibility requirements
 * from a user perspective.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for identifying WCAG compliance and accessibility requirements.
 * 
 * This prompt guides analysis of (from user's perspective):
 * - Keyboard navigation (tab order, focus management, keyboard shortcuts)
 * - Screen reader compatibility (alt text, ARIA labels, semantic structure)
 * - Form accessibility (labels, error announcements, required field indicators)
 * - State change announcements (loading, success, error notifications)
 * - Color contrast and visual accessibility
 * - Focus indicators
 */
export const ACCESSIBILITY_PROMPT = `# PATH SCOPE
This iteration is allowed to modify only these sections:
- outcomeAcceptanceCriteria (AC-OUT-* items)
- systemAcceptanceCriteria (AC-SYS-* items)

All patches MUST target only these paths. Patches targeting other sections will be rejected.

# OUTPUT FORMAT
Respond with valid JSON only (no markdown code fence, no prose):
{
  "patches": [
    {
      "op": "add",
      "path": "outcomeAcceptanceCriteria",
      "item": { "id": "AC-OUT-001", "text": "..." },
      "metadata": { "advisorId": "accessibility", "reasoning": "..." }
    }
  ]
}

Required fields:
- op: "add" | "replace" | "remove"
- path: Must be one of the allowed paths above
- item: { id: string, text: string } for add/replace
- match: { id?: string, textEquals?: string } for replace/remove
- metadata: { advisorId: "accessibility", reasoning?: string }

---

# VISION ANALYSIS (when images provided)

If mockup images are provided, use visual evidence to identify:
- **Focus indicators**: Visible focus rings, outlines, or highlight styles on interactive elements
- **Required/error indicators**: Asterisks, "required" labels, red borders, error icons, inline error text
- **Semantic structure**: Headings, lists, form labels visible in the layout
- **Color and contrast**: High-contrast text, error colors, success colors; note any low-contrast areas
- **Alt text needs**: Images, icons, or decorative elements that need alternative text

Prioritize what you see in the image over text descriptions when both are present.

## FUNCTIONAL VISION ANALYSIS

Extract functional implications from visual design:

1. **Contrast → Readability**
   - Text vs background: "Body text has sufficient contrast for readability"
   - DO NOT specify ratio numbers or hex - describe that contrast meets accessibility needs

2. **Focus/State Indicators → Keyboard and Screen Reader**
   - Visible focus: "Interactive elements show clear focus indicator"
   - DO NOT specify outline width or color - describe that focus is visible

3. **Semantic Structure → Navigation and Landmarks**
   - Headings/lists: "Heading hierarchy and list structure support navigation"
   - DO NOT specify font sizes - describe structural roles

4. **Error and Required → Non-Color Communication**
   - Required/error: "Required fields and errors indicated by more than color alone (e.g. icon, text)"
   - DO NOT specify red/green hex - describe that state is communicated accessibly

---

## ANTI-PATTERNS: What NOT to Extract (Accessibility)

❌ **Exact color values**: "#B22222 for errors", "4.5:1 contrast ratio", "WCAG AA hex codes"
✓ **Functional contrast**: "Error state uses sufficient contrast and is not conveyed by color alone"

❌ **Exact dimensions**: "2px focus ring", "24px focus outline offset"
✓ **Functional focus**: "Focus indicator is clearly visible and distinct from default state"

❌ **Typography specs**: "18px for headings", "14px body for readability"
✓ **Functional typography**: "Heading hierarchy is clear", "Body text is readable"

❌ **Pixel measurements**: "48px min touch target", "8px spacing"
✓ **Functional targets**: "Touch targets are adequate for activation", "Spacing prevents accidental activation"

---

## EXAMPLES: Functional vs Visual Extraction (Accessibility)

**WRONG (Over-specified):**
"Focus ring is 2px solid #005FCC, 2px offset; error text is #CC0000 14px; touch targets minimum 44px"

**RIGHT (Functional):**
"All interactive elements have a visible focus indicator; errors are indicated by text and icon, not color alone; controls have adequate size for touch and pointer"

**WRONG:** "Text contrast 4.5:1 on white background; required field asterisk 12px red"
**RIGHT:** "Text has sufficient contrast for readability; required fields are indicated visibly and programmatically (e.g. asterisk or label)"

---

Analyze the mockup or design to identify accessibility requirements and how users with disabilities will experience the interface.

## Keyboard Navigation

1. **Tab Order and Focus Management**: Identify keyboard navigation patterns:
   - What is the logical tab order through interactive elements?
   - How does focus move between form fields, buttons, and links?
   - Are there keyboard shortcuts available to users?
   - Can all interactive elements be reached via keyboard?
   - Are there skip links or shortcuts to bypass repetitive navigation?
   - How does focus behave in modals, dropdowns, and dynamic content?

2. **Keyboard Interaction**: Document keyboard-accessible interactions:
   - Can users activate buttons and links using Enter or Space?
   - How do users navigate dropdown menus with keyboard?
   - Can users close modals and dialogs using Escape?
   - Are there keyboard shortcuts for common actions?
   - How do users interact with complex components (tabs, accordions, carousels) via keyboard?

## Screen Reader Compatibility

3. **Alt Text and Descriptions**: Identify images and visual content:
   - What alternative text should be provided for informative images?
   - How are decorative images handled (should they be hidden from screen readers)?
   - Are icons and graphics described appropriately?
   - Do charts, graphs, and data visualizations have text alternatives?
   - Are complex images (infographics, diagrams) described in detail?

4. **Screen Reader Experience**: Analyze what screen reader users hear and experience:
   - What do screen reader users hear when they encounter icon-only buttons?
   - Can screen reader users understand which label belongs to which field?
   - Can users navigate between major sections and regions of the page?
   - Do interactive elements have clear, descriptive names that explain their purpose?
   - Can users understand relationships between elements (groups, lists, tables)?

5. **Content Structure and Navigation**: Identify how users navigate content:
   - Can users navigate by headings to quickly find content?
   - Is content organized so users can understand the structure when reading linearly?
   - Can screen reader users easily navigate the menu structure and understand the navigation hierarchy?
   - Can users understand how form fields are grouped and what each group represents?
   - Is the page structure clear and logical when experienced non-visually?

## Form Accessibility

6. **Form Labels and Associations**: Document form accessibility:
   - Are all form fields clearly labeled?
   - Can users (especially screen reader users) understand which label belongs to which field?
   - Are placeholder texts used as the only labels (anti-pattern)?
   - Do complex inputs (date pickers, file uploads) have clear instructions?
   - Are form field purposes clear (what information is being requested)?

7. **Error Announcements**: Identify how form errors are communicated:
   - Are validation errors announced to screen readers immediately?
   - How do users learn about errors when they can't see visual indicators?
   - Are error messages associated with the fields that have errors?
   - Can users navigate directly to fields with errors?
   - Is there a summary of errors that screen readers can access?

8. **Required Field Indicators**: Document required field communication:
   - How are required fields indicated to screen reader users?
   - Is the required status announced when users focus on fields?
   - Are required field indicators clear and consistent?
   - Can users understand which fields are optional vs required?

## State Change Announcements

9. **Dynamic Content Updates**: Identify state changes that need announcements:
   - How are loading states communicated to screen reader users?
   - Are success messages announced when actions complete?
   - How do users learn about error notifications?
   - Are dynamic content updates (loading new items, updating lists) announced appropriately?
   - Do users receive feedback when form submissions succeed or fail?

10. **Live Regions**: Determine what needs live region announcements:
    - Which content changes should be announced immediately?
    - Which changes should be announced politely (after current task)?
    - Which changes should not be announced (decorative updates)?
    - How are progress indicators communicated?
    - Are status messages (saving, uploading) announced?

## Visual Accessibility

11. **Color Contrast**: Analyze color usage for accessibility:
    - Do text colors have sufficient contrast against backgrounds?
    - Are interactive elements distinguishable without relying on color alone?
    - Do error states use more than just color to indicate problems?
    - Are focus indicators visible with high contrast?
    - Can users distinguish between different states (active, disabled, error) without color?

12. **Focus Indicators**: Document focus visibility:
    - Are focus indicators clearly visible on all interactive elements?
    - Is the focus indicator distinct from hover states?
    - Can users easily see which element currently has focus?
    - Do focus indicators meet minimum size and contrast requirements?
    - Are custom focus styles consistent across the interface?

13. **Visual Alternatives**: Identify non-visual communication methods:
    - Are icons accompanied by text labels?
    - Do color-coded statuses have text or icon alternatives?
    - Can users understand information without relying on visual cues?
    - Are there alternatives to hover-only interactions?
    - Is important information not conveyed solely through visual design?

## Responsive and Touch Accessibility

14. **Touch Target Sizes**: Document touch accessibility:
    - Are interactive elements large enough for easy touch interaction?
    - Is there adequate spacing between clickable elements?
    - Can users with motor disabilities easily interact with controls?
    - Are touch gestures (swipe, pinch) optional or have alternatives?

15. **Responsive Accessibility**: Consider accessibility across devices:
    - Does the interface remain accessible on mobile devices?
    - Are keyboard navigation patterns maintained across screen sizes?
    - Do focus indicators work on touch devices?
    - Is content readable and navigable at different zoom levels?

## User Story Implications

16. **Story Requirements**: For each accessibility feature, determine:
    - What user actions are supported via keyboard?
    - How do screen reader users understand and interact with content?
    - What feedback is provided for state changes?
    - How are errors and validation communicated accessibly?
    - What visual and non-visual indicators support accessibility?

17. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Keyboard navigation and focus management
    - Screen reader compatibility and announcements
    - Form accessibility and error communication
    - Visual accessibility (contrast, focus indicators)
    - Alternative text and semantic structure
    - Touch accessibility and responsive behavior

## Output

Return AdvisorOutput only: a JSON object with a "patches" array. Each patch must target outcomeAcceptanceCriteria or systemAcceptanceCriteria. Add or replace items to document:
- Accessibility requirements for keyboard users
- Screen reader compatibility needs
- Form accessibility and state change announcements
- Visual accessibility considerations
- Acceptance criteria for accessibility (AC-OUT-*, AC-SYS-*)`;

/**
 * Metadata for the accessibility requirements iteration
 */
export const ACCESSIBILITY_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'accessibility',
  name: 'Accessibility Requirements',
  description: 'Identifies WCAG compliance and accessibility requirements for inclusive design',
  prompt: ACCESSIBILITY_PROMPT,
  category: 'quality',
  applicableWhen: 'For all mockups to ensure inclusive design',
  order: 4,
  tokenEstimate: 1872, // ~7487 chars / 4
};
