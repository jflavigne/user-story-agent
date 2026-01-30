# USA-19 Implementation Plan: Individual Iteration Skills

## Overview

Create 13 individual Claude Code skill files (12 iteration skills + 1 consolidate skill) that allow users to apply single iterations or post-processing to existing user stories.

## Key Decisions (Answers to Questions)

### 1. Should individual skills include the full iteration prompt inline or reference the TypeScript files?
**Answer: Include full prompts inline.** Claude Code skills are markdown files, not TypeScript, so prompts must be included inline following the pattern from `write.md` and `interactive.md`.

### 2. Should skills prompt for product context or keep it minimal for single-iteration use?
**Answer: Keep minimal.** Individual iteration skills focus on single-iteration enhancement. Product context can be inferred from the story content itself. Skills accept `$1` (story path or text) and apply the iteration prompt directly.

### 3. How should consolidate.md work as a standalone post-processing step?
**Answer: Standalone consolidation tool.** The `consolidate.md` skill:
- Accepts `$1` argument (story path or text)
- Reads the story content
- Applies the POST_PROCESSING_PROMPT inline
- Consolidates duplicate criteria, improves formatting, uses plain language
- Outputs refined story with all redundancies removed
- Works independently of iterations (can be used on any user story)

## File Mapping

| Iteration ID | Skill Filename | Maps To |
|--------------|----------------|---------|
| user-roles | `user-roles.md` | `src/prompts/iterations/user-roles.ts` |
| interactive-elements | `interactive-elements.md` | `src/prompts/iterations/interactive-elements.ts` |
| validation | `validation.md` | `src/prompts/iterations/validation.ts` |
| accessibility | `accessibility.md` | `src/prompts/iterations/accessibility.ts` |
| performance | `performance.md` | `src/prompts/iterations/performance.ts` |
| security | `security.md` | `src/prompts/iterations/security.ts` |
| responsive-web | `responsive-web.md` | `src/prompts/iterations/responsive-web.ts` |
| responsive-native | `responsive-native.md` | `src/prompts/iterations/responsive-native.ts` |
| language-support | `i18n-language.md` | `src/prompts/iterations/language-support.ts` |
| locale-formatting | `i18n-locale.md` | `src/prompts/iterations/locale-formatting.ts` |
| cultural-appropriateness | `i18n-cultural.md` | `src/prompts/iterations/cultural-appropriateness.ts` |
| analytics | `analytics.md` | `src/prompts/iterations/analytics.ts` |
| N/A | `consolidate.md` | `src/prompts/post-processing.ts` |

## Step-by-Step Action Plan

### Phase 1: Preparation

1. **Read all iteration prompt files** - Read all 12 files from `src/prompts/iterations/*.ts` and `src/prompts/post-processing.ts` to extract PROMPT exports
2. **Create base template** - Design markdown template based on `write.md`/`interactive.md` patterns with frontmatter, usage, instructions, and output format

### Phase 2: Create Individual Iteration Skills (Steps 3-14)

3. **Create `accessibility.md`** - Include ACCESSIBILITY_PROMPT inline, description: "Enhance user story with accessibility requirements and WCAG compliance considerations"
4. **Create `security.md`** - Include SECURITY_PROMPT inline, description: "Enhance user story with security requirements from a user trust and data protection perspective"
5. **Create `performance.md`** - Include PERFORMANCE_PROMPT inline, description: "Enhance user story with performance requirements and optimization opportunities"
6. **Create `validation.md`** - Include VALIDATION_PROMPT inline, description: "Enhance user story with input validation and error handling requirements"
7. **Create `user-roles.md`** - Include USER_ROLES_PROMPT inline, description: "Enhance user story with distinct user roles and permission analysis"
8. **Create `interactive-elements.md`** - Include INTERACTIVE_ELEMENTS_PROMPT inline, description: "Enhance user story by mapping interactive UI elements to functionality"
9. **Create `responsive-web.md`** - Include RESPONSIVE_WEB_PROMPT inline, description: "Enhance user story with responsive web design requirements", add note about product type applicability
10. **Create `responsive-native.md`** - Include RESPONSIVE_NATIVE_PROMPT inline, description: "Enhance user story with native mobile UX patterns and platform-specific requirements", add note about mobile-native only
11. **Create `i18n-language.md`** - Include LANGUAGE_SUPPORT_PROMPT inline, description: "Enhance user story with internationalization (i18n) and multi-language support requirements"
12. **Create `i18n-locale.md`** - Include LOCALE_FORMATTING_PROMPT inline, description: "Enhance user story with locale-specific formatting requirements (dates, numbers, currency)"
13. **Create `i18n-cultural.md`** - Include CULTURAL_APPROPRIATENESS_PROMPT inline, description: "Enhance user story with cultural sensitivity and localization requirements"
14. **Create `analytics.md`** - Include ANALYTICS_PROMPT inline, description: "Enhance user story with analytics and tracking requirements"

### Phase 3: Create Consolidate Skill

15. **Create `consolidate.md`** - Include POST_PROCESSING_PROMPT inline, description: "Consolidate and refine user story by removing redundancies and improving formatting", standalone post-processing (not an iteration)

### Phase 4: Quality Assurance

16. **Verify frontmatter consistency** - Check all 13 files have `description` and `allowed-tools: [read, write, search_replace]`
17. **Verify argument handling** - Ensure all skills accept `$1` argument (story path or text) and handle missing arguments
18. **Verify prompt inclusion** - Confirm all iteration prompts are included inline and complete
19. **Verify file naming** - Check all filenames match USA-19 spec exactly
20. **Cross-reference registry** - Verify skill names align with iteration IDs in `iteration-registry.ts` and workflow order
21. **Test self-containment** - Ensure each skill is independently usable without external dependencies

### Phase 5: Documentation

22. **Update USA-19 ticket** - Mark acceptance criteria complete, document implementation decisions

## Implementation Notes

### Common Pattern for Each Iteration Skill

```markdown
---
description: [Iteration-specific description]
allowed-tools: [read, write, search_replace]
---

# /user-story/[iteration-name] - [Iteration Name] Enhancement

## Purpose

[Brief description of what this iteration adds to user stories]

## Usage

```
/user-story/[iteration-name] [story-path]
```

**Arguments:**
- `$1` (story-path): Path to existing user story file or story text to enhance

**Examples:**
```
/user-story/[iteration-name] tickets/USA-1.md
/user-story/[iteration-name] "As a user, I want..."
```

If `$1` is not provided, prompt the user for the story path or text.

## Step-by-Step Instructions

### Step 1: Read Story Content

1. If `$1` is provided:
   - If it's a file path, use `read` tool to load the file
   - If it's story text, use it directly
2. If `$1` is missing, prompt: "Please provide the path to your user story file or paste the story text:"

### Step 2: Apply [Iteration Name] Prompt

Apply the following prompt to enhance the user story:

[FULL PROMPT FROM ITERATION FILE INLINE]

### Step 3: Enhance User Story

1. Analyze the existing user story using the prompt above
2. Add new acceptance criteria related to [iteration focus]
3. Preserve all existing acceptance criteria
4. Enhance the story with [iteration-specific] requirements

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template
- All original acceptance criteria
- New [iteration-specific] acceptance criteria
- Clear indication of what was added

## Output Format

[Standard output format matching write.md]
```

### Consolidate Skill Pattern

```markdown
---
description: Consolidate and refine user story by removing redundancies and improving formatting
allowed-tools: [read, write, search_replace]
---

# /user-story/consolidate - Post-Processing Consolidation

## Purpose

Standalone post-processing step to consolidate, refine, and improve formatting of user stories and acceptance criteria.

## Usage

```
/user-story/consolidate [story-path]
```

**Arguments:**
- `$1` (story-path): Path to existing user story file or story text to consolidate

## Step-by-Step Instructions

### Step 1: Read Story Content
[Same as iteration skills]

### Step 2: Apply Post-Processing Prompt
[FULL POST_PROCESSING_PROMPT INLINE]

### Step 3: Consolidate and Refine
1. Review for redundancies
2. Merge similar criteria
3. Improve formatting
4. Use plain language
5. Maintain user-centric focus
6. Remove duplicates while preserving completeness

### Step 4: Output Refined Story
[Output consolidated story]
```

## Success Criteria

- [x] All 13 skill files created
- [x] All skills have consistent frontmatter
- [x] All skills accept `$1` argument
- [x] All iteration prompts included inline
- [x] All skills are self-contained
- [x] File naming matches USA-19 spec
- [x] Skills follow existing patterns from write.md and interactive.md
