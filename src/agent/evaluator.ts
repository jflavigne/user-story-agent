/**
 * Evaluator class for verifying iteration outputs meet quality standards
 * Implements Anthropic's Evaluator-Optimizer pattern
 */

import { ClaudeClient } from './claude-client.js';
import { EVALUATOR_SYSTEM_PROMPT } from '../prompts/evaluator-prompt.js';
import { VerificationResultSchema, type VerificationResult } from '../shared/schemas.js';
import { extractJSON } from '../shared/json-utils.js';
import { logger } from '../utils/logger.js';

/**
 * Evaluator class that verifies iteration outputs
 */
export class Evaluator {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new Evaluator instance
   *
   * @param claudeClient - The Claude client to use for evaluation
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Verifies that an iteration's output meets quality standards
   *
   * @param originalStory - The story before the iteration was applied
   * @param enhancedStory - The story after the iteration was applied
   * @param iterationId - ID of the iteration that was applied
   * @param iterationPurpose - Description of what the iteration was supposed to do
   * @returns Promise resolving to the verification result
   */
  async verify(
    originalStory: string,
    enhancedStory: string,
    iterationId: string,
    iterationPurpose: string
  ): Promise<VerificationResult> {
    logger.debug(`Evaluating iteration: ${iterationId}`);

    try {
      // Build the evaluation prompt
      const userMessage = `Evaluate the following iteration:

Iteration ID: ${iterationId}
Iteration Purpose: ${iterationPurpose}

Original Story:
${originalStory}

Enhanced Story:
${enhancedStory}

Please evaluate whether this iteration improved the story appropriately based on:
1. ENHANCEMENT: Did the iteration add value to the story?
2. COHERENCE: Are changes consistent with the original story?
3. RELEVANCE: Do changes match the iteration's stated purpose?
4. NON-DESTRUCTIVE: Were important elements preserved?

Respond with JSON in the format specified in your system prompt.`;

      // Call Claude API
      const response = await this.claudeClient.sendMessage({
        systemPrompt: EVALUATOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      // Parse and validate the response
      const json = extractJSON(response.content);
      if (!json) {
        throw new Error('No JSON found in evaluator response');
      }

      const verificationResult = VerificationResultSchema.parse(json);

      logger.debug(
        `Evaluation complete for ${iterationId}: passed=${verificationResult.passed}, ` +
          `score=${verificationResult.score}, issues=${verificationResult.issues.length}`
      );

      return verificationResult;
    } catch (error) {
      // Log error but return a failed verification result instead of throwing
      // This ensures verification failures don't block the main workflow
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Evaluation failed for iteration ${iterationId}: ${errorMessage}`);

      // Return a failed verification result
      return {
        passed: false,
        score: 0.0,
        reasoning: `Evaluation error: ${errorMessage}`,
        issues: [
          {
            severity: 'error',
            category: 'evaluation',
            description: `Failed to evaluate iteration: ${errorMessage}`,
            suggestion: 'Review the iteration output manually',
          },
        ],
      };
    }
  }
}
