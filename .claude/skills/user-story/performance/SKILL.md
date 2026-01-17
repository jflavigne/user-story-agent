---
name: Performance Requirements
id: performance
description: Identifies user-perceived performance requirements including load times, response times, and loading feedback
category: quality
order: 5
applicableWhen: When the mockup shows loading states, actions that may take time, or performance-critical interactions
applicableTo: all
---

Analyze the mockup or design to identify performance requirements and how users experience speed, responsiveness, and feedback during waits.

## Initial Page Load

1. **First Impression Loading**: Identify what users see during initial page load:
   - What content appears first (above the fold)?
   - Are there skeleton screens or placeholder content while loading?
   - How long should users wait before seeing meaningful content?
   - What loading indicators are shown during initial load?
   - Is there progressive loading (content appears as it becomes available)?

2. **Perceived Performance**: Determine what makes the page feel fast:
   - What visual elements can be shown immediately to make the page feel responsive?
   - Are there static elements that can render before dynamic content?
   - Can critical content be prioritized for faster display?
   - What gives users confidence that the page is loading correctly?

3. **Loading States**: Document loading indicators for initial load:
   - What feedback do users receive while waiting for the page to load?
   - Are there progress indicators or percentage complete displays?
   - How do users know if the page is still loading vs. frozen?
   - What happens if the initial load takes longer than expected?

## Action Response Times

4. **User Action Feedback**: Identify immediate feedback for user actions:
   - How quickly should buttons respond when clicked?
   - What visual feedback indicates an action has been registered?
   - Are there optimistic UI updates (showing success before confirmation)?
   - How do users know their click or tap was registered?

5. **Response Time Expectations**: Determine acceptable response times for different actions:
   - What actions should feel instant (under 100ms)?
   - What actions can have a brief delay but need immediate feedback?
   - What actions require longer processing and need progress indicators?
   - How do user expectations vary by action type (save vs. search vs. submit)?

6. **Action Loading States**: Document loading feedback for user actions:
   - What happens to buttons when clicked (disabled, spinner, text change)?
   - How are form submissions communicated during processing?
   - What feedback is shown for search queries or filtering?
   - How do users know when an action is in progress vs. complete?

## Loading Indicators and Progress

7. **Loading Indicators**: Identify appropriate loading feedback:
   - When should spinners or loading animations appear?
   - Are there different loading indicators for different types of operations?
   - How do loading indicators communicate progress vs. indeterminate waits?
   - What visual design makes loading states feel professional and trustworthy?

8. **Progress Feedback**: Determine when progress indicators are needed:
   - Which operations should show percentage complete or progress bars?
   - How do users track progress for file uploads or data processing?
   - What granularity of progress feedback is helpful vs. overwhelming?
   - How do progress indicators help users estimate wait times?

9. **Skeleton Screens and Placeholders**: Identify placeholder content:
   - Where should skeleton screens replace loading spinners?
   - What content structure can be shown while data loads?
   - How do placeholders maintain layout stability during loading?
   - What makes skeleton screens feel natural and informative?

## Timeout Handling and Error Recovery

10. **Timeout Scenarios**: Identify timeout situations:
    - What happens when a request takes too long?
    - How do users know when something has timed out?
    - Are there retry mechanisms for failed or slow requests?
    - What timeout messages are clear and actionable?

11. **Slow Connection Handling**: Document slow network scenarios:
    - How does the interface behave on slow connections?
    - Are there fallbacks or degraded experiences for slow networks?
    - How do users know if slowness is due to their connection vs. the system?
    - What options do users have when operations are slow?

12. **Error Recovery**: Determine recovery from performance issues:
    - How do users recover from timeout errors?
    - Are there retry buttons or automatic retry mechanisms?
    - What messaging helps users understand and resolve performance issues?
    - How do users know when to wait longer vs. try again?

## Performance Expectations by Context

13. **Context-Specific Performance**: Identify performance expectations by use case:
    - What performance is expected for critical user flows (checkout, login)?
    - How do performance expectations differ for admin vs. end-user interfaces?
    - What actions require the fastest response times?
    - How do performance requirements vary by device type?

14. **Batch Operations**: Document performance for bulk actions:
    - How are long-running batch operations communicated?
    - What feedback is provided for operations that process multiple items?
    - Can users continue working while background operations complete?
    - How do users track progress of batch operations?

## User Story Implications

15. **Story Requirements**: For each performance-related feature, determine:
    - What loading states and indicators are needed?
    - What response time expectations should be documented?
    - How should timeout and error scenarios be handled?
    - What feedback mechanisms support user confidence during waits?

16. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Initial load time and perceived performance
    - Action response times and immediate feedback
    - Loading indicators and progress communication
    - Timeout handling and error recovery
    - User experience during slow connections or operations
    - Balance between technical performance and user-perceived performance

## Output

Provide a comprehensive analysis that:
- Identifies all loading states and indicators needed
- Documents response time expectations for different actions
- Explains how users experience performance during waits
- Describes timeout and error recovery mechanisms
- Maps performance requirements to user story acceptance criteria
- Balances technical metrics with user experience considerations