# FilterItem Component

## Overview
**Type:** Atom
**Purpose:** Single selectable filter option
**Pattern:** Interactive list item with active/inactive states

Single selectable filter option with active and inactive states. The fundamental building block of the filtering system, used within FilterGroup to represent individual filterable values.

![FilterItem Component](./images/FilterItem.png)

---

## User Stories

### US-FI-001: Select a Filter Option
**As a** user refining content
**I want to** click/tap a filter option
**So that** I can include it in my active filter set

**Acceptance Criteria:**
- [ ] Clicking/tapping the FilterItem toggles its state
- [ ] Transition from inactive to active is immediate (< 150ms)
- [ ] Visual feedback appears on click (ripple effect or highlight)
- [ ] Selection triggers parent grid update
- [ ] Multiple FilterItems can be active simultaneously

---

### US-FI-002: Identify Active vs Inactive State
**As a** user viewing filter options
**I want to** clearly see which filters are currently applied
**So that** I understand my current filter selection

**Acceptance Criteria:**
- [ ] Inactive state: Plain text, no icon
- [ ] Active state: X icon or checkmark icon displayed before text
- [ ] Active state has distinct styling (color, background, or weight)
- [ ] State change is visually obvious at a glance
- [ ] Icon appears/disappears smoothly (fade or slide animation)

---

### US-FI-003: Deselect an Active Filter
**As a** user with active filters
**I want to** click/tap an active filter option again
**So that** I can remove it from my filter set

**Acceptance Criteria:**
- [ ] Clicking an active FilterItem deselects it
- [ ] Returns to inactive state (icon removed)
- [ ] Grid updates to reflect removal
- [ ] Transition is smooth and immediate
- [ ] No confirmation required

---

### US-FI-004: Hover Feedback (Desktop)
**As a** desktop user
**I want to** see hover feedback on filter options
**So that** I know which option I'm about to select

**Acceptance Criteria:**
- [ ] Hover state changes background color or shows outline
- [ ] Cursor changes to pointer on hover
- [ ] Hover feedback appears within 50ms
- [ ] Hover state is visually distinct from active state
- [ ] Mobile: No hover state (touch interaction only)

---

### US-FI-005: Understand Filter Option Label
**As a** user browsing filters
**I want to** see clear, readable labels for each option
**So that** I understand what each filter represents

**Acceptance Criteria:**
- [ ] Label text is clear and descriptive (e.g., "Campaign & content design")
- [ ] Text doesn't truncate unless necessary (ellipsis if overflow)
- [ ] Font size is readable (minimum 14px)
- [ ] Label has sufficient contrast with background (WCAG AA)
- [ ] No abbreviations or unclear terms

---

### US-FI-006: Keyboard Selection (Desktop)
**As a** keyboard user
**I want to** use keyboard to select filter options
**So that** I can apply filters without using a mouse

**Acceptance Criteria:**
- [ ] FilterItem is focusable via Tab key
- [ ] Focus indicator is clearly visible (outline or highlight)
- [ ] Enter or Space key toggles selection
- [ ] Focus order follows visual order (top to bottom)
- [ ] Focus state is distinct from hover and active states

---

### US-FI-007: Screen Reader Support
**As a** screen reader user
**I want to** hear the filter label and its state
**So that** I can navigate and select filters independently

**Acceptance Criteria:**
- [ ] FilterItem has appropriate role (checkbox or button)
- [ ] Label text is announced correctly
- [ ] Active state is announced (aria-pressed="true" or aria-checked="true")
- [ ] Selection change triggers announcement
- [ ] Group context is provided ("Expertises filter")

---

## Technical Requirements

### Component Structure
```
FilterItem
├── Interactive Container (button or checkbox)
├── Icon [conditional: active state only]
│   └── X or Checkmark (SVG, 16px × 16px)
└── Label Text (e.g., "Campaign & content design")
```

### Props/Configuration
- `label`: string (display text)
- `value`: string (unique identifier)
- `isActive`: boolean (selected state)
- `onToggle`: function (callback when clicked)
- `isHidden`: boolean (for zero-result hiding)

### States
1. **Inactive (Default):**
   - No icon
   - Default text color
   - Standard background

2. **Active (Selected):**
   - X icon or checkmark icon before label
   - Accent color or bold text
   - May have background highlight

3. **Hover (Desktop only):**
   - Light background color change
   - Pointer cursor

4. **Focus (Keyboard navigation):**
   - Visible outline (2px accent color)
   - Clear focus indicator

5. **Hidden (Zero results):**
   - Display: none or opacity: 0
   - Removed from layout
   - Animated fade-out

### Behavior Logic
- Click/tap toggles between inactive and active
- Calls `onToggle(value)` callback on interaction
- Parent component manages actual filter state
- Animation on state change: 150ms

### Accessibility
- [ ] Semantic HTML: `<button>` with role="checkbox" or native `<input type="checkbox">`
- [ ] aria-checked or aria-pressed reflects active state
- [ ] aria-label or visible label for screen readers
- [ ] Keyboard accessible (focusable, Enter/Space to activate)
- [ ] Focus indicator meets WCAG contrast requirements (3:1)
- [ ] Touch target minimum 48px × 48px (mobile)

---

## Design Specifications

### Sizing
- Height: 48px (provides comfortable touch target)
- Width: 100% of parent container
- Icon size: 20px × 20px (or 16px × 16px for minimal style)
- Touch target: Minimum 48px × 48px

### Spacing
- Padding: 12px left/right, 14px top/bottom
- Icon margin-right: 8px (between icon and label)
- Internal alignment: Vertically centered

### Typography
- Font size: 14px
- Font weight: 400 (regular) for inactive, 500 (medium) for active
- Line height: 20px
- Text color: #333333 (inactive), accent color (active)

### Colors
**Inactive State:**
- Background: Transparent or white
- Text: Dark gray (#333333)
- No icon

**Active State:**
- Background: Light accent (#E3F2FD) or transparent
- Text: Accent color (#1976D2)
- Icon: Accent color (#1976D2)
- Icon: X (close icon) or checkmark

**Hover State (Desktop):**
- Background: Light gray (#F5F5F5)

**Focus State:**
- Outline: 2px solid accent color (#1976D2)
- Offset: 2px

### Icons
- Active icon: X (close/remove) or ✓ (checkmark)
- Icon library: SVG, 20×20px viewBox
- Icon position: Before label text (left-aligned)
- Icon color: Matches text color (accent when active)

### Animation
- State change: 150ms ease-in-out
- Icon fade in/out: 100ms
- Hover transition: 100ms
- Focus outline: Instant (no transition)

---

## Interaction Patterns

### Mobile (Touch)
- Tap to toggle
- No hover state
- Minimum 48px touch target
- Visual feedback on tap (ripple effect)

### Desktop (Mouse/Keyboard)
- Click or Enter/Space to toggle
- Hover preview
- Focus indicator for keyboard navigation
- Pointer cursor

---

## Related Components
- **FilterGroup** (parent component, contains multiple FilterItems)
- **FilterSheet** (ancestor component in mobile context)
- **FilterBar** (ancestor component in desktop context)

---

## Variants

### With Icon (Active State)
```
[X] Campaign & content design
```

### Without Icon (Inactive State)
```
Campaign & content design
```

### Long Label (Truncated)
```
[X] Very Long Filter Option Name That Exceeds...
```

---

## Notes
- FilterItem is the most granular, reusable component in the filtering system
- It's intentionally simple to maximize reusability across different contexts
- The parent component (FilterGroup) manages the list of FilterItems and their visibility
- Active state styling should be consistent across all FilterItems for visual coherence
- The choice between X icon (removal metaphor) vs checkmark (selection metaphor) should be consistent across the entire application
