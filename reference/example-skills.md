# Example Skills from Various Sources

## 1. Testing Patterns Skill

**Source**: Claude Code Showcase

```yaml
---
name: testing-patterns
description: "Jest testing patterns for this project. Use when writing tests, creating mocks, or following TDD workflow."
allowed-tools: Read, Grep, Bash
---

# Testing Patterns

## Test File Structure
- Tests live in `__tests__/` directories
- Name files as `*.test.ts` or `*.spec.ts`

## Mocking Patterns
[Instructions for mocking...]

## TDD Workflow
1. Write failing test
2. Implement minimum code
3. Refactor
```

## 2. GraphQL Schema Skill

**Source**: Claude Code Showcase

```yaml
---
name: graphql-schema
description: "GraphQL schema patterns, queries, mutations, and code generation. Use when working with GraphQL."
---

# GraphQL Schema

## Query Patterns
[GraphQL query examples...]

## Mutation Patterns
[Mutation examples...]

## Code Generation
[How to generate types...]
```

## 3. Core Components Skill

**Source**: Claude Code Showcase

```yaml
---
name: core-components
description: "Design system components and token usage. Use when building UI."
---

# Core Components

## Available Components
- Button
- Input
- Card
- Modal

## Design Tokens
- Colors: `--color-primary`, `--color-secondary`
- Spacing: `--space-1` through `--space-8`
```

## 4. React UI Patterns Skill

**Source**: Claude Code Showcase

```yaml
---
name: react-ui-patterns
description: "Loading, error, and empty states for React components."
---

# React UI Patterns

## Loading States
```tsx
function Component() {
  if (loading) return <Skeleton />;
  return <Content />;
}
```

## Error States
```tsx
function Component() {
  if (error) return <ErrorBoundary error={error} />;
  return <Content />;
}
```

## Empty States
```tsx
function Component() {
  if (data.length === 0) return <EmptyState />;
  return <List data={data} />;
}
```
```

## 5. Web Assets Generator Skill

**Source**: https://github.com/alonw0/web-asset-generator

```yaml
---
name: web-assets
description: "Generate web assets including favicons, PWA icons, and social media meta images."
allowed-tools: Bash, Write
---

# Web Assets Generator

## Capabilities
- Favicon generation (multiple sizes)
- PWA app icons
- Open Graph images for Facebook, Twitter, WhatsApp, LinkedIn
- Image resizing
- Text-to-image generation

## Usage
Provide source image and target formats...
```

## 6. Dexie.js Specialist Command

**Source**: Awesome Claude Code

```markdown
---
description: Get Dexie.js guidance with current documentation
allowed-tools: Read, Grep, Glob, WebFetch
---

First, fetch the documentation index from the Dexie.js website.

Then, analyze the user's question and fetch relevant documentation pages.

Finally, answer the following question using the current documentation:

$ARGUMENTS
```

## 7. Code Reviewer Agent

**Source**: Claude Code Showcase

```yaml
---
name: code-reviewer
description: "Specialized code review agent with detailed checklists."
model: claude-sonnet-4-20250514
---

# Code Review Checklist

## Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevention

## Performance
- [ ] No N+1 queries
- [ ] Proper indexing
- [ ] Caching where appropriate

## Code Quality
- [ ] Clear naming
- [ ] Single responsibility
- [ ] Proper error handling
```

## 8. Document Skills (Anthropic Official)

**Source**: https://github.com/anthropics/skills

### PDF Skill
```yaml
---
name: pdf
description: "Create and manipulate PDF documents"
---
# PDF Operations
- Create PDF from content
- Extract text from PDF
- Merge PDFs
```

### DOCX Skill
```yaml
---
name: docx
description: "Create and edit Word documents"
---
# Word Document Operations
- Create documents
- Edit existing documents
- Format text and tables
```

### PPTX Skill
```yaml
---
name: pptx
description: "Create PowerPoint presentations"
---
# Presentation Operations
- Create slides
- Add content and images
- Apply themes
```

### XLSX Skill
```yaml
---
name: xlsx
description: "Create and edit Excel spreadsheets"
---
# Spreadsheet Operations
- Create workbooks
- Add data and formulas
- Format cells
```

## Patterns for Mockup Analysis Skill

Based on these examples, a mockup analysis skill should:

1. **Clear trigger description**: "Analyze UI mockups to identify components and generate user stories"

2. **Structured output format**: Define templates for component identification and user story generation

3. **Multi-step workflow**:
   - Accept image input
   - Identify components
   - Map to user story templates
   - Generate acceptance criteria

4. **Integration with existing skills**: Reference user story writing prompts
