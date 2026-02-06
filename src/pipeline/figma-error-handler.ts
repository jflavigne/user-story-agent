/**
 * Figma API error handling with exponential backoff.
 * Handles 403 rate limit errors with retry logic.
 */

export interface FigmaErrorContext {
  component: string;
  attempt: number;
}

/**
 * Handles Figma 403 errors with exponential backoff.
 * Retry delays: 5s, 15s, 45s (max 3 attempts).
 */
export async function handleFigma403WithBackoff(
  _error: Error,
  context: FigmaErrorContext
): Promise<void> {
  const maxAttempts = 3;
  const delays = [5_000, 15_000, 45_000]; // 5s, 15s, 45s

  if (context.attempt >= maxAttempts) {
    throw new Error(
      `Figma 403 after ${maxAttempts} attempts for ${context.component}`
    );
  }

  const delayMs = delays[context.attempt];
  console.log(
    `[Figma 403] ${context.component}: Waiting ${delayMs}ms before retry ${context.attempt + 1}/${maxAttempts}`
  );
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Detects if an error is a Figma 403 (Forbidden/rate limit) error.
 */
export function isFigma403Error(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("403") || error.message.includes("Forbidden"))
  );
}

/**
 * Sleep utility for exponential backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
