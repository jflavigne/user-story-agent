# USA-18 Implementation Plan: Interactive Mode Skill

## Goal
Create the `/user-story/interactive` skill markdown file at `.claude/commands/user-story/interactive.md` that allows users to selectively choose which iterations to apply to their user story.

## Step-by-Step Actions

### Step 1: Create the skill file structure
1. Create the directory `.claude/commands/user-story/` if it doesn't exist
2. Create the file `.claude/commands/user-story/interactive.md`
3. Add frontmatter with:
   - `description`: Brief description of the interactive mode skill
   - `allowed-tools`: Same as write.md - `[read, write, search_replace]`

### Step 2: Write the Purpose section
1. Explain that this skill allows selective enhancement of user stories
2. Describe the checkbox-style selection interface
3. Mention that iterations are applied in workflow order (not selection order)
4. Note that consolidation always runs at the end

### Step 3: Write the Usage section
1. Document the command syntax: `/user-story/interactive [story-path] [product-type]`
2. Explain the arguments (same as write.md):
   - `$1`: Path to mockup, design file, or existing user story
   - `$2`: Product type (web, mobile-native, mobile-web, desktop, api)
3. Provide usage examples
4. Document that arguments can be omitted and prompted for

### Step 4: Document the iteration grouping structure
1. Define the 5 user-friendly categories:
   - **Core Structure**: user-roles, interactive-elements, validation
   - **Quality**: accessibility, performance, security
   - **Platform**: responsive-web, responsive-native
   - **i18n**: language-support, locale-formatting, cultural-appropriateness
   - **Insights**: analytics
2. Note that Platform iterations are filtered by product type:
   - responsive-web: web, mobile-web, desktop
   - responsive-native: mobile-native only
3. Document that other iterations apply to all product types

### Step 5: Write Step-by-Step Instructions - Part 1 (Setup)
1. **Step 1: Parse Arguments and Gather Input**
   - Extract `$1` (story path) and `$2` (product type)
   - Prompt for missing information (same as write.md)
   - Validate product type

2. **Step 2: Gather Product Context**
   - Present the same product context form as write.md
   - Store context for use throughout workflow

3. **Step 3: Read Mockup/Design File**
   - Use `read` tool to load the file
   - Handle both image and text-based files

4. **Step 4: Apply System Prompt**
   - Use the same system prompt as write.md
   - Generate initial user story
   - Save as working document

### Step 6: Write Step-by-Step Instructions - Part 2 (Selection Menu)
1. **Step 5: Present Iteration Selection Menu**
   - Filter iterations by product type applicability
   - Group iterations into the 5 categories
   - Present checkbox-style menu with format:
     ```
     ## Select Iterations to Apply
     
     ### Core Structure
     ☐ [ ] User Roles - Identifies distinct user roles and permissions
     ☐ [ ] Interactive Elements - Maps UI elements to functionality
     ☐ [ ] Validation - Documents input validation and error handling
     
     ### Quality
     ☐ [ ] Accessibility - Ensures WCAG compliance and inclusive design
     ☐ [ ] Performance - Identifies performance requirements
     ☐ [ ] Security - Documents security considerations
     
     ### Platform
     ☐ [ ] Responsive Web - (web, mobile-web, desktop only) Responsive design requirements
     ☐ [ ] Responsive Native - (mobile-native only) Native mobile UX patterns
     
     ### i18n
     ☐ [ ] Language Support - Internationalization requirements
     ☐ [ ] Locale Formatting - Regional formatting (dates, numbers, currency)
     ☐ [ ] Cultural Appropriateness - Cultural sensitivity and localization
     
     ### Insights
     ☐ [ ] Analytics - Tracking and measurement requirements
     ```
   - Only show Platform iterations applicable to the selected product type
   - Include descriptions for each iteration
   - Allow user to select/deselect iterations

### Step 7: Write Step-by-Step Instructions - Part 3 (Application)
1. **Step 6: Apply Selected Iterations in Workflow Order**
   - Parse user selections from the menu
   - Sort selected iterations by workflow order (not selection order)
   - Workflow order: user-roles → interactive-elements → validation → accessibility → performance → security → responsive-web → responsive-native → language-support → locale-formatting → cultural-appropriateness → analytics
   - For each selected iteration in workflow order:
     - Load the iteration prompt (reference the prompts from write.md)
     - Apply the prompt to the current user story
     - Enhance the user story with new acceptance criteria
     - Carry context forward (include all previous iteration results)
   - Document that context must be carried forward (same as write.md)

### Step 8: Write Step-by-Step Instructions - Part 4 (Consolidation)
1. **Step 7: Apply Post-Processing (Always)**
   - Note that consolidation always runs, regardless of selections
   - Use the same post-processing prompt as write.md
   - Consolidate and refine the user story
   - Remove duplicates, improve formatting, ensure completeness

### Step 9: Write Step-by-Step Instructions - Part 5 (Output)
1. **Step 8: Output Final User Story**
   - Present the final consolidated user story
   - Use the same output format as write.md:
     - User Story Template
     - Product Context
     - Comprehensive Acceptance Criteria
     - Priority (if applicable)
     - Notes

### Step 10: Add Context Carrying Instructions
1. Copy the context carrying section from write.md
2. Emphasize that each iteration builds upon previous results
3. Document the working document approach
4. Note that consolidation only happens at the end

### Step 11: Add Iteration Applicability Rules
1. Document which iterations apply to which product types
2. Create a table similar to write.md showing skip rules
3. Note that Platform iterations are automatically filtered in the menu

### Step 12: Add Output Format section
1. Copy the output format section from write.md
2. Ensure it matches the expected final structure

### Step 13: Add Notes section
1. Document that this command allows selective enhancement
2. Note that iterations are applied in workflow order regardless of selection order
3. Emphasize that consolidation always runs
4. Mention that the skill follows the same structure as write.md

### Step 14: Review and validate
1. Ensure frontmatter matches write.md format
2. Verify all 5 categories are properly defined
3. Check that workflow order is correctly documented
4. Verify product type filtering logic is clear
5. Ensure consolidation step is always included
6. Confirm context carrying instructions are present
7. Validate that iteration prompts are referenced (not duplicated)

## Key Requirements Checklist

- [x] Frontmatter with description and allowed-tools
- [x] Purpose section explaining selective iteration enhancement
- [x] Usage section with examples
- [x] Instructions for presenting checkbox-style selection menu
- [x] Instructions for applying selected iterations in workflow order
- [x] Instructions for consolidation (always runs)
- [x] 5 user-friendly category groups
- [x] Product type applicability handling
- [x] Context carrying instructions
- [x] Output format documentation

## Implementation Notes

- The skill should reference iteration prompts from write.md rather than duplicating them
- Platform iterations (responsive-web, responsive-native) should be filtered based on product type in the menu
- All other iterations apply to all product types
- Selected iterations must be applied in workflow order, not selection order
- Consolidation/post-processing always runs at the end, regardless of selections
- The structure should closely follow write.md for consistency
