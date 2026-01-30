# FilterBar Component

## Overview
**Type:** Organism (Desktop-only)
**Purpose:** Horizontal filter assembly for desktop content refinement
**Pattern:** Multi-column layout with real-time updates

A desktop-exclusive horizontal assembly used to refine content grids. It orchestrates FilterGroup columns and features a global "Clear all" action. Logic is real-time: any interaction triggers an immediate refresh of both the results and the available filter options (hiding zero-result paths).

![FilterBar Component](./images/FilterBar.png)

---

## User Stories

### US-FB-001: View All Filter Categories at Once
**As a** desktop user browsing projects
**I want to** see all filter categories displayed horizontally
**So that** I can quickly scan available options without needing to expand/collapse

**Acceptance Criteria:**
- [ ] FilterBar appears at top of content area on desktop viewports
- [ ] All FilterGroups are visible simultaneously in columns
- [ ] Each column shows its category name and filter options
- [ ] No accordion behavior (all categories always expanded)
- [ ] Columns are separated by visual dividers
- [ ] Layout is responsive within desktop range (min-width: 768px)

---

### US-FB-002: Select Multiple Filters Across Categories
**As a** desktop user refining search results
**I want to** click filter options across different categories
**So that** I can build complex filter combinations efficiently

**Acceptance Criteria:**
- [ ] Clicking a filter option toggles its active state
- [ ] Active filters show X icon or checkmark
- [ ] Multiple selections allowed per category
- [ ] Selections across different categories combine with AND logic
- [ ] Active filters remain visually distinct (highlighted or marked)
- [ ] Hover states provide feedback before clicking

---

### US-FB-003: See Real-Time Result Updates
**As a** desktop user applying filters
**I want to** see the results grid update immediately after each selection
**So that** I get instant feedback on my filter choices

**Acceptance Criteria:**
- [ ] Grid below FilterBar updates within 200ms of filter change
- [ ] Loading spinner appears during update
- [ ] No page refresh or navigation required
- [ ] Smooth transition when results change
- [ ] Result count updates in real-time
- [ ] URL parameters update to reflect active filters (for bookmarking)

---

### US-FB-004: Avoid Zero-Result Filter Combinations
**As a** desktop user refining results
**I want to** see only filter options that will return results
**So that** I don't select combinations that yield empty result sets

**Acceptance Criteria:**
- [ ] After selecting a filter, incompatible options are automatically hidden
- [ ] Hidden options fade out or gray out smoothly
- [ ] Options reappear when conflicting filters are deselected
- [ ] If entire category becomes unavailable, it shows "(No options available)"
- [ ] Logic evaluates all active filters together for interdependencies
- [ ] Hidden state is animated (150ms fade)

---

### US-FB-005: Clear All Filters with One Click
**As a** desktop user who has applied multiple filters
**I want to** click "Clear all" to reset all selections
**So that** I can return to viewing all results without manually deselecting each filter

**Acceptance Criteria:**
- [ ] "Clear all" link is always visible in FilterBar (typically top-right)
- [ ] Single click deselects all active filters across all categories
- [ ] All FilterItems return to inactive state
- [ ] Grid refreshes to show full unfiltered result set
- [ ] All previously hidden filter options become visible again
- [ ] No confirmation dialog required (immediate action)

---

### US-FB-006: Understand Current Filter State
**As a** desktop user with filters applied
**I want to** see which filters are currently active
**So that** I understand why I'm seeing specific results

**Acceptance Criteria:**
- [ ] Active filters are visually distinct (icon, color, or badge)
- [ ] Count of active filters shown somewhere (e.g., "3 filters applied")
- [ ] Easy to identify which categories have active selections
- [ ] Hover on "Clear all" shows tooltip with count
- [ ] Visual hierarchy makes active filters stand out

---

### US-FB-007: Efficient Keyboard Navigation
**As a** desktop power user
**I want to** navigate filters using keyboard
**So that** I can apply filters quickly without using the mouse

**Acceptance Criteria:**
- [ ] Tab key moves between filter options sequentially
- [ ] Enter or Space toggles filter selection
- [ ] Tab order follows logical left-to-right, top-to-bottom flow
- [ ] Focus indicators are clear and visible
- [ ] Shift+Tab navigates backwards
- [ ] Escape key clears focus or triggers "Clear all"

---

## Technical Requirements

### Component Structure
```
FilterBar
├── Container (horizontal flex layout)
├── FilterGroup Column (Expertises)
│   ├── Category Title
│   └── FilterItem List (vertical stack)
├── Divider
├── FilterGroup Column (Creative Lenses)
│   ├── Category Title
│   └── FilterItem List (vertical stack)
├── Divider
├── [Additional FilterGroup Columns...]
└── Clear All Button
```

### Behavior Logic
- **Real-time Updates:** Every filter selection triggers immediate grid refresh
- **Interdependent Filters:** Options that would yield zero results are hidden automatically
- **Column Layout:** FilterGroups are arranged horizontally in columns
- **No Accordion:** All categories always visible (no expand/collapse)

### Responsive Behavior
- **Desktop Only:** Component renders on viewports ≥ 768px
- **Mobile:** FilterSheet component is used instead
- **Minimum Width:** Requires at least 768px to display properly
- **Column Width:** Each FilterGroup column is flexible but has min-width

### Performance
- Grid updates must complete within 200ms
- Filter option hiding/showing animated at 150ms
- Debounce rapid filter toggles to prevent excessive API calls

### State Management
- Active filters stored in centralized state
- URL parameters sync with filter state (for sharing/bookmarking)
- Filter state persists across browser refresh (if using URL params)

### Accessibility
- [ ] All filter options are keyboard accessible
- [ ] ARIA labels for each FilterGroup: aria-label="Filter by [category]"
- [ ] Active filters have aria-pressed="true"
- [ ] "Clear all" has aria-label="Clear all filters"
- [ ] Screen reader announces result count changes
- [ ] Focus management follows logical order

---

## Design Specifications

### Layout
- Container: Full width of content area
- Padding: 16px top/bottom, 24px left/right
- FilterGroup columns: Equal width or flexible with max-width
- Column gap: 32px between FilterGroups
- Divider: 1px vertical line, height: 100%

### Spacing
- Category title margin-bottom: 12px
- FilterItem height: 48px
- FilterItem gap: 0px (stacked directly)

### Typography
- Category titles: 14px semibold, uppercase or regular case
- FilterItems: 14px regular
- "Clear all": 14px, link style (blue or accent color)

### Colors
- Background: White or light gray (#F9F9F9)
- Active FilterItem: Accent color with X icon
- Inactive FilterItem: Default text color
- Divider: Light gray (#E0E0E0)
- "Clear all": Link blue (#0066CC)

### Interaction States
- Hover: Background color change (light gray)
- Active: Accent background + X icon
- Focus: 2px outline in accent color
- Disabled/Hidden: Opacity 0.4 or display none

---

## Related Components
- **FilterGroup** (child component, used as columns)
- **FilterItem** (descendant component)
- **SpinnerLoading** (used during grid updates)
- **FilterSheet** (mobile equivalent)

---

## Notes
- The FilterBar provides better discoverability than mobile accordion since all options are visible
- Desktop users can scan all categories simultaneously without interaction
- Real-time result updates and zero-result hiding create a guided filtering experience
- The horizontal layout requires careful responsive design to handle varying numbers of FilterGroups
- Consider collapsing to FilterSheet pattern if viewport becomes too narrow
