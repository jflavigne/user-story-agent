---
description: Enhance user stories with tracking and measurement requirements
allowed-tools: [read, write, search_replace]
---

# /user-story/analytics - Analytics Requirements Iteration

## Purpose

Enhance an existing user story by analyzing analytics requirements from a user experience perspective. This iteration adds acceptance criteria for user interaction tracking, duration and timing metrics, frequency analysis, user journey mapping, and engagement metrics.

## Usage

```
/user-story/analytics [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/analytics stories/checkout-flow.md
/user-story/analytics tickets/USA-12.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Analytics Iteration Prompt

Analyze the user story using the following prompt:

```
Analyze the mockup or design to identify analytics requirements and how user behavior patterns can be understood to improve the experience.

## User Interaction Tracking

1. **Button and Link Interactions**: Identify how users interact with clickable elements:
   - How do users click buttons, links, and interactive elements throughout the interface?
   - What actions do users take when presented with multiple options or navigation choices?
   - How do users interact with primary vs. secondary actions?
   - What happens when users click elements that trigger workflows or processes?

2. **Form Submission Patterns**: Document how users complete and submit forms:
   - How do users progress through multi-step forms?
   - What happens when users submit forms successfully or encounter errors?
   - How do users interact with form fields (tab order, field focus, validation)?
   - What actions do users take when forms are incomplete or invalid?

3. **Navigation Behavior**: Determine how users move through the application:
   - How do users navigate between pages, sections, or views?
   - What navigation paths do users take to reach specific features or content?
   - How do users use menus, breadcrumbs, back buttons, and other navigation aids?
   - What happens when users use browser navigation (back/forward buttons)?

4. **Search and Filter Interactions**: Identify how users search and filter content:
   - How do users enter search queries and refine their searches?
   - What filters do users apply and how do they combine multiple filters?
   - How do users interact with search results (clicking, sorting, pagination)?
   - What happens when users clear filters or start new searches?

5. **Content Interaction**: Document how users interact with content:
   - How do users click, expand, collapse, or interact with content elements?
   - What actions do users take with media (play, pause, download, share)?
   - How do users interact with lists, tables, and data displays?
   - What happens when users interact with interactive content (tooltips, modals, accordions)?

## Duration and Timing

6. **Time on Task**: Identify how long users spend on specific tasks:
   - How long do users take to complete forms, workflows, or multi-step processes?
   - What is the typical duration for users to accomplish key goals?
   - How do users experience time spent on different sections or features?
   - What happens when users take longer than expected to complete tasks?

7. **Time to Action**: Document timing from entry to key actions:
   - How quickly do users take their first action after arriving at a page or feature?
   - What is the time between when users see content and when they interact with it?
   - How do users experience the time from discovery to engagement?
   - What happens when users take immediate action vs. delayed action?

8. **Session Duration**: Determine how long users spend in sessions:
   - How long do users typically spend in a single session?
   - What is the total time users spend across multiple sessions?
   - How do users experience session length for different use cases?
   - What happens when users have very short vs. very long sessions?

9. **Wait and Load Times**: Identify how users experience waiting:
   - How long do users wait for pages, content, or features to load?
   - What happens during loading states and how do users react?
   - How do users experience delays in form submissions or actions?
   - What is the impact of wait times on user behavior and satisfaction?

## Frequency Analysis

10. **Action Frequency**: Document how often users perform specific actions:
    - How frequently do users perform key actions (logins, purchases, shares, etc.)?
    - What is the pattern of repeat actions over time?
    - How do users experience features they use frequently vs. rarely?
    - What happens when users perform actions multiple times in succession?

11. **Visit Patterns**: Determine how often users return to the application:
    - How frequently do users visit the application (daily, weekly, monthly)?
    - What is the pattern of return visits and user retention?
    - How do users experience the application differently on first visit vs. repeat visits?
    - What happens when users return after extended absences?

12. **Feature Usage Frequency**: Identify how often different features are used:
    - How frequently do users access different features or sections?
    - What is the pattern of feature discovery and adoption over time?
    - How do users experience features they use regularly vs. occasionally?
    - What happens when users discover new features or stop using existing ones?

13. **Content Consumption Frequency**: Document how often users consume content:
    - How frequently do users view, read, or interact with different types of content?
    - What is the pattern of content consumption over time?
    - How do users experience content they consume frequently vs. rarely?
    - What happens when users consume large amounts of content in single sessions?

## User Journey Mapping

14. **Entry Points**: Identify how users enter the application:
    - How do users arrive at the application (direct, search, referral, etc.)?
    - What entry points do users use and how do they differ?
    - How do users experience the application differently based on entry point?
    - What happens when users enter from different sources or contexts?

15. **Navigation Paths**: Document the paths users take through the application:
    - What sequences of pages or views do users follow to accomplish goals?
    - How do users navigate from discovery to action or completion?
    - What are the common paths users take vs. less common paths?
    - How do users experience different navigation paths to the same goal?

16. **Drop-off Points**: Determine where users leave or abandon processes:
    - At what points do users exit or abandon workflows?
    - Where do users stop engaging with content or features?
    - How do users experience friction points that cause them to leave?
    - What happens when users encounter obstacles that interrupt their journey?

17. **Goal Completion Paths**: Identify paths users take to complete goals:
    - What sequences of actions do users take to complete key goals?
    - How do users progress from start to completion of workflows?
    - What are the successful paths vs. paths that lead to abandonment?
    - How do users experience the journey from intent to completion?

18. **Cross-Feature Navigation**: Document how users move between features:
    - How do users navigate between different features or sections?
    - What connections do users make between related features?
    - How do users experience the relationship between different parts of the application?
    - What happens when users switch contexts or move between workflows?

## Engagement Metrics

19. **Feature Adoption**: Identify how users discover and adopt features:
    - How do users discover new features or functionality?
    - What is the pattern of feature adoption over time?
    - How do users experience features they've just discovered vs. familiar features?
    - What happens when users try features for the first time?

20. **Content Engagement**: Document how users engage with content:
    - How do users consume, interact with, and respond to different types of content?
    - What content do users view, read, watch, or listen to?
    - How do users experience content depth (surface vs. deep engagement)?
    - What happens when users engage with content in different ways?

21. **Interaction Depth**: Determine the depth of user interactions:
    - How deeply do users engage with features (surface clicks vs. deep exploration)?
    - What is the pattern of interaction depth across different features?
    - How do users experience shallow vs. deep engagement with the application?
    - What happens when users explore features more thoroughly?

22. **Return Engagement**: Identify patterns of returning user behavior:
    - How do returning users engage differently than first-time users?
    - What features or content do returning users prioritize?
    - How do users experience the application differently on repeat visits?
    - What happens when users return with specific goals vs. exploratory visits?

23. **Engagement Quality**: Document the quality and value of user engagement:
    - How do users experience meaningful vs. superficial interactions?
    - What indicates that users are successfully accomplishing their goals?
    - How do users experience satisfaction and value from their interactions?
    - What happens when users have positive vs. negative engagement experiences?

## User Story Implications

24. **Story Requirements**: For each analytics requirement, determine:
    - How user interactions reveal user behavior patterns
    - How duration and timing metrics help understand user experience
    - How frequency analysis shows usage patterns and user needs
    - How user journey mapping reveals paths, drop-offs, and completion patterns
    - How engagement metrics indicate feature adoption and content consumption
    - How analytics insights can inform improvements to user experience

25. **Acceptance Criteria**: Document acceptance criteria that cover:
    - User interaction tracking for buttons, forms, navigation, and content
    - Duration and timing metrics for tasks, actions, sessions, and wait times
    - Frequency analysis for actions, visits, feature usage, and content consumption
    - User journey mapping for entry points, paths, drop-offs, and goal completion
    - Engagement metrics for feature adoption, content engagement, interaction depth, and return behavior
    - Focus on user behavior patterns and experience insights, not technical analytics implementation

## Output

Provide a comprehensive analysis that:
- Identifies user interaction tracking requirements from a user behavior perspective
- Documents duration and timing metrics that reveal user experience patterns
- Explains frequency analysis that shows usage patterns and user needs
- Describes user journey mapping that reveals navigation paths and drop-off points
- Maps engagement metrics that indicate feature adoption and content consumption
- Focuses on user experience behaviors and insights, not technical analytics implementation details
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the analytics iteration prompt to identify:
   - User interaction tracking requirements
   - Duration and timing metrics
   - Frequency analysis needs
   - User journey mapping points
   - Engagement metrics
3. Add new acceptance criteria for analytics
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New analytics acceptance criteria clearly marked with a "### Analytics" section
- Notes on key user behavior metrics and insights

---

## Notes

- This iteration focuses on user behavior patterns and experience insights
- New criteria should be additive, not replacing existing requirements
- Consider interaction tracking, timing, frequency, journeys, and engagement
- Focus on understanding user behavior, not technical analytics implementation
