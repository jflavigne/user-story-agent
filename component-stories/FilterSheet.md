# FilterSheet Component

## Overview
**Type:** Organism (Mobile-only)
**Purpose:** Task-based filtering interface for mobile users
**Pattern:** Bottom sheet with accordion structure

A mobile-exclusive bottom sheet that slides from the bottom of the screen, providing task-based filtering functionality. It nests FilterGroup molecules within an accordion structure and includes a header with a global "Clear all" action. The component features real-time logic where selections immediately update the project grid and dynamically hide FilterItems that would yield zero results.

![FilterSheet Component](./images/FilterSheet.png)

---

## User Stories

### US-FS-001: Access Filters on Mobile
**As a** mobile user browsing projects
**I want to** tap a "Filters" button to open a bottom sheet
**So that** I can refine the project list without leaving the current view

**Acceptance Criteria:**
- [ ] Filter button is visible and accessible on mobile viewport
- [ ] Tapping the button slides the FilterSheet up from the bottom
- [ ] Animation is smooth (300ms transition)
- [ ] Sheet appears above current content with overlay/backdrop
- [ ] Backdrop is semi-transparent to show content updating behind it

---

### US-FS-002: Navigate Filter Categories with Accordion
**As a** mobile user with the FilterSheet open
**I want to** expand and collapse filter categories
**So that** I can focus on one category at a time without scrolling through everything

**Acceptance Criteria:**
- [ ] Each FilterGroup has a collapse/expand toggle (−/+ icon)
- [ ] Only one category can be expanded at a time (accordion behavior)
- [ ] Tapping a category header expands it and collapses others
- [ ] Expand/collapse transitions are smooth
- [ ] Current state is visually clear (icon changes from + to −)

---

### US-FS-003: Select Filter Options in Real-Time
**As a** mobile user viewing filter options
**I want to** tap filter items to select/deselect them
**So that** the project grid updates immediately to show matching results

**Acceptance Criteria:**
- [ ] Tapping a FilterItem toggles its selection state
- [ ] Selected items show active state (checkmark/X icon)
- [ ] Grid updates immediately in background (visible through backdrop)
- [ ] Loading spinner shows during grid refresh
- [ ] Multiple selections are allowed within a category
- [ ] Selections persist while navigating between categories

---

### US-FS-004: See Only Relevant Filter Options
**As a** mobile user selecting filters
**I want to** see only filter options that would return results
**So that** I don't waste time selecting combinations that yield zero projects

**Acceptance Criteria:**
- [ ] After selecting a filter, options that would yield 0 results are hidden
- [ ] Hidden options are removed smoothly (fade out animation)
- [ ] If all options in a category are hidden, category shows "(No options available)"
- [ ] Deselecting a filter shows previously hidden options again
- [ ] The logic respects interdependencies between all active filters

---

### US-FS-005: Clear All Filters Quickly
**As a** mobile user who has applied multiple filters
**I want to** tap "Clear all" in the header
**So that** I can reset to the full project list in one action

**Acceptance Criteria:**
- [ ] "Clear all" link/button is always visible in FilterSheet header
- [ ] Tapping it deselects all active filters across all categories
- [ ] All FilterItems return to inactive state
- [ ] All previously hidden options become visible again
- [ ] Grid refreshes to show all projects
- [ ] Action completes in one tap (no confirmation required)

---

### US-FS-006: Close Filter Sheet
**As a** mobile user who has finished filtering
**I want to** close the FilterSheet
**So that** I can view the filtered results in full screen

**Acceptance Criteria:**
- [ ] Close button (X icon) is visible in FilterSheet header
- [ ] Tapping close button slides sheet down off screen
- [ ] Tapping backdrop also closes the sheet
- [ ] Swiping down on sheet drags it closed
- [ ] Applied filters persist after closing
- [ ] Animation reverses smoothly (slide down, 300ms)

---

### US-FS-007: See Content Update Behind Sheet
**As a** mobile user applying filters
**I want to** see the project grid update behind the FilterSheet
**So that** I can preview results without closing the sheet

**Acceptance Criteria:**
- [ ] FilterSheet leaves space at top to show content
- [ ] Backdrop is semi-transparent (allows content to show through)
- [ ] Grid updates are visible in real-time as filters change
- [ ] Note in UI indicates "Content updating in background"
- [ ] No performance lag when switching filters

---

## Technical Requirements

### Component Structure
```
FilterSheet
├── Header
│   ├── Title ("Filters")
│   ├── Clear All Button
│   └── Close Button (X)
├── Accordion Container
│   ├── FilterGroup (Expertises)
│   │   ├── Category Header (with +/− toggle)
│   │   └── FilterItem List
│   └── FilterGroup (Creative Lenses)
│       ├── Category Header (with +/− toggle)
│       └── FilterItem List
└── Backdrop/Overlay
```

### Behavior Logic
- **Real-time Updates:** Every filter selection triggers immediate grid refresh
- **Interdependent Filters:** Selecting option A hides incompatible options in other categories
- **Zero-Result Prevention:** Options that would yield 0 results are hidden automatically
- **Accordion State:** Single-expand pattern (one category open at a time)

### Responsive Behavior
- **Mobile Only:** Component only renders on viewports < 768px
- **Desktop:** FilterBar component is used instead

### Performance
- Grid updates must complete within 200ms
- Filter option hiding/showing animated at 150ms
- Sheet slide animation: 300ms cubic-bezier

### Accessibility
- [ ] Focus trap when sheet is open (keyboard navigation stays within sheet)
- [ ] Escape key closes the sheet
- [ ] ARIA attributes: role="dialog", aria-modal="true"
- [ ] Close button has aria-label="Close filters"
- [ ] "Clear all" has aria-label="Clear all filters"
- [ ] Screen reader announces filter count changes

---

## Design Specifications

### Spacing
- Sheet max height: 80vh
- Header padding: 16px
- Category spacing: 12px between groups
- FilterItem height: 48px

### Typography
- Header title: 20px bold
- Category headers: 16px semibold
- FilterItems: 14px regular
- "Clear all": 14px link style

### Colors
- Backdrop: rgba(0, 0, 0, 0.4)
- Sheet background: #FFFFFF
- Active FilterItem: Accent color with checkmark
- Inactive FilterItem: Default text color

### Animation Timing
- Sheet slide: 300ms ease-out
- Accordion expand/collapse: 250ms ease-in-out
- FilterItem selection: 150ms
- Option hide/show: 150ms fade

---

## Related Components
- **FilterGroup** (child component)
- **FilterItem** (descendant component)
- **SpinnerLoading** (used during grid updates)
- **FilterBar** (desktop equivalent)

---

## Notes
- The FilterSheet provides visual feedback by allowing users to see content updates behind the sheet (through transparent backdrop)
- The interdependent filter logic is complex and requires careful state management
- Hiding zero-result options improves UX but requires real-time result counting
