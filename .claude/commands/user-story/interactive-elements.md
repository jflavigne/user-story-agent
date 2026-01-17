---
description: Enhance user stories with interactive UI element documentation and states
allowed-tools: [read, write, search_replace]
---

# /user-story/interactive-elements - Interactive Elements Iteration

## Purpose

Enhance an existing user story by documenting all interactive UI elements, including their types, purposes, and interaction states. This iteration adds acceptance criteria for buttons, inputs, links, icons, and their various states (default, hover, focus, active, disabled, error).

## Usage

```
/user-story/interactive-elements [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/interactive-elements stories/login-form.md
/user-story/interactive-elements tickets/USA-2.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Interactive Elements Iteration Prompt

Analyze the user story using the following prompt:

```
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

Provide a comprehensive inventory that:
- Lists all interactive elements by type
- Documents each element's purpose and behavior
- Describes all interaction states with visual details
- Includes accessibility and validation requirements
- Maps elements to user story acceptance criteria
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the interactive elements iteration prompt to identify:
   - All interactive UI elements (buttons, inputs, links, icons)
   - Element types and purposes
   - Interaction states for each element
   - Groupings and relationships
3. Add new acceptance criteria for interactive elements
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New interactive elements acceptance criteria clearly marked with a "### Interactive Elements" section
- Notes on state behaviors and feedback mechanisms

---

## Notes

- This iteration focuses on documenting UI elements and their behaviors
- New criteria should be additive, not replacing existing requirements
- Include both visual states and functional behaviors
- Consider keyboard and touch interactions alongside mouse interactions
