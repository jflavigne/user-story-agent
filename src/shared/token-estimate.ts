/**
 * Claude token estimation for prompt text.
 *
 * Uses Anthropic's documented character-to-token rate (~4 characters per token for English).
 * Mixed prompt content (markdown, code) often tokenizes denser, so we use a conservative
 * factor to keep estimates within ~10% of actual usage.
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/token-counting
 * Exact counts are available via the API: client.messages.countTokens()
 */

/** Characters per token for estimation. Conservative for mixed prompt content (English + markdown/code). */
const CHARS_PER_TOKEN = 3.5;

/**
 * Estimates Claude input token count for a given text string.
 * Suitable for planning and display; not a substitute for response usage for billing.
 *
 * @param text - Raw prompt or message text
 * @returns Estimated number of input tokens (ceil)
 */
export function estimateClaudeInputTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
