---
description: Generate user stories from mockups with selective iteration enhancement via interactive checkbox selection
allowed-tools: [read, write, search_replace]
---

# /user-story/interactive - Interactive User Story Workflow

## Purpose

Generate user stories from mockups and designs with selective enhancement through an interactive checkbox selection menu. Unlike `/user-story/write` which applies all iterations sequentially, this command allows you to choose which iteration categories to apply, enabling focused enhancement based on your specific needs.

## Usage

```
/user-story/interactive [story-path] [product-type]
```

**Arguments:**
- `$1` (story-path): Path to mockup, design file, or existing user story to enhance
- `$2` (product-type): Product type - one of: `web`, `mobile-native`, `mobile-web`, `desktop`, `api`

**Examples:**
```
/user-story/interactive designs/login-mockup.png web
/user-story/interactive tickets/USA-1.md mobile-native
/user-story/interactive "Private & Shared/User Story Prompts/design.png" mobile-web
```

If arguments are not provided, prompt the user for:
1. Story/mockup path (required)
2. Product type selection from the valid options (required)

---

## Iteration Categories

The selection menu presents iterations grouped into 5 categories:

### 1. Core Structure
- **User Roles** - Identifies distinct user roles and permissions
- **Interactive Elements** - Maps UI elements to functionality  
- **Validation** - Documents input validation and error handling

### 2. Quality
- **Accessibility** - Ensures WCAG compliance and inclusive design
- **Performance** - Identifies performance requirements
- **Security** - Documents security considerations

### 3. Platform (filtered by product type)
- **Responsive Web** - (web, mobile-web, desktop only) Responsive design requirements
- **Responsive Native** - (mobile-native only) Native mobile UX patterns

### 4. i18n
- **Language Support** - Internationalization requirements
- **Locale Formatting** - Regional formatting (dates, numbers, currency)
- **Cultural Appropriateness** - Cultural sensitivity and localization

### 5. Insights
- **Analytics** - Tracking and measurement requirements

---

## Step-by-Step Instructions

### Step 1: Parse Arguments and Gather Input

1. **Extract Arguments:**
   - `$1` = story/mockup path (if provided)
   - `$2` = product type (if provided)

2. **Prompt for Missing Information:**
   - If `$1` is missing, ask: "Please provide the path to your mockup, design file, or existing user story:"
   - If `$2` is missing, present options:
     ```
     Please select the product type:
     1. web - Web application (desktop and mobile browsers)
     2. mobile-native - Native mobile app (iOS/Android)
     3. mobile-web - Mobile-optimized web application
     4. desktop - Desktop application
     5. api - API/service (no UI)
     ```

3. **Validate Product Type:**
   - Ensure `$2` is one of: `web`, `mobile-native`, `mobile-web`, `desktop`, `api`
   - If invalid, prompt again with the valid options

### Step 2: Gather Product Context

Present a product context form to gather essential information. Ask the user for:

```
## Product Context

Please provide the following information about your product:

1. **Product Name:** [e.g., "E-commerce Checkout Flow"]
2. **Client/Organization:** [e.g., "Acme Corp"]
3. **Target Audience:** [e.g., "Online shoppers, ages 25-45"]
4. **Key Features:** [e.g., "Shopping cart, payment processing, order tracking"]
5. **Business Context:** [e.g., "Reducing cart abandonment, improving conversion"]
6. **Additional Notes:** [Any other relevant context]
```

Store this context for use throughout the workflow.

### Step 3: Read Mockup/Design File

Use the `read` tool to load the mockup or design file:

```
read: {story-path}
```

If the file cannot be read (e.g., image file), note that visual analysis will be based on the file name and any provided context. For text-based files (existing user stories), read the full content.

### Step 4: Apply System Prompt

Establish the AI persona and user story format by applying the system prompt. **Reference the system prompt from `/user-story/write` (Step 4)** - do not duplicate the full prompt here, but apply the same system prompt that establishes:

- AI persona (all-in-one user story writer)
- User story template format (As a [role], I want [goal], So that [reason])
- Acceptance criteria guidelines
- Visual element analysis approach

**Initial Analysis:**
Based on the mockup/design file and product context, generate an initial user story following the template. This becomes the foundation for all subsequent iterations.

**Context Carrying:** Save this initial user story as the working document that will be enhanced through selected iterations.

### Step 5: Present Iteration Selection Menu

Present a checkbox-style selection menu grouped by category. Use numbered options for selection:

```
## Select Iterations to Apply

Please select which iteration categories you'd like to apply (enter numbers separated by commas, or 'all' for all):

### 1. Core Structure
  [1] User Roles - Identifies distinct user roles and permissions
  [2] Interactive Elements - Maps UI elements to functionality
  [3] Validation - Documents input validation and error handling

### 2. Quality
  [4] Accessibility - Ensures WCAG compliance and inclusive design
  [5] Performance - Identifies performance requirements
  [6] Security - Documents security considerations

### 3. Platform
  [7] Responsive Web - (web, mobile-web, desktop only) Responsive design requirements
  [8] Responsive Native - (mobile-native only) Native mobile UX patterns

### 4. i18n
  [9] Language Support - Internationalization requirements
  [10] Locale Formatting - Regional formatting (dates, numbers, currency)
  [11] Cultural Appropriateness - Cultural sensitivity and localization

### 5. Insights
  [12] Analytics - Tracking and measurement requirements

Enter your selections (e.g., "1,2,4,5" or "all"):
```

**Important Filtering Rules:**
- If product type is `mobile-native`, hide option [7] (Responsive Web)
- If product type is NOT `mobile-native`, hide option [8] (Responsive Native)
- If product type is `api`, hide both [7] and [8] (Platform iterations)

**Selection Processing:**
- Parse user input (comma-separated numbers or "all")
- If "all" is selected, apply all **visible** iterations (respecting product type filtering)
- Validate selections against available options for the selected product type
- If user enters an invalid or hidden option number, prompt: "Option [X] is not available for [product-type]. Please select from the available options."
- Map selections to iteration names:
  - 1 → user-roles
  - 2 → interactive-elements
  - 3 → validation
  - 4 → accessibility
  - 5 → performance
  - 6 → security
  - 7 → responsive-web
  - 8 → responsive-native
  - 9 → language-support
  - 10 → locale-formatting
  - 11 → cultural-appropriateness
  - 12 → analytics

### Step 6: Apply Selected Iterations in Workflow Order

**Critical:** Apply selected iterations in **workflow order** (not selection order). The workflow order is:

1. user-roles
2. interactive-elements
3. validation
4. accessibility
5. performance
6. security
7. responsive-web (if selected and applicable)
8. responsive-native (if selected and applicable)
9. language-support
10. locale-formatting
11. cultural-appropriateness
12. analytics

For each selected iteration:

1. **Load the iteration prompt** - Reference the iteration prompts from `/user-story/write` Step 5. Do not duplicate the full prompts here, but reference them:
   - User Roles → `/user-story/write` Iteration 1
   - Interactive Elements → `/user-story/write` Iteration 2
   - Validation → `/user-story/write` Iteration 3
   - Accessibility → `/user-story/write` Iteration 4
   - Performance → `/user-story/write` Iteration 5
   - Security → `/user-story/write` Iteration 6
   - Responsive Web → `/user-story/write` Iteration 7
   - Responsive Native → `/user-story/write` Iteration 8
   - Language Support → `/user-story/write` Iteration 9
   - Locale Formatting → `/user-story/write` Iteration 10
   - Cultural Appropriateness → `/user-story/write` Iteration 11
   - Analytics → `/user-story/write` Iteration 12

2. **Apply the prompt** to the current user story
3. **Enhance the user story** with new acceptance criteria and requirements
4. **Carry context forward** - Include all previous iteration results in the next iteration

**Important:** Each iteration should reference and build upon the results of all previous iterations. Do not start fresh - accumulate requirements.

### Step 7: Apply Post-Processing (Always)

After all selected iterations are complete, **always** apply the post-processing prompt to consolidate and refine the user story. **Reference the post-processing prompt from `/user-story/write` (Step 6)** - do not duplicate the full prompt here, but apply the same consolidation logic that:

- Consolidates similar criteria
- Improves formatting
- Uses plain language
- Maintains user-centric focus
- Removes duplicates while preserving completeness

**Consolidation:** Review the accumulated user story and acceptance criteria, consolidate duplicates, improve formatting, and ensure completeness while maintaining all essential requirements.

### Step 8: Output Final User Story

Present the final consolidated user story to the user in a clear, well-formatted markdown document. Include:

1. **User Story Template** (As a [role], I want [goal], So that [reason])
2. **Product Context** (from Step 2)
3. **Comprehensive Acceptance Criteria** (consolidated from selected iterations)
4. **Priority** (if applicable)
5. **Notes** (any additional context or considerations)

---

## Context Carrying Instructions

**Critical:** Each iteration must build upon the previous results. Do not start fresh for each iteration.

1. **Maintain Working Document**: Keep a single working user story document that accumulates requirements through each selected iteration.

2. **Reference Previous Iterations**: When applying each iteration prompt, include:
   - The current user story content
   - All acceptance criteria from previous iterations
   - Any notes or considerations from previous iterations

3. **Accumulate, Don't Replace**: Each iteration should ADD new acceptance criteria and requirements, not replace existing ones.

4. **Consolidation Only at End**: Only consolidate and refine during the post-processing step. During iterations, focus on adding comprehensive requirements.

5. **Preserve Context**: Maintain product context, user roles, and key decisions throughout all iterations.

**Reference:** See `/user-story/write` "Context Carrying Instructions" section for detailed guidance.

---

## Iteration Applicability Rules

Based on product type, certain iterations are filtered from the selection menu:

| Product Type | Hidden Options |
|--------------|----------------|
| `web` | `[8] Responsive Native` |
| `mobile-native` | `[7] Responsive Web` |
| `mobile-web` | `[8] Responsive Native` |
| `desktop` | `[8] Responsive Native` |
| `api` | `[7] Responsive Web`, `[8] Responsive Native` |

All other iterations are available for all product types.

**Reference:** See `/user-story/write` "Iteration Applicability Rules" section for detailed guidance.

---

## Output Format

The final user story should follow this structure:

```markdown
# User Story: [Title]

## Product Context
- **Product Name:** [name]
- **Client/Organization:** [client]
- **Target Audience:** [audience]
- **Key Features:** [features]
- **Business Context:** [context]

## User Story

As a [role],
I want [goal],
So that [reason].

## Acceptance Criteria

### Functional Requirements
- [Criterion 1]
- [Criterion 2]
...

### Non-Functional Requirements
- [Criterion 1]
- [Criterion 2]
...

### Accessibility
- [Criterion 1]
- [Criterion 2]
...

### Security
- [Criterion 1]
- [Criterion 2]
...

[Additional sections as needed based on selected iterations]

## Priority
[Must Have | Should Have | Could Have | Won't Have]

## Notes
[Any additional context, edge cases, or considerations]
```

**Reference:** See `/user-story/write` "Output Format" section for detailed structure.

---

## Notes

- This command provides selective enhancement through interactive iteration selection
- Selected iterations are applied in workflow order, not selection order
- Post-processing consolidation is always applied, regardless of selections
- Platform iterations are automatically filtered based on product type
- All iteration prompts are referenced from `/user-story/write` to avoid duplication
- The final output is a production-ready user story with only the selected enhancements applied
