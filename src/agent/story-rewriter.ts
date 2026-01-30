/**
 * LLM-based rewriter for section separation.
 * Removes jargon from top sections (As a/I want/So that, User-Visible Behavior, Outcome AC).
 */

import type { ClaudeClient } from './claude-client.js';
import type { JudgeRubric, SystemDiscoveryContext } from '../shared/types.js';
import { SECTION_SEPARATION_REWRITER_PROMPT } from '../prompts/rewriter/section-separation.js';
import { logger } from '../utils/logger.js';

/**
 * LLM-based rewriter for section separation violations.
 */
export class StoryRewriter {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new StoryRewriter instance.
   *
   * @param claudeClient - Claude client for API calls
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Rewrites the story to fix section-separation violations (jargon in top sections).
   * Consumes judge violations from a JudgeRubric or a raw string array.
   *
   * @param story - Full story markdown
   * @param violationsOrRubric - Judge rubric (uses sectionSeparation.violations) or list of violation descriptions
   * @param systemContext - System discovery context for consistency
   * @returns Rewritten story markdown
   */
  async rewriteForSectionSeparation(
    story: string,
    violationsOrRubric: string[] | JudgeRubric,
    systemContext: SystemDiscoveryContext
  ): Promise<string> {
    const violations = Array.isArray(violationsOrRubric)
      ? violationsOrRubric
      : (violationsOrRubric.sectionSeparation.violations ?? []);
    logger.debug(`StoryRewriter: rewriting for section separation (${violations.length} violations)`);

    const contextBlob = this.formatSystemContext(systemContext);
    const violationsList = violations.length > 0 ? violations.map((v) => `- ${v}`).join('\n') : '(none listed)';
    const userMessage = `## System context\n${contextBlob}\n\n## Violations to fix\n${violationsList}\n\n## Current story\n${story}\n\nRewrite the story to fix the violations. Output only the full story markdown.`;

    const response = await this.claudeClient.sendMessage({
      systemPrompt: SECTION_SEPARATION_REWRITER_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content?.trim() ?? '';
    if (!content) {
      throw new Error('Empty response from rewriter');
    }

    return content;
  }

  private formatSystemContext(ctx: SystemDiscoveryContext): string {
    const parts: string[] = [];
    if (ctx.timestamp) parts.push(`Timestamp: ${ctx.timestamp}`);
    const components = ctx.componentGraph ? Object.values(ctx.componentGraph.components) : [];
    if (components.length) {
      parts.push('Components: ' + components.map((c) => `${c.id} (${c.productName})`).join(', '));
    }
    const compEdges = ctx.componentGraph?.compositionEdges ?? [];
    if (compEdges.length) {
      parts.push('Composition: ' + compEdges.map((e) => `${e.parent}→${e.child}`).join(', '));
    }
    const coordEdges = ctx.componentGraph?.coordinationEdges ?? [];
    if (coordEdges.length) {
      parts.push('Coordination: ' + coordEdges.map((e) => `${e.from}→${e.to} (${e.via})`).join(', '));
    }
    const dataFlows = ctx.componentGraph?.dataFlows ?? [];
    if (dataFlows.length) {
      parts.push('Data flows: ' + dataFlows.map((d) => `${d.source}→${d.target}`).join(', '));
    }
    const stateModels = ctx.sharedContracts?.stateModels ?? [];
    if (stateModels.length) {
      parts.push('State models: ' + stateModels.map((s) => s.id).join(', '));
    }
    const eventRegistry = ctx.sharedContracts?.eventRegistry ?? [];
    if (eventRegistry.length) {
      parts.push('Events: ' + eventRegistry.map((e) => e.id).join(', '));
    }
    const standardStates = ctx.sharedContracts?.standardStates ?? [];
    if (standardStates.length) {
      parts.push('Standard states: ' + standardStates.map((s) => s.type).join(', '));
    }
    const contractDataFlows = ctx.sharedContracts?.dataFlows ?? [];
    if (contractDataFlows.length) {
      parts.push('Contract data flows: ' + contractDataFlows.map((d) => d.id).join(', '));
    }
    if (ctx.componentRoles?.length) {
      parts.push('Roles: ' + ctx.componentRoles.map((r) => `${r.componentId}: ${r.role}`).join(', '));
    }
    const vocabEntries = ctx.productVocabulary ? Object.entries(ctx.productVocabulary) : [];
    if (vocabEntries.length) {
      parts.push('Vocabulary: ' + vocabEntries.map(([k, v]) => `${k}→${v}`).join(', '));
    }
    if (ctx.referenceDocuments?.length) {
      parts.push('Reference documents: ' + ctx.referenceDocuments.length + ' item(s)');
    }
    return parts.length > 0 ? parts.join('\n') : '(no system context)';
  }
}
