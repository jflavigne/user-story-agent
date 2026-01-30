# FilterGroup Component

## Overview
**Type:** Molecule
**Purpose:** Category organizer for filter options
**Pattern:** Header + List structure with optional accordion behavior

Orchestrates a category title and a vertical or grid list of FilterItems. It manages the visual separation (dividers) between categories. Used as building blocks within both FilterSheet (mobile accordion) and FilterBar (desktop columns).

![FilterGroup Component](./images/FilterGroup.png)

---

## User Stories

### US-FG-001: Display Filter Category with Clear Label
**As a** user viewing filters
**I want to** see a clear category label above each group of options
**So that** I understand what aspect I'm filtering by

**Acceptance Criteria:**
- [ ] Category title is displayed prominently at top of group
- [ ] Title uses semantic heading markup (h3 or h4)
- [ ] Title is visually distinct from filter options (bold or larger font)
- [ ] Common titles include: "Expertises", "Creative Lenses", etc.
- [ ] Title remains visible even when scrolling through long lists

---

### US-FG-002: Toggle Category Visibility (Accordion Mode)
**As a** mobile user in FilterSheet
**I want to** tap the category header to expand/collapse the filter list
**So that** I can focus on one category at a time

**Acceptance Criteria:**
- [ ] Category header includes toggle icon (+ when collapsed, − when expanded)
- [ ] Tapping header toggles between collapsed and expanded states
- [ ] Icon animates smoothly during state change
- [ ] Collapsed state hides all FilterItems in the group
- [ ] Expanded state shows all available FilterItems
- [ ] Animation duration: 250ms ease-in-out

**Note:** This behavior only applies when FilterGroup is used within FilterSheet (mobile accordion context).

---

### US-FG-003: Show All Options (Desktop Column Mode)
**As a** desktop user in FilterBar
**I want to** see all filter options in a category without expanding
**So that** I can quickly scan and select options

**Acceptance Criteria:**
- [ ] No toggle icon shown in desktop mode
- [ ] All FilterItems are always visible
- [ ] Category acts as a static column heading
- [ ] No expand/collapse interaction available
- [ ] Vertical list layout within column

**Note:** This behavior only applies when FilterGroup is used within FilterBar (desktop context).

---

### US-FG-004: Visual Separation Between Categories
**As a** user viewing multiple filter categories
**I want to** see clear visual separation between groups
**So that** I can distinguish where one category ends and another begins

**Acceptance Criteria:**
- [ ] Horizontal divider line appears below each FilterGroup
- [ ] Divider is subtle but visible (1px, light gray)
- [ ] Consistent spacing above and below divider
- [ ] Last FilterGroup in list may omit bottom divider
- [ ] Divider spans full width of container

---

### US-FG-005: Handle Empty or Unavailable Categories
**As a** user with active filters
**I want to** see when a category has no available options
**So that** I understand why a category appears empty

**Acceptance Criteria:**
- [ ] When all options are hidden (zero results), show placeholder message
- [ ] Message: "(No options available)" or similar
- [ ] Placeholder is visually distinct (italics, lighter color)
- [ ] Category header remains visible even when empty
- [ ] Options reappear when filters change and results become available

---

### US-FG-006: Display Filter Options in Organized List
**As a** user selecting filters
**I want to** see options listed vertically
**So that** I can easily scan and select from the list

**Acceptance Criteria:**
- [ ] FilterItems are stacked vertically in a list
- [ ] Each item has consistent height (48px)
- [ ] No gaps between items (stacked directly)
- [ ] List is scrollable if content exceeds container height
- [ ] Scroll behavior is smooth and doesn't affect other categories

---

### US-FG-007: Support Dynamic Option Hiding
**As a** user applying interdependent filters
**I want to** see FilterItems hide automatically when they'd yield zero results
**So that** I only see valid options

**Acceptance Criteria:**
- [ ] FilterItems can be hidden dynamically based on other active filters
- [ ] Hiding animation is smooth (fade out, 150ms)
- [ ] Hidden items are removed from layout (don't take up space)
- [ ] Items reappear with fade-in when valid again
- [ ] Order of remaining items stays consistent

---

## Technical Requirements

### Component Structure
```
FilterGroup
├── Header
│   ├── Category Title (e.g., "Expertises")
│   └── Toggle Icon (±) [conditional: accordion mode only]
├── FilterItem List Container
│   ├── FilterItem (option 1)
│   ├── FilterItem (option 2)
│   ├── FilterItem (option 3)
│   └── [...more FilterItems]
└── Divider [conditional: not last in list]
```

### Props/Configuration
- `category`: string (e.g., "Expertises", "Creative Lenses")
- `items`: array of FilterItem data
- `isAccordion`: boolean (mobile vs desktop mode)
- `isExpanded`: boolean (accordion state, default: false)
- `showDivider`: boolean (default: true)

### Behavior Logic
- **Accordion Mode (Mobile):**
  - Toggle icon visible
  - Expand/collapse on header click
  - Animated height transition

- **Column Mode (Desktop):**
  - No toggle icon
  - Always expanded
  - Static column layout

### Conditional Rendering
- Toggle icon: Only render if `isAccordion === true`
- Divider: Only render if `showDivider === true`
- Placeholder message: Render if `items.length === 0` or all items hidden

### Accessibility
- [ ] Category title uses semantic heading (`<h3>` or `<h4>`)
- [ ] Accordion: button element for toggle with aria-expanded state
- [ ] Accordion: aria-controls links header to FilterItem list
- [ ] List container: role="group" or role="list"
- [ ] FilterItems: role="listitem" or inherit from parent
- [ ] Keyboard navigation: Tab through FilterItems, Enter/Space to expand

---

## Design Specifications

### Spacing
- Header padding: 12px top/bottom
- FilterItem height: 48px
- Divider margin: 16px top, 8px bottom
- List container padding: 8px (internal)

### Typography
- Category title: 16px semibold (mobile), 14px semibold (desktop)
- Toggle icon: 20px × 20px
- Placeholder text: 14px italic, gray

### Colors
- Category title: Dark gray or black (#333333)
- Toggle icon: Medium gray (#666666)
- Divider: Light gray (#E0E0E0)
- Placeholder text: Light gray (#999999)

### Animation
- Accordion expand/collapse: 250ms ease-in-out (height transition)
- Toggle icon rotation: 200ms (+ to − rotation)
- FilterItem hide/show: 150ms fade

### Layout
- **Mobile (Accordion):** Full width, vertical stack
- **Desktop (Column):** Fixed or flexible column width, vertical stack

---

## Context of Use

### Within FilterSheet (Mobile)
- Acts as accordion item content
- Toggle icon visible
- Expand/collapse behavior enabled
- Typically only one expanded at a time

### Within FilterBar (Desktop)
- Acts as standalone column
- Toggle icon hidden
- Always expanded
- Multiple groups visible simultaneously

---

## Related Components
- **FilterItem** (child component, multiple instances)
- **FilterSheet** (parent component in mobile context)
- **FilterBar** (parent component in desktop context)

---

## Notes
- FilterGroup is a reusable molecule that adapts based on context (accordion vs column)
- The same component can be configured differently for mobile vs desktop
- Managing the show/hide logic for individual FilterItems requires coordination with parent state
- The divider is part of the FilterGroup to ensure consistent spacing between groups
