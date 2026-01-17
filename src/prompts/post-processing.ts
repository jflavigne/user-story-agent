/**
 * Post-processing prompt for refining and consolidating user stories
 */

/**
 * Post-processing prompt that provides guidelines for refining user stories
 * and acceptance criteria after initial generation.
 * 
 * This prompt focuses on consolidation, formatting, and ensuring completeness
 * while maintaining user-centric focus.
 */
export const POST_PROCESSING_PROMPT = `Assistant, please review the user story and acceptance criteria for any redundancies or overlaps. Ensure that each requirement is distinct and concise. Consider the following guidelines:

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

After refining, present the updated user story with all sections completed, including priority if applicable.`;

/**
 * Metadata for the post-processing prompt
 */
export const POST_PROCESSING_PROMPT_METADATA = {
  name: 'Post-Processing Prompt',
  description: 'Guidelines for consolidating, formatting, and refining user stories and acceptance criteria',
  tokenEstimate: 620, // ~2481 chars / 4
};
