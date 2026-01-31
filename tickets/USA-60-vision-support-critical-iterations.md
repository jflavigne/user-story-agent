# USA-60: Add Vision Support to Critical Iterations

**Type**: Feature Enhancement
**Priority**: P1 - CRITICAL
**Status**: Open
**Created**: 2026-01-31
**Parent**: VISION-BENEFITS-ANALYSIS.md
**Depends On**: USA-59 (vision infrastructure)

## Problem

Four critical iterations currently analyze text descriptions but would significantly benefit from vision:

1. **Interactive Elements** - Button types, input decorations, icon meanings, states
2. **Responsive Web** - Layout transformations across breakpoints
3. **Accessibility** - Focus indicators, color contrast, visual relationships
4. **Validation** - Error states, visual indicators, message positioning

These iterations ask the model to "analyze the mockup" but only receive text descriptions, losing visual details that are critical to generating accurate user stories.

## Impact

**Current state (text-only):**
- Button types inferred from labels, not visual hierarchy
- States missing unless explicitly described
- Layout changes described textually (spatial relationships lost)
- Visual feedback patterns incomplete

**Expected with vision:**
- Button importance from visual styling (size, color, position)
- All states visible in mockup variations
- Layout transformations clear from side-by-side views
- Visual indicators directly observed

**Quality improvement:** +20-30% story completeness and accuracy

## Solution

Enable vision support for these 4 iterations, building on USA-59 infrastructure.

### Architecture Changes

**1. Extend iteration execution to accept images**

```typescript
// src/agent/user-story-agent.ts

interface IterationContext {
  story: string;
  systemContext: SystemDiscoveryContext;
  iterationId: IterationId;
  mockupImages?: ImageInput[];  // NEW - pass through from initial input
}

async executeIteration(context: IterationContext): Promise<IterationResult> {
  // Build multi-modal message if images available
  const content: Array<TextBlockParam | ImageBlockParam> = [
    { type: 'text', text: userMessage }
  ];

  // Add images for vision-enabled iterations
  const visionIterations = ['interactive-elements', 'responsive-web', 'accessibility', 'validation'];
  if (context.mockupImages && visionIterations.includes(context.iterationId)) {
    for (const imageInput of context.mockupImages) {
      const imageBlock = await prepareImageForClaude(imageInput);
      content.push(imageBlock);
    }
  }

  const response = await this.claudeClient.sendMessage({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    model: this.resolveModel('iteration'),
  });

  // ... rest unchanged
}
```

**2. Update prompts for vision analysis**

Each iteration prompt needs a vision analysis section.

### Interactive Elements Prompt Updates

```typescript
// src/prompts/iterations/interactive-elements.ts

export const INTERACTIVE_ELEMENTS_PROMPT = `# PATH SCOPE
[... existing path scope ...]

# VISION ANALYSIS (when images provided)

If mockup images are provided, use visual evidence to identify:

1. **Button Types from Visual Styling**:
   - **Primary buttons**: Prominent styling - larger size, bold colors, high contrast
   - **Secondary buttons**: Subtle styling - outlined, muted colors, smaller
   - **Icon buttons**: Icon only, no text label (check for alt text needs)
   - **Text buttons**: Minimal styling, text-only appearance
   - Visual hierarchy indicates importance: primary > secondary > text

2. **Button States** (shown in mockup variations):
   - Default state (normal appearance)
   - Hover state (color change, shadow, scale)
   - Focus state (outline, ring, border)
   - Active/pressed state (inset, darker color)
   - Disabled state (grayed, reduced opacity, no pointer)

3. **Input Field Visual Details**:
   - **Prefix icons**: Icon before input text (search icon, user icon, etc.)
   - **Suffix icons/actions**: Icon after text (show/hide password, clear button)
   - **Visual validation indicators**: Checkmarks (valid), X icons (error), warning icons
   - **Required field markers**: Asterisks, visual badges, color indicators

4. **Link Visual Characteristics**:
   - Underlined vs plain text
   - Color coding (primary blue, danger red, muted gray)
   - Icon accompaniment (external link icon, arrow, chevron)
   - Hover state changes (underline, color shift)

5. **Icon Semantics from Visual Context**:
   - Icon shape/appearance + position + surrounding elements = meaning
   - Example: Trash icon + red color + destructive position = delete action
   - Example: Question mark + info color + help position = help/tooltip trigger

... [rest of existing prompt]
`;
```

### Responsive Web Prompt Updates

```typescript
// src/prompts/iterations/responsive-web.ts

export const RESPONSIVE_WEB_PROMPT = `# PATH SCOPE
[... existing path scope ...]

# VISION ANALYSIS (when images provided)

Mockups often show multiple breakpoints side-by-side (mobile / tablet / desktop). From the images:

1. **Navigation Transformations**:
   - **Desktop**: Observe horizontal navigation bar, visible menu items, dropdown patterns
   - **Tablet**: Identify hybrid patterns (partial collapse, mixed visibility)
   - **Mobile**: See hamburger menu, bottom navigation, slide-out drawer
   - **Transition points**: Note which elements hide/show at each breakpoint

2. **Layout Reflow Patterns**:
   - **Multi-column → Single column**: Desktop 3-col grid becomes mobile stack
   - **Horizontal → Vertical**: Desktop filter bar becomes mobile bottom sheet
   - **Sidebar → Drawer**: Desktop sidebar becomes mobile slide-out
   - **Fixed → Scrolling**: Desktop fixed header becomes mobile sticky/scrolling

3. **Component Adaptations**:
   - **Button sizes**: Desktop smaller (mouse precision) vs mobile larger (touch targets)
   - **Input fields**: Desktop inline labels vs mobile stacked labels
   - **Cards/items**: Desktop 3-4 per row vs mobile 1 per row
   - **Spacing**: Desktop tighter vs mobile more generous (touch ergonomics)

4. **Touch vs Click Indicators**:
   - **Touch targets**: 44x44px minimum on mobile (observe button/link sizes)
   - **Swipe gestures**: Visual affordances (carousel dots, swipe indicators)
   - **Tap areas**: Observe padding, spacing for easy tapping
   - **Hover alternatives**: Mobile tap-to-reveal vs desktop hover

5. **Breakpoint Thresholds** (visible from mockup dimensions):
   - Typical breakpoints: 768px (tablet), 1024px (desktop), 1440px (large desktop)
   - Observe exact widths shown in mockup annotations or visual changes

... [rest of existing prompt]
`;
```

### Accessibility Prompt Updates

```typescript
// src/prompts/iterations/accessibility.ts

export const ACCESSIBILITY_PROMPT = `# PATH SCOPE
[... existing path scope ...]

# VISION ANALYSIS (when images provided)

From the mockup images, identify accessibility requirements through visual analysis:

1. **Focus Indicators** (critical for keyboard navigation):
   - **Outline style**: Solid line, dashed line, double-ring, glow
   - **Color**: Blue, black, high-contrast (visible against all backgrounds)
   - **Width**: 2px minimum for visibility
   - **Offset**: Gap between element and focus ring (prevents clipping)
   - **Persistence**: Focus remains visible on all interactive elements

2. **Color Contrast** (WCAG requirements):
   - **Text contrast**: Measure foreground/background color ratio
     - Normal text: 4.5:1 minimum (WCAG AA)
     - Large text (18pt+): 3:1 minimum
   - **UI component contrast**: 3:1 for interactive elements (buttons, inputs)
   - **Visual-only indicators**: Don't rely on color alone (use icons, patterns)

3. **Icon-Only Buttons** (screen reader requirements):
   - Identify buttons with no visible text label
   - These MUST have aria-label or aria-labelledby
   - Example: X button (Close), magnifying glass (Search), hamburger (Menu)

4. **Visual Grouping for Screen Readers**:
   - **Form field groups**: Visually grouped fields need fieldset/legend
   - **Related content**: Visual sections need ARIA landmarks or headings
   - **Lists**: Visual bullets/numbers should be semantic <ul>/<ol>

5. **Visual Hierarchy for Navigation**:
   - **Heading structure**: Observe heading sizes (h1 > h2 > h3)
   - **Landmarks**: Visual sections (header, nav, main, aside, footer)
   - **Skip links**: Check for "Skip to content" visual indicator

... [rest of existing prompt]
`;
```

### Validation Prompt Updates

```typescript
// src/prompts/iterations/validation.ts

export const VALIDATION_PROMPT = `# PATH SCOPE
[... existing path scope ...]

# VISION ANALYSIS (when images provided)

From mockup images, identify validation patterns through visual observation:

1. **Error State Visual Indicators**:
   - **Border changes**: Red 2px border (vs 1px gray default)
   - **Background color**: Light red tint (#FFF5F5)
   - **Icons**: Error icon (exclamation, X) positioned left/right of field
   - **Icon styling**: Red color, 16-20px size, inline with text
   - **Field highlighting**: Shake animation, glow, or pulse effect

2. **Error Message Presentation**:
   - **Position**: Below field (most common), tooltip, inline, summary at top
   - **Typography**: Smaller than label (12-14px), red color (#D32F2F)
   - **Icons with messages**: Error icon before text (visual pairing)
   - **Persistence**: Always visible vs dismiss-able
   - **Spacing**: 4-8px gap between field and message

3. **Validation Success Indicators**:
   - **Border changes**: Green 1px border
   - **Icons**: Checkmark (success), positioned right side
   - **Icon color**: Green (#4CAF50)
   - **Subtle feedback**: Not as prominent as errors

4. **Multi-State Visualization** (mockups often show all states):
   - **Empty state**: Default styling, placeholder text
   - **Typing state**: Focus indicator, border color change
   - **Error state**: Red border + icon + message
   - **Valid state**: Green border + checkmark
   - **Disabled state**: Gray, reduced opacity

5. **Password Strength Visual Feedback**:
   - **Progress bar**: Width/color indicates strength (red → yellow → green)
   - **Checkmarks/indicators**: Requirements met (✓ 8+ characters, ✓ uppercase, etc.)
   - **Color coding**: Red (weak), yellow (medium), green (strong)
   - **Real-time updates**: Visual changes as user types

6. **Required Field Indicators**:
   - **Asterisk**: Position (after label, before label), color (red, gray)
   - **Visual markers**: Dot, badge, highlight
   - **Consistent styling**: Same pattern across all required fields
   - **Legend**: "* Required" explanation visible

... [rest of existing prompt]
`;
```

## Acceptance Criteria

### Core Functionality
- [ ] All 4 iterations accept mockup images
- [ ] Images are passed through iteration context
- [ ] Vision-enabled prompts guide visual analysis
- [ ] Backward compatible (images optional)

### Vision-Specific Improvements

**Interactive Elements:**
- [ ] Button types identified from visual hierarchy
- [ ] States captured from mockup variations
- [ ] Icon semantics inferred from visual context
- [ ] Input decorations (prefix/suffix icons) documented

**Responsive Web:**
- [ ] Layout transformations observed across breakpoints
- [ ] Navigation changes captured visually
- [ ] Component adaptations documented
- [ ] Touch vs click patterns identified

**Accessibility:**
- [ ] Focus indicators described (style, color, width)
- [ ] Color contrast measured from visuals
- [ ] Icon-only buttons flagged for aria-labels
- [ ] Visual grouping mapped to ARIA relationships

**Validation:**
- [ ] Error states captured (borders, icons, messages)
- [ ] Validation timing inferred from states shown
- [ ] Password strength feedback documented
- [ ] Required field indicators described

### Quality Validation
- [ ] Benchmark: Text-only vs vision-enabled for each iteration
- [ ] Measure: Story completeness improvement (target: +20%)
- [ ] Measure: State/variation capture (target: +80%)
- [ ] Verify: Judge scores improve (fewer rewrites)

## Testing Strategy

### Integration Tests

```typescript
describe('Vision-enabled iterations', () => {
  const mockupImages = [{ path: 'tests/fixtures/mockup-login.png' }];

  it('interactive-elements captures visual button hierarchy', async () => {
    const result = await agent.executeIteration({
      story: baseStory,
      systemContext,
      iterationId: 'interactive-elements',
      mockupImages,
    });

    // Should identify primary vs secondary buttons from visual styling
    expect(result.patches).toContainEqual(
      expect.objectContaining({
        item: expect.objectContaining({
          text: expect.stringContaining('primary')
        })
      })
    );
  });

  it('responsive-web captures layout transformations', async () => {
    const mockups = [
      { path: 'tests/fixtures/mockup-mobile.png' },
      { path: 'tests/fixtures/mockup-desktop.png' }
    ];

    const result = await agent.executeIteration({
      story: baseStory,
      systemContext,
      iterationId: 'responsive-web',
      mockupImages: mockups,
    });

    // Should document navigation transformation
    expect(result.patches.some(p =>
      p.item.text.includes('hamburger') || p.item.text.includes('horizontal')
    )).toBe(true);
  });

  it('accessibility captures focus indicators', async () => {
    const result = await agent.executeIteration({
      story: baseStory,
      systemContext,
      iterationId: 'accessibility',
      mockupImages,
    });

    // Should describe focus visual style
    expect(result.patches.some(p =>
      p.item.text.match(/focus.*(outline|ring|border)/i)
    )).toBe(true);
  });

  it('validation captures error state visuals', async () => {
    const mockups = [
      { path: 'tests/fixtures/mockup-form-error.png' }
    ];

    const result = await agent.executeIteration({
      story: baseStory,
      systemContext,
      iterationId: 'validation',
      mockupImages: mockups,
    });

    // Should describe error border, icon, message
    expect(result.patches.some(p =>
      p.item.text.match(/red.*(border|icon)/i)
    )).toBe(true);
  });
});
```

### Benchmark Comparison

```bash
# Run with text-only
npm run benchmark -- --mode text-only --iterations interactive-elements,responsive-web,accessibility,validation

# Run with vision
npm run benchmark -- --mode vision-enabled --mockup-images tests/fixtures/*.png

# Compare:
# - Patch count (vision should have more details)
# - Story completeness scores
# - Judge approval rate
```

## Implementation Phases

### Phase 1: Infrastructure (2-4 hours)
- [ ] Extend iteration execution to accept images
- [ ] Update IterationContext type
- [ ] Add logic to include images for vision-enabled iterations

### Phase 2: Prompt Updates (6-10 hours)
- [ ] Update interactive-elements prompt with vision guidance
- [ ] Update responsive-web prompt with vision guidance
- [ ] Update accessibility prompt with vision guidance
- [ ] Update validation prompt with vision guidance

### Phase 3: Testing (8-12 hours)
- [ ] Integration tests for each iteration
- [ ] Benchmark text-only vs vision-enabled
- [ ] Quality validation with real mockups

### Phase 4: Documentation (2-4 hours)
- [ ] Update iteration documentation
- [ ] Add vision analysis examples
- [ ] Document expected improvements

**Total Estimated Time:** 18-30 hours

## Expected Outcomes

### Interactive Elements
- **Text-only:** "Submit button" (1 detail)
- **Vision:** "Primary Submit button (blue, 48px height, checkmark icon, states: default/hover/disabled)" (6+ details)
- **Improvement:** 5-6x more detail

### Responsive Web
- **Text-only:** "Mobile uses hamburger menu"
- **Vision:** "Mobile: Hamburger icon (top-left) opens slide-out drawer (80% width, dark overlay). Desktop: Horizontal nav bar (120px height, 8 items visible, dropdown on hover)"
- **Improvement:** 3-4x more detail

### Accessibility
- **Text-only:** "Buttons should be keyboard accessible"
- **Vision:** "Focus indicator: 2px blue outline (#0066CC), 2px offset from element, visible on all interactive elements. Icon-only buttons need aria-label: X button (aria-label='Close'), search icon (aria-label='Search')"
- **Improvement:** 4-5x more detail

### Validation
- **Text-only:** "Show error on invalid email"
- **Vision:** "Error state: Red 2px border (#D32F2F), error icon (16px, right-aligned), error message below (12px, 'Please enter a valid email'), appears 300ms after blur"
- **Improvement:** 6-7x more detail

## Related Tickets

- USA-59: Add vision support to System Discovery (prerequisite)
- VISION-BENEFITS-ANALYSIS.md: Full analysis of vision benefits

## Notes

- These 4 iterations are the most visual-dependent after System Discovery
- Combined, they cover ~30% of iteration work but have highest visual content
- Vision support here has 2nd highest ROI (after System Discovery)
- User stories will be significantly more complete and actionable
