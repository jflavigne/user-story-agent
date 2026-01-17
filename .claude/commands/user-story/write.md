---
description: Generate comprehensive user stories from mockups and designs using a sequential iteration workflow
allowed-tools: [read, write, search_replace]
---

# /user-story/write - Unified User Story Workflow

## Purpose

Generate comprehensive, production-ready user stories from mockups and designs by applying a systematic 12-iteration enhancement workflow. This command orchestrates the complete user story generation process, from initial analysis through role identification, accessibility, security, internationalization, and final consolidation.

## Usage

```
/user-story/write [story-path] [product-type]
```

**Arguments:**
- `$1` (story-path): Path to mockup, design file, or existing user story to enhance
- `$2` (product-type): Product type - one of: `web`, `mobile-native`, `mobile-web`, `desktop`, `api`

**Examples:**
```
/user-story/write designs/login-mockup.png web
/user-story/write tickets/USA-1.md mobile-native
/user-story/write "Private & Shared/User Story Prompts/design.png" mobile-web
```

If arguments are not provided, prompt the user for:
1. Story/mockup path (required)
2. Product type selection from the valid options (required)

---

## Workflow Overview

The command executes a sequential workflow that progressively enhances the user story through 12 iterations plus setup and consolidation phases:

**Setup:**
- **System Prompt** - Establishes AI persona and user story template

**Iterations (1-12):**
1. **User Roles** - Identifies distinct user roles and permissions
2. **Interactive Elements** - Maps UI elements to functionality
3. **Validation** - Documents input validation and error handling
4. **Accessibility** - Ensures WCAG compliance and inclusive design
5. **Performance** - Identifies performance requirements
6. **Security** - Documents security considerations
7. **Responsive Web** - (web, mobile-web, desktop only) Responsive design requirements
8. **Responsive Native** - (mobile-native only) Native mobile UX patterns
9. **Language Support** - Internationalization requirements
10. **Locale Formatting** - Regional formatting (dates, numbers, currency)
11. **Cultural Appropriateness** - Cultural sensitivity and localization
12. **Analytics** - Tracking and measurement requirements

**Consolidation:**
- **Post-Processing** - Consolidation and refinement

Each iteration builds upon the previous results, carrying context forward to create a comprehensive, production-ready user story.

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

Establish the AI persona and user story format by applying the system prompt:

**System Prompt:**
```
You are an all-in-one AI user story writer, blending the skills of a product owner, business analyst, UX designer, and developer.

As a virtual assistant for the development team, your purpose is to help generate user stories for websites built using React and Sitecore.

To create a user story, please follow this template:

As a [role],
I want [goal],
So that [reason].

In addition to the template, you can provide acceptance criteria, constraints, non-functional requirements, or any specific context or edge cases. For acceptance criteria, please use the format:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]
...

## Acceptance Criteria Guidelines

When creating acceptance criteria, follow these principles:

1. **Testable**: Each criterion should be testable and verifiable. Use specific, measurable conditions.

2. **Given/When/Then Format**: Where appropriate, use the Given/When/Then format to structure acceptance criteria:
   - **Given** a specific context or precondition
   - **When** a user performs an action
   - **Then** a specific outcome should occur

3. **Specific and Measurable**: Avoid vague language. Be specific about what should happen, when it should happen, and what the expected outcome is.

4. **Cover Happy Path and Edge Cases**: Include criteria for:
   - The primary user flow (happy path)
   - Error conditions and edge cases
   - Boundary conditions
   - Alternative flows

5. **User-Centric**: Frame criteria from the user's perspective, emphasizing the value or expected result.

## Analyzing Visual Elements

When analyzing mockups and designs:

1. **Identify Interactive Elements**: Map visual elements to functionality:
   - Buttons, links, and clickable areas
   - Form fields and input controls
   - Navigation elements
   - Interactive states (hover, focus, active, disabled, error)

2. **Map to User Goals**: Connect visual elements to user goals and workflows.

3. **Identify Relationships**: Understand how different elements relate to each other and contribute to the overall user story.

4. **Consider Context**: Take into account the context in which the feature appears and how it fits into the larger user journey.

Please provide as much relevant information as possible to generate comprehensive user stories. Concise and well-defined user stories are preferred.

Feel free to collaborate and iterate on the user stories generated. Your feedback is valuable for further refinement.

Example User Story:
As a registered user,
I want to be able to save items to my wishlist,
So that I can easily track and revisit them later.

Example Acceptance Criteria:

- When I click the "Add to Wishlist" button, the item should be added to my wishlist.
- I should be able to view and manage my wishlist from my user profile page.
- The wishlist should persist across sessions for logged-in users.
```

**Initial Analysis:**
Based on the mockup/design file and product context, generate an initial user story following the template. This becomes the foundation for all subsequent iterations.

**Context Carrying:** Save this initial user story as the working document that will be enhanced through each iteration.

### Step 5: Execute Sequential Iterations

Execute each applicable iteration in workflow order. For each iteration:

1. **Load the iteration prompt** (see iteration prompts below)
2. **Apply the prompt** to the current user story
3. **Enhance the user story** with new acceptance criteria and requirements
4. **Carry context forward** - Include all previous iteration results in the next iteration

**Important:** Each iteration should reference and build upon the results of all previous iterations. Do not start fresh - accumulate requirements.

#### Iteration 1: User Roles

**Prompt:**
```
Analyze the mockup or design to identify distinct user roles and their specific interactions with the interface.

## Role Identification

1. **Identify User Types**: Examine the interface to determine what types of users might interact with it:
   - Anonymous visitors or guests
   - Registered or authenticated users
   - Administrators or power users
   - Specific role-based users (e.g., editors, moderators, customers, vendors)

2. **Role Goals and Motivations**: For each identified role, determine:
   - What are their primary goals when using this interface?
   - What motivates them to interact with specific features?
   - What outcomes are they trying to achieve?

3. **Role-Specific Interactions**: Map how each role interacts with UI elements:
   - Which features are visible or accessible to each role?
   - What actions can each role perform?
   - Are there role-specific workflows or navigation paths?
   - Do different roles see different content or layouts?

## Access and Permissions

4. **Role-Based Access Control**: Identify any role-based restrictions:
   - Features that are only available to certain roles
   - Content that varies by user role
   - Actions that require specific permissions
   - UI elements that appear or disappear based on role

5. **Permission Indicators**: Note any visual indicators of permissions:
   - Disabled buttons or features for unauthorized roles
   - Different navigation menus or options
   - Role-specific dashboards or views
   - Access level indicators or badges

## User Story Implications

6. **Story Variations**: Consider how user stories might differ by role:
   - Should separate stories be created for each role?
   - Can a single story accommodate multiple roles with variations?
   - What role-specific acceptance criteria are needed?

7. **Role Context in Stories**: When documenting user stories:
   - Clearly specify the role in the "As a [role]" format
   - Include role-specific acceptance criteria
   - Document any role-based constraints or permissions
   - Note any differences in behavior or access between roles

## Output

Provide a structured analysis that:
- Lists all identified user roles
- Describes each role's goals and interactions
- Maps role-specific features and permissions
- Recommends how to structure user stories to accommodate role differences
```

**Enhancement:** Update the user story with role-specific acceptance criteria and role variations.

#### Iteration 2: Interactive Elements

**Prompt:**
```
Analyze the mockup or design to identify all interactive elements and map them to user actions and functionality.

## Element Identification

1. **Buttons and Actions**: Identify all buttons and their purposes:
   - Primary actions (submit, save, confirm)
   - Secondary actions (cancel, back, skip)
   - Destructive actions (delete, remove)
   - Navigation buttons (next, previous, home)

2. **Form Controls**: Document all form inputs:
   - Text fields (single-line, multi-line)
   - Selection controls (dropdowns, radio buttons, checkboxes)
   - File uploads
   - Date/time pickers
   - Sliders and range inputs

3. **Links and Navigation**: Identify navigation elements:
   - Internal links
   - External links
   - Breadcrumbs
   - Menu items
   - Pagination controls

4. **Interactive States**: Document all interactive states:
   - Default state
   - Hover state
   - Focus state
   - Active/pressed state
   - Disabled state
   - Loading state
   - Error state
   - Success state

## User Interactions

5. **Click/Tap Actions**: Map each interactive element to user actions:
   - What happens when the user clicks/taps?
   - What feedback is provided?
   - What state changes occur?

6. **Form Interactions**: Document form behavior:
   - Field-level interactions
   - Form submission flow
   - Multi-step form progression
   - Dynamic field visibility

7. **Navigation Patterns**: Identify navigation flows:
   - How users move between pages/screens
   - Modal and dialog interactions
   - Tab and accordion interactions
   - Carousel and slider interactions

## User Story Implications

8. **Action Mapping**: For each interactive element, determine:
   - What user goal does it support?
   - What acceptance criteria are needed?
   - What edge cases exist?

9. **Acceptance Criteria**: Document acceptance criteria that cover:
   - All interactive elements are functional
   - All states are properly implemented
   - All user actions produce expected results
   - All feedback mechanisms work correctly
```

**Enhancement:** Add acceptance criteria for all interactive elements and their states.

#### Iteration 3: Validation

**Prompt:**
```
Analyze the mockup or design to identify validation requirements for all user inputs and interactions.

## Input Validation

1. **Field-Level Validation**: Identify validation rules for each input:
   - Required fields
   - Data type validation (text, number, email, phone, URL)
   - Format validation (patterns, masks)
   - Length constraints (min/max characters)
   - Range constraints (min/max values)

2. **Real-Time Validation**: Determine when validation occurs:
   - On blur (when field loses focus)
   - On change (as user types)
   - On submit (form-level validation)
   - Server-side validation requirements

3. **Validation Messages**: Document error messaging:
   - What error messages are shown?
   - Where are errors displayed (inline, summary, toast)?
   - How are errors styled/indicated visually?
   - Are errors announced to screen readers?

## Business Logic Validation

4. **Cross-Field Validation**: Identify validation that depends on multiple fields:
   - Password confirmation matching
   - Date range validation (start < end)
   - Conditional required fields
   - Dependent field visibility

5. **Business Rules**: Document business logic constraints:
   - Unique value requirements
   - Referential integrity (e.g., valid category selection)
   - State-dependent validation (e.g., can't edit after submission)
   - Permission-based validation

## Error Handling

6. **Error States**: Document all error scenarios:
   - Invalid input errors
   - Network/server errors
   - Timeout errors
   - Permission errors
   - Business rule violations

7. **Error Recovery**: Identify how users can recover from errors:
   - Clear error messages with guidance
   - Ability to correct and resubmit
   - Cancel/back options
   - Save draft functionality

## User Story Implications

8. **Validation Criteria**: Document acceptance criteria that cover:
   - All validation rules are enforced
   - All error messages are clear and helpful
   - All error states are properly displayed
   - Users can successfully correct errors
   - Validation works across all supported devices/browsers
```

**Enhancement:** Add comprehensive validation acceptance criteria.

#### Iteration 4: Accessibility

**Prompt:**
```
Analyze the mockup or design to identify accessibility requirements and how users with disabilities will experience the interface.

## Keyboard Navigation

1. **Tab Order and Focus Management**: Identify keyboard navigation patterns:
   - What is the logical tab order through interactive elements?
   - How does focus move between form fields, buttons, and links?
   - Are there keyboard shortcuts available to users?
   - Can all interactive elements be reached via keyboard?
   - Are there skip links or shortcuts to bypass repetitive navigation?
   - How does focus behave in modals, dropdowns, and dynamic content?

2. **Keyboard Interaction**: Document keyboard-accessible interactions:
   - Can users activate buttons and links using Enter or Space?
   - How do users navigate dropdown menus with keyboard?
   - Can users close modals and dialogs using Escape?
   - Are there keyboard shortcuts for common actions?
   - How do users interact with complex components (tabs, accordions, carousels) via keyboard?

## Screen Reader Compatibility

3. **Alt Text and Descriptions**: Identify images and visual content:
   - What alternative text should be provided for informative images?
   - How are decorative images handled (should they be hidden from screen readers)?
   - Are icons and graphics described appropriately?
   - Do charts, graphs, and data visualizations have text alternatives?
   - Are complex images (infographics, diagrams) described in detail?

4. **Screen Reader Experience**: Analyze what screen reader users hear and experience:
   - What do screen reader users hear when they encounter icon-only buttons?
   - Can screen reader users understand which label belongs to which field?
   - Can users navigate between major sections and regions of the page?
   - Do interactive elements have clear, descriptive names that explain their purpose?
   - Can users understand relationships between elements (groups, lists, tables)?

5. **Content Structure and Navigation**: Identify how users navigate content:
   - Can users navigate by headings to quickly find content?
   - Is content organized so users can understand the structure when reading linearly?
   - Can screen reader users easily navigate the menu structure and understand the navigation hierarchy?
   - Can users understand how form fields are grouped and what each group represents?
   - Is the page structure clear and logical when experienced non-visually?

## Form Accessibility

6. **Form Labels and Associations**: Document form accessibility:
   - Are all form fields clearly labeled?
   - Can users (especially screen reader users) understand which label belongs to which field?
   - Are placeholder texts used as the only labels (anti-pattern)?
   - Do complex inputs (date pickers, file uploads) have clear instructions?
   - Are form field purposes clear (what information is being requested)?

7. **Error Announcements**: Identify how form errors are communicated:
   - Are validation errors announced to screen readers immediately?
   - How do users learn about errors when they can't see visual indicators?
   - Are error messages associated with the fields that have errors?
   - Can users navigate directly to fields with errors?
   - Is there a summary of errors that screen readers can access?

8. **Required Field Indicators**: Document required field communication:
   - How are required fields indicated to screen reader users?
   - Is the required status announced when users focus on fields?
   - Are required field indicators clear and consistent?
   - Can users understand which fields are optional vs required?

## State Change Announcements

9. **Dynamic Content Updates**: Identify state changes that need announcements:
   - How are loading states communicated to screen reader users?
   - Are success messages announced when actions complete?
   - How do users learn about error notifications?
   - Are dynamic content updates (loading new items, updating lists) announced appropriately?
   - Do users receive feedback when form submissions succeed or fail?

10. **Live Regions**: Determine what needs live region announcements:
    - Which content changes should be announced immediately?
    - Which changes should be announced politely (after current task)?
    - Which changes should not be announced (decorative updates)?
    - How are progress indicators communicated?
    - Are status messages (saving, uploading) announced?

## Visual Accessibility

11. **Color Contrast**: Analyze color usage for accessibility:
    - Do text colors have sufficient contrast against backgrounds?
    - Are interactive elements distinguishable without relying on color alone?
    - Do error states use more than just color to indicate problems?
    - Are focus indicators visible with high contrast?
    - Can users distinguish between different states (active, disabled, error) without color?

12. **Focus Indicators**: Document focus visibility:
    - Are focus indicators clearly visible on all interactive elements?
    - Is the focus indicator distinct from hover states?
    - Can users easily see which element currently has focus?
    - Do focus indicators meet minimum size and contrast requirements?
    - Are custom focus styles consistent across the interface?

13. **Visual Alternatives**: Identify non-visual communication methods:
    - Are icons accompanied by text labels?
    - Do color-coded statuses have text or icon alternatives?
    - Can users understand information without relying on visual cues?
    - Are there alternatives to hover-only interactions?
    - Is important information not conveyed solely through visual design?

## Responsive and Touch Accessibility

14. **Touch Target Sizes**: Document touch accessibility:
    - Are interactive elements large enough for easy touch interaction?
    - Is there adequate spacing between clickable elements?
    - Can users with motor disabilities easily interact with controls?
    - Are touch gestures (swipe, pinch) optional or have alternatives?

15. **Responsive Accessibility**: Consider accessibility across devices:
    - Does the interface remain accessible on mobile devices?
    - Are keyboard navigation patterns maintained across screen sizes?
    - Do focus indicators work on touch devices?
    - Is content readable and navigable at different zoom levels?

## User Story Implications

16. **Story Requirements**: For each accessibility feature, determine:
    - What user actions are supported via keyboard?
    - How do screen reader users understand and interact with content?
    - What feedback is provided for state changes?
    - How are errors and validation communicated accessibly?
    - What visual and non-visual indicators support accessibility?

17. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Keyboard navigation and focus management
    - Screen reader compatibility and announcements
    - Form accessibility and error communication
    - Visual accessibility (contrast, focus indicators)
    - Alternative text and semantic structure
    - Touch accessibility and responsive behavior
```

**Enhancement:** Add comprehensive accessibility acceptance criteria.

#### Iteration 5: Performance

**Prompt:**
```
Analyze the mockup or design to identify performance requirements and optimization opportunities.

## Load Time Performance

1. **Initial Load**: Identify initial load requirements:
   - What is the target time to first contentful paint?
   - What is the target time to interactive?
   - What content should be prioritized for above-the-fold rendering?
   - What can be deferred or lazy-loaded?

2. **Resource Loading**: Document resource optimization needs:
   - Image optimization requirements (formats, sizes, lazy loading)
   - Font loading strategy (subsetting, preloading)
   - JavaScript bundle size targets
   - CSS optimization needs

## Runtime Performance

3. **Interaction Responsiveness**: Identify interaction performance requirements:
   - Target response time for button clicks
   - Form submission feedback timing
   - Animation and transition performance
   - Scroll performance requirements

4. **Data Loading**: Document data fetching patterns:
   - API response time targets
   - Pagination and infinite scroll requirements
   - Caching strategies
   - Background data prefetching

## User Story Implications

5. **Performance Criteria**: Document acceptance criteria that cover:
   - Load time targets are met
   - Interactions feel responsive
   - Animations are smooth (60fps)
   - Data loads efficiently
   - Performance works across target devices and network conditions
```

**Enhancement:** Add performance-related acceptance criteria.

#### Iteration 6: Security

**Prompt:**
```
Analyze the mockup or design to identify security requirements and considerations.

## Authentication and Authorization

1. **Access Control**: Identify access control requirements:
   - What authentication is required?
   - What authorization levels exist?
   - How are permissions enforced?
   - What data is role-restricted?

2. **Session Management**: Document session handling:
   - Session timeout requirements
   - Secure session storage
   - Logout functionality
   - Session invalidation on security events

## Data Protection

3. **Sensitive Data**: Identify sensitive data handling:
   - What data is considered sensitive?
   - How is sensitive data displayed (masking, redaction)?
   - How is sensitive data transmitted (encryption)?
   - How is sensitive data stored?

4. **Input Sanitization**: Document input security:
   - XSS prevention requirements
   - SQL injection prevention (if applicable)
   - CSRF protection needs
   - File upload security

## User Story Implications

5. **Security Criteria**: Document acceptance criteria that cover:
   - Authentication and authorization work correctly
   - Sensitive data is protected
   - Inputs are properly sanitized
   - Security best practices are followed
   - Security works across all user roles
```

**Enhancement:** Add security-related acceptance criteria.

#### Iteration 7: Responsive Web (if applicable)

**Skip if product type is `mobile-native` or `api`.**

**Prompt:**
```
Analyze the mockup or design to identify responsive design requirements for web applications.

## Breakpoint Strategy

1. **Screen Sizes**: Identify target breakpoints:
   - Mobile (320px - 768px)
   - Tablet (768px - 1024px)
   - Desktop (1024px+)
   - Large desktop (1440px+)

2. **Layout Adaptations**: Document layout changes across breakpoints:
   - Navigation patterns (hamburger menu, full menu)
   - Grid system adaptations
   - Typography scaling
   - Spacing adjustments

## Touch and Interaction

3. **Touch Targets**: Document touch-friendly design:
   - Minimum touch target sizes (44x44px)
   - Adequate spacing between interactive elements
   - Touch gesture support

4. **Interaction Patterns**: Identify device-specific interactions:
   - Mobile: swipe gestures, pull-to-refresh
   - Desktop: hover states, keyboard shortcuts
   - Tablet: hybrid interactions

## User Story Implications

5. **Responsive Criteria**: Document acceptance criteria that cover:
   - Layout works across all target breakpoints
   - Touch targets are appropriately sized
   - Interactions work on both touch and mouse/keyboard
   - Content is readable and usable at all sizes
   - Performance is maintained across devices
```

**Enhancement:** Add responsive design acceptance criteria.

#### Iteration 8: Responsive Native (if applicable)

**Skip if product type is NOT `mobile-native`.**

**Prompt:**
```
Analyze the mockup or design to identify native mobile UX patterns and platform-specific requirements.

## Platform Considerations

1. **iOS vs Android**: Identify platform-specific requirements:
   - Navigation patterns (iOS: tab bar, Android: navigation drawer)
   - Platform conventions (back button, app bar)
   - Platform-specific UI components
   - Platform guidelines compliance (HIG, Material Design)

2. **Device Variations**: Document device-specific considerations:
   - Screen size variations (phones, tablets, foldables)
   - Orientation support (portrait, landscape)
   - Notch and safe area handling
   - Different input methods

## Native Patterns

3. **Platform Patterns**: Identify native interaction patterns:
   - Pull-to-refresh
   - Swipe gestures
   - Platform-specific animations
   - Native sharing and system integration

4. **Performance**: Document native performance requirements:
   - Smooth scrolling (60fps)
   - Fast navigation transitions
   - Efficient memory usage
   - Battery optimization

## User Story Implications

5. **Native Criteria**: Document acceptance criteria that cover:
   - Follows platform design guidelines
   - Works across target device sizes
   - Supports required orientations
   - Uses appropriate native patterns
   - Meets performance targets
```

**Enhancement:** Add native mobile acceptance criteria.

#### Iteration 9: Language Support

**Prompt:**
```
Analyze the mockup or design to identify internationalization (i18n) requirements.

## Multi-Language Support

1. **Supported Languages**: Identify target languages:
   - Primary language
   - Secondary languages
   - RTL (right-to-left) language support needs

2. **Content Translation**: Document translatable content:
   - UI text and labels
   - Error messages
   - Help text and tooltips
   - User-generated content handling

## Language Selection

3. **Language Switching**: Identify language selection mechanisms:
   - How users select their preferred language
   - Language persistence (cookies, user preferences)
   - Default language fallback

## User Story Implications

4. **i18n Criteria**: Document acceptance criteria that cover:
   - All UI text is translatable
   - Language selection works correctly
   - RTL layouts work (if applicable)
   - Content displays correctly in all supported languages
```

**Enhancement:** Add internationalization acceptance criteria.

#### Iteration 10: Locale Formatting

**Prompt:**
```
Analyze the mockup or design to identify locale-specific formatting requirements.

## Regional Formatting

1. **Date and Time**: Document date/time formatting needs:
   - Date formats (MM/DD/YYYY vs DD/MM/YYYY)
   - Time formats (12-hour vs 24-hour)
   - Timezone handling
   - Calendar systems (Gregorian, lunar, etc.)

2. **Numbers and Currency**: Identify number formatting:
   - Decimal separators (period vs comma)
   - Thousands separators
   - Currency symbols and placement
   - Number formatting (1,234.56 vs 1.234,56)

3. **Address and Contact**: Document address formatting:
   - Address line order
   - Postal code formats
   - Phone number formats
   - Name formats (first/last order)

## User Story Implications

4. **Locale Criteria**: Document acceptance criteria that cover:
   - Dates and times display in user's locale format
   - Numbers and currency format correctly
   - Addresses follow regional conventions
   - All locale-specific formatting works correctly
```

**Enhancement:** Add locale formatting acceptance criteria.

#### Iteration 11: Cultural Appropriateness

**Prompt:**
```
Analyze the mockup or design to identify cultural sensitivity and localization requirements.

## Cultural Considerations

1. **Visual Design**: Document cultural appropriateness:
   - Color symbolism and meanings
   - Icon and imagery appropriateness
   - Gesture and interaction cultural norms
   - Typography and reading patterns

2. **Content and Messaging**: Identify culturally sensitive content:
   - Tone and formality levels
   - Cultural references and idioms
   - Religious and cultural holidays
   - Taboo topics and imagery

3. **Localization**: Document localization needs:
   - Content adaptation (not just translation)
   - Regional feature variations
   - Compliance with local regulations
   - Cultural user expectations

## User Story Implications

4. **Cultural Criteria**: Document acceptance criteria that cover:
   - Visual design is culturally appropriate
   - Content respects cultural norms
   - Localization goes beyond translation
   - Cultural sensitivity is maintained
```

**Enhancement:** Add cultural appropriateness acceptance criteria.

#### Iteration 12: Analytics

**Prompt:**
```
Analyze the mockup or design to identify analytics and tracking requirements.

## Event Tracking

1. **User Actions**: Identify trackable user actions:
   - Button clicks and form submissions
   - Page/screen views
   - Navigation events
   - Feature usage

2. **Conversion Events**: Document conversion tracking:
   - Key conversion points
   - Funnel steps
   - Success metrics
   - Error tracking

## Data Collection

3. **User Properties**: Identify user data to track:
   - User demographics (if applicable)
   - User preferences
   - Feature usage patterns
   - Engagement metrics

4. **Privacy Compliance**: Document privacy requirements:
   - Consent mechanisms (GDPR, CCPA)
   - Data anonymization
   - Opt-out capabilities
   - Privacy policy compliance

## User Story Implications

5. **Analytics Criteria**: Document acceptance criteria that cover:
   - Key user actions are tracked
   - Conversion events are measured
   - Privacy requirements are met
   - Analytics work across all features
   - Data collection is compliant with regulations
```

**Enhancement:** Add analytics acceptance criteria.

### Step 6: Apply Post-Processing

After all iterations are complete, apply the post-processing prompt to consolidate and refine the user story:

**Post-Processing Prompt:**
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

**Consolidation:** Review the accumulated user story and acceptance criteria, consolidate duplicates, improve formatting, and ensure completeness while maintaining all essential requirements.

### Step 7: Output Final User Story

Present the final consolidated user story to the user in a clear, well-formatted markdown document. Include:

1. **User Story Template** (As a [role], I want [goal], So that [reason])
2. **Product Context** (from Step 2)
3. **Comprehensive Acceptance Criteria** (consolidated from all iterations)
4. **Priority** (if applicable)
5. **Notes** (any additional context or considerations)

---

## Context Carrying Instructions

**Critical:** Each iteration must build upon the previous results. Do not start fresh for each iteration.

1. **Maintain Working Document**: Keep a single working user story document that accumulates requirements through each iteration.

2. **Reference Previous Iterations**: When applying each iteration prompt, include:
   - The current user story content
   - All acceptance criteria from previous iterations
   - Any notes or considerations from previous iterations

3. **Accumulate, Don't Replace**: Each iteration should ADD new acceptance criteria and requirements, not replace existing ones.

4. **Consolidation Only at End**: Only consolidate and refine during the post-processing step. During iterations, focus on adding comprehensive requirements.

5. **Preserve Context**: Maintain product context, user roles, and key decisions throughout all iterations.

---

## Iteration Applicability Rules

Based on product type, skip certain iterations:

| Product Type | Skip Iterations |
|--------------|----------------|
| `web` | `responsive-native (#8)` |
| `mobile-native` | `responsive-web (#7)` |
| `mobile-web` | `responsive-native (#8)` |
| `desktop` | `responsive-native (#8)` |
| `api` | `responsive-web (#7)`, `responsive-native (#8)` |

All other iterations apply to all product types.

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

[Additional sections as needed]

## Priority
[Must Have | Should Have | Could Have | Won't Have]

## Notes
[Any additional context, edge cases, or considerations]
```

---

## Notes

- This command orchestrates the complete user story generation workflow
- All iterations are executed sequentially, with context carried forward
- The final output is a production-ready, comprehensive user story
- Each iteration adds depth and completeness to the user story
- Post-processing ensures the final output is well-organized and non-redundant
