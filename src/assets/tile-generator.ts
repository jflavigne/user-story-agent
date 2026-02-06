/**
 * Tile generation with path validation (null-byte checks for security).
 */

export interface GenerateTilesOptions {
  inputPath: string;
  outputDir: string;
  prefix?: string;
}

/**
 * Generate tiles from an input path.
 * @throws Error if any path/prefix contains null bytes
 */
export async function generateTiles(options: GenerateTilesOptions): Promise<void> {
  const { inputPath, outputDir, prefix = "" } = options;

  if (inputPath.includes("\0"))
    throw new Error("Invalid input path: null bytes not allowed");
  if (outputDir.includes("\0"))
    throw new Error("Invalid output directory: null bytes not allowed");
  if (prefix.includes("\0"))
    throw new Error("Invalid prefix: null bytes not allowed");

  // Implementation: tile generation logic
}

/**
 * Generate a single tile.
 * @throws Error if input or output path contains null bytes
 */
export async function generateSingleTile(
  inputPath: string,
  outputPath: string
): Promise<void> {
  if (inputPath.includes("\0"))
    throw new Error("Invalid input path: null bytes not allowed");
  if (outputPath.includes("\0"))
    throw new Error("Invalid output path: null bytes not allowed");

  // Implementation: single tile generation logic
}
