---
description: Enhance user stories with responsive web design requirements (web, mobile-web, desktop)
allowed-tools: [read, write, search_replace]
---

# /user-story/responsive-web - Responsive Web Requirements Iteration

## Purpose

Enhance an existing user story by analyzing responsive web design requirements for web applications. This iteration adds acceptance criteria for navigation behavior changes, touch vs click interactions, content reflow, feature availability by device type, and input method differences.

**Platform Note:** This iteration applies to `web`, `mobile-web`, and `desktop` product types. For native mobile apps, use `/user-story/responsive-native` instead.

## Usage

```
/user-story/responsive-web [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/responsive-web stories/product-catalog.md
/user-story/responsive-web tickets/USA-7.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Responsive Web Iteration Prompt

Analyze the user story using the following prompt:

```
Analyze the mockup or design to identify responsive web requirements and how users experience functional behaviors across different screen sizes (mobile, tablet, desktop).

## Navigation Behavior Across Breakpoints

1. **Mobile Navigation**: Identify navigation behavior on mobile devices:
   - How do users access the main navigation menu (hamburger menu, bottom nav, tabs)?
   - What happens when users tap the menu icon or navigation trigger?
   - How do users navigate between sections on small screens?
   - What navigation elements are always visible vs. hidden behind menus?
   - How do users understand where they are in the navigation hierarchy?

2. **Tablet Navigation**: Document navigation behavior on tablet-sized screens:
   - How does navigation differ from mobile (more items visible, different layout)?
   - Are there navigation elements that appear on tablet but not mobile?
   - How do users access secondary navigation or submenus?
   - What navigation patterns work best for tablet-sized screens?

3. **Desktop Navigation**: Determine navigation behavior on desktop screens:
   - How is the full navigation menu presented (horizontal bar, sidebar, mega menu)?
   - What navigation elements are always visible without clicking?
   - How do users access dropdown menus or subnavigation?
   - What navigation shortcuts or quick access features are available?

4. **Navigation Transitions**: Identify how navigation changes between breakpoints:
   - How do users experience navigation when resizing their browser window?
   - What happens to navigation state when switching between mobile and desktop views?
   - Are there navigation elements that persist across all screen sizes?
   - How do users maintain their place in navigation when screen size changes?

## Touch vs Click Interactions

5. **Touch Target Sizes**: Identify touch interaction requirements:
   - What minimum sizes are needed for buttons and interactive elements on touch devices?
   - How do users tap buttons, links, and controls on mobile devices?
   - Are there interactive elements that are too small for comfortable touch interaction?
   - What spacing is needed between touch targets to prevent accidental taps?

6. **Interaction Feedback**: Document feedback for touch interactions:
   - How do users know their touch was registered (visual feedback, haptics)?
   - What happens when users tap buttons or links on touch devices?
   - How are hover states handled on touch devices (do they work, are they replaced)?
   - What feedback indicates interactive elements are tappable?

7. **Click vs Tap Behavior**: Determine differences between click and tap:
   - Are there interactions that work differently on touch vs. mouse devices?
   - How do right-click or long-press interactions work on touch devices?
   - What context menus or secondary actions are available on different input methods?
   - How do users access features that typically require hover on desktop?

8. **Gesture Support**: Identify gesture-based interactions:
   - What swipe gestures are used for navigation or actions?
   - How do users scroll, zoom, or pan content on touch devices?
   - Are there pinch-to-zoom or other multi-touch gestures needed?
   - How are gestures communicated to users (hints, tutorials, discoverability)?

## Content Reflow and Layout Behavior

9. **Content Stacking**: Identify how content reflows on smaller screens:
   - How do multi-column layouts stack on mobile devices?
   - What content appears first when scrolling on mobile (priority order)?
   - How do sidebars, panels, or secondary content move on smaller screens?
   - What content is hidden, collapsed, or moved to different locations?

10. **Image and Media Responsiveness**: Document media behavior across breakpoints:
    - How do images scale or crop on different screen sizes?
    - Are different image sizes or crops used for different devices?
    - How do videos or embedded media adapt to screen size?
    - What happens to image galleries or carousels on mobile vs. desktop?

11. **Form Layout Changes**: Determine form behavior across breakpoints:
    - How do multi-column forms stack on mobile devices?
    - Are form fields full-width on mobile or do they maintain multiple columns?
    - How do form labels and inputs align on different screen sizes?
    - What form elements are easier or harder to use on different devices?

12. **Table and Data Display**: Identify data table behavior on small screens:
    - How do wide tables display on mobile (horizontal scroll, stacked cards, simplified view)?
    - What table information is most important to show on small screens?
    - How do users access all table data on mobile devices?
    - Are there alternative views for complex data on smaller screens?

## Feature Availability by Device

13. **Device-Specific Features**: Identify features that vary by device:
    - What features are available on desktop but not mobile (or vice versa)?
    - Are there advanced features hidden on mobile to simplify the experience?
    - How do users access full feature sets on different devices?
    - What device capabilities affect feature availability (camera, GPS, file system)?

14. **Progressive Enhancement**: Document feature availability strategy:
    - What core features work on all devices?
    - What enhanced features are available on larger screens or more capable devices?
    - How do users understand what features are available on their device?
    - Are there clear indicators when features aren't available on a device?

15. **Context-Specific Features**: Determine features based on device context:
    - What features make sense for mobile use cases (location, camera, quick actions)?
    - What features are better suited for desktop (complex forms, data entry, multi-tasking)?
    - How do user needs differ by device type and context?
    - What features adapt based on device capabilities?

## Input Method Differences

16. **Keyboard Input**: Identify keyboard-related behaviors:
    - How do virtual keyboards affect form layout and input fields on mobile?
    - What input types trigger appropriate keyboards (email, number, tel)?
    - How do users navigate forms efficiently on mobile with virtual keyboards?
    - What happens to page layout when virtual keyboards appear?

17. **Mouse vs Touch Input**: Document input method differences:
    - How do hover states and tooltips work on touch devices?
    - What interactions require mouse precision vs. touch-friendly alternatives?
    - How do drag-and-drop interactions work on touch devices?
    - What input methods are optimized for each device type?

18. **Input Validation and Feedback**: Determine input feedback across devices:
    - How is input validation communicated on different devices?
    - Are validation messages positioned differently on mobile vs. desktop?
    - How do users correct input errors efficiently on touch devices?
    - What input assistance features are available (autocomplete, suggestions)?

## Breakpoint-Specific Behaviors

19. **Breakpoint Transitions**: Identify behavior at breakpoint boundaries:
    - How do users experience layout changes when crossing breakpoints?
    - Are there smooth transitions or abrupt changes between breakpoints?
    - What happens to user state when layout changes at breakpoints?
    - How do users maintain their place in content when layout shifts?

20. **Orientation Changes**: Document behavior when device orientation changes:
    - How does the layout adapt when users rotate their device?
    - What features or content are optimized for portrait vs. landscape?
    - How do users experience orientation changes (smooth, jarring, helpful)?
    - Are there features that work better in one orientation?

## User Story Implications

21. **Story Requirements**: For each responsive feature, determine:
    - What navigation behaviors are needed at each breakpoint?
    - How do touch and click interactions differ for the feature?
    - How does content reflow affect the user experience?
    - What features are available on which devices?
    - How do input methods affect feature usability?

22. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Navigation behavior across mobile, tablet, and desktop breakpoints
    - Touch target sizes and interaction feedback
    - Content reflow and layout adaptation
    - Feature availability by device type
    - Input method differences and optimizations
    - Breakpoint transitions and orientation handling
    - Functional behaviors users experience, not just visual appearance

## Output

Provide a comprehensive analysis that:
- Identifies navigation behavior changes across breakpoints
- Documents touch vs. click interaction differences
- Explains content reflow and layout behavior
- Describes feature availability by device type
- Maps input method differences to user experience
- Covers breakpoint transitions and orientation handling
- Focuses on functional behaviors users experience, not visual design details
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the responsive web iteration prompt to identify:
   - Navigation behavior across breakpoints
   - Touch vs click interaction requirements
   - Content reflow and layout behavior
   - Feature availability by device
   - Input method differences
3. Add new acceptance criteria for responsive web
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New responsive web acceptance criteria clearly marked with a "### Responsive Design" section
- Notes on breakpoint behaviors and device-specific considerations

---

## Notes

- This iteration applies to web, mobile-web, and desktop product types
- Focus on functional behaviors, not visual appearance
- New criteria should be additive, not replacing existing requirements
- Consider navigation, interactions, content reflow, and feature availability
