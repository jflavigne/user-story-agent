# User Story Self-Containment Review

**Date:** 2026-01-29
**Reviewer:** Claude Code
**Purpose:** Identify gaps where user stories lack critical context about component relationships, making them hard to implement without referencing COMPONENT-RELATIONSHIPS.md

---

## Review Methodology

For each user story, I evaluated:
1. **Clarity:** Can a developer understand what to build without external docs?
2. **Context:** Does it explain relationships with other components where relevant?
3. **Data Flow:** When state changes or events occur, is it clear how they propagate?
4. **Completeness:** Are acceptance criteria testable without knowing architecture details?

---

## FilterSheet User Stories

### ✅ Good: Self-Contained Stories
- **US-FS-001:** Access Filters on Mobile - Clear, standalone
- **US-FS-006:** Close Filter Sheet - Clear interaction, no dependencies

### ⚠️ Needs Context: Missing Relationship Details

#### US-FS-002: Navigate Filter Categories with Accordion
**Current Issue:**
- Mentions "FilterGroup" without explaining what it is
- Doesn't clarify that FilterSheet contains multiple FilterGroups
- Accordion behavior mentions "collapses others" but doesn't explain the coordination mechanism

**Missing Context:**
- FilterGroup is a child component that groups related filter options
- FilterSheet manages which FilterGroup is expanded (owns accordion state)
- When one expands, FilterSheet collapses the others

**Suggested Addition to Acceptance Criteria:**
```
- [ ] FilterSheet manages accordion state (which category is expanded)
- [ ] Each filter category (e.g., "Expertises", "Creative Lenses") is represented by a FilterGroup component
- [ ] Expanding one category automatically collapses the previously expanded category
```

---

#### US-FS-003: Select Filter Options in Real-Time
**Current Issue:**
- Mentions "FilterItem" without definition
- Says "Grid updates immediately" but doesn't explain the mechanism
- "Loading spinner shows" - where? Who controls it?

**Missing Context:**
- FilterItem is a nested component (FilterSheet → FilterGroup → FilterItem)
- Selection event propagates up: FilterItem → FilterGroup → FilterSheet → triggers API call
- FilterSheet manages loading state and shows SpinnerLoading component
- Grid is a sibling component that also listens to filter state changes

**Suggested Addition:**
```
**How it works:**
- FilterItems (individual options like "Campaign design") are nested within FilterGroups
- When a FilterItem is tapped, the selection event propagates to FilterSheet
- FilterSheet updates the active filter set and triggers an API call to fetch filtered results
- While loading, a SpinnerLoading component appears (visible through the backdrop)
- The results grid (rendered separately from FilterSheet) updates when data is received

**Acceptance Criteria:**
- [ ] FilterSheet receives selection events from any FilterItem in any FilterGroup
- [ ] FilterSheet maintains the set of active filter values
- [ ] FilterSheet triggers API call when active filters change
- [ ] FilterSheet shows SpinnerLoading component while API call is in progress
```

---

#### US-FS-004: See Only Relevant Filter Options
**Current Issue:**
- "Options that would yield 0 results are hidden" - who calculates this? Client or server?
- "Interdependencies between all active filters" - no explanation of mechanism
- Doesn't explain how FilterItems across different FilterGroups coordinate

**Missing Context:**
- Server/API determines which combinations are valid
- API response includes both results AND available filter options
- FilterSheet receives list of available options and passes to FilterGroups
- FilterGroups hide FilterItems not in the available list

**Suggested Addition:**
```
**How it works:**
- After any filter selection, FilterSheet calls the API with current active filters
- API response includes:
  - Filtered results (for the grid)
  - Available filter options (which combinations would return results)
- FilterSheet distributes available options to each FilterGroup
- FilterGroups hide FilterItems that aren't in the available options list
- This prevents users from selecting combinations that would yield zero results

**Acceptance Criteria:**
- [ ] API returns both results and available filter options on each request
- [ ] FilterSheet receives and distributes available options to FilterGroups
- [ ] FilterGroups compare their items against available options and hide non-matching items
- [ ] Hidden items animate out smoothly (150ms fade)
- [ ] When filters are removed, previously hidden options reappear
```

---

#### US-FS-005: Clear All Filters Quickly
**Current Issue:**
- "All FilterItems return to inactive state" - doesn't explain how this coordination happens across components
- Doesn't specify who manages the "Clear all" button

**Missing Context:**
- FilterSheet header contains the "Clear all" button
- Clicking it resets FilterSheet's active filter set to empty
- All FilterGroups and nested FilterItems receive updated props and re-render
- Requires API call to fetch unfiltered results and full option set

**Suggested Addition:**
```
**How it works:**
- "Clear all" button is part of FilterSheet's header
- When clicked, FilterSheet resets its active filter set to empty
- FilterSheet calls API with no filters to get all results and all available options
- All FilterGroups receive empty active filter set and full available options
- All FilterItems receive isActive=false and become visible

**Acceptance Criteria:**
- [ ] FilterSheet header contains "Clear all" button
- [ ] Clicking "Clear all" resets FilterSheet's active filter state to empty
- [ ] FilterSheet triggers API call to fetch unfiltered results
- [ ] All FilterGroups receive updated props (empty active filters, full options)
- [ ] All FilterItems automatically show inactive state (no manual coordination needed)
```

---

#### US-FS-007: See Content Update Behind Sheet
**Current Issue:**
- "Grid updates are visible in real-time" - doesn't explain that grid is NOT a child of FilterSheet
- Architectural relationship is unclear

**Missing Context:**
- Grid and FilterSheet are sibling components, not parent-child
- Both listen to same global filter state
- FilterSheet has semi-transparent backdrop allowing grid visibility
- Grid updates independently when filter state changes

**Suggested Addition:**
```
**How it works:**
- FilterSheet and the results grid are separate, sibling components
- Both consume the same global filter state (e.g., via Context API or Redux)
- When FilterSheet updates active filters, the grid also receives those updates
- FilterSheet's backdrop is semi-transparent (rgba), allowing users to see the grid behind it
- This creates the illusion of "real-time preview" without tight coupling

**Acceptance Criteria:**
- [ ] FilterSheet and grid are independent components sharing global state
- [ ] Backdrop opacity is ~40% (allows grid visibility)
- [ ] Grid automatically updates when filter state changes (no direct communication with FilterSheet)
- [ ] Visual hierarchy: Grid (z-index: 1) → Backdrop (z-index: 100) → FilterSheet (z-index: 101)
```

---

## FilterBar User Stories

### ✅ Good: Self-Contained Stories
- **US-FB-001:** View All Filter Categories at Once - Clear layout description
- **US-FB-007:** Efficient Keyboard Navigation - Clear interaction pattern

### ⚠️ Needs Context: Missing Relationship Details

#### US-FB-002: Select Multiple Filters Across Categories
**Current Issue:**
- "Selections across different categories combine with AND logic" - doesn't explain where this logic lives

**Missing Context:**
- FilterBar doesn't implement AND logic itself
- The API/backend combines filters with AND when fetching results
- FilterBar just collects selected values and passes to API

**Suggested Addition:**
```
**How it works:**
- FilterBar contains multiple FilterGroup components (one per category)
- Each FilterGroup contains FilterItem components (individual options)
- When any FilterItem is clicked, event propagates: FilterItem → FilterGroup → FilterBar
- FilterBar maintains a set of all active filter values (across all categories)
- FilterBar sends all active filters to API, which applies AND logic
- Example: {"expertises": ["campaign-design"], "creativeLenses": ["non-profit"]}
  means "show projects that are BOTH campaign-design AND non-profit"

**Acceptance Criteria:**
- [ ] FilterBar maintains single set of active filters (no distinction by category for AND logic)
- [ ] API receives all active filter values and applies AND between them
- [ ] FilterBar receives and displays results matching ALL selected filters
```

---

#### US-FB-003: See Real-Time Result Updates
**Current Issue:**
- Doesn't explain relationship between FilterBar and grid
- "Grid below FilterBar" suggests parent-child but they may be siblings

**Missing Context:**
- Similar to FilterSheet, grid and FilterBar are likely siblings
- Both consume shared state
- FilterBar triggers updates, grid renders them

**Suggested Addition:**
```
**How it works:**
- FilterBar and results grid share global filter state
- When a FilterItem is clicked:
  1. Event propagates to FilterBar
  2. FilterBar updates global state (active filters)
  3. FilterBar triggers API call (sets isLoading = true)
  4. SpinnerLoading component appears
  5. API responds with results and available options
  6. Grid receives new results and re-renders
  7. FilterBar receives available options and hides zero-result filters
  8. isLoading = false, SpinnerLoading disappears

**Acceptance Criteria:**
- [ ] FilterBar and grid are coordinated via shared state (not direct parent-child)
- [ ] FilterBar triggers updates by modifying shared filter state
- [ ] Grid automatically re-renders when state changes
- [ ] URL parameters also update to reflect active filters (for bookmarking/sharing)
```

---

#### US-FB-004: Avoid Zero-Result Filter Combinations
**Current Issue:**
- Same issue as US-FS-004 - mechanism not explained

**Suggested Addition:**
```
**How it works:**
- After each filter selection, API returns:
  - Filtered results
  - Available filter options (valid combinations)
- FilterBar distributes available options to each FilterGroup
- FilterGroups hide FilterItems not in the available list
- This is server-driven logic (backend calculates valid combinations)

**Acceptance Criteria:**
- [ ] API endpoint returns both results and availableOptions
- [ ] FilterBar passes availableOptions to each FilterGroup
- [ ] FilterGroups filter their items: only render if in availableOptions
- [ ] Hidden items fade out (150ms), visible items fade in
```

---

#### US-FB-005: Clear All Filters with One Click
**Current Issue:**
- Same coordination questions as US-FS-005

**Suggested Addition:**
```
**How it works:**
- "Clear all" button is part of FilterBar (typically top-right corner)
- Clicking resets FilterBar's active filter set to empty
- FilterBar calls API with no filters
- All FilterGroups receive props: activeFilters={}, availableOptions={all options}
- All FilterItems automatically show inactive state

**Acceptance Criteria:**
- [ ] FilterBar owns and renders "Clear all" button
- [ ] Button click handler resets active filter state
- [ ] All FilterGroups re-render with empty active filters
- [ ] No FilterItem needs direct notification (props-driven re-render)
```

---

## FilterGroup User Stories

### ✅ Good: Self-Contained Stories
- **US-FG-001:** Display Filter Category with Clear Label - Clear, standalone
- **US-FG-004:** Visual Separation Between Categories - Clear visual requirement

### ⚠️ Needs Context: Missing Relationship Details

#### US-FG-002: Toggle Category Visibility (Accordion Mode)
**Current Issue:**
- Doesn't explain that accordion state is managed by FilterSheet parent
- Says "tapping header toggles" but doesn't clarify the state ownership

**Missing Context:**
- FilterSheet owns which group is expanded
- FilterGroup receives isExpanded prop
- FilterGroup calls onToggleExpand callback
- FilterSheet decides which other groups to collapse

**Suggested Addition:**
```
**How it works:**
- FilterGroup receives two props from FilterSheet:
  - isExpanded: boolean (is this group currently expanded?)
  - onToggleExpand: callback function
- When header is tapped, FilterGroup calls onToggleExpand()
- FilterSheet receives the callback and updates its accordion state
- FilterSheet ensures only one FilterGroup has isExpanded=true
- All FilterGroups re-render with updated isExpanded props

**Acceptance Criteria:**
- [ ] FilterGroup is a controlled component (doesn't own its expanded state)
- [ ] FilterGroup receives isExpanded prop from parent
- [ ] Tapping header calls onToggleExpand callback
- [ ] Parent (FilterSheet) manages which group is expanded
```

---

#### US-FG-003: Show All Options (Desktop Column Mode)
**Current Issue:**
- Doesn't explain that this is the same component in different context
- Lacks clarity on how desktop vs mobile mode is determined

**Missing Context:**
- FilterGroup is reusable in both FilterBar and FilterSheet
- Mode is determined by props (isAccordion boolean)
- Same component, different configuration

**Suggested Addition:**
```
**How it works:**
- FilterGroup is used in both FilterBar (desktop) and FilterSheet (mobile)
- Parent passes isAccordion prop:
  - FilterSheet passes isAccordion=true → shows toggle icon, collapsible
  - FilterBar passes isAccordion=false → no toggle, always expanded
- Same component code, different behavior based on props

**Acceptance Criteria:**
- [ ] FilterGroup receives isAccordion prop from parent
- [ ] If isAccordion=false: no toggle icon, all items always visible
- [ ] If isAccordion=true: toggle icon shown, expand/collapse enabled
- [ ] Component doesn't know its context (mobile vs desktop), just responds to props
```

---

#### US-FG-007: Support Dynamic Option Hiding
**Current Issue:**
- Doesn't explain how FilterGroup knows which items to hide
- Missing data flow from API → parent → FilterGroup

**Missing Context:**
- FilterGroup receives availableOptions prop from parent
- Compares its items against availableOptions
- Only renders items in the available list

**Suggested Addition:**
```
**How it works:**
- FilterGroup receives two arrays from parent:
  - items: all possible filter options for this category
  - availableOptions: subset of items that should be visible (based on API response)
- FilterGroup filters items.filter(item => availableOptions.includes(item.value))
- Renders only the filtered items
- Uses CSS transitions for smooth fade in/out

**Acceptance Criteria:**
- [ ] FilterGroup receives availableOptions prop (list of values to show)
- [ ] FilterGroup filters items: only renders if value in availableOptions
- [ ] When availableOptions changes, items animate in/out (150ms fade)
- [ ] If availableOptions is empty, shows "(No options available)" placeholder
```

---

## FilterItem User Stories

### ⚠️ Needs Context: All Stories Have Issues

#### US-FI-001: Select a Filter Option
**Current Issue:**
- "Selection triggers parent grid update" - grid is not the parent
- Doesn't explain event propagation chain

**Missing Context:**
- FilterItem calls onToggle callback with its value
- Event bubbles: FilterItem → FilterGroup → FilterBar/FilterSheet
- Ancestor manages state and API calls
- Grid is sibling that responds to state changes

**Suggested Addition:**
```
**How it works:**
- FilterItem is a controlled component (doesn't manage its own selection state)
- When clicked, FilterItem calls onToggle(value) callback (provided by parent FilterGroup)
- Event chain: FilterItem.onToggle → FilterGroup → FilterBar/FilterSheet
- FilterBar/FilterSheet updates global active filter set
- FilterBar/FilterSheet triggers API call
- Results grid (a sibling component) updates when state changes

**Acceptance Criteria:**
- [ ] FilterItem receives onToggle callback prop from parent
- [ ] Click handler calls onToggle(this.value)
- [ ] FilterItem doesn't manage selection state (receives isActive prop)
- [ ] Visual transition happens immediately (optimistic UI update)
- [ ] Parent components handle actual state management and API calls
```

---

#### US-FI-002: Identify Active vs Inactive State
**Current Issue:**
- Doesn't explain how active state is determined
- Seems like local state, but it's actually derived from global state

**Missing Context:**
- FilterItem receives isActive prop (boolean)
- Parent calculates: isActive = activeFilters.has(this.value)
- FilterItem just renders based on prop

**Suggested Addition:**
```
**How it works:**
- FilterItem is a "dumb" presentational component
- It receives isActive prop from parent (FilterGroup)
- Parent determines isActive by checking if FilterItem's value is in global active filter set
- Example: isActive = activeFilters.includes("campaign-design")
- FilterItem renders icon and styling based on isActive prop

**Acceptance Criteria:**
- [ ] FilterItem receives isActive: boolean prop
- [ ] FilterItem doesn't compute its own active state
- [ ] If isActive=true: shows X icon or checkmark, applies active styling
- [ ] If isActive=false: no icon, default styling
- [ ] State changes when parent passes new isActive value
```

---

#### US-FI-003: Deselect an Active Filter
**Current Issue:**
- "Grid updates to reflect removal" - unclear mechanism

**Suggested Addition:**
```
**How it works:**
- When an active FilterItem is clicked, same onToggle(value) is called
- Parent (FilterBar/FilterSheet) receives the value
- Parent checks: if value in activeFilters, remove it; else add it (toggle logic)
- Parent triggers API call with updated filter set
- FilterItem receives new isActive=false prop and re-renders

**Acceptance Criteria:**
- [ ] Clicking active FilterItem calls same onToggle callback
- [ ] Parent implements toggle logic (add if not present, remove if present)
- [ ] FilterItem receives updated isActive=false prop
- [ ] Visual state updates automatically (icon removed, styling reverted)
```

---

## SpinnerLoading User Stories

### ✅ Good: Mostly Self-Contained
SpinnerLoading stories are generally clear because it's a simple, passive component.

### ⚠️ Minor Improvement Needed

#### US-SL-004: Identify Loading Location
**Current Issue:**
- "Positioned near or within the updating content area" - doesn't explain who positions it

**Missing Context:**
- Parent component (FilterBar or FilterSheet) renders and positions SpinnerLoading
- SpinnerLoading itself doesn't have positioning logic

**Suggested Addition:**
```
**How it works:**
- SpinnerLoading is rendered by parent component (FilterBar or FilterSheet)
- Parent decides placement based on layout:
  - FilterBar (desktop): May overlay grid or appear inline with filters
  - FilterSheet (mobile): Appears on grid (visible through backdrop)
- SpinnerLoading receives isVisible prop, has no positioning logic

**Acceptance Criteria:**
- [ ] Parent component renders SpinnerLoading in desired location
- [ ] SpinnerLoading doesn't self-position (no absolute/fixed positioning logic)
- [ ] Positioning is consistent within each context (mobile vs desktop)
```

---

## Summary of Issues

### Critical Context Missing Across All Components:

1. **State Ownership:**
   - User stories don't clarify who owns what state
   - Not clear that most components are "controlled" (stateless for business logic)
   - Missing explanation of global state (activeFilters, availableOptions, isLoading)

2. **Data Flow:**
   - Event propagation (bottom-up) not explained
   - Props distribution (top-down) not explained
   - API call triggers and response handling unclear

3. **Component Relationships:**
   - Parent-child relationships mentioned but not explained
   - Sibling relationships (FilterBar/FilterSheet and Grid) not mentioned
   - Containment hierarchy unclear (FilterSheet → FilterGroup → FilterItem)

4. **Coordination Mechanisms:**
   - Zero-result hiding: server-driven vs client-driven unclear
   - "Clear all": how it reaches all descendants not explained
   - Accordion: state ownership not clarified

5. **Architectural Patterns:**
   - Controlled vs uncontrolled components not distinguished
   - Props vs callbacks not clearly separated
   - Global state vs local UI state not differentiated

---

## Recommendations

### Option 1: Add "How It Works" Section to Each Story
Add a brief explanation before acceptance criteria:
```
### US-XX-YY: Story Title
**As a** ...
**I want to** ...
**So that** ...

**How it works:**
[2-3 sentences explaining data flow, state ownership, and relationships]

**Acceptance Criteria:**
- [ ] ...
```

### Option 2: Add Component Context Section at Top of Each File
Before the first user story:
```
## Component Context

**Role:** [Orchestrator / List Manager / Presentational Component]
**Parent Component(s):** [List parents]
**Child Component(s):** [List children]
**State Ownership:** [What state this component owns vs receives]
**Key Relationships:** [Brief description of critical interactions]
```

### Option 3: Enhance Acceptance Criteria with Relationship Details
Add specific criteria about data flow:
```
**Acceptance Criteria:**
- [ ] Functional: Clicking toggles state
- [ ] Relationship: FilterItem calls onToggle callback provided by parent
- [ ] Data Flow: Event propagates to FilterBar/FilterSheet
- [ ] State: FilterItem receives isActive prop (doesn't own selection state)
```

### Recommendation: Combination Approach
Use Option 1 (How It Works) + Option 2 (Component Context) for best clarity:
- Component Context section provides high-level orientation
- "How It Works" in each story provides specific flow for that story
- Acceptance criteria remain focused on testable outcomes

---

## Priority for Updates

### High Priority (Critical for Implementation):
1. FilterSheet US-003, US-004, US-005 (core interaction flows)
2. FilterBar US-002, US-003, US-004 (desktop equivalent)
3. FilterGroup US-002, US-003, US-007 (coordination mechanisms)
4. FilterItem US-001, US-002, US-003 (state management clarity)

### Medium Priority (Helpful but Inferrable):
1. FilterSheet US-002 (accordion mechanism)
2. FilterBar US-005 (clear all coordination)
3. FilterGroup US-001 (basic structure)

### Low Priority (Already Fairly Clear):
1. All accessibility stories
2. Visual/styling stories
3. SpinnerLoading stories

---

## Next Steps

1. Review this analysis with stakeholders
2. Decide on approach (How It Works sections vs Component Context vs Enhanced Criteria)
3. Update user stories in priority order
4. Re-review for completeness
5. Validate with potential implementer (can they build from stories alone?)
