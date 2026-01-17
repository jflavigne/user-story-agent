---
description: Identifies WCAG compliance and accessibility requirements for inclusive design
allowed-tools: [read, write, search_replace]
---

# /user-story/accessibility - Accessibility Requirements Iteration

## Purpose

Enhance an existing user story by analyzing accessibility requirements. This iteration adds acceptance criteria for accessibility features, keyboard navigation, screen reader support, and WCAG compliance.

## Usage

```
/user-story/accessibility [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/accessibility stories/example.md
/user-story/accessibility tickets/USA-X.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Accessibility Requirements Iteration Prompt

Analyze the user story using the following prompt:

```
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

Provide a comprehensive analysis that:
- Lists all accessibility requirements for keyboard users
- Documents screen reader compatibility needs
- Identifies form accessibility requirements
- Describes state change announcements needed
- Explains visual accessibility considerations
- Maps accessibility requirements to user story acceptance criteria
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the Accessibility Requirements iteration prompt to identify requirements
3. Add new acceptance criteria
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New acceptance criteria clearly marked with a "### Accessibility" section
- Notes on any considerations

---

## Notes

- This iteration focuses on accessibility requirements
- New criteria should be additive, not replacing existing requirements
- Focus on user experience for users with disabilities
- Accessibility should be built-in, not an afterthought
