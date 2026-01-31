#!/usr/bin/env tsx
/**
 * Real-time monitoring for expanded-benchmark.ts
 *
 * Monitors background benchmark process and displays:
 * - Current progress (stories, iterations)
 * - Timing statistics
 * - Token usage
 * - Quality scores (when available)
 * - Estimated time remaining
 */

import { readFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join } from 'path';

const OUTPUT_FILE = '/private/tmp/claude/-Users-jflavigne-user-story-agent/tasks/b599359.output';
const RESULTS_FILE = join(process.cwd(), 'expanded-benchmark-results.json');

interface BenchmarkStats {
  startTime: Date | null;
  currentPass: string;
  currentRound: number;
  currentIteration: string;
  storiesCompleted: number;
  totalStories: number;
  iterationsCompleted: number;
  totalIterations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  patchesApplied: number;
  patchesRejected: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  isComplete: boolean;
  scores: Array<{ story: string; score: number }>;
}

function parseLogOutput(content: string): BenchmarkStats {
  const lines = content.split('\n');

  const stats: BenchmarkStats = {
    startTime: null,
    currentPass: 'Unknown',
    currentRound: 0,
    currentIteration: 'Unknown',
    storiesCompleted: 0,
    totalStories: 16,
    iterationsCompleted: 0,
    totalIterations: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    patchesApplied: 0,
    patchesRejected: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
    isComplete: false,
    scores: [],
  };

  // Parse story count
  const storyCountMatch = content.match(/Stories: (\d+)/);
  if (storyCountMatch) {
    stats.totalStories = parseInt(storyCountMatch[1], 10);
  }

  // Parse start time
  const startTimeMatch = content.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\].*Starting Pass 0/);
  if (startTimeMatch) {
    const [hours, minutes, seconds] = startTimeMatch[1].split(':').map(s => parseFloat(s));
    const now = new Date();
    stats.startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
    stats.elapsedSeconds = (Date.now() - stats.startTime.getTime()) / 1000;
  }

  // Parse current pass and round
  const passMatch = content.match(/runSystemWorkflow: Pass (\d+)/g);
  if (passMatch && passMatch.length > 0) {
    const lastPass = passMatch[passMatch.length - 1];
    const passNum = lastPass.match(/Pass (\d+)/)?.[1];
    if (passNum === '0') stats.currentPass = 'Pass 0: System Discovery';
    else if (passNum === '1') stats.currentPass = 'Pass 1: Story Generation';
    else if (passNum === '2') stats.currentPass = 'Pass 2: Interconnection';
  }

  const roundMatch = content.match(/Refinement round (\d+)\/(\d+)/g);
  if (roundMatch && roundMatch.length > 0) {
    const lastRound = roundMatch[roundMatch.length - 1];
    const roundNum = lastRound.match(/round (\d+)/)?.[1];
    stats.currentRound = roundNum ? parseInt(roundNum, 10) : 0;
  }

  // Parse current iteration
  const iterationMatch = content.match(/Starting iteration: ([\w-]+)/g);
  if (iterationMatch && iterationMatch.length > 0) {
    const lastIteration = iterationMatch[iterationMatch.length - 1];
    stats.currentIteration = lastIteration.replace('Starting iteration: ', '');
  }

  // Count completed iterations
  const completedIterations = content.match(/Completed: ([\w-]+)/g);
  if (completedIterations) {
    stats.iterationsCompleted = completedIterations.length;
  }

  // Estimate total iterations per story (based on selected iterations in script)
  // user-roles, interactive-elements, validation, accessibility, performance, responsive-web = 6 iterations
  // But we also have: security, language-support, locale-formatting, cultural-appropriateness, analytics, consolidation
  // That's 12 iterations per story in refinement round
  stats.totalIterations = stats.totalStories * 12; // 12 iterations per story

  // Parse token usage
  const tokenMatches = content.matchAll(/(\d+) in \/ (\d+) out tokens/g);
  for (const match of tokenMatches) {
    stats.totalInputTokens += parseInt(match[1], 10);
    stats.totalOutputTokens += parseInt(match[2], 10);
  }

  // Parse patch statistics
  const patchMatches = content.matchAll(/applied (\d+)\/(\d+) patches \((\d+) rejected: path, (\d+) rejected: validation\)/g);
  for (const match of patchMatches) {
    stats.patchesApplied += parseInt(match[1], 10);
    const pathRejected = parseInt(match[3], 10);
    const validationRejected = parseInt(match[4], 10);
    stats.patchesRejected += pathRejected + validationRejected;
  }

  // Check if complete
  if (content.includes('[BENCHMARK LOG] System workflow completed')) {
    stats.isComplete = true;
  }

  // Estimate stories completed (rough heuristic: completed iterations / 12)
  stats.storiesCompleted = Math.floor(stats.iterationsCompleted / 12);

  // Estimate time remaining
  if (stats.elapsedSeconds > 0 && stats.iterationsCompleted > 0) {
    const secondsPerIteration = stats.elapsedSeconds / stats.iterationsCompleted;
    const remainingIterations = stats.totalIterations - stats.iterationsCompleted;
    stats.estimatedRemainingSeconds = remainingIterations * secondsPerIteration;
  }

  return stats;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function displayStats(stats: BenchmarkStats) {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         USA-56 Expanded Benchmark Monitor                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Status
  if (stats.isComplete) {
    console.log('✅ STATUS: COMPLETE\n');
  } else {
    console.log(`🔄 STATUS: RUNNING - ${stats.currentPass}\n`);
  }

  // Progress
  const progressPct = stats.totalIterations > 0
    ? (stats.iterationsCompleted / stats.totalIterations * 100).toFixed(1)
    : '0.0';

  const progressBar = '█'.repeat(Math.floor(parseFloat(progressPct) / 2)) +
                      '░'.repeat(50 - Math.floor(parseFloat(progressPct) / 2));

  console.log('PROGRESS:');
  console.log(`  Stories: ${stats.storiesCompleted}/${stats.totalStories}`);
  console.log(`  Iterations: ${stats.iterationsCompleted}/${stats.totalIterations}`);
  console.log(`  [${progressBar}] ${progressPct}%\n`);

  // Current work
  console.log('CURRENT:');
  console.log(`  Round: ${stats.currentRound}/3`);
  console.log(`  Iteration: ${stats.currentIteration}\n`);

  // Timing
  console.log('TIMING:');
  console.log(`  Elapsed: ${formatDuration(stats.elapsedSeconds)}`);
  if (!stats.isComplete && stats.estimatedRemainingSeconds > 0) {
    console.log(`  Remaining: ~${formatDuration(stats.estimatedRemainingSeconds)}`);
    const eta = new Date(Date.now() + stats.estimatedRemainingSeconds * 1000);
    console.log(`  ETA: ${eta.toLocaleTimeString()}`);
  }
  console.log('');

  // Token usage
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  console.log('TOKENS:');
  console.log(`  Input: ${stats.totalInputTokens.toLocaleString()}`);
  console.log(`  Output: ${stats.totalOutputTokens.toLocaleString()}`);
  console.log(`  Total: ${totalTokens.toLocaleString()}\n`);

  // Patches
  const totalPatches = stats.patchesApplied + stats.patchesRejected;
  const rejectionRate = totalPatches > 0
    ? (stats.patchesRejected / totalPatches * 100).toFixed(1)
    : '0.0';

  console.log('PATCHES:');
  console.log(`  Applied: ${stats.patchesApplied}`);
  console.log(`  Rejected: ${stats.patchesRejected} (${rejectionRate}%)\n`);

  // Footer
  if (!stats.isComplete) {
    console.log('Press Ctrl+C to stop monitoring (benchmark will continue running)\n');
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Results: ${RESULTS_FILE} (when complete)`);
  } else {
    console.log(`\nFinal results written to: ${RESULTS_FILE}`);
    console.log('\nRun the following to analyze results:');
    console.log('  cat expanded-benchmark-results.json | jq .metrics');
  }
}

function monitor() {
  if (!existsSync(OUTPUT_FILE)) {
    console.error(`ERROR: Output file not found: ${OUTPUT_FILE}`);
    console.error('Is the benchmark still running?');
    process.exit(1);
  }

  let lastStats: BenchmarkStats | null = null;

  const updateDisplay = () => {
    try {
      const content = readFileSync(OUTPUT_FILE, 'utf-8');
      const stats = parseLogOutput(content);

      // Only update display if stats changed
      if (!lastStats || JSON.stringify(stats) !== JSON.stringify(lastStats)) {
        displayStats(stats);
        lastStats = stats;
      }

      // If complete, check for results file
      if (stats.isComplete) {
        if (existsSync(RESULTS_FILE)) {
          console.log('\n✅ Benchmark complete! Results file ready.\n');
          unwatchFile(OUTPUT_FILE);
          process.exit(0);
        }
      }
    } catch (error) {
      console.error('Error reading output file:', error);
    }
  };

  // Initial display
  updateDisplay();

  // Watch for changes
  watchFile(OUTPUT_FILE, { interval: 2000 }, updateDisplay);

  // Also update every 5 seconds to refresh timing estimates
  setInterval(updateDisplay, 5000);
}

// Handle clean exit
process.on('SIGINT', () => {
  console.log('\n\nMonitoring stopped (benchmark continues running in background)');
  unwatchFile(OUTPUT_FILE);
  process.exit(0);
});

monitor();
