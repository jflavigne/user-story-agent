# SpinnerLoading Component

## Overview
**Type:** Atom
**Purpose:** Visual loading feedback indicator
**Pattern:** Animated spinner for asynchronous operations

Provides visual feedback when the grid is updating based on filter changes. A simple, universally recognized loading indicator that communicates to users that an operation is in progress.

![SpinnerLoading Component](./images/SpinnerLoading.png)

---

## User Stories

### US-SL-001: See Loading Feedback During Grid Updates
**As a** user applying filters
**I want to** see a loading indicator when results are updating
**So that** I know the system is processing my request

**Acceptance Criteria:**
- [ ] Spinner appears immediately when filter selection changes
- [ ] Spinner is visible and prominent (not subtle)
- [ ] Spinner animates continuously (rotating or pulsing)
- [ ] Spinner disappears when grid update completes
- [ ] Delay before showing spinner: 0ms (immediate)

---

### US-SL-002: Understand System is Responsive
**As a** user waiting for results
**I want to** see continuous animation
**So that** I know the system hasn't frozen

**Acceptance Criteria:**
- [ ] Animation is smooth and continuous
- [ ] Frame rate: Minimum 30fps (preferably 60fps)
- [ ] No stuttering or lag in animation
- [ ] Animation continues until operation completes
- [ ] Uses CSS animation or requestAnimationFrame for smoothness

---

### US-SL-003: Not Be Distracted by Loading State
**As a** user experiencing fast updates
**I want to** see the spinner only for operations that take time
**So that** I'm not distracted by flashing indicators

**Acceptance Criteria:**
- [ ] Spinner shows immediately (no delay) when operation starts
- [ ] If operation completes within 200ms, spinner still shows briefly
- [ ] Minimum display time: 300ms (prevents flashing)
- [ ] Smooth fade-out when operation completes
- [ ] Fade-out duration: 150ms

---

### US-SL-004: Identify Loading Location
**As a** user with multiple interactive areas
**I want to** see the spinner near the content being updated
**So that** I understand what is loading

**Acceptance Criteria:**
- [ ] Spinner positioned near or within the updating content area
- [ ] Common positions: Center of grid, inline with filters, or overlay
- [ ] Position is consistent across all loading states
- [ ] Spinner doesn't cause layout shift when appearing/disappearing
- [ ] If overlay: Semi-transparent background to maintain context

---

### US-SL-005: Accessible Loading State for Screen Readers
**As a** screen reader user
**I want to** be informed when content is loading
**So that** I don't attempt to interact with updating content

**Acceptance Criteria:**
- [ ] ARIA live region announces loading state
- [ ] Announcement: "Loading results" or similar
- [ ] aria-live="polite" to avoid interrupting current reading
- [ ] aria-busy="true" on parent container during loading
- [ ] Completion announcement: "Results loaded" or similar

---

### US-SL-006: Recognize Universal Loading Pattern
**As a** user familiar with web interfaces
**I want to** see a recognizable loading pattern
**So that** I immediately understand what it means

**Acceptance Criteria:**
- [ ] Uses universal loading pattern (circular spinner, dots, or bars)
- [ ] Animation direction: Clockwise rotation (standard convention)
- [ ] Size: Large enough to see (minimum 32px), not overwhelming
- [ ] Style consistent with application design system
- [ ] Color matches brand or uses neutral gray

---

## Technical Requirements

### Component Structure
```
SpinnerLoading
└── SVG or CSS Spinner Element
    └── Rotating Circle, Dots, or Arc
```

### Props/Configuration
- `size`: number (default: 64px, options: 32px, 48px, 64px)
- `color`: string (default: accent color or neutral gray)
- `label`: string (for accessibility, default: "Loading")
- `isVisible`: boolean (controls display)

### Animation Types (Choose One)

1. **Circular Spinner (Recommended):**
   - Rotating circle with partial arc
   - Smooth 360° rotation
   - Duration: 1s infinite

2. **Pulsing Dots:**
   - 3 dots fading in sequence
   - Duration: 1.2s infinite

3. **Indeterminate Progress:**
   - Sweeping arc or bar
   - Duration: 1.5s infinite

### Behavior Logic
- Appears when `isVisible === true`
- Minimum display time: 300ms (prevents flashing)
- Fade-in: 100ms
- Fade-out: 150ms
- Animation continues throughout entire visibility period

### Performance
- Use CSS transforms (not position properties) for animation
- Use GPU acceleration (will-change: transform)
- Avoid JavaScript-based animation if possible
- Target 60fps animation

### Accessibility
- [ ] aria-live="polite" or aria-live="assertive" on container
- [ ] aria-label or sr-only text: "Loading results"
- [ ] aria-busy="true" on parent content container
- [ ] role="status" or role="alert" depending on urgency
- [ ] Focusable: No (spinner should not receive focus)
- [ ] Visual focus: No (decorative element)

---

## Design Specifications

### Sizing
- Small: 32px × 32px (inline indicators)
- Medium: 48px × 48px (default)
- Large: 64px × 64px (full-page loading)

### Spacing
- Margin: 16px on all sides (when standalone)
- If overlay: Centered vertically and horizontally

### Colors
- Primary: Accent color (#1976D2) or brand color
- Neutral: Medium gray (#757575)
- Background (if overlay): rgba(255, 255, 255, 0.9)

### Animation Timing
- Rotation speed: 1s per full rotation
- Easing: linear (constant speed)
- Fade-in: 100ms ease-out
- Fade-out: 150ms ease-in

### Visual Style
**Option 1: Circular Arc Spinner**
- Circle stroke width: 4px
- Arc length: 75% of circle (270°)
- Rotation: Continuous clockwise

**Option 2: Dot Pulse**
- 3 dots, 8px diameter each
- Spacing: 8px between dots
- Opacity animation: 0.2 → 1.0 → 0.2

**Option 3: Material Design Style**
- Circular with indeterminate arc
- Arc length animates between 30° and 300°
- Rotation and arc length both animated

---

## Placement Patterns

### 1. Inline with Content
```
+---------------------------+
|  [Filters Applied]        |
+---------------------------+
|                           |
|    ⟳ SpinnerLoading      |
|                           |
|  (Grid updates here)      |
+---------------------------+
```

### 2. Overlay on Grid
```
+---------------------------+
|  [Filters Applied]        |
+---------------------------+
| ┌─────────────────────┐   |
| │  (Blurred Grid)     │   |
| │                     │   |
| │      ⟳ Loading     │   |
| │                     │   |
| └─────────────────────┘   |
+---------------------------+
```

### 3. Next to Active Filter
```
+---------------------------+
| [X] Campaign Design  ⟳   |
| [ ] Digital Product       |
+---------------------------+
```

---

## Related Components
- **FilterSheet** (shows spinner during mobile grid updates)
- **FilterBar** (shows spinner during desktop grid updates)
- **FilterItem** (may trigger spinner on selection)

---

## Variants

### Small (32px)
- Use: Inline with filter text or buttons
- Context: Indicates local loading

### Medium (48px)
- Use: Default size for grid loading
- Context: Primary loading indicator

### Large (64px)
- Use: Full-page or major section loading
- Context: Initial page load or major operations

---

## Implementation Examples

### CSS-Only Spinner
```css
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1976D2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### SVG Spinner
```html
<svg class="spinner" viewBox="0 0 50 50">
  <circle
    cx="25" cy="25" r="20"
    fill="none"
    stroke="#1976D2"
    stroke-width="4"
    stroke-dasharray="90, 150"
    stroke-linecap="round">
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 25 25"
      to="360 25 25"
      dur="1s"
      repeatCount="indefinite"/>
  </circle>
</svg>
```

---

## Notes
- SpinnerLoading is a universal pattern - users immediately recognize it as "loading"
- Keep the design simple and consistent with the application's design system
- Avoid over-engineering: A simple CSS spinner is often sufficient
- Always provide ARIA attributes for accessibility
- Consider using a library like `react-spinners` or similar for consistent implementation
- Test animation performance on low-end devices
- Minimum display time prevents jarring flashing for fast operations
