#!/usr/bin/env node
/**
 * User Story Agent - CLI Entry Point
 *
 * Usage:
 *   npm run agent -- --mode individual --iterations validation,accessibility
 *   npm run agent -- --mode workflow --product-type web
 *   npm run agent -- --mode interactive --input story.txt --output enhanced.txt
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import {
  createAgent,
  mergeConfigWithDefaults,
  VERSION,
  PRODUCT_TYPES,
  WORKFLOW_ORDER,
  getIterationById,
  loadSkills,
  initializeIterationPrompts,
} from './index.js';
import type {
  UserStoryAgentConfig,
  IterationOption,
  ProductContext,
  StreamEventUnion,
  ModelConfig,
  QualityPreset,
} from './index.js';
import { QUALITY_PRESETS } from './index.js';
import type { IterationId, ProductType } from './shared/iteration-registry.js';
import type { ImageInput } from './utils/image-utils.js';
import { logger, initializeLogger } from './utils/logger.js';
import { EvaluationError } from './agent/evaluator.js';

/**
 * CLI argument definitions
 */
interface CliArgs {
  mode?: 'individual' | 'workflow' | 'interactive' | 'system-workflow';
  iterations?: string;
  productType?: string;
  input?: string;
  output?: string;
  apiKey?: string;
  model?: string;
  qualityTier?: string;
  modelDiscovery?: string;
  modelIteration?: string;
  modelJudge?: string;
  modelRewrite?: string;
  modelInterconnection?: string;
  modelGlobalJudge?: string;
  modelEvaluator?: string;
  maxRetries?: string;
  streamTimeout?: string;
  help?: boolean;
  version?: boolean;
  verbose?: boolean;
  debug?: boolean;
  quiet?: boolean;
  stream?: boolean;
  verify?: boolean;
  /** When true (default), throw on evaluator crash; --no-strict-evaluation disables */
  strictEvaluation?: boolean;
  listSkills?: boolean;
  mockupImages?: string;
  /** Base directory for artifacts (requires --project) */
  saveArtifacts?: string;
  /** Project name for artifact organization (required with --save-artifacts) */
  project?: string;
}

/**
 * Prints usage information
 */
function printUsage(): void {
  console.log(`
User Story Agent v${VERSION}

Usage: npm run agent -- [options]

Options:
  --mode <mode>           Agent mode: individual, workflow, interactive, or system-workflow (required)
  --iterations <ids>      Comma-separated iteration IDs (required for individual mode)
  --product-type <type>   Product type (required for workflow mode)
                          Values: ${PRODUCT_TYPES.join(', ')}
  --input <file>          Input file path (default: stdin)
  --output <file>         Output file path (default: stdout)
  --api-key <key>         Anthropic API key (default: ANTHROPIC_API_KEY env var)
                          Note: Prefer env var; CLI args may be visible in process lists
  --model <model>         Single Claude model for all operations (overrides --quality-tier)
  --quality-tier <preset> Quality preset: balanced (default), premium, or fast
  --model-discovery <m>   Model for system discovery (Pass 0)
  --model-iteration <m>    Model for story iterations
  --model-judge <m>       Model for story quality judge (Pass 1c)
  --model-rewrite <m>     Model for section-separation rewriter
  --model-interconnection Model for Pass 2 interconnection
  --model-global-judge    Model for global consistency (Pass 2b)
  --model-evaluator <m>   Model for iteration verification
  --max-retries <n>       Maximum number of retry attempts for API calls (default: 3)
  --stream-timeout <ms>   Stream creation timeout in milliseconds (default: 60000)
  --stream                Enable streaming output for real-time progress
  --verify                Enable verification of each iteration's output quality
  --no-strict-evaluation  On evaluator crash, continue with degraded state (default: fail fast)
  --mockup-images <paths> Comma-separated mockup image paths (PNG, JPG, WEBP, GIF)
                          Images are analyzed alongside text descriptions
  --save-artifacts <dir>  Save pipeline artifacts to directory
  --project <name>        Project name for artifact organization (required with --save-artifacts)
  --list-skills           List all available skills and exit
  --verbose               Enable info-level logging (default)
  --debug                 Enable debug-level logging (most verbose)
  --quiet                 Suppress all output except errors
  --help                  Show this help message
  --version               Show version number

Quality presets (--quality-tier):
  balanced  Discovery/judge/globalJudge: opus-4.5; iteration/evaluator: haiku-4.5; rewrite/interconnection: sonnet-4.5
  premium   All operations use opus-4.5
  fast      Discovery/judge/rewrite/interconnection/globalJudge: sonnet-4.5; iteration/evaluator: haiku-4.5

Environment Variables:
  ANTHROPIC_API_KEY       API key for Anthropic Claude API
  STREAM_TIMEOUT_MS       Stream creation timeout in milliseconds (default: 60000)
  LOG_LEVEL               Logging level: silent, error, warn, info, debug

Available Iterations:
  ${WORKFLOW_ORDER.join(', ')}

Examples:
  # Individual mode with specific iterations
  echo "As a user..." | npm run agent -- --mode individual --iterations validation,accessibility

  # Use premium quality (all operations opus-4.5)
  npm run agent -- --mode individual --iterations validation --quality-tier premium --input story.md

  # Override only judge model
  npm run agent -- --mode individual --iterations validation --model-judge claude-opus-4-20250514

  # Workflow mode for web product
  cat story.txt | npm run agent -- --mode workflow --product-type web

  # Interactive mode with file I/O
  npm run agent -- --mode interactive --input story.txt --output enhanced.txt
`);
}

/**
 * Parses command line arguments
 *
 * @param argv - Command line arguments array
 * @returns Parsed CLI arguments
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--mode':
        if (i + 1 < argv.length) {
          args.mode = argv[++i] as CliArgs['mode'];
        }
        break;
      case '--iterations':
        if (i + 1 < argv.length) {
          args.iterations = argv[++i];
        }
        break;
      case '--product-type':
        if (i + 1 < argv.length) {
          args.productType = argv[++i];
        }
        break;
      case '--input':
        if (i + 1 < argv.length) {
          args.input = argv[++i];
        }
        break;
      case '--output':
        if (i + 1 < argv.length) {
          args.output = argv[++i];
        }
        break;
      case '--api-key':
        if (i + 1 < argv.length) {
          args.apiKey = argv[++i];
        }
        break;
      case '--model':
        if (i + 1 < argv.length) {
          args.model = argv[++i];
        }
        break;
      case '--quality-tier':
        if (i + 1 < argv.length) {
          args.qualityTier = argv[++i];
        }
        break;
      case '--model-discovery':
        if (i + 1 < argv.length) {
          args.modelDiscovery = argv[++i];
        }
        break;
      case '--model-iteration':
        if (i + 1 < argv.length) {
          args.modelIteration = argv[++i];
        }
        break;
      case '--model-judge':
        if (i + 1 < argv.length) {
          args.modelJudge = argv[++i];
        }
        break;
      case '--model-rewrite':
        if (i + 1 < argv.length) {
          args.modelRewrite = argv[++i];
        }
        break;
      case '--model-interconnection':
        if (i + 1 < argv.length) {
          args.modelInterconnection = argv[++i];
        }
        break;
      case '--model-global-judge':
        if (i + 1 < argv.length) {
          args.modelGlobalJudge = argv[++i];
        }
        break;
      case '--model-evaluator':
        if (i + 1 < argv.length) {
          args.modelEvaluator = argv[++i];
        }
        break;
      case '--max-retries':
        if (i + 1 < argv.length) {
          args.maxRetries = argv[++i];
        }
        break;
      case '--stream-timeout':
        if (i + 1 < argv.length) {
          args.streamTimeout = argv[++i];
        }
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;
      case '--verbose':
        args.verbose = true;
        break;
      case '--debug':
        args.debug = true;
        break;
      case '--quiet':
      case '-q':
        args.quiet = true;
        break;
      case '--stream':
        args.stream = true;
        break;
      case '--verify':
        args.verify = true;
        break;
      case '--no-strict-evaluation':
        args.strictEvaluation = false;
        break;
      case '--mockup-images':
        if (i + 1 < argv.length) {
          args.mockupImages = argv[++i];
        }
        break;
      case '--list-skills':
        args.listSkills = true;
        break;
      case '--save-artifacts':
        if (i + 1 < argv.length) {
          args.saveArtifacts = argv[++i];
        }
        break;
      case '--project':
        if (i + 1 < argv.length) {
          args.project = argv[++i];
        }
        break;
    }
  }

  return args;
}

/**
 * Builds model config from CLI args: single --model, or --quality-tier with optional per-operation overrides.
 */
function buildModelFromArgs(args: CliArgs): string | ModelConfig | QualityPreset {
  if (args.model) return args.model;
  const preset = args.qualityTier as QualityPreset | undefined;
  const hasOverrides =
    !!args.modelDiscovery ||
    !!args.modelIteration ||
    !!args.modelJudge ||
    !!args.modelRewrite ||
    !!args.modelInterconnection ||
    !!args.modelGlobalJudge ||
    !!args.modelEvaluator;
  const base =
    preset === 'balanced' || preset === 'premium' || preset === 'fast'
      ? { ...QUALITY_PRESETS[preset] }
      : (preset ? {} : { ...QUALITY_PRESETS.balanced });
  const config: ModelConfig = { ...base };
  if (args.modelDiscovery) config.discovery = args.modelDiscovery;
  if (args.modelIteration) config.iteration = args.modelIteration;
  if (args.modelJudge) config.judge = args.modelJudge;
  if (args.modelRewrite) config.rewrite = args.modelRewrite;
  if (args.modelInterconnection) config.interconnection = args.modelInterconnection;
  if (args.modelGlobalJudge) config.globalJudge = args.modelGlobalJudge;
  if (args.modelEvaluator) config.evaluator = args.modelEvaluator;
  if (hasOverrides || (preset !== 'balanced' && preset !== 'premium' && preset !== 'fast')) {
    return config;
  }
  return preset ?? 'balanced';
}

/**
 * Validates and normalizes a file path to prevent path traversal attacks
 *
 * @param filePath - The file path to validate
 * @param baseDir - The base directory to resolve relative paths against
 * @returns The normalized absolute path
 * @throws {Error} If the path attempts traversal outside allowed directories
 */
function validateFilePath(filePath: string, baseDir: string = process.cwd()): string {
  // Resolve to absolute path
  const absolutePath = path.resolve(baseDir, filePath);
  const normalizedBase = path.resolve(baseDir);

  // Ensure the resolved path is within the base directory or is an absolute path
  // Allow absolute paths but prevent relative traversal attacks
  if (path.isAbsolute(filePath)) {
    return absolutePath;
  }

  // For relative paths, ensure they don't escape the base directory
  if (!absolutePath.startsWith(normalizedBase)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  return absolutePath;
}

/**
 * Reads input from file or stdin
 *
 * @param inputPath - Optional file path to read from
 * @returns Promise resolving to the file contents
 */
async function readInput(inputPath?: string): Promise<string> {
  if (inputPath) {
    const validatedPath = validateFilePath(inputPath);
    return fs.readFile(validatedPath, 'utf-8');
  }

  // Read from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Writes output to file or stdout
 *
 * @param content - Content to write
 * @param outputPath - Optional file path to write to
 */
async function writeOutput(content: string, outputPath?: string): Promise<void> {
  if (outputPath) {
    const validatedPath = validateFilePath(outputPath);
    await fs.writeFile(validatedPath, content, 'utf-8');
  } else {
    console.log(content);
  }
}

/**
 * Validates an iteration ID against the registry
 *
 * @param id - The iteration ID to validate
 * @returns True if the ID is valid
 */
function isValidIterationId(id: string): id is IterationId {
  return getIterationById(id) !== undefined;
}

/**
 * Creates an interactive selection callback for CLI use
 *
 * @returns Callback function for iteration selection
 */
function createInteractiveSelectionCallback(): (options: IterationOption[]) => Promise<IterationId[]> {
  return async (options: IterationOption[]): Promise<IterationId[]> => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.error('\nAvailable iterations:');
    options.forEach((opt, index) => {
      console.error(`  ${index + 1}. [${opt.id}] ${opt.name} - ${opt.description}`);
    });
    console.error('\nEnter iteration IDs (comma-separated) or numbers (e.g., "1,3,5" or "validation,security"):');

    return new Promise((resolve) => {
      rl.question('> ', (answer) => {
        rl.close();

        const input = answer.trim();
        if (!input) {
          resolve([]);
          return;
        }

        const parts = input.split(',').map((s) => s.trim());
        const selectedIds: IterationId[] = [];
        const validOptionIds = new Set(options.map((opt) => opt.id));

        for (const part of parts) {
          // Check if it's a number
          const num = parseInt(part, 10);
          if (!isNaN(num) && num >= 1 && num <= options.length) {
            selectedIds.push(options[num - 1].id);
          } else if (validOptionIds.has(part as IterationId)) {
            // Validate iteration ID before adding
            selectedIds.push(part as IterationId);
          } else {
            console.error(`Warning: Ignoring invalid iteration ID: ${part}`);
          }
        }

        resolve(selectedIds);
      });
    });
  };
}

/**
 * Lists all available skills
 */
async function listSkills(): Promise<void> {
  try {
    const skills = await loadSkills('.claude/skills/user-story');
    
    // Group by category
    const byCategory = new Map<string, typeof skills>();
    for (const skill of skills) {
      const cat = skill.metadata.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(skill);
    }
    
    console.log('\nAvailable Skills (User Story Iterations):\n');
    
    // Sort categories for consistent output
    const categories = Array.from(byCategory.keys()).sort();
    
    for (const category of categories) {
      console.log(`  Category: ${category}`);
      const categorySkills = byCategory.get(category)!;
      
      for (const skill of categorySkills) {
        const id = skill.metadata.id.padEnd(25);
        const name = skill.metadata.name;
        const desc = skill.metadata.description;
        console.log(`    ${id} ${name}`);
        console.log(`    ${' '.repeat(27)}${desc}`);
        if (skill.metadata.applicableWhen) {
          console.log(`    ${' '.repeat(27)}When: ${skill.metadata.applicableWhen}`);
        }
        console.log();
      }
    }
  } catch (error) {
    logger.error(`Failed to load skills: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

/**
 * Derives a project name from input file path or generates a timestamp-based name.
 *
 * @param inputPath - Optional input file path
 * @returns Project name derived from input or timestamp
 */
function deriveProjectName(inputPath?: string): string {
  if (inputPath) {
    // Extract filename without extension: "components.csv" -> "components"
    const basename = inputPath.split('/').pop() || inputPath;
    const nameWithoutExt = basename.replace(/\.[^.]+$/, '');
    // Sanitize: replace non-alphanumeric with dashes
    const sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (sanitized) return sanitized;
  }
  // Fallback: timestamp-based name
  return `run-${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Validates CLI arguments and returns an error message if invalid
 *
 * @param args - Parsed CLI arguments
 * @returns Error message if invalid, null otherwise
 */
function validateArgs(args: CliArgs): string | null {
  if (!args.mode) {
    return 'Missing required argument: --mode';
  }

  if (!['individual', 'workflow', 'interactive', 'system-workflow'].includes(args.mode)) {
    return `Invalid mode: ${args.mode}. Must be one of: individual, workflow, interactive, system-workflow`;
  }

  if (args.mode === 'individual' && !args.iterations) {
    return 'Individual mode requires --iterations argument';
  }

  if ((args.mode === 'workflow' || args.mode === 'system-workflow') && !args.productType) {
    return `${args.mode} mode requires --product-type argument`;
  }

  if (args.productType && !PRODUCT_TYPES.includes(args.productType as ProductType)) {
    return `Invalid product type: ${args.productType}. Must be one of: ${PRODUCT_TYPES.join(', ')}`;
  }

  if (args.qualityTier && !['balanced', 'premium', 'fast'].includes(args.qualityTier)) {
    return `Invalid quality tier: ${args.qualityTier}. Must be one of: balanced, premium, fast`;
  }

  // Validate iteration IDs if provided
  if (args.iterations) {
    const ids = args.iterations.split(',').map((s) => s.trim());
    const invalidIds = ids.filter((id) => !isValidIterationId(id));
    if (invalidIds.length > 0) {
      return `Invalid iteration ID(s): ${invalidIds.join(', ')}. Available: ${WORKFLOW_ORDER.join(', ')}`;
    }
  }

  return null;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  // Initialize logger early (before any logging)
  initializeLogger({
    verbose: args.verbose,
    debug: args.debug,
    quiet: args.quiet,
  });

  // Handle help and version
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (args.version) {
    console.log(`User Story Agent v${VERSION}`);
    process.exit(0);
  }

  // Handle --list-skills
  if (args.listSkills) {
    await listSkills();
    process.exit(0);
  }

  // Load iteration prompts from markdown (required before validation and createAgent)
  const promptsDir = path.join(process.cwd(), 'src', 'prompts', 'iterations');
  await initializeIterationPrompts(promptsDir);

  // Validate arguments
  const validationError = validateArgs(args);
  if (validationError) {
    logger.error(validationError);
    console.error('\nRun with --help for usage information.');
    process.exit(1);
  }

  if (args.saveArtifacts && !args.project) {
    console.error('Error: --project is required when using --save-artifacts');
    process.exit(1);
  }

  try {
    // Start session tracking
    logger.startSession();
    logger.debug(`Mode: ${args.mode}, Input: ${args.input || 'stdin'}, Output: ${args.output || 'stdout'}`);

    // Read input story
    const story = await readInput(args.input);
    if (!story.trim()) {
      logger.error('Input story is empty');
      process.exit(1);
    }
    logger.debug(`Input story: ${story.length} characters`);

    // Build configuration
    const partialConfig: Partial<UserStoryAgentConfig> = {
      mode: args.mode,
      apiKey: args.apiKey,
      model: buildModelFromArgs(args),
    };

    // Parse maxRetries if provided
    if (args.maxRetries) {
      const maxRetries = parseInt(args.maxRetries, 10);
      if (isNaN(maxRetries) || maxRetries < 1) {
        logger.error(`Invalid --max-retries value: ${args.maxRetries}. Must be a positive integer.`);
        process.exit(1);
      }
      partialConfig.maxRetries = maxRetries;
    }

    // Parse streamTimeout if provided
    if (args.streamTimeout) {
      const streamTimeout = parseInt(args.streamTimeout, 10);
      const maxStreamTimeout = 600000; // 10 minutes
      if (
        isNaN(streamTimeout) ||
        streamTimeout < 1 ||
        streamTimeout > maxStreamTimeout
      ) {
        logger.error(
          `Invalid --stream-timeout value: ${args.streamTimeout}. Must be a positive integer up to ${maxStreamTimeout}.`
        );
        process.exit(1);
      }
      partialConfig.streamTimeout = streamTimeout;
    }

    // Add iterations for individual mode (already validated)
    if (args.mode === 'individual' && args.iterations) {
      partialConfig.iterations = args.iterations.split(',').map((s) => s.trim()) as IterationId[];
    }

    // Add product context for workflow and system-workflow modes
    if ((args.mode === 'workflow' || args.mode === 'system-workflow') && args.productType) {
      partialConfig.productContext = {
        productName: args.project ?? 'CLI Product',
        productType: args.productType,
        clientInfo: 'CLI User',
        targetAudience: 'End Users',
        keyFeatures: [],
        businessContext: 'Generated via CLI',
      } as ProductContext;
    }

    // Add selection callback for interactive mode
    if (args.mode === 'interactive') {
      partialConfig.onIterationSelection = createInteractiveSelectionCallback();
    }

    // Add streaming option
    if (args.stream) {
      partialConfig.streaming = true;
    }

    // Add verification option
    if (args.verify) {
      partialConfig.verify = true;
    }
    if (args.strictEvaluation === false) {
      partialConfig.strictEvaluation = false;
    }

    // Add mockup images for vision (Pass 0 and vision-enabled iterations)
    let mockupImageInputs: ImageInput[] | undefined;
    if (args.mockupImages) {
      const imagePaths = args.mockupImages.split(',').map((s) => s.trim()).filter(Boolean);
      mockupImageInputs = imagePaths.map((imagePath) => {
        // Additional security: only allow relative paths for mockup images
        if (path.isAbsolute(imagePath)) {
          throw new Error(`Mockup image paths must be relative to current directory: ${imagePath}`);
        }
        const validated = validateFilePath(imagePath);
        return {
          path: validated,
        };
      });
    }
    if (mockupImageInputs?.length) {
      partialConfig.mockupImages = mockupImageInputs;
    }

    // ALWAYS save artifacts - derive defaults if not provided
    const artifactBaseDir = args.saveArtifacts || './artifacts';
    const projectName = args.project || deriveProjectName(args.input);
    partialConfig.artifactConfig = {
      baseDir: artifactBaseDir,
      projectName: projectName,
    };
    logger.info(`Artifacts will be saved to: ${artifactBaseDir}/projects/${projectName}/`);

    // Create and run agent
    const config = mergeConfigWithDefaults(partialConfig);
    const agent = createAgent(config);

    // Set up streaming output if enabled
    if (args.stream) {
      agent.on('stream', (event: StreamEventUnion) => {
        switch (event.type) {
          case 'start':
            process.stderr.write(`\n[${event.iterationId}] Starting...\n`);
            break;
          case 'chunk':
            process.stderr.write(event.content);
            break;
          case 'complete':
            process.stderr.write(`\n[${event.iterationId}] Complete (${event.tokenUsage.input} in / ${event.tokenUsage.output} out tokens)\n`);
            break;
          case 'error':
            process.stderr.write(`\n[${event.iterationId}] Error: ${event.error.message}\n`);
            break;
        }
      });
    }

    // System-workflow mode: run full pipeline with artifact saving
    if (args.mode === 'system-workflow') {
      // Parse story seeds from input (one per line, or CSV rows)
      const storySeeds = story.includes(',') && story.includes('\n')
        ? story.split('\n').filter(line => line.trim() && !line.startsWith('ID,'))  // CSV: skip header, use rows as seeds
        : story.split('\n').filter(line => line.trim());  // Plain text: one seed per line

      logger.info(`Running system-workflow with ${storySeeds.length} story seeds`);

      const systemResult = await agent.runSystemWorkflow(storySeeds);

      // Output all stories
      const allContent = systemResult.stories.map(s => s.content).join('\n\n---\n\n');
      await writeOutput(allContent, args.output);

      logger.info(`Generated ${systemResult.stories.length} stories`);
      logger.info(`Passes completed: ${systemResult.metadata.passesCompleted.join(', ')}`);

      if (systemResult.metadata.fixesApplied > 0) {
        logger.info(`Fixes applied: ${systemResult.metadata.fixesApplied}`);
      }
      if (systemResult.metadata.fixesFlaggedForReview > 0) {
        logger.warn(`Fixes flagged for review: ${systemResult.metadata.fixesFlaggedForReview}`);
      }

      logger.endSession();

      if (!args.output) {
        console.error(`\n--- System Workflow Summary ---`);
        console.error(`Stories: ${systemResult.stories.length}`);
        console.error(`Passes: ${systemResult.metadata.passesCompleted.join(' → ')}`);
      }
    } else {
      // Standard modes: individual, workflow, interactive
      const result = await agent.processUserStory(story);

      if (result.success) {
        await writeOutput(result.enhancedStory, args.output);
        logger.info(`Processed ${result.appliedIterations.length} iterations`);

        // Show verification results if enabled
        if (args.verify) {
          const verifiedIterations = result.iterationResults.filter((r) => r.verification);
          const passedCount = verifiedIterations.filter((r) => r.verification?.passed).length;
          const failedCount = verifiedIterations.length - passedCount;
          const evalFailedIterations = verifiedIterations.filter(
            (r) => r.verification?.evaluationFailed === true
          );

          if (evalFailedIterations.length > 0) {
            logger.error(
              `Evaluation failed (evaluator crashed) for ${evalFailedIterations.length} iteration(s). ` +
                'Run with --no-strict-evaluation to continue with degraded state.'
            );
            for (const iterResult of evalFailedIterations) {
              logger.error(
                `  ${iterResult.iterationId}: ${iterResult.verification?.reasoning ?? 'Unknown error'}`
              );
            }
            logger.endSession();
            process.exit(1);
          }

          if (verifiedIterations.length > 0) {
            logger.info(`Verification: ${passedCount} passed, ${failedCount} failed`);

            // Log details for failed verifications (validation failures, not eval crashes)
            for (const iterResult of verifiedIterations) {
              if (iterResult.verification && !iterResult.verification.passed) {
                const label = iterResult.verification.evaluationFailed
                  ? 'Evaluation failed (evaluator crashed)'
                  : 'Validation failed (content issues)';
                logger.warn(
                  `  ${iterResult.iterationId} [${label}]: ${iterResult.verification.reasoning} ` +
                    `(score: ${iterResult.verification.score.toFixed(2)})`
                );
              }
            }
          }
        }

        logger.endSession();
        if (!args.output) {
          console.error(`\n--- Processing Summary ---`);
          console.error(result.summary);
        }
      } else {
        logger.error(result.summary);
        logger.endSession();
        process.exit(1);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(message);
    if (args.debug && error instanceof Error) {
      if (error.stack) {
        console.error('\nStack trace:\n' + error.stack);
      }
      if (error instanceof EvaluationError && error.cause instanceof Error && error.cause.stack) {
        console.error('\nCaused by:\n' + error.cause.stack);
      }
    }
    logger.endSession();
    process.exit(1);
  }
}

// Run CLI
main();
