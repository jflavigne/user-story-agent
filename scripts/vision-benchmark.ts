#!/usr/bin/env tsx
/**
 * Vision-Enhanced Benchmark (USA-60 Validation)
 *
 * Validates vision-enhanced workflow improvements by:
 * - Using actual Figma screenshots instead of text mockups
 * - Measuring quality scores, patch rejection rates, over-specification
 * - Comparing against USA-56 text-only baseline
 *
 * Expected improvements:
 * - Quality score: 3.4/5 → 4.2/5 (+24%)
 * - Pass rate: 54% → 80% (+48%)
 * - Over-specification: <10% (down from 35%)
 */

import { config } from 'dotenv';
import { UserStoryAgent } from '../src/agent/user-story-agent.js';
import type { ProductContext } from '../src/shared/types.js';
import { countOverSpecification } from '../src/shared/overspecification-patterns.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Load .env file
config();

async function main() {
  console.log('=== Vision-Enhanced Benchmark (USA-60) ===\n');

  // Product context for component inventory
  const productContext: ProductContext = {
    productName: 'Component Inventory System',
    productType: 'web',
    clientInfo: 'Design system component library with filtering functionality',
    targetAudience: 'Developers and designers using the component library',
    keyFeatures: [
      'Mobile FilterSheet with bottom sheet interface',
      'Desktop FilterBar with horizontal layout',
      'Hierarchical filter groups (Expertise, Creative Lenses)',
      'Individual filter items with checkboxes',
      'Loading states with spinner',
      'Responsive design (mobile vs desktop)',
    ],
  };

  // Stories to generate from visual mockups
  const stories = [
    'User opens filter sheet on mobile to browse filter categories',
    'User applies filters using desktop filter bar',
    'User sees loading spinner while filters are being applied',
    'User views hierarchical filter groups with expertise and creative lenses',
    'User toggles individual filter items with checkboxes',
  ];

  console.log(`Product: ${productContext.productName}`);
  console.log(`Stories: ${stories.length}`);
  console.log(`Mode: Vision-enhanced with automatic Figma component detection\n`);

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.error('Set it with: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('Initializing agent with vision support...');

  // Use Figma URL to trigger automatic component detection
  const figmaUrl = 'https://figma.com/design/MHujefjiDpZQVpSQzE3pq1/ComponentInventory';

  const agent = new UserStoryAgent({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
    mode: 'system-workflow',
    productContext,
    mockupImages: [{ url: figmaUrl }], // Auto-detect components!
    selectedIterations: [
      'user-roles',
      'interactive-elements',
      'validation',
      'accessibility',
      'performance',
      'responsive-web',
      'analytics', // Added with USA-60
    ],
  });

  console.log('Running vision-enhanced workflow...\n');
  console.log('[BENCHMARK] Starting Pass 0: System Discovery (with vision)');

  const startTime = Date.now();

  try {
    const result = await agent.runSystemWorkflow(stories, []);

    const totalTime = Date.now() - startTime;

    console.log('\n[BENCHMARK] System workflow completed');
    console.log(`[BENCHMARK] Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`[BENCHMARK] Passes completed: ${result.metadata.passesCompleted.join(', ')}`);
    console.log(`[BENCHMARK] Refinement rounds: ${result.metadata.refinementRounds}`);
    console.log(`[BENCHMARK] Fixes applied: ${result.metadata.fixesApplied}`);
    console.log(`[BENCHMARK] Fixes flagged for review: ${result.metadata.fixesFlaggedForReview}`);
    console.log(`[BENCHMARK] Fixes rejected: ${result.metadata.fixesRejected ?? 0}\n`);

    // Analyze quality metrics
    let totalScore = 0;
    let scoreCount = 0;
    let rewriteCount = 0;
    let manualReviewCount = 0;
    const scoresDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Analyze over-specification (USA-60 validation)
    let totalOverSpec = 0;
    let storiesWithOverSpec = 0;
    const overSpecDetails: Array<{ story: string; counts: any }> = [];

    console.log('=== Quality Analysis ===\n');

    result.stories.forEach((story, index) => {
      console.log(`Story ${index + 1}: "${story.title}"`);

      // Judge scores
      if (story.judgeScore !== undefined) {
        totalScore += story.judgeScore;
        scoreCount++;
        scoresDistribution[story.judgeScore]++;
        console.log(`  Judge score: ${story.judgeScore}/5`);
      }

      // Rewrites
      if (story.rewrites && story.rewrites > 0) {
        rewriteCount++;
        console.log(`  Rewrites: ${story.rewrites}`);
      }

      // Manual review flagged
      if (story.requiresManualReview) {
        manualReviewCount++;
        console.log(`  ⚠️  Flagged for manual review`);
      }

      // Over-specification analysis (NEW with USA-60)
      const storyContent = story.content || '';
      const overSpecCounts = countOverSpecification(storyContent);

      if (overSpecCounts.total > 0) {
        storiesWithOverSpec++;
        totalOverSpec += overSpecCounts.total;
        console.log(`  ⚠️  Over-specification: ${overSpecCounts.total} instances`);
        console.log(`     - Exact colors: ${overSpecCounts.exactColor}`);
        console.log(`     - Pixel measurements: ${overSpecCounts.pixelMeasurement}`);
        console.log(`     - Font specs: ${overSpecCounts.fontSpec}`);

        overSpecDetails.push({
          story: story.title,
          counts: overSpecCounts,
        });
      }

      console.log('');
    });

    // Summary statistics
    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    const passRate = scoreCount > 0 ? (scoresDistribution[4] + scoresDistribution[5]) / scoreCount : 0;
    const rewriteRate = result.stories.length > 0 ? rewriteCount / result.stories.length : 0;
    const overSpecRate = result.stories.length > 0 ? storiesWithOverSpec / result.stories.length : 0;

    console.log('=== Summary Statistics ===\n');
    console.log(`Average quality score: ${avgScore.toFixed(2)}/5`);
    console.log(`Pass rate (≥4/5): ${(passRate * 100).toFixed(1)}%`);
    console.log(`Rewrite rate: ${(rewriteRate * 100).toFixed(1)}%`);
    console.log(`Manual review rate: ${(manualReviewCount / result.stories.length * 100).toFixed(1)}%`);
    console.log(`\nOver-specification metrics (USA-60):`);
    console.log(`  Stories with over-spec: ${storiesWithOverSpec}/${result.stories.length} (${(overSpecRate * 100).toFixed(1)}%)`);
    console.log(`  Total over-spec instances: ${totalOverSpec}`);
    console.log(`  Avg per story: ${(totalOverSpec / result.stories.length).toFixed(2)}`);

    console.log('\n=== Score Distribution ===\n');
    for (let score = 5; score >= 0; score--) {
      const count = scoresDistribution[score];
      const percentage = scoreCount > 0 ? (count / scoreCount * 100).toFixed(1) : '0.0';
      const bar = '█'.repeat(Math.round(count / scoreCount * 20));
      console.log(`${score}/5: ${bar} ${count} (${percentage}%)`);
    }

    // Comparison with USA-56 baseline
    console.log('\n=== Comparison with USA-56 Baseline ===\n');
    console.log('Metric                    | Text-Only (USA-56) | Vision (USA-60) | Change');
    console.log('--------------------------|--------------------|-----------------|---------');
    console.log(`Avg quality score         | 3.4/5              | ${avgScore.toFixed(2)}/5        | ${avgScore >= 3.4 ? '✓' : '✗'} ${((avgScore - 3.4) / 3.4 * 100).toFixed(1)}%`);
    console.log(`Pass rate (≥4/5)          | 54%                | ${(passRate * 100).toFixed(1)}%          | ${passRate >= 0.54 ? '✓' : '✗'} ${((passRate - 0.54) / 0.54 * 100).toFixed(1)}%`);
    console.log(`Rewrite rate              | 46%                | ${(rewriteRate * 100).toFixed(1)}%          | ${rewriteRate <= 0.46 ? '✓' : '✗'} ${((0.46 - rewriteRate) / 0.46 * 100).toFixed(1)}%`);
    console.log(`Over-specification rate   | ~35%               | ${(overSpecRate * 100).toFixed(1)}%          | ${overSpecRate <= 0.10 ? '✓✓' : overSpecRate <= 0.35 ? '✓' : '✗'}`);

    // Save results
    const resultsFile = join(process.cwd(), 'benchmark-results', 'vision-benchmark-results.json');
    const results = {
      timestamp: new Date().toISOString(),
      mode: 'vision-enhanced',
      totalTime: totalTime,
      stories: result.stories.length,
      metrics: {
        avgScore,
        passRate,
        rewriteRate,
        manualReviewRate: manualReviewCount / result.stories.length,
        overSpecRate,
        totalOverSpec,
      },
      scoresDistribution,
      overSpecDetails,
      fullResults: result,
    };

    writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);

    // Final verdict
    console.log('\n=== Verdict ===\n');
    if (avgScore >= 4.2 && passRate >= 0.80 && overSpecRate <= 0.10) {
      console.log('✅ SUCCESS: All USA-60 targets achieved!');
    } else if (avgScore >= 3.8 && passRate >= 0.70 && overSpecRate <= 0.20) {
      console.log('✓ GOOD: Significant improvement over baseline');
    } else {
      console.log('⚠️  NEEDS WORK: Targets not yet met');
    }

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();
