# Image Analysis Patterns for Mockups

## How Claude Handles Images

Claude is multimodal and can analyze images directly. In Claude Code:

1. **Paste screenshots** directly into the prompt input
2. **Drag and drop** images into the conversation
3. **Reference files** using file paths that Claude can read

## Basic Mockup Analysis Prompt Pattern

```markdown
[Image of mockup]

Analyze this UI mockup and identify:

1. **Page/Screen Name**: What is this screen?
2. **Primary Purpose**: What is the user trying to accomplish?
3. **Components Identified**:
   - List each UI component
   - Note its type (button, input, card, etc.)
   - Describe its apparent function

4. **User Flows**: What actions can users take?
5. **Data Requirements**: What data does this screen display/collect?
```

## Component Extraction Pattern

```markdown
[Image of mockup]

Extract all UI components from this mockup:

## Interactive Elements
| Component | Type | Purpose | States Needed |
|-----------|------|---------|---------------|
| ... | Button | ... | default, hover, disabled |

## Display Elements
| Component | Type | Content Type |
|-----------|------|--------------|
| ... | Card | ... |

## Form Elements
| Field | Type | Validation Needed |
|-------|------|-------------------|
| ... | Text Input | Required, Email format |
```

## Mockup-to-User-Story Pattern

```markdown
[Image of mockup]

Based on this mockup, generate user stories:

## Instructions
1. Identify the primary user goal shown in the mockup
2. Break down into individual features/interactions
3. For each feature, create a user story

## User Story Template
As a [role identified from mockup context],
I want [action visible in the mockup],
So that [inferred benefit].

### Acceptance Criteria
- [Criterion based on visible UI elements]
- [Criterion based on implied functionality]
```

## Multi-Page Mockup Analysis

```markdown
[Image 1: Homepage]
[Image 2: Product Page]
[Image 3: Checkout]

Analyze these mockups as a connected user flow:

1. **Flow Overview**: Describe the journey
2. **Per-Screen Analysis**:
   - Screen name
   - Entry points (how user arrives)
   - Exit points (where user goes next)
   - Key components
3. **Shared Components**: Identify reusable elements
4. **User Stories**: Generate stories for the complete flow
```

## Design System Extraction

```markdown
[Multiple mockup images]

Extract the design system patterns:

## Colors
- Primary:
- Secondary:
- Accent:
- Text:
- Background:

## Typography
- Headings:
- Body:
- Labels:

## Spacing
- Component gaps:
- Section margins:

## Components
- Buttons (variants):
- Inputs (variants):
- Cards (variants):
```

## Iterative Analysis with User Approval

```markdown
## Phase 1: Component Identification

[Image of mockup]

I've identified the following components:
1. Header with logo and navigation
2. Hero section with CTA
3. Feature cards (3)
4. Footer

**Please confirm or correct this analysis before I proceed.**

---

## Phase 2: User Story Generation (after approval)

Based on the confirmed components, here are the proposed user stories:

### Story 1: Navigation
As a visitor, I want to navigate to different sections...

**Do you approve these stories, or would you like modifications?**

---

## Phase 3: Detailed Acceptance Criteria (after approval)

For each approved story, here are the detailed acceptance criteria...
```

## Tool Integration Patterns

### Using Read Tool for Local Images

```typescript
// Claude can read images from file paths
const mockupPath = '/path/to/mockup.png';
// The Read tool will display the image content
```

### Using WebFetch for Online Mockups

```markdown
Fetch and analyze the mockup at: https://example.com/mockup.png
```

### Structured Output for Downstream Processing

```json
{
  "mockupAnalysis": {
    "screenName": "Login Page",
    "components": [
      {
        "id": "email-input",
        "type": "text-input",
        "purpose": "Collect user email",
        "validation": ["required", "email-format"]
      }
    ],
    "userStories": [
      {
        "id": "US-001",
        "role": "User",
        "goal": "Sign in to my account",
        "benefit": "Access personalized content",
        "acceptanceCriteria": [...]
      }
    ]
  }
}
```

## Best Practices

1. **Request specific output formats** - JSON, markdown tables, or structured lists
2. **Break complex mockups into sections** - Analyze header, body, footer separately
3. **Ask for confidence levels** - "Rate your confidence in each identification"
4. **Iterate with user feedback** - Build in approval checkpoints
5. **Reference design systems** - If known, reference existing component libraries
6. **Consider responsive variations** - Ask about mobile/tablet versions

## Limitations

- Claude cannot interact with live UIs (no clicking, scrolling)
- Static analysis only - cannot test functionality
- May miss subtle design details
- Cannot access Figma/Sketch files directly (need exported images)
- Color accuracy depends on image quality
