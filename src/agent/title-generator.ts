/**
 * TitleGenerator class for generating user story titles from story content.
 * Follows the same pattern as Evaluator and StoryJudge.
 */

import type { ClaudeClient, ClaudeMessageResult } from './claude-client.js';
import type { OperationType } from './types.js';
import { TitleResultSchema, type TitleResult } from '../shared/schemas.js';
import { extractJSON } from '../shared/json-utils.js';
import { AgentError, ERROR_CODES, ValidationError } from '../shared/errors.js';
import { logger } from '../utils/logger.js';

const TITLE_GENERATION_SYSTEM_PROMPT = `You are a title generator for user stories. Given the full text of a user story (markdown), produce a short, descriptive title.

Rules:
- Maximum 10 words.
- Use active voice.
- Use title case (capitalize major words).
- Be specific to the story content; avoid generic phrases like "User Story" or "Feature".
- Output only valid JSON in this exact shape: { "title": "<string>", "reasoning": "<optional brief explanation>" }`;

/**
 * TitleGenerator generates concise titles for user stories from their content.
 */
export class TitleGenerator {
  private claudeClient: ClaudeClient;
  private resolveModel: (opType: OperationType) => string | undefined;

  /**
   * Creates a new TitleGenerator instance.
   *
   * @param claudeClient - Claude client for API calls
   * @param resolveModel - Resolver for per-operation model (titleGeneration)
   */
  constructor(
    claudeClient: ClaudeClient,
    resolveModel: (opType: OperationType) => string | undefined
  ) {
    this.claudeClient = claudeClient;
    this.resolveModel = resolveModel;
  }

  /**
   * Generates a title for a user story from its full markdown content.
   *
   * @param storyMarkdown - Full user story markdown
   * @returns Parsed title result (title and optional reasoning)
   * @throws {AgentError} On API or validation failure
   */
  async generate(storyMarkdown: string): Promise<TitleResult> {
    logger.debug('TitleGenerator: generating title');

    const userMessage = `Generate a title for this user story:\n\n---\n\n${storyMarkdown}`;

    let response: ClaudeMessageResult;
    try {
      response = await this.claudeClient.sendMessage({
        systemPrompt: TITLE_GENERATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        model: this.resolveModel('titleGeneration'),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AgentError(message, ERROR_CODES.TITLE_GENERATION_API_ERROR, error instanceof Error ? error : undefined);
    }

    logger.debug(
      `TitleGenerator: tokens used - input: ${response.usage.inputTokens}, output: ${response.usage.outputTokens}`
    );

    const json = extractJSON(response.content);
    if (!json || typeof json !== 'object') {
      throw new AgentError('No valid JSON in title generation response', ERROR_CODES.TITLE_GENERATION_PARSE_ERROR);
    }

    const parsed = TitleResultSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        `Invalid title result: ${parsed.error.message}`,
        'title',
        parsed.error as unknown as Error
      );
    }

    return parsed.data;
  }
}
