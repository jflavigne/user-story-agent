# USA-59: Add Vision Support to System Discovery (Pass 0)

**Type**: Feature Enhancement
**Priority**: P1 - CRITICAL
**Status**: COMPLETE (2026-01-31)
**Created**: 2026-01-31
**Parent**: VISION-BENEFITS-ANALYSIS.md

## Problem

System Discovery (Pass 0) currently analyzes text descriptions of mockups to extract UI components, hierarchy, and relationships. This approach loses critical visual information:

- **Visual hierarchy** - Spatial relationships, nesting, grouping
- **Component identification** - Buttons/links identified by visual appearance, not labels
- **Implicit relationships** - Containment inferred from visual layout
- **Visual states** - Hover, disabled, error states shown in mockup variations
- **Missing details** - Text descriptions often omit spacing, alignment, visual grouping

**Current accuracy:** ~60% component capture rate (based on text-only descriptions)
**Expected with vision:** 85-95% component capture rate

## Impact

System Discovery is the **foundation** for all subsequent passes. Poor component graph = poor stories.

**Downstream effects of poor discovery:**
- Stories reference components that don't exist
- Component relationships are incomplete
- States and variations are missed
- UI mapping in Pass 2 fails due to missing components

## Solution

Add vision (image) support to System Discovery operation.

### Architecture Changes

**1. Update ClaudeClient message format**

```typescript
// src/agent/claude-client.ts

import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources';

export interface SendMessageOptions {
  systemPrompt: string;
  messages: Array<{
    role: 'user';
    content: string | Array<TextBlockParam | ImageBlockParam>;
  }>;
  model?: string;
  maxTokens?: number;
}
```

**2. Add image preprocessing utility**

```typescript
// src/utils/image-utils.ts

export interface ImageInput {
  path?: string;       // File path
  url?: string;        // HTTP URL
  base64?: string;     // Base64-encoded image data
  mediaType?: string;  // image/png, image/jpeg, image/webp, image/gif
}

export async function prepareImageForClaude(
  input: ImageInput
): Promise<ImageBlockParam> {
  // 1. Load image (from file, URL, or base64)
  // 2. Resize if > 1568x1568 (Claude vision limit)
  // 3. Convert to base64 if needed
  // 4. Return ImageBlockParam
}
```

**3. Update System Discovery to accept images**

```typescript
// src/agent/user-story-agent.ts

async runSystemDiscovery(
  mockupDescriptions: string[],
  mockupImages?: ImageInput[],  // NEW
  referenceDocuments?: string[]
): Promise<SystemDiscoveryContext> {
  // Build multi-modal message
  const content: Array<TextBlockParam | ImageBlockParam> = [
    { type: 'text', text: userMessage }
  ];

  if (mockupImages) {
    for (const imageInput of mockupImages) {
      const imageBlock = await prepareImageForClaude(imageInput);
      content.push(imageBlock);
    }
  }

  const response = await this.claudeClient.sendMessage({
    systemPrompt: SYSTEM_DISCOVERY_PROMPT,
    messages: [{ role: 'user', content }],
    model: this.resolveModel('discovery'),
  });

  // ... rest unchanged
}
```

**4. Update System Discovery prompt**

```typescript
// src/prompts/iterations/system-discovery.ts

export const SYSTEM_DISCOVERY_PROMPT = `You are performing **Pass 0: System Discovery** from mockups and reference documents.

## Input Format

You may receive:
- **Text descriptions** of mockups and designs
- **Images** of mockups, wireframes, or screenshots
- **Reference documentation** (architecture specs, component libraries)

**IMPORTANT:** If images are provided, prioritize visual evidence over text descriptions. Text descriptions may be incomplete or miss visual details.

## Visual Analysis (when images provided)

From the mockup images, identify:

1. **UI Components** - Visible elements in the design:
   - Controls: Buttons (identify primary vs secondary from visual styling), inputs, checkboxes, toggles
   - Containers: Forms, modals, sheets, cards, panels
   - Navigation: Headers, menus, breadcrumbs, tabs
   - Feedback: Spinners, progress bars, toasts, banners

2. **Visual Hierarchy** - Spatial relationships:
   - Parent-child containment (which components are inside others)
   - Visual grouping (components grouped by proximity, borders, backgrounds)
   - Z-index (modals over screens, dropdowns over content)

3. **Component States** - Variations shown in mockup:
   - Default, hover, focus, active, disabled, error states
   - Empty states, loading states, success states
   - Note: Some mockups show multiple states side-by-side

4. **Visual Properties** - Appearance details:
   - Button types (primary buttons are prominent - larger, colored; secondary are subtle)
   - Icon presence (buttons with icons, inputs with prefix/suffix icons)
   - Required field indicators (asterisks, visual markers)
   - Error indicators (red borders, error icons, validation messages)

5. **Layout Structure**:
   - Screen sections (header, main content, sidebar, footer)
   - Grid layouts, flex layouts, multi-column designs
   - Responsive variations (mobile vs tablet vs desktop views)

... [rest of existing prompt]
`;
```

**5. CLI support for image inputs**

```typescript
// src/cli.ts

interface CliArgs {
  // ... existing fields
  mockupImages?: string;  // Comma-separated image paths
}

// Add argument parsing
case '--mockup-images':
  if (i + 1 < argv.length) {
    args.mockupImages = argv[++i];
  }
  break;

// Process images
let mockupImageInputs: ImageInput[] | undefined;
if (args.mockupImages) {
  const imagePaths = args.mockupImages.split(',').map(s => s.trim());
  mockupImageInputs = imagePaths.map(path => ({
    path: validateFilePath(path),
  }));
}
```

## Acceptance Criteria

### Core Functionality
- [ ] ClaudeClient accepts multi-modal messages (text + images)
- [ ] Image preprocessing utility handles PNG, JPG, WEBP, GIF
- [ ] Images are resized to max 1568x1568 (Claude limit)
- [ ] System Discovery accepts optional mockup images
- [ ] CLI accepts `--mockup-images` flag with comma-separated paths

### Vision-Specific Features
- [ ] Prompt instructs model to prioritize visual evidence
- [ ] Component identification from visual appearance (not just labels)
- [ ] Visual hierarchy extraction (containment, grouping)
- [ ] State capture from mockup variations
- [ ] Visual property extraction (button types, icons, indicators)

### Backward Compatibility
- [ ] Text-only input still works (images optional)
- [ ] Existing tests pass without modifications
- [ ] Config schema remains backward compatible

### Quality Validation
- [ ] Benchmark: Run discovery with text-only vs vision-enabled
- [ ] Measure: Component capture rate improvement (target: +30% minimum)
- [ ] Measure: State capture improvement (target: +80% minimum)
- [ ] Verify: Downstream story quality improves

## Testing Strategy

### Unit Tests
```typescript
describe('Image preprocessing', () => {
  it('loads image from file path', async () => {
    const imageBlock = await prepareImageForClaude({ path: 'mockup.png' });
    expect(imageBlock.type).toBe('image');
    expect(imageBlock.source.type).toBe('base64');
  });

  it('resizes images larger than 1568x1568', async () => {
    const imageBlock = await prepareImageForClaude({ path: 'large-mockup.png' });
    // Verify dimensions <= 1568x1568
  });

  it('handles multiple image formats', async () => {
    for (const ext of ['png', 'jpg', 'webp', 'gif']) {
      const imageBlock = await prepareImageForClaude({ path: `mockup.${ext}` });
      expect(imageBlock.source.media_type).toMatch(/image\//);
    }
  });
});

describe('System Discovery with vision', () => {
  it('accepts images alongside text', async () => {
    const context = await agent.runSystemDiscovery(
      ['Login screen description'],
      [{ path: 'tests/fixtures/mockup-login.png' }]
    );
    expect(context.componentGraph.components).toBeDefined();
  });

  it('works without images (backward compatible)', async () => {
    const context = await agent.runSystemDiscovery(['Login screen description']);
    expect(context.componentGraph.components).toBeDefined();
  });
});
```

### Integration Test
```typescript
it('vision-enabled discovery captures more components than text-only', async () => {
  const textOnlyContext = await agent.runSystemDiscovery([
    'Login screen with email, password, submit button'
  ]);

  const visionContext = await agent.runSystemDiscovery(
    ['Login screen'],
    [{ path: 'tests/fixtures/mockup-login-detailed.png' }]
  );

  // Vision should find: email input, password input, submit button,
  // forgot password link, social login buttons, signup link, icons, etc.
  expect(Object.keys(visionContext.componentGraph.components).length)
    .toBeGreaterThan(Object.keys(textOnlyContext.componentGraph.components).length * 1.5);
});
```

### Benchmark Test
```bash
# Run same stories with text-only vs vision
npm run benchmark -- --mode text-only
npm run benchmark -- --mode vision-enabled

# Compare:
# - Component count
# - Story quality scores
# - Downstream iteration accuracy
```

## Implementation Phases

### Phase 1: Foundation (4-8 hours)
- [ ] Update ClaudeClient to accept multi-modal messages
- [ ] Create image preprocessing utility
- [ ] Add unit tests for image handling

### Phase 2: Integration (4-8 hours)
- [ ] Update System Discovery to accept images
- [ ] Update prompt for vision analysis
- [ ] Add CLI support for mockup images

### Phase 3: Testing (8-12 hours)
- [ ] Integration tests with sample mockups
- [ ] Benchmark text-only vs vision-enabled
- [ ] Quality validation

### Phase 4: Documentation (2-4 hours)
- [ ] Update README with vision usage examples
- [ ] Document image format requirements
- [ ] Add example mockup images to repository

**Total Estimated Time:** 18-32 hours

## Expected Outcomes

**Component Discovery:**
- Text-only: 4-6 components from "Login screen with email, password, submit"
- Vision-enabled: 10-15 components (icons, social buttons, links, visual grouping)
- **Improvement:** 2.5-3x more components

**State Capture:**
- Text-only: 0-1 states (maybe "disabled" if described)
- Vision-enabled: 4-6 states (default, hover, disabled, error, focus)
- **Improvement:** 5-6x more states

**Story Quality:**
- Text-only baseline: 50% stories ≥4/5
- Vision-enabled: 70-80% stories ≥4/5
- **Improvement:** +20-30 percentage points

**Downstream Impact:**
- Better UI mapping in Pass 2 (fewer missing components)
- More accurate acceptance criteria
- Fewer judge rewrites (better component understanding)

## Related Tickets

- USA-60: Add vision to critical iterations (interactive-elements, responsive-web, accessibility, validation)
- VISION-BENEFITS-ANALYSIS.md: Full analysis of vision benefits across all operations

## Notes

- System Discovery is the most critical operation for vision support
- All other iterations depend on the component graph from Discovery
- Poor Discovery = poor everything downstream
- Vision support here has highest ROI in the entire pipeline
