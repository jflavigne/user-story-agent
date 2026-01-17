# Iterations Guide

This guide explains the iteration system and what each iteration does.

## Overview

Iterations are specialized prompts that enhance user stories with specific concerns. Each iteration focuses on a particular aspect (accessibility, validation, i18n, etc.) and adds relevant acceptance criteria.

## How Iterations Work

1. **Input**: The current user story text
2. **Processing**: Claude analyzes the story and applies the iteration's focus
3. **Output**: Enhanced story with new acceptance criteria
4. **Accumulation**: Context from previous iterations informs subsequent ones

## Iteration Categories

| Category | Focus Area |
|----------|------------|
| `roles` | User types and permissions |
| `elements` | UI components and interactions |
| `validation` | Input validation and feedback |
| `quality` | Accessibility, performance, security |
| `responsive` | Device and screen adaptation |
| `i18n` | Internationalization |
| `analytics` | Tracking and metrics |

## Available Iterations

### Core Iterations

#### user-roles

**Category:** roles
**Applies to:** All product types

Identifies distinct user roles and their interactions with the interface.

**Adds criteria for:**
- User role definitions
- Permission levels
- Role-specific behaviors
- Authentication states

**Example output:**
```markdown
### User Roles
- [ ] Anonymous users can view public content
- [ ] Registered users can save preferences
- [ ] Admin users can manage other accounts
```

---

#### interactive-elements

**Category:** elements
**Applies to:** All product types

Documents buttons, inputs, links, icons and their interaction states.

**Adds criteria for:**
- Button states (default, hover, active, disabled)
- Input field behaviors
- Link destinations
- Icon meanings
- Loading states

**Example output:**
```markdown
### Interactive Elements
- [ ] "Submit" button shows loading spinner while processing
- [ ] Disabled state reduces opacity to 50%
- [ ] Input fields show focus ring on keyboard navigation
```

---

#### validation

**Category:** validation
**Applies to:** All product types

Identifies form field validation rules and user feedback requirements.

**Adds criteria for:**
- Required field indicators
- Format validation (email, phone, etc.)
- Real-time vs submit-time validation
- Error message content and placement
- Success feedback

**Example output:**
```markdown
### Validation
- [ ] Email field validates format on blur
- [ ] Password requires 8+ chars, 1 number, 1 special
- [ ] Error messages appear below fields in red
- [ ] Form cannot submit until all errors resolved
```

---

### Quality Iterations

#### accessibility

**Category:** quality
**Applies to:** All product types

WCAG compliance and inclusive design requirements.

**Adds criteria for:**
- Screen reader compatibility
- Keyboard navigation
- Color contrast (4.5:1 minimum)
- Focus management
- ARIA labels and roles
- Alternative text

**Example output:**
```markdown
### Accessibility (WCAG 2.1 AA)
- [ ] All images have descriptive alt text
- [ ] Form fields have associated labels
- [ ] Error messages announced to screen readers
- [ ] Skip link available for keyboard users
- [ ] Color is not the only indicator of state
```

---

#### performance

**Category:** quality
**Applies to:** All product types

User-perceived performance requirements.

**Adds criteria for:**
- Initial load time targets
- Interaction response times
- Loading indicators
- Skeleton screens
- Optimistic updates
- Offline behavior

**Example output:**
```markdown
### Performance
- [ ] Initial page load < 3 seconds on 3G
- [ ] Button clicks respond within 100ms
- [ ] Skeleton loaders shown for async content
- [ ] Images lazy-loaded below the fold
```

---

#### security

**Category:** quality
**Applies to:** All product types

Security UX and data protection requirements.

**Adds criteria for:**
- Sensitive data masking
- Session management
- CSRF protection
- Input sanitization
- Secure transmission indicators
- Privacy controls

**Example output:**
```markdown
### Security
- [ ] Password field masked by default with show/hide toggle
- [ ] Session expires after 30 minutes of inactivity
- [ ] "Remember me" clearly explains data retention
- [ ] Credit card fields use secure input mode
```

---

### Responsive Iterations

#### responsive-web

**Category:** responsive
**Applies to:** `web`, `mobile-web`, `desktop`

Responsive design requirements for web applications.

**Adds criteria for:**
- Breakpoint behaviors (mobile, tablet, desktop)
- Touch vs mouse interactions
- Layout adaptations
- Navigation changes
- Content reflow

**Example output:**
```markdown
### Responsive Design (Web)
- [ ] Mobile (<768px): Single column, hamburger menu
- [ ] Tablet (768-1024px): Two columns, condensed nav
- [ ] Desktop (>1024px): Full sidebar navigation
- [ ] Touch targets minimum 44x44px on mobile
```

---

#### responsive-native

**Category:** responsive
**Applies to:** `mobile-native`

Native mobile device-specific behaviors.

**Adds criteria for:**
- Device size adaptations (iPhone SE to iPad Pro)
- Orientation changes
- Safe area handling (notch, home indicator)
- Platform conventions (iOS vs Android)
- Hardware button integration

**Example output:**
```markdown
### Responsive Design (Native)
- [ ] Layout adapts from iPhone SE to iPad Pro
- [ ] Landscape orientation supported with adjusted layout
- [ ] Content respects safe area insets
- [ ] Android back button navigates as expected
```

---

### Internationalization Iterations

#### language-support

**Category:** i18n
**Applies to:** All product types

Multi-language interface requirements.

**Adds criteria for:**
- Text expansion handling (German ~30% longer)
- RTL layout support
- Language switcher
- Fallback language
- Dynamic content translation

**Example output:**
```markdown
### Language Support
- [ ] UI supports English, Spanish, French, German
- [ ] Layout accommodates 30% text expansion
- [ ] Language selector in footer/settings
- [ ] Untranslated content falls back to English
```

---

#### locale-formatting

**Category:** i18n
**Applies to:** All product types

Locale-specific formatting requirements.

**Adds criteria for:**
- Date formats (MM/DD/YYYY vs DD/MM/YYYY)
- Number formats (1,000.00 vs 1.000,00)
- Currency display
- Time zones
- Measurement units

**Example output:**
```markdown
### Locale Formatting
- [ ] Dates display in user's locale format
- [ ] Currency shows local symbol and format
- [ ] Times converted to user's timezone
- [ ] Numbers use locale-appropriate separators
```

---

#### cultural-appropriateness

**Category:** i18n
**Applies to:** All product types

Cultural sensitivity requirements.

**Adds criteria for:**
- Color meaning variations
- Icon/symbol appropriateness
- Imagery guidelines
- Content tone
- Holiday/calendar considerations

**Example output:**
```markdown
### Cultural Appropriateness
- [ ] Avoid red/green for success/error in some cultures
- [ ] Hand gesture icons reviewed for cultural meaning
- [ ] Imagery reflects diverse user base
- [ ] Date picker supports multiple calendar systems
```

---

### Analytics Iteration

#### analytics

**Category:** analytics
**Applies to:** All product types

User behavior tracking requirements.

**Adds criteria for:**
- Page/screen views
- User actions (clicks, submissions)
- Conversion funnels
- Error tracking
- Performance metrics
- Privacy compliance

**Example output:**
```markdown
### Analytics
- [ ] Track page views with referrer
- [ ] Track button clicks with element ID
- [ ] Track form submissions (success/failure)
- [ ] Track search queries and result counts
- [ ] Respect "Do Not Track" browser setting
```

---

## Workflow Order

Iterations run in a specific order to build context progressively:

1. `user-roles` - Establish who uses the system
2. `interactive-elements` - Document what users interact with
3. `validation` - Define input requirements
4. `accessibility` - Ensure inclusive access
5. `performance` - Set speed expectations
6. `security` - Address data protection
7. `responsive-web` / `responsive-native` - Handle device adaptation
8. `language-support` - Multi-language support
9. `locale-formatting` - Regional formatting
10. `cultural-appropriateness` - Cultural considerations
11. `analytics` - Tracking requirements

## Product Type Filtering

Not all iterations apply to all products:

| Product Type | Excluded |
|--------------|----------|
| `web` | `responsive-native` |
| `mobile-native` | `responsive-web` |
| `mobile-web` | `responsive-native` |
| `desktop` | `responsive-web`, `responsive-native` |
| `api` | Most UI-focused iterations |

## Consolidation

After all iterations complete (in workflow/interactive mode), a consolidation step:

1. Removes duplicates
2. Resolves conflicts
3. Organizes criteria logically
4. Ensures consistent formatting
5. Adds summary section

## Creating Custom Iterations

Iterations are defined as SKILL.md files in `.claude/skills/user-story/`:

```markdown
---
id: my-iteration
name: My Custom Iteration
description: What this iteration does
category: quality
order: 15
applicableTo: ['web', 'mobile-web']
---

# My Custom Iteration

Analyze the user story and add acceptance criteria for [your focus area].

## Requirements

- Criterion 1
- Criterion 2

## Output Format

Return JSON with:
- enhancedStory: the updated story
- changesApplied: list of changes made
```

See [Contributing Guide](../CONTRIBUTING.md) for details on adding new iterations.
