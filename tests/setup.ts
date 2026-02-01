/**
 * Global test setup
 *
 * Initialize iteration prompts before all tests run.
 */

import path from 'path';
import { initializeIterationPrompts } from '../src/shared/iteration-registry.js';

const ITERATIONS_DIR = path.join(process.cwd(), 'src', 'prompts', 'iterations');

// Initialize iteration prompts globally before tests run
await initializeIterationPrompts(ITERATIONS_DIR);
