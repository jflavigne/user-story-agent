---
description: Refine and consolidate user stories through post-processing
allowed-tools: [read, write, search_replace]
---

# /user-story/consolidate - Post-Processing and Consolidation

## Purpose

Refine and consolidate an existing user story by reviewing acceptance criteria for redundancies, improving formatting, and ensuring completeness. This skill applies post-processing guidelines to create a polished, production-ready user story.

**Note:** Unlike iteration skills that add new acceptance criteria, this skill refines and consolidates existing content without adding new requirements.

## Usage

```
/user-story/consolidate [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to consolidate

**Examples:**
```
/user-story/consolidate stories/enhanced-checkout.md
/user-story/consolidate tickets/USA-FINAL.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Post-Processing Guidelines

Review and refine the user story using the following guidelines:

```
Assistant, please review the user story and acceptance criteria for any redundancies or overlaps. Ensure that each requirement is distinct and concise. Consider the following guidelines:

1. **Consolidate Similar Criteria**: Merge related criteria into a single one to avoid repetition. Look for criteria that address the same functionality or requirement from slightly different angles and combine them into a single, comprehensive criterion.

2. **Effective Formatting**: Use bullet points or numbers for main criteria, and sub-bullets for specific sub-requirements to enhance clarity and organization. Maintain consistent structure throughout the acceptance criteria.

3. **Plain Language**: Utilize simple, non-technical language to ensure understanding across different stakeholders. Avoid technical jargon where possible, and when technical terms are necessary, ensure they are clearly explained or are standard industry terms.

4. **User-Centric**: Frame criteria from the user's perspective, emphasizing the value or expected result. The desired feature outcome should be clear. Focus on what the user experiences and achieves, not on implementation details.

5. **Avoid Requirement Omission**: Be mindful not to remove essential requirements while simplifying or consolidating. Every crucial detail should be maintained. When consolidating, ensure that all unique aspects of the original criteria are preserved in the consolidated version.

6. **Avoid Repetitive Explanations**: For well-known concepts, state them once clearly rather than repeating them in every criterion. For instance, in an accessibility context, you might simply state initially that all interactive elements must meet accessibility standards, including screen reader compatibility and keyboard navigation, instead of repeating these standards in every criterion. Apply this principle to other topics as well, ensuring that the requirements are concise yet comprehensive.

7. **Remove Duplicates**: Identify and remove duplicate criteria while preserving unique requirements. If two criteria say essentially the same thing, keep the more comprehensive or clearer one.

8. **Maintain Completeness**: Ensure that all aspects of the user story are covered:
   - Happy path scenarios
   - Error conditions
   - Edge cases
   - Alternative flows
   - Non-functional requirements (if applicable)

After refining, present the updated user story with all sections completed, including priority if applicable.
```

### Step 3: Consolidate and Refine

Apply the post-processing guidelines to:

1. **Identify Duplicates**: Find acceptance criteria that say the same thing in different ways
2. **Merge Related Criteria**: Combine similar criteria into single, comprehensive statements
3. **Improve Structure**: Organize criteria into logical sections with consistent formatting
4. **Simplify Language**: Replace technical jargon with plain language where possible
5. **Verify Completeness**: Ensure all unique requirements are preserved
6. **Check Coverage**: Confirm happy paths, error conditions, and edge cases are addressed

### Step 4: Output Consolidated Story

Present the refined user story with:

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
- [Consolidated criterion 1]
- [Consolidated criterion 2]
...

### Non-Functional Requirements
- [Consolidated criterion 1]
- [Consolidated criterion 2]
...

### Accessibility
- [Consolidated criterion 1]
- [Consolidated criterion 2]
...

### Security
- [Consolidated criterion 1]
- [Consolidated criterion 2]
...

[Additional sections as needed]

## Priority
[Must Have | Should Have | Could Have | Won't Have]

## Notes
[Any additional context, edge cases, or considerations]
```

---

## Consolidation Principles

### What to Consolidate

- **Similar validation rules** → Single validation section with all rules
- **Repeated accessibility requirements** → One accessibility section with comprehensive coverage
- **Overlapping error handling** → Unified error handling criteria
- **Duplicate state descriptions** → Single state management section

### What NOT to Consolidate

- **Unique functional requirements** → Keep distinct features separate
- **Different user roles** → Maintain role-specific criteria
- **Distinct edge cases** → Preserve each edge case
- **Non-overlapping validation** → Keep different validation types separate

### Quality Checks

Before finalizing, verify:

1. **No lost requirements**: Compare consolidated version against original
2. **Clear language**: All criteria understandable by non-technical stakeholders
3. **Testable criteria**: Each criterion can be verified
4. **Complete coverage**: Happy path, errors, and edge cases included
5. **Consistent formatting**: Uniform structure throughout

---

## Notes

- This skill refines existing content without adding new requirements
- Use after applying iteration skills to polish the final user story
- Focus on clarity, organization, and completeness
- Preserve all unique requirements while eliminating redundancy
