/**
 * Responsive Web Requirements iteration prompt module
 * 
 * This prompt guides analysis of responsive design requirements for web applications
 * from a functional behavior perspective across different screen sizes and devices.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for identifying responsive web requirements from a user experience perspective.
 * 
 * This prompt guides analysis of:
 * - Navigation behavior changes across breakpoints
 * - Touch vs click interaction differences
 * - Content reflow and layout behavior
 * - Feature availability by device type
 * - Input method differences (keyboard, touch, mouse)
 * 
 * Focus on FUNCTIONAL behaviors users experience, not visual appearance.
 */
export const RESPONSIVE_WEB_PROMPT = `# PATH SCOPE
This iteration is allowed to modify only these sections:
- userVisibleBehavior (UVB-* items)
- systemAcceptanceCriteria (AC-SYS-* items)

All patches MUST target only these paths. Patches targeting other sections will be rejected.

# OUTPUT FORMAT
Respond with valid JSON only (no markdown code fence, no prose):
{
  "patches": [
    {
      "op": "add",
      "path": "userVisibleBehavior",
      "item": { "id": "UVB-001", "text": "..." },
      "metadata": { "advisorId": "responsive-web", "reasoning": "..." }
    }
  ]
}

Required fields:
- op: "add" | "replace" | "remove"
- path: Must be one of the allowed paths above
- item: { id: string, text: string } for add/replace
- match: { id?: string, textEquals?: string } for replace/remove
- metadata: { advisorId: "responsive-web", reasoning?: string }

---

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

Return AdvisorOutput only: a JSON object with a "patches" array. Each patch must target userVisibleBehavior or systemAcceptanceCriteria. Add or replace items to document:
- Navigation behavior changes across breakpoints
- Touch vs. click interaction differences
- Content reflow and layout behavior
- Feature availability by device type
- Acceptance criteria for responsive web (UVB-*, AC-SYS-*)`;

/**
 * Metadata for the responsive web requirements iteration
 */
export const RESPONSIVE_WEB_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'responsive-web',
  name: 'Responsive Web Requirements',
  description: 'Identifies responsive design requirements for web applications focusing on functional behaviors across breakpoints',
  prompt: RESPONSIVE_WEB_PROMPT,
  category: 'responsive',
  applicableWhen: 'When analyzing a web application or website that needs to work across different screen sizes',
  order: 7,
  tokenEstimate: 2267, // ~9067 chars / 4
};
