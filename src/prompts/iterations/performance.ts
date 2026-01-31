/**
 * Performance Requirements iteration prompt module
 * 
 * This prompt guides analysis of user-perceived performance requirements
 * and how users experience load times, response times, and feedback during waits.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for identifying performance requirements from a user experience perspective.
 * 
 * This prompt guides analysis of:
 * - Initial page load times and perceived performance
 * - Action response times and user expectations
 * - Loading indicators and progress feedback
 * - Timeout handling and error recovery
 * - Balance between technical metrics and user experience
 */
export const PERFORMANCE_PROMPT = `# PATH SCOPE
This iteration is allowed to modify only these sections:
- systemAcceptanceCriteria (AC-SYS-* items)
- implementationNotes.performanceNotes
- implementationNotes.loadingStates

All patches MUST target only these paths. Patches targeting other sections will be rejected.

# OUTPUT FORMAT
Respond with valid JSON only (no markdown code fence, no prose):
{
  "patches": [
    {
      "op": "add",
      "path": "systemAcceptanceCriteria",
      "item": { "id": "AC-SYS-001", "text": "..." },
      "metadata": { "advisorId": "performance", "reasoning": "..." }
    }
  ]
}

Required fields:
- op: "add" | "replace" | "remove"
- path: Must be one of the allowed paths above
- item: { id: string, text: string } for add/replace
- match: { id?: string, textEquals?: string } for replace/remove
- metadata: { advisorId: "performance", reasoning?: string }

---

# VISION ANALYSIS (when images provided)

If mockup images are provided, use visual evidence to identify:
- **Loading indicators**: Spinners, progress bars, skeleton placeholders, or "loading" text
- **Action feedback**: Buttons or controls that show in-progress state (disabled, spinner, label change)
- **Progressive disclosure**: Content that appears in stages (above-the-fold first, then rest)
- **Empty or placeholder states**: Placeholders for content not yet loaded
- **Timeout/error recovery**: Any retry or error messaging shown in the design

Prioritize what you see in the image over text descriptions when both are present.

## FUNCTIONAL VISION ANALYSIS

Extract functional implications from visual design:

1. **Loading Presence → Feedback Requirement**
   - Where loading appears: "Initial load shows loading indicator or skeleton"
   - DO NOT specify spinner size, animation duration, or skeleton dimensions - describe that feedback is present

2. **Progress vs Indeterminate → User Expectation**
   - Progress bar vs spinner: "Long operation shows progress; short operation shows indeterminate loading"
   - DO NOT specify bar height or color - describe type of feedback (progress vs indeterminate)

3. **Action State → Response Confirmation**
   - Button during submit: "Submit shows in-progress state (e.g. disabled + indicator) until complete"
   - DO NOT specify exact disabled style or icon size - describe that user sees action was registered

4. **Placeholder/Skeleton → Perceived Performance**
   - Skeleton vs blank: "Content area shows skeleton or placeholder while loading"
   - DO NOT specify skeleton line width or spacing - describe that layout is stable and loading is communicated

---

## ANTI-PATTERNS: What NOT to Extract (Performance)

❌ **Exact dimensions**: "48px spinner", "4px progress bar height", "skeleton 200px wide"
✓ **Functional feedback**: "Loading indicator is visible", "Progress is communicated", "Skeleton preserves layout"

❌ **Animation specs**: "300ms fade-in", "1s pulse animation", "ease-in-out"
✓ **Functional timing**: "Loading state is visible until complete", "Transition is smooth"

❌ **Color values**: "Spinner #0066CC", "Progress bar green"
✓ **Functional color**: "Loading indicator is visible against background", "Progress state is distinguishable"

❌ **Pixel/time values**: "Spinner 24px", "Show after 200ms delay"
✓ **Functional behavior**: "Immediate feedback on action", "Loading visible for long operations"

---

## EXAMPLES: Functional vs Visual Extraction (Performance)

**WRONG (Over-specified):**
"Submit button shows 24px blue spinner, disabled with opacity 0.6; progress bar is 4px height, green fill, 300ms animation"

**RIGHT (Functional):**
"Submit shows in-progress state (e.g. disabled with loading indicator) until response; user receives clear feedback that action was registered"

**WRONG:** "Skeleton has 3 lines 16px height, 8px gap, gray #E0E0E0"
**RIGHT:** "Initial load shows skeleton or placeholder for content area so layout is stable and loading is communicated; content replaces skeleton when ready"

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

Return AdvisorOutput only: a JSON object with a "patches" array. Each patch must target systemAcceptanceCriteria, implementationNotes.performanceNotes, or implementationNotes.loadingStates. Add or replace items to document:
- Loading states and indicators needed
- Response time expectations for different actions
- Timeout and error recovery mechanisms
- Acceptance criteria for performance (AC-SYS-*)
- Performance and loading notes in implementationNotes`;

/**
 * Metadata for the performance requirements iteration
 */
export const PERFORMANCE_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'performance',
  name: 'Performance Requirements',
  description: 'Identifies user-perceived performance requirements including load times, response times, and loading feedback',
  prompt: PERFORMANCE_PROMPT,
  category: 'quality',
  applicableWhen: 'When the mockup shows loading states, actions that may take time, or performance-critical interactions',
  order: 5,
  tokenEstimate: 1561, // ~6243 chars / 4
  supportsVision: true,
};
