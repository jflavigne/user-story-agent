# Component Relationships & Interaction Patterns

This document describes how the 5 filter system components interact with each other, including data flow, state management, event propagation, and coordination patterns.

---

## Component Hierarchy & Ownership

```
┌─────────────────────────────────────────────────────────┐
│ Application State (Global)                              │
│ - activeFilters: Set<string>                            │
│ - availableFilterOptions: Map<category, Set<option>>   │
│ - isLoading: boolean                                     │
└─────────────────────────────────────────────────────────┘
                           │
                           │ consumes & updates
                           ▼
        ┌──────────────────────────────────┐
        │  FilterBar (Desktop)              │  Manages layout, "Clear all"
        │  OR                                │  Coordinates FilterGroups
        │  FilterSheet (Mobile)             │  Shows/hides SpinnerLoading
        └──────────────────────────────────┘
                           │
                           │ renders multiple
                           ▼
        ┌──────────────────────────────────┐
        │  FilterGroup (Molecule)           │  Groups by category
        │  - category: "Expertises"         │  Manages expand/collapse (mobile)
        │  - items: FilterItemData[]        │  Filters visible items
        └──────────────────────────────────┘
                           │
                           │ renders multiple
                           ▼
        ┌──────────────────────────────────┐
        │  FilterItem (Atom)                │  Individual option
        │  - label: "Campaign design"       │  Handles click interaction
        │  - value: "campaign-design"       │  Displays active state
        │  - isActive: boolean               │
        └──────────────────────────────────┘

        ┌──────────────────────────────────┐
        │  SpinnerLoading (Atom)            │  Shows during async operations
        │  - isVisible: isLoading           │  Positioned by parent
        └──────────────────────────────────┘
```

---

## Data Flow Patterns

### 1. Filter Selection Flow (Bottom-Up)

**User Action → State Update → Re-render**

```
User clicks FilterItem
        │
        ▼
FilterItem.onClick(value)
        │
        ▼
FilterGroup.onItemToggle(value) [optional middleware]
        │
        ▼
FilterBar/FilterSheet.handleFilterToggle(value)
        │
        ▼
Update Global State: activeFilters.toggle(value)
        │
        ├─► Trigger API call: fetchFilteredResults(activeFilters)
        │   │
        │   ├─► Set isLoading = true
        │   │   └─► SpinnerLoading shows
        │   │
        │   └─► Response received
        │       ├─► Update availableFilterOptions (zero-result hiding)
        │       └─► Set isLoading = false
        │           └─► SpinnerLoading hides
        │
        └─► Re-render component tree
            ├─► FilterBar/FilterSheet passes new activeFilters down
            ├─► FilterGroups receive updated availableFilterOptions
            └─► FilterItems update isActive state
```

### 2. State Distribution Flow (Top-Down)

**Global State → Props → Component Rendering**

```
Global State {
  activeFilters: ["campaign-design", "non-profit"]
  availableFilterOptions: {
    expertises: ["campaign-design", "digital-product", ...],
    creativeLenses: ["non-profit", "out-of-box", ...]
  }
  isLoading: false
}
        │
        ▼
FilterBar/FilterSheet receives state
        │
        ├─► Passes activeFilters to all FilterGroups
        ├─► Passes availableFilterOptions[category] to each FilterGroup
        └─► Passes isLoading to SpinnerLoading
                │
                ▼
        FilterGroup receives:
        - category: "Expertises"
        - activeFilters: ["campaign-design"]
        - availableOptions: ["campaign-design", "digital-product", ...]
        - onFilterToggle: callback
                │
                ├─► Filters items to show only availableOptions
                ├─► Maps items to FilterItem components
                └─► Passes isActive state to each FilterItem
                        │
                        ▼
                FilterItem receives:
                - label: "Campaign & content design"
                - value: "campaign-design"
                - isActive: true (because value in activeFilters)
                - onToggle: callback
```

---

## Component Interactions

### FilterBar/FilterSheet ↔ FilterGroup

**FilterBar/FilterSheet is the orchestrator** that coordinates multiple FilterGroups.

#### Props Passed Down (FilterBar/FilterSheet → FilterGroup)

```typescript
interface FilterGroupProps {
  category: string;                    // "Expertises", "Creative Lenses"
  items: FilterItemData[];             // All possible items in this category
  activeFilters: Set<string>;          // Which values are currently selected
  availableOptions: Set<string>;       // Which options should be visible (zero-result hiding)
  onFilterToggle: (value: string) => void; // Callback when item is toggled
  isAccordion: boolean;                // Mobile vs desktop mode
  isExpanded?: boolean;                // Accordion state (mobile only)
  onToggleExpand?: () => void;         // Accordion toggle callback (mobile only)
}
```

#### Events Bubbled Up (FilterGroup → FilterBar/FilterSheet)

```typescript
// User clicks a FilterItem
onFilterToggle("campaign-design")

// User expands/collapses accordion (mobile only)
onToggleExpand() // FilterSheet decides which group to collapse
```

#### Responsibilities

**FilterBar/FilterSheet:**
- Manages global "Clear all" button
- Coordinates which FilterGroup is expanded (mobile accordion)
- Decides when to show SpinnerLoading
- Fetches filtered results from API
- Updates availableFilterOptions based on API response

**FilterGroup:**
- Renders only items in `availableOptions` (hides zero-result items)
- Passes active state to FilterItems
- Manages local UI state (expand/collapse animation)

---

### FilterGroup ↔ FilterItem

**FilterGroup is the list manager** that renders and coordinates FilterItems.

#### Props Passed Down (FilterGroup → FilterItem)

```typescript
interface FilterItemProps {
  label: string;                       // Display text
  value: string;                       // Unique identifier
  isActive: boolean;                   // Is this filter selected?
  onToggle: (value: string) => void;   // Callback when clicked
  isHidden?: boolean;                  // For animation during hide/show
}
```

#### Events Bubbled Up (FilterItem → FilterGroup)

```typescript
// User clicks FilterItem
onToggle("campaign-design")
// → FilterGroup forwards to parent: onFilterToggle("campaign-design")
```

#### Responsibilities

**FilterGroup:**
- Determines which FilterItems to render (filters by `availableOptions`)
- Calculates `isActive` for each item (checks if value in `activeFilters`)
- Animates items in/out when `availableOptions` changes
- Displays "(No options available)" if all items are hidden

**FilterItem:**
- Renders label and icon
- Handles click/keyboard interaction
- Shows visual feedback (hover, focus, active state)
- Calls `onToggle` callback with its value

---

### FilterBar/FilterSheet ↔ SpinnerLoading

**SpinnerLoading is a passive indicator** controlled by parent state.

#### Props Passed Down

```typescript
interface SpinnerLoadingProps {
  isVisible: boolean;  // Tied to global isLoading state
  size?: number;       // Optional size variant
  label?: string;      // Accessibility label
}
```

#### Trigger Conditions

SpinnerLoading becomes visible when:
1. User toggles a FilterItem
2. Parent sets `isLoading = true`
3. API call is initiated (fetchFilteredResults)

SpinnerLoading hides when:
1. API response received
2. Parent sets `isLoading = false`
3. Minimum display time elapsed (300ms to prevent flashing)

#### Positioning

**Desktop (FilterBar):**
- Positioned near the filter controls or overlaying the grid
- Common: Inline with FilterBar or centered on grid area

**Mobile (FilterSheet):**
- Visible through semi-transparent backdrop
- Positioned on the grid behind the sheet
- Shows content updating in real-time

---

## Critical Interaction Patterns

### Pattern 1: Interdependent Filter Logic (Zero-Result Hiding)

**Problem:** When user selects "Non-Profit" in Creative Lenses, some Expertises may yield zero results.

**Solution Flow:**
```
1. User selects "Non-Profit" FilterItem
   └─► onToggle("non-profit") called

2. FilterBar/FilterSheet.handleFilterToggle("non-profit")
   ├─► Update activeFilters: {"non-profit"}
   ├─► Set isLoading = true
   └─► Call API: fetchFilteredResults({"non-profit"})

3. API returns:
   {
     results: [...],
     availableOptions: {
       expertises: ["campaign-design", "digital-product"],  // "architectural-design" hidden
       creativeLenses: ["non-profit", "out-of-box", "social-impact"]
     }
   }

4. FilterBar/FilterSheet updates state:
   └─► Set availableFilterOptions = API response

5. Re-render cascade:
   ├─► FilterGroup (Expertises) receives new availableOptions
   │   └─► Hides "architectural-design" FilterItem (fade out animation)
   │
   └─► FilterGroup (Creative Lenses) receives new availableOptions
       └─► All items still visible
```

**Key Points:**
- **Server-side logic** determines which options are available (prevents client-side computation)
- **FilterBar/FilterSheet** receives and distributes availableOptions
- **FilterGroup** performs the actual hiding/showing of FilterItems
- **Animation** handled by FilterGroup (150ms fade)

---

### Pattern 2: "Clear All" Coordination

**Problem:** "Clear all" button must reset all FilterItems across all FilterGroups.

**Solution Flow:**
```
1. User clicks "Clear all" in FilterBar/FilterSheet
   └─► onClearAll() called

2. FilterBar/FilterSheet.handleClearAll()
   ├─► Reset activeFilters = new Set()
   ├─► Set isLoading = true
   └─► Call API: fetchFilteredResults({})

3. API returns full option set:
   {
     results: [...all results...],
     availableOptions: {
       expertises: [...all expertises...],
       creativeLenses: [...all creative lenses...]
     }
   }

4. Re-render cascade:
   ├─► All FilterGroups receive empty activeFilters
   └─► All FilterGroups receive full availableOptions
       └─► All previously hidden FilterItems reappear (fade in)
           └─► All FilterItems show inactive state (no checkmark)
```

**No Direct Communication Between FilterGroups:**
- FilterGroups don't talk to each other
- They only respond to new props from parent
- Parent (FilterBar/FilterSheet) orchestrates the reset

---

### Pattern 3: Mobile Accordion Coordination

**Problem:** Only one FilterGroup should be expanded at a time on mobile.

**Solution Flow:**
```
1. User taps "Creative Lenses" FilterGroup header
   └─► onToggleExpand("creative-lenses") called

2. FilterSheet.handleToggleExpand("creative-lenses")
   └─► Update local state: expandedGroup = "creative-lenses"

3. Re-render:
   ├─► FilterGroup (Expertises) receives isExpanded = false
   │   └─► Collapses (height: 0, hide items)
   │
   └─► FilterGroup (Creative Lenses) receives isExpanded = true
       └─► Expands (height: auto, show items)
```

**FilterSheet Owns Accordion State:**
- FilterSheet maintains `expandedGroup` state
- Each FilterGroup receives `isExpanded` boolean
- FilterGroups don't know about siblings
- FilterSheet enforces single-expand constraint

---

### Pattern 4: Real-Time Grid Update Visibility (Mobile)

**Problem:** User needs to see grid updating behind FilterSheet while selecting filters.

**Solution Flow:**
```
FilterSheet renders:
├─► Semi-transparent backdrop (rgba(0,0,0,0.4))
├─► FilterSheet content (filters)
│   └─► FilterGroups & FilterItems
│
└─► Grid renders independently below
    ├─► Updates triggered by FilterSheet's filter changes
    └─► SpinnerLoading shows during update
        └─► Visible through semi-transparent backdrop
```

**Key Points:**
- FilterSheet uses CSS `backdrop` or overlay pattern
- Grid is NOT a child of FilterSheet (sibling relationship)
- Both listen to same global state
- z-index layering: Grid (1) → Backdrop (100) → FilterSheet (101)

---

## State Management Architecture

### Option A: Context API (React)

```typescript
// FilterContext.tsx
interface FilterContextValue {
  activeFilters: Set<string>;
  availableFilterOptions: Map<string, Set<string>>;
  isLoading: boolean;
  toggleFilter: (value: string) => Promise<void>;
  clearAllFilters: () => Promise<void>;
}

const FilterContext = createContext<FilterContextValue>(null);

// FilterProvider wraps the app
function FilterProvider({ children }) {
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [availableOptions, setAvailableOptions] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const toggleFilter = async (value: string) => {
    const newFilters = new Set(activeFilters);
    newFilters.has(value) ? newFilters.delete(value) : newFilters.add(value);

    setActiveFilters(newFilters);
    setIsLoading(true);

    const response = await fetchFilteredResults(Array.from(newFilters));
    setAvailableOptions(response.availableOptions);
    setIsLoading(false);
  };

  return (
    <FilterContext.Provider value={{ activeFilters, availableOptions, isLoading, toggleFilter, clearAllFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

// Components consume context
function FilterBar() {
  const { activeFilters, availableOptions, isLoading, toggleFilter, clearAllFilters } = useContext(FilterContext);
  // ...
}
```

### Option B: Redux/Zustand (Global Store)

```typescript
// filterStore.ts
interface FilterState {
  activeFilters: Set<string>;
  availableOptions: Map<string, Set<string>>;
  isLoading: boolean;
}

const useFilterStore = create<FilterState>((set, get) => ({
  activeFilters: new Set(),
  availableOptions: new Map(),
  isLoading: false,

  toggleFilter: async (value: string) => {
    const { activeFilters } = get();
    const newFilters = new Set(activeFilters);
    newFilters.has(value) ? newFilters.delete(value) : newFilters.add(value);

    set({ activeFilters: newFilters, isLoading: true });

    const response = await fetchFilteredResults(Array.from(newFilters));
    set({ availableOptions: response.availableOptions, isLoading: false });
  },

  clearAllFilters: async () => {
    set({ activeFilters: new Set(), isLoading: true });
    const response = await fetchFilteredResults([]);
    set({ availableOptions: response.availableOptions, isLoading: false });
  }
}));
```

### URL Synchronization

```typescript
// Sync filters with URL params for shareable links
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const filtersFromUrl = params.get('filters')?.split(',') || [];
  setActiveFilters(new Set(filtersFromUrl));
}, []);

useEffect(() => {
  const params = new URLSearchParams();
  if (activeFilters.size > 0) {
    params.set('filters', Array.from(activeFilters).join(','));
  }
  window.history.replaceState({}, '', `?${params.toString()}`);
}, [activeFilters]);
```

---

## Timing & Sequencing

### Filter Selection Sequence (with timing)

```
t=0ms:    User clicks FilterItem "Campaign design"
          └─► FilterItem.onClick fires immediately

t=0ms:    FilterItem calls onToggle("campaign-design")
          └─► Event bubbles to FilterGroup

t=0ms:    FilterGroup forwards to FilterBar/FilterSheet
          └─► onFilterToggle("campaign-design") called

t=0ms:    FilterBar/FilterSheet updates state
          ├─► activeFilters.add("campaign-design")
          └─► isLoading = true

t=0ms:    SpinnerLoading appears (immediate)

t=0ms:    API call initiated
          └─► POST /api/filter with body: ["campaign-design"]

t=150ms:  Network latency...

t=150ms:  API response received
          ├─► availableOptions updated
          └─► Grid data updated

t=150ms:  State update triggers re-render
          ├─► isLoading = false
          └─► Components receive new props

t=150ms:  FilterItems update visual state (transition: 150ms)
          └─► "Campaign design" shows checkmark

t=300ms:  SpinnerLoading hides (minimum display time enforced)
          └─► Fade out: 150ms

t=450ms:  All animations complete
```

**Total perceived latency: ~450ms** (API call + animations)

---

## Component Communication Matrix

|  | FilterBar/Sheet | FilterGroup | FilterItem | SpinnerLoading |
|---|---|---|---|---|
| **FilterBar/Sheet** | - | Props ↓<br>Events ↑ | Props ↓↓<br>Events ↑↑ | Props ↓ |
| **FilterGroup** | Events ↑ | - | Props ↓<br>Events ↑ | - |
| **FilterItem** | Events ↑↑ | Events ↑ | - | - |
| **SpinnerLoading** | - | - | - | - |

**Legend:**
- **Props ↓** = Parent passes props to child
- **Events ↑** = Child calls parent callback
- **↓↓** = Grandparent passes props through parent
- **↑↑** = Event bubbles through parent to grandparent
- **-** = No direct communication

---

## Anti-Patterns to Avoid

### ❌ Don't: FilterGroups talk to each other directly
```typescript
// BAD: Direct sibling communication
function FilterGroup({ category, siblings }) {
  const handleToggle = (value) => {
    siblings.forEach(sibling => sibling.updateAvailableOptions());
  };
}
```

**Why:** Creates tight coupling and breaks unidirectional data flow.

**Do instead:** Let parent orchestrate all coordination.

---

### ❌ Don't: FilterItem manages global state
```typescript
// BAD: FilterItem directly updates global state
function FilterItem({ value }) {
  const { toggleFilter } = useFilterStore();
  return <button onClick={() => toggleFilter(value)}>...</button>;
}
```

**Why:** Bypasses parent coordination logic, makes testing harder.

**Do instead:** FilterItem calls parent callback, parent manages state.

---

### ❌ Don't: Multiple sources of truth
```typescript
// BAD: Both local state and global state
const [activeFilters, setActiveFilters] = useState(new Set());
const globalFilters = useFilterStore(state => state.activeFilters);
```

**Why:** State can become inconsistent, causes bugs.

**Do instead:** Single source of truth (global state or lifted state).

---

## Testing Component Interactions

### Integration Test Example: Filter Selection Flow

```typescript
describe('Filter Selection Flow', () => {
  it('updates grid when FilterItem is clicked', async () => {
    // Arrange
    const { getByText, getByRole } = render(<FilterBar />);
    const apiMock = jest.fn().mockResolvedValue({
      results: [...],
      availableOptions: {...}
    });

    // Act
    const filterItem = getByText('Campaign design');
    fireEvent.click(filterItem);

    // Assert
    expect(getByRole('status')).toBeInTheDocument(); // Spinner visible

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(['campaign-design']);
      expect(queryByRole('status')).not.toBeInTheDocument(); // Spinner hidden
    });
  });
});
```

---

## Summary

### Key Relationships

1. **FilterBar/FilterSheet = Orchestrator**
   - Owns global filter state
   - Coordinates all FilterGroups
   - Manages API calls and loading state

2. **FilterGroup = List Manager**
   - Renders FilterItems based on availableOptions
   - Handles visibility and animations
   - Forwards events to parent

3. **FilterItem = Interaction Handler**
   - Handles user clicks/keyboard
   - Displays visual state
   - Calls parent callback

4. **SpinnerLoading = Passive Indicator**
   - No business logic
   - Controlled entirely by parent state

### Data Flow Principles

- **Unidirectional:** Props down, events up
- **Single Source of Truth:** Global state or lifted state in orchestrator
- **No Sibling Communication:** All coordination through parent
- **Server-Driven Logic:** Interdependent filter logic computed server-side

### Coordination Patterns

- **Zero-Result Hiding:** Server returns availableOptions → parent distributes → FilterGroups filter
- **Clear All:** Parent resets state → all children receive empty activeFilters
- **Accordion:** Parent owns expandedGroup state → children receive isExpanded boolean
- **Loading State:** Parent manages isLoading → SpinnerLoading reflects state

---

This architecture ensures components are:
- ✅ Loosely coupled (can be tested independently)
- ✅ Reusable (FilterGroup works in both contexts)
- ✅ Maintainable (clear responsibilities)
- ✅ Predictable (unidirectional data flow)
