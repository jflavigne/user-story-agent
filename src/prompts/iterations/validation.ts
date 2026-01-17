/**
 * Validation Rules iteration prompt module
 * 
 * This prompt guides analysis of form field validation rules and user feedback
 * requirements from a user perspective.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for identifying form field validation rules and user feedback requirements.
 * 
 * This prompt guides analysis of (from user's perspective):
 * - Email format validation and feedback
 * - Password requirements and strength indicators
 * - Required field handling
 * - Error states and error message presentation
 * - Real-time vs submit-time validation feedback
 * - Field format constraints (phone, date, etc.)
 */
export const VALIDATION_PROMPT = `Analyze the mockup or design to identify form field validation rules and how users experience validation feedback.

## Validation Requirements

1. **Email Format Validation**: Identify email input fields and determine:
   - What feedback does the user receive when entering an invalid email format?
   - When does validation occur (as they type, on blur, on submit)?
   - What error message is shown to help the user correct their input?
   - Is there visual feedback (red border, error icon) in addition to text?
   - Can the user see examples of valid email formats?

2. **Password Requirements**: For password fields, identify:
   - What password requirements are communicated to the user?
   - How are password strength indicators displayed (weak, medium, strong)?
   - When are password requirements shown (before typing, during typing, on error)?
   - What feedback helps users understand why their password doesn't meet requirements?
   - Are there visual indicators (progress bars, checkmarks) for meeting requirements?

3. **Required Field Handling**: Document required field indicators:
   - How are required fields marked (asterisk, label text, visual indicator)?
   - When do users learn a field is required (always visible, on submit, on blur)?
   - What happens when a user tries to submit with missing required fields?
   - Are required fields clearly distinguishable from optional fields?
   - Is there consistent visual language for required field indicators?

## Error States and Messages

4. **Error Message Presentation**: Analyze how validation errors are communicated:
   - Where do error messages appear (below field, above field, inline, tooltip)?
   - What is the tone and clarity of error messages?
   - Do error messages explain what went wrong and how to fix it?
   - Are error messages persistent or do they disappear automatically?
   - Is there visual distinction between different error types (format, required, constraint)?

5. **Error State Indicators**: Identify visual error indicators:
   - Color changes (red borders, backgrounds)
   - Icons (error icons, warning symbols)
   - Field highlighting or emphasis
   - Disabled submit buttons when errors exist
   - Summary of errors at top of form (if applicable)

## Validation Timing

6. **Real-Time vs Submit-Time Validation**: Determine when validation occurs:
   - Which fields validate as the user types (real-time)?
   - Which fields validate when the user leaves the field (on blur)?
   - Which fields validate only when the form is submitted?
   - How does the user experience differ between these approaches?
   - Are there loading states or delays during validation?

7. **Progressive Validation**: Identify if validation is progressive:
   - Do users see validation feedback incrementally as they complete fields?
   - Can users see which fields still need attention?
   - Is there a clear path to resolving all validation errors?

## Field Format Constraints

8. **Format-Specific Validation**: For fields with format requirements:
   - Phone number formats and validation feedback
   - Date format requirements and date picker behavior
   - Number ranges (min/max) and how limits are communicated
   - Character limits (max length) and remaining character indicators
   - Pattern requirements (e.g., username rules, credit card formats)
   - File upload constraints (size, type) and error handling

9. **Format Feedback**: How are format requirements communicated:
   - Placeholder text showing expected format
   - Helper text explaining requirements
   - Examples of valid input
   - Format masks or auto-formatting (e.g., phone number formatting)
   - Clear indication of what format is expected

## User Experience Considerations

10. **Validation Success States**: Identify positive feedback:
    - Visual confirmation when fields are valid (green checkmarks, success icons)
    - Clear indication when all validation passes
    - Enabled submit buttons when form is valid
    - Success messages after successful submission

11. **Accessibility of Validation**: Consider how validation is accessible:
    - Are error messages announced to screen readers?
    - Can users navigate to error messages via keyboard?
    - Are error states clearly visible with sufficient color contrast?
    - Do error messages use clear, non-technical language?

## User Story Implications

12. **Story Requirements**: For each validation rule, determine:
    - What user actions trigger validation?
    - What feedback does the user receive?
    - How does the user know what to do to fix errors?
    - What prevents form submission when validation fails?
    - What indicates successful validation?

13. **Acceptance Criteria**: Document acceptance criteria that cover:
    - All validation rules and their triggers
    - Error message content and placement
    - Visual error indicators
    - Validation timing (real-time, on blur, on submit)
    - Success states and positive feedback
    - Accessibility of validation feedback

## Output

Provide a comprehensive analysis that:
- Lists all form fields and their validation requirements
- Describes validation timing and user experience
- Documents error messages and visual indicators
- Explains how users learn about and resolve validation errors
- Maps validation requirements to user story acceptance criteria`;

/**
 * Metadata for the validation rules iteration
 */
export const VALIDATION_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'validation',
  name: 'Validation Rules',
  description: 'Identifies form field validation rules and user feedback requirements',
  prompt: VALIDATION_PROMPT,
  category: 'validation',
  applicableWhen: 'When the mockup contains forms or input fields',
  order: 3,
  tokenEstimate: 1338, // ~5350 chars / 4
};
