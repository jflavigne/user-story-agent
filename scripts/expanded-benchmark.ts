#!/usr/bin/env tsx
/**
 * USA-56: Expanded Benchmark with 16 User Stories
 *
 * Runs system-workflow mode with real Anthropic API on comprehensive story set
 * to collect statistically significant data for threshold tuning.
 */

import { UserStoryAgent } from '../src/agent/user-story-agent.js';
import type { SystemWorkflowResult } from '../src/agent/types.js';
import type { ProductContext } from '../src/shared/types.js';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCRATCHPAD = process.env.BENCHMARK_SCRATCHPAD_DIR ?? join(process.cwd(), 'benchmark-fixtures');

if (!existsSync(SCRATCHPAD)) {
  console.error(`ERROR: Scratchpad directory not found: ${SCRATCHPAD}`);
  console.error('Set BENCHMARK_SCRATCHPAD_DIR environment variable or create benchmark-fixtures/ directory');
  process.exit(1);
}

async function main() {
  console.log('=== USA-56: Expanded Benchmark (16 Stories) ===\n');
  console.log('Loading mockups and reference docs...');

  // Load mockups
  const mockupFilterSheet = readFileSync(join(SCRATCHPAD, 'mockup-filtersheet.md'), 'utf-8');
  const mockupFilterBar = readFileSync(join(SCRATCHPAD, 'mockup-filterbar.md'), 'utf-8');
  const referenceArchitecture = readFileSync(join(SCRATCHPAD, 'reference-architecture.md'), 'utf-8');

  // Product context
  const productContext: ProductContext = {
    productName: 'Project Portfolio Browser',
    productType: 'web', // Valid types: web, mobile-native, mobile-web, desktop, api
    clientInfo: 'Creative agency showcasing portfolio of projects with advanced filtering',
    targetAudience: 'Creative professionals browsing project portfolios',
    keyFeatures: [
      'Real-time filtering with dynamic availability',
      'Mobile-first bottom sheet interface',
      'Desktop horizontal filter bar',
      'Zero-result prevention',
      'Interdependent filter logic'
    ]
  };

  // Comprehensive story set (16 stories)
  const stories = [
    // Mobile Filter Stories (FilterSheet)
    'User opens the mobile filter sheet to refine project results and can dismiss it to return to browsing',
    'User expands filter groups in the mobile sheet to see available options and collapses them to reduce clutter',
    'User taps filter items in the mobile sheet to select expertise and creative lens filters',
    'User taps the "Clear all" button in the mobile filter sheet to reset all active filters and see the full portfolio',
    'User selects a filter in the mobile sheet and sees the project grid update immediately in the background through the sheet gap',

    // Desktop Filter Stories (FilterBar)
    'User clicks filter items in the horizontal desktop filter bar to refine the project portfolio',
    'User clicks the X icon on selected filter items in the desktop bar to deselect specific filters',
    'User clicks the "Clear all" link in the desktop filter bar to reset all active filters',

    // Interactive Behavior Stories
    'User attempts to select a filter combination and unavailable options automatically hide to prevent zero-result scenarios',
    'User selects a filter and sees a loading spinner while the system fetches updated project results',
    'User selects an expertise filter and sees creative lens options update based on interdependent filter logic',
    'User applies filters, navigates to a project detail, then returns to find their filter selections preserved',

    // Accessibility Stories
    'User navigates the filter interface using only keyboard (Tab, Enter, Escape) to select and apply filters',
    'User with a screen reader hears clear announcements of filter states, available options, and result counts',

    // Edge Case Stories
    'User selects filters that would return zero results and sees helpful messaging with suggestions to adjust filters',
    'User experiences a network error while applying filters and sees a clear error message with retry option'
  ];

  console.log(`Stories: ${stories.length}`);
  console.log(`Mockups: 2 (FilterSheet, FilterBar)`);
  console.log(`Reference docs: 1 (Architecture)\n`);

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.error('Set it with: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('Initializing agent with real API client...');
  const agent = new UserStoryAgent({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
    mode: 'system-workflow',
    productContext,
    selectedIterations: [
      'user-roles',
      'interactive-elements',
      'validation',
      'accessibility',
      'performance',
      'responsive-web'
    ]
  });

  const runId = new Date().toISOString();
  const runDir = join(process.cwd(), 'benchmark-data', `run-${runId}`);

  console.log('Running system-workflow mode on 16 stories...\n');
  console.log('[BENCHMARK LOG] Starting Pass 0: System Discovery');

  const startTime = Date.now();

  try {
    const result = await agent.runSystemWorkflow(stories, [referenceArchitecture]);

    await saveDetailedData(runId, runDir, result, stories, productContext, startTime);

    const totalTime = Date.now() - startTime;

    console.log('\n[BENCHMARK LOG] System workflow completed');
    console.log(`[BENCHMARK LOG] Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`[BENCHMARK LOG] Passes completed: ${result.metadata.passesCompleted.join(', ')}`);
    console.log(`[BENCHMARK LOG] Refinement rounds: ${result.metadata.refinementRounds}`);
    console.log(`[BENCHMARK LOG] Fixes applied: ${result.metadata.fixesApplied}`);
    console.log(`[BENCHMARK LOG] Fixes flagged for review: ${result.metadata.fixesFlaggedForReview}`);
    console.log(`[BENCHMARK LOG] Fixes rejected: ${result.metadata.fixesRejected ?? 0}\n`);

    // Analyze quality metrics
    let totalScore = 0;
    let scoreCount = 0;
    let rewriteCount = 0;
    let manualReviewCount = 0;
    const scoresDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    console.log('=== Quality Analysis ===\n');

    for (const story of result.stories) {
      const rubric = story.judgeResults?.pass1c ?? story.judgeResults?.pass1cAfterRewrite;

      if (rubric) {
        const score = rubric.overallScore;
        totalScore += score;
        scoreCount++;
        scoresDistribution[score]++;

        console.log(`Story "${story.id}": Score ${score}/5`);

        if (story.judgeResults?.pass1c && story.judgeResults?.pass1cAfterRewrite) {
          const beforeScore = story.judgeResults.pass1c.overallScore;
          const afterScore = story.judgeResults.pass1cAfterRewrite.overallScore;
          console.log(`  → Rewritten: ${beforeScore} → ${afterScore} (${afterScore > beforeScore ? '+' : ''}${afterScore - beforeScore})`);
          rewriteCount++;
        }

        if (rubric.recommendation === 'manual-review' || story.needsManualReview) {
          console.log('  → Flagged for manual review');
          manualReviewCount++;
        }
      }
    }

    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    const storiesAbove4 = scoresDistribution[4] + scoresDistribution[5];
    const pctAbove4 = scoreCount > 0 ? (storiesAbove4 / scoreCount) * 100 : 0;
    const manualReviewPct = scoreCount > 0 ? (manualReviewCount / scoreCount) * 100 : 0;

    console.log(`\nAverage Score: ${avgScore.toFixed(2)}/5`);
    console.log(`Stories ≥ 4.0: ${storiesAbove4}/${scoreCount} (${pctAbove4.toFixed(1)}%)`);
    console.log(`Rewrites: ${rewriteCount}/${scoreCount} (${(scoreCount > 0 ? (rewriteCount / scoreCount) * 100 : 0).toFixed(1)}%)`);
    console.log(`Manual Review: ${manualReviewCount}/${scoreCount} (${manualReviewPct.toFixed(1)}%)`);

    console.log('\nScore Distribution:');
    for (let i = 0; i <= 5; i++) {
      const count = scoresDistribution[i];
      const pct = scoreCount > 0 ? (count / scoreCount) * 100 : 0;
      const bar = '█'.repeat(Math.round(pct / 5));
      console.log(`  ${i}: ${bar} ${count} (${pct.toFixed(1)}%)`);
    }

    // Check acceptance criteria
    console.log('\n=== Acceptance Criteria ===\n');
    const criteria = [
      { name: '>80% stories ≥ 4.0', value: pctAbove4, threshold: 80, pass: pctAbove4 >= 80 },
      { name: '<5% manual review', value: manualReviewPct, threshold: 5, pass: manualReviewPct < 5 }
    ];

    for (const c of criteria) {
      const status = c.pass ? '✅' : '❌';
      console.log(`${status} ${c.name}: ${c.value.toFixed(1)}% (threshold: ${c.threshold}%)`);
    }

    // Write detailed report
    const report = {
      runId,
      timestamp: new Date().toISOString(),
      storyCount: stories.length,
      stories: result.stories.map(s => ({
        id: s.id,
        pass1cScore: s.judgeResults?.pass1c?.overallScore,
        pass1cAfterRewriteScore: s.judgeResults?.pass1cAfterRewrite?.overallScore,
        recommendation: s.judgeResults?.pass1cAfterRewrite?.recommendation ?? s.judgeResults?.pass1c?.recommendation,
        needsManualReview: !!s.needsManualReview,
        hasRubricViolations: !!(s.judgeResults?.pass1c?.sectionSeparation?.violations?.length),
        relationshipsDiscovered: (s.judgeResults?.pass1c?.newRelationships?.length ?? 0),
      })),
      metrics: {
        averageScore: avgScore,
        scoresDistribution,
        storiesAbove4Count: storiesAbove4,
        storiesAbove4Pct: pctAbove4,
        rewriteCount,
        rewritePct: scoreCount > 0 ? (rewriteCount / scoreCount) * 100 : 0,
        manualReviewCount,
        manualReviewPct
      },
      metadata: result.metadata,
      systemContext: result.systemContext,
      consistencyReport: result.consistencyReport,
      acceptanceCriteria: criteria,
      executionTime: {
        totalSeconds: totalTime / 1000,
        perStoryAvgSeconds: (totalTime / 1000) / stories.length
      },
      detailedDataPath: `benchmark-data/run-${runId}/`
    };

    const reportPath = join(process.cwd(), 'expanded-benchmark-results.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\nDetailed report written to: ${reportPath}`);
    console.log(`\nDetailed data saved to: ${runDir}/`);
    logFileSizes(runDir);

  } catch (error) {
    console.error('\n[BENCHMARK ERROR]', error);
    process.exitCode = 1;
  }
}

async function saveDetailedData(
  runId: string,
  runDir: string,
  result: SystemWorkflowResult,
  stories: string[],
  productContext: ProductContext,
  startTime: number
): Promise<void> {
  mkdirSync(runDir, { recursive: true });
  const endTime = Date.now();
  const durationMs = endTime - startTime;

  saveStoriesFull(runDir, result.stories);
  saveJudgeRubrics(runDir, result.stories);
  saveRelationships(runDir, result.stories);
  saveConsistencyReport(runDir, result.consistencyReport);
  saveMetadata(runDir, runId, result, productContext, stories.length, startTime, endTime, durationMs);
}

function saveStoriesFull(runDir: string, stories: SystemWorkflowResult['stories']): void {
  const payload = stories.map((s) => ({
    id: s.id,
    content: s.content,
    structure: s.structure
  }));
  writeFileSync(join(runDir, 'stories-full.json'), JSON.stringify(payload, null, 2), 'utf-8');
}

function saveJudgeRubrics(runDir: string, stories: SystemWorkflowResult['stories']): void {
  const payload = stories.map((s) => ({
    id: s.id,
    pass1c: s.judgeResults?.pass1c,
    pass1cAfterRewrite: s.judgeResults?.pass1cAfterRewrite
  }));
  writeFileSync(join(runDir, 'judge-rubrics.json'), JSON.stringify(payload, null, 2), 'utf-8');
}

function saveRelationships(runDir: string, stories: SystemWorkflowResult['stories']): void {
  const byStory = stories.map((s) => ({
    id: s.id,
    newRelationships: s.judgeResults?.pass1c?.newRelationships ?? [],
    interconnections: s.interconnections
  }));
  const totalNew = byStory.reduce((sum, s) => sum + (s.newRelationships?.length ?? 0), 0);
  const payload = {
    byStory,
    aggregate: {
      totalNewRelationships: totalNew,
      storiesWithNewRelationships: byStory.filter((s) => (s.newRelationships?.length ?? 0) > 0).length
    }
  };
  writeFileSync(join(runDir, 'relationships.json'), JSON.stringify(payload, null, 2), 'utf-8');
}

function saveConsistencyReport(
  runDir: string,
  consistencyReport: SystemWorkflowResult['consistencyReport']
): void {
  writeFileSync(
    join(runDir, 'consistency-report.json'),
    JSON.stringify(consistencyReport, null, 2),
    'utf-8'
  );
}

function saveMetadata(
  runDir: string,
  runId: string,
  result: SystemWorkflowResult,
  productContext: ProductContext,
  storyCount: number,
  startTime: number,
  endTime: number,
  durationMs: number
): void {
  const fileSizes: Record<string, number> = {};
  for (const name of ['stories-full.json', 'judge-rubrics.json', 'relationships.json', 'consistency-report.json']) {
    const p = join(runDir, name);
    try {
      fileSizes[name] = statSync(p).size;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`Warning: Failed to stat ${name}:`, err);
      }
      fileSizes[name] = 0;
    }
  }
  const payload = {
    runId,
    productContext,
    storyCount,
    config: {
      passesCompleted: result.metadata.passesCompleted,
      refinementRounds: result.metadata.refinementRounds,
      fixesApplied: result.metadata.fixesApplied,
      fixesFlaggedForReview: result.metadata.fixesFlaggedForReview,
      fixesRejected: result.metadata.fixesRejected
    },
    execution: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs,
      durationSeconds: (durationMs / 1000).toFixed(2)
    },
    fileSizes
  };
  writeFileSync(join(runDir, 'metadata.json'), JSON.stringify(payload, null, 2), 'utf-8');
}

function logFileSizes(runDir: string): void {
  const names = ['stories-full.json', 'judge-rubrics.json', 'relationships.json', 'consistency-report.json', 'metadata.json'];
  for (const name of names) {
    const p = join(runDir, name);
    try {
      const size = statSync(p).size;
      console.log(`  ${name}: ${(size / 1024).toFixed(2)} KB`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`Warning: Failed to stat ${name}:`, err);
      }
      console.log(`  ${name}: (missing)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
