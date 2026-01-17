# Design Review Workflow

## Overview

An automated design review system that provides comprehensive feedback on front-end code changes, ensuring UI/UX consistency, accessibility compliance, and adherence to design standards.

**Repository**: https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review

**Tutorial Video**: https://www.youtube.com/watch?v=xOO8Wt_i72s

## Technology Stack

- **Microsoft Playwright MCP** - Browser automation for visual testing
- **Claude Code Agents** - Specialized for design review
- **Sub-agents** - Dedicated reviewers for different aspects

## Focus Areas

The workflow ensures:
- UI/UX consistency across changes
- Accessibility compliance (WCAG)
- Adherence to world-class design standards
- Visual issue detection before production

## Typical Design Review Criteria

Based on similar workflows, a design review typically covers:

### Visual Consistency
- Color palette adherence
- Typography consistency
- Spacing and alignment
- Component styling

### Responsive Design
- Mobile breakpoints
- Tablet layouts
- Desktop optimization
- Touch targets

### Accessibility
- Color contrast ratios
- Keyboard navigation
- Screen reader compatibility
- Focus states
- ARIA labels

### User Experience
- Visual hierarchy
- Call-to-action clarity
- Loading states
- Error states
- Empty states

### Performance
- Image optimization
- Animation performance
- Layout shift

## Integration Pattern

```
.claude/
├── agents/
│   └── design-reviewer/
│       └── AGENT.md
├── commands/
│   └── design-review.md
└── skills/
    └── design-patterns/
        └── SKILL.md
```

## Command Example Pattern

```markdown
---
description: Run automated design review on current changes
allowed-tools: Read, Bash, WebFetch
---

## Design Review Process

1. Identify changed UI files
2. Launch browser preview
3. Capture screenshots at breakpoints
4. Analyze against design system
5. Check accessibility compliance
6. Generate review report

## Breakpoints to Test
- Mobile: 375px
- Tablet: 768px
- Desktop: 1280px
- Wide: 1920px

## Report Format
- Summary of issues
- Priority ranking
- Specific recommendations
- Screenshot annotations
```

## Relevance for Mockup Analysis

This workflow demonstrates:
1. **Automated visual analysis** - Using Playwright for screenshots
2. **Multi-criteria evaluation** - Comprehensive checklist
3. **Report generation** - Structured feedback
4. **Sub-agent delegation** - Specialized reviewers

Can be adapted for mockup-to-user-story conversion by:
- Analyzing mockup screenshots
- Identifying UI components
- Mapping to user story templates
- Generating acceptance criteria
