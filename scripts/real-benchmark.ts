#!/usr/bin/env tsx
/**
 * USA-56: Real Benchmark with Actual API Calls
 *
 * Runs system-workflow mode with real Anthropic API to validate:
 * - Judge score distribution
 * - Rewrite effectiveness
 * - Threshold appropriateness
 * - Manual review rates
 */

import 'dotenv/config';
import { UserStoryAgent } from '../src/agent/user-story-agent.js';
import type { ProductContext } from '../src/shared/types.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// USA-60: Configurable scratchpad path via environment variable
const SCRATCHPAD = process.env.BENCHMARK_SCRATCHPAD || './benchmark-fixtures';

async function main() {
  console.log('=== USA-56: Real Benchmark ===\n');

  // Validate fixtures directory exists
  if (!existsSync(SCRATCHPAD)) {
    console.error(`ERROR: Benchmark fixtures directory not found: ${SCRATCHPAD}`);
    console.error('Set BENCHMARK_SCRATCHPAD environment variable to the correct path.');
    console.error('Example: export BENCHMARK_SCRATCHPAD=/path/to/fixtures');
    process.exit(1);
  }

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

  // Stories to generate
  const stories = [
    'User applies filters on mobile to find relevant projects',
    'User clears all filters to see full portfolio'
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

  console.log('Running system-workflow mode...\n');
  console.log('[BENCHMARK LOG] Starting Pass 0: System Discovery');

  const startTime = Date.now();

  const result = await agent.runSystemWorkflow(stories, [mockupFilterSheet, mockupFilterBar, referenceArchitecture]);

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
  const rewritePct = scoreCount > 0 ? (rewriteCount / scoreCount) * 100 : 0;
  console.log(`Rewrites: ${rewriteCount}/${scoreCount} (${rewritePct.toFixed(1)}%)`);
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
    timestamp: new Date().toISOString(),
    stories: result.stories.map(s => ({
      id: s.id,
      pass1cScore: s.judgeResults?.pass1c?.overallScore,
      pass1cAfterRewriteScore: s.judgeResults?.pass1cAfterRewrite?.overallScore,
      recommendation: s.judgeResults?.pass1cAfterRewrite?.recommendation ?? s.judgeResults?.pass1c?.recommendation,
      needsManualReview: !!s.needsManualReview,
      content: s.content
    })),
    metrics: {
      averageScore: avgScore,
      scoresDistribution,
      storiesAbove4Count: storiesAbove4,
      storiesAbove4Pct: pctAbove4,
      rewriteCount,
      rewritePct,
      manualReviewCount,
      manualReviewPct
    },
    metadata: result.metadata,
    systemContext: result.systemContext,
    consistencyReport: result.consistencyReport,
    acceptanceCriteria: criteria
  };

  const reportPath = join(process.cwd(), 'real-benchmark-results.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nDetailed report written to: ${reportPath}`);
}

// USA-61: Single error handler with immediate exit
main().catch((err) => {
  console.error('\n[BENCHMARK ERROR]', err);
  process.exit(1);
});
