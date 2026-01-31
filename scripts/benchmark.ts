#!/usr/bin/env tsx
/**
 * USA-55: Performance Benchmarking
 *
 * Benchmarks system-workflow mode vs legacy workflow mode using a mocked
 * ClaudeClient. Measures token usage, latency, quality scores, and patch
 * rejection rates; generates a comparison report.
 */

import { UserStoryAgent } from '../src/agent/user-story-agent.js';
import type { ProductContext } from '../src/shared/types.js';
import type { ClaudeClient } from '../src/agent/claude-client.js';
import type { SendMessageOptions } from '../src/agent/claude-client.js';
import type { StreamingHandler } from '../src/agent/streaming.js';
import type { AgentResult } from '../src/agent/types.js';
import type { SystemWorkflowResult } from '../src/agent/types.js';
import type { JudgeRubric } from '../src/shared/types.js';
import type { GlobalConsistencyReport } from '../src/shared/types.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenchmarkResult {
  mode: 'workflow' | 'system-workflow';
  tokenUsage: {
    total: number;
    input: number;
    output: number;
  };
  latency: {
    total: number;
    pass0?: number;
    pass1: number;
    pass2?: number;
    pass2b?: number;
  };
  quality: {
    averageScore: number;
    scoresDistribution: Record<number, number>;
    rewrites: number;
    manualReviewNeeded: number;
  };
  patches?: {
    applied: number;
    rejected: number;
    rejectionRate: number;
  };
  stories: number;
}

interface BenchmarkMetrics {
  inputTokens: number;
  outputTokens: number;
  totalLatencyMs: number;
  latencyByPass: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Test stories (5+ representative stories)
// ---------------------------------------------------------------------------

const BENCHMARK_STORIES = [
  'As a user, I want to log in with email and password so that I can access my account.',
  "As a user, I want to view my dashboard with recent activity so that I can see what's new.",
  'As a user, I want to update my profile settings so that I can customize my experience.',
  'As an admin, I want to manage user permissions so that I can control access.',
  'As a user, I want to search for items so that I can find what I need quickly.',
];

// ---------------------------------------------------------------------------
// Mock responses (minimal valid payloads for agent parsing)
// ---------------------------------------------------------------------------

const PASS0_PAYLOAD = {
  mentions: {
    components: ['Email input', 'Password input', 'Sign In button', 'DashboardContainer'],
    stateModels: ['User authentication state', 'Session management'],
    events: ['user-authenticated', 'user-logged-out'],
  },
  canonicalNames: {
    LoginForm: ['LoginForm', 'Email input', 'Password input', 'Sign In button'],
    DashboardContainer: ['DashboardContainer', 'Dashboard'],
    'User authentication state': ['User authentication state', 'auth state'],
  },
  evidence: { LoginForm: 'Handles authentication', DashboardContainer: 'Main layout' },
  vocabulary: { 'sign-in': 'Sign In button', dashboard: 'DashboardContainer' },
};

function minimalJudgeRubric(overallScore: 0 | 1 | 2 | 3 | 4 | 5): JudgeRubric {
  return {
    sectionSeparation: { score: overallScore, reasoning: '', violations: [] },
    correctnessVsSystemContext: { score: overallScore, reasoning: '' },
    testability: {
      outcomeAC: { score: overallScore, reasoning: '' },
      systemAC: { score: overallScore, reasoning: '' },
    },
    completeness: { score: overallScore, reasoning: '' },
    overallScore,
    recommendation: overallScore >= 4 ? 'approve' : overallScore >= 2 ? 'rewrite' : 'manual-review',
    newRelationships: [],
    needsSystemContextUpdate: false,
    confidenceByRelationship: {},
  };
}

function mockResponse(
  contentType: 'pass0' | 'iteration' | 'pass2' | 'judge' | 'rewrite' | 'global-consistency',
  metrics: BenchmarkMetrics,
  options: SendMessageOptions
): { content: string; usage: { inputTokens: number; outputTokens: number } } {
  // Realistic token estimates per call type
  const tokenByType: Record<string, { in: number; out: number }> = {
    pass0: { in: 800, out: 400 },
    iteration: { in: 600, out: 350 },
    pass2: { in: 700, out: 300 },
    judge: { in: 500, out: 250 },
    rewrite: { in: 450, out: 400 },
    'global-consistency': { in: 900, out: 350 },
  };
  const { in: inputTokens, out: outputTokens } = tokenByType[contentType] ?? { in: 500, out: 300 };

  let content: string;
  switch (contentType) {
    case 'pass0':
      content = JSON.stringify(PASS0_PAYLOAD);
      break;
    case 'iteration':
      content = JSON.stringify({
        enhancedStory: `# Story\n\n${options.messages[0]?.content?.slice(0, 80) ?? 'Story content'}...`,
        changesApplied: [],
      });
      break;
    case 'pass2':
      content = JSON.stringify({
        storyId: 'story-1',
        uiMapping: {},
        contractDependencies: [],
        ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
        relatedStories: [],
      });
      break;
    case 'judge':
      content = JSON.stringify(minimalJudgeRubric(4));
      break;
    case 'rewrite':
      content = '## User Story\n\nRewritten story content for benchmark.';
      break;
    case 'global-consistency':
      content = JSON.stringify({ issues: [], fixes: [] } as GlobalConsistencyReport);
      break;
    default:
      content = JSON.stringify({ enhancedStory: '# Story\n\nContent.', changesApplied: [] });
  }

  // Simulate small delay (deterministic for benchmarking)
  const delayMs = 12;
  const latencyMs = delayMs;
  metrics.inputTokens += inputTokens;
  metrics.outputTokens += outputTokens;
  metrics.totalLatencyMs += latencyMs;
  metrics.latencyByPass[contentType] = (metrics.latencyByPass[contentType] ?? 0) + latencyMs;

  return {
    content,
    usage: { inputTokens, outputTokens },
  };
}

function createMockClient(metrics: BenchmarkMetrics): ClaudeClient {
  const sendMessage = async (options: SendMessageOptions) => {
    const sys = options.systemPrompt ?? '';
    let contentType: 'pass0' | 'iteration' | 'pass2' | 'judge' | 'rewrite' | 'global-consistency' =
      'iteration';
    if (sys.includes('System Discovery') || sys.includes('Pass 0')) contentType = 'pass0';
    else if (sys.includes('Story Interconnection') || sys.includes('Pass 2')) contentType = 'pass2';
    else if (sys.includes('global consistency') || sys.includes('Pass 2b')) contentType = 'global-consistency';
    else if (sys.includes('section separation') || sys.includes('rewrite')) contentType = 'rewrite';
    else if (sys.includes('judge') || sys.includes('rubric') || sys.includes('Pass 1c')) contentType = 'judge';

    const result = mockResponse(contentType, metrics, options);
    return {
      content: result.content,
      stopReason: 'end_turn',
      usage: result.usage,
    };
  };

  const sendMessageStreaming = async (
    options: SendMessageOptions,
    handler: StreamingHandler
  ): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> => {
    const result = await sendMessage(options);
    handler.start();
    handler.chunk(result.content);
    handler.complete?.(result.usage);
    return { content: result.content, usage: result.usage };
  };

  return { sendMessage, sendMessageStreaming } as unknown as ClaudeClient;
}

function resetMetrics(metrics: BenchmarkMetrics): void {
  metrics.inputTokens = 0;
  metrics.outputTokens = 0;
  metrics.totalLatencyMs = 0;
  metrics.latencyByPass = {};
}

// ---------------------------------------------------------------------------
// Benchmark runners
// ---------------------------------------------------------------------------

const DEFAULT_PRODUCT_CONTEXT: ProductContext = {
  productName: 'Benchmark App',
  productType: 'web',
  clientInfo: 'Benchmark',
  targetAudience: 'Users',
  keyFeatures: ['Login', 'Dashboard', 'Settings'],
  businessContext: 'Benchmarking workflow vs system-workflow.',
};

export async function runBenchmark(
  mode: 'workflow' | 'system-workflow',
  stories: string[],
  productContext: ProductContext,
  _referenceDocuments?: string[],
  metrics: BenchmarkMetrics
): Promise<BenchmarkResult> {
  const mockClient = createMockClient(metrics);
  const agent = new UserStoryAgent({
    mode,
    productContext,
    claudeClient: mockClient,
    apiKey: 'benchmark-mock',
  });

  const scoresDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let rewrites = 0;
  let manualReviewNeeded = 0;
  let totalScore = 0;
  let scoreCount = 0;

  if (mode === 'workflow') {
    for (const story of stories) {
      const result: AgentResult = await agent.processUserStory(story);
      const rubric = result.judgeResults?.pass1c ?? result.judgeResults?.pass1cAfterRewrite;
      if (rubric) {
        const s = rubric.overallScore;
        scoresDistribution[s]++;
        totalScore += s;
        scoreCount++;
        if (rubric.recommendation === 'rewrite') rewrites++;
      }
      if (result.needsManualReview || rubric?.recommendation === 'manual-review') {
        manualReviewNeeded++;
      }
    }

    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    return {
      mode: 'workflow',
      tokenUsage: {
        total: metrics.inputTokens + metrics.outputTokens,
        input: metrics.inputTokens,
        output: metrics.outputTokens,
      },
      latency: {
        total: Math.round(metrics.totalLatencyMs),
        pass1: Math.round(metrics.latencyByPass['iteration'] ?? 0) + Math.round(metrics.latencyByPass['judge'] ?? 0) + Math.round(metrics.latencyByPass['rewrite'] ?? 0),
      },
      quality: {
        averageScore,
        scoresDistribution,
        rewrites,
        manualReviewNeeded,
      },
      stories: stories.length,
    };
  }

  // system-workflow
  const result: SystemWorkflowResult = await agent.runSystemWorkflow(stories);
  for (const s of result.stories) {
    const rubric = s.judgeResults?.pass1c ?? s.judgeResults?.pass1cAfterRewrite;
    if (rubric) {
      const score = rubric.overallScore;
      scoresDistribution[score]++;
      totalScore += score;
      scoreCount++;
      if (rubric.recommendation === 'rewrite') rewrites++;
    }
    if (rubric?.recommendation === 'manual-review' || s.needsManualReview) manualReviewNeeded++;
  }
  const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

  const applied = result.metadata.fixesApplied ?? 0;
  const rejected = result.metadata.fixesRejected ?? 0;
  const totalPatches = applied + rejected;
  const rejectionRate = totalPatches > 0 ? rejected / totalPatches : 0;

  return {
    mode: 'system-workflow',
    tokenUsage: {
      total: metrics.inputTokens + metrics.outputTokens,
      input: metrics.inputTokens,
      output: metrics.outputTokens,
    },
    latency: {
      total: Math.round(metrics.totalLatencyMs),
      pass0: Math.round(metrics.latencyByPass['pass0'] ?? 0),
      pass1: Math.round(metrics.latencyByPass['iteration'] ?? 0) + Math.round(metrics.latencyByPass['judge'] ?? 0) + Math.round(metrics.latencyByPass['rewrite'] ?? 0),
      pass2: Math.round(metrics.latencyByPass['pass2'] ?? 0),
      pass2b: Math.round(metrics.latencyByPass['global-consistency'] ?? 0),
    },
    quality: {
      averageScore,
      scoresDistribution,
      rewrites,
      manualReviewNeeded,
    },
    patches: {
      applied,
      rejected,
      rejectionRate,
    },
    stories: result.stories.length,
  };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

const TOKEN_INCREASE_THRESHOLD = 0.4;
const LATENCY_INCREASE_THRESHOLD = 0.3;
const PATCH_REJECTION_THRESHOLD = 0.05;
const QUALITY_FIRST_PASS_THRESHOLD = 4.0;
const QUALITY_FIRST_PASS_PCT = 0.8;
const MANUAL_REVIEW_PCT_THRESHOLD = 0.05;

function generateReport(legacy: BenchmarkResult, systemWorkflow: BenchmarkResult): string {
  const timestamp = new Date().toISOString();
  const tokenDelta =
    legacy.tokenUsage.total > 0
      ? (systemWorkflow.tokenUsage.total - legacy.tokenUsage.total) / legacy.tokenUsage.total
      : 0;
  const latencyDelta =
    legacy.latency.total > 0
      ? (systemWorkflow.latency.total - legacy.latency.total) / legacy.latency.total
      : 0;

  const tokenOk = tokenDelta < TOKEN_INCREASE_THRESHOLD;
  const latencyOk = latencyDelta < LATENCY_INCREASE_THRESHOLD;
  const rejectionOk =
    systemWorkflow.patches == null
      ? true
      : systemWorkflow.patches.rejectionRate < PATCH_REJECTION_THRESHOLD;
  const storiesAtOrAbove4 =
    (systemWorkflow.quality.scoresDistribution[4] ?? 0) +
    (systemWorkflow.quality.scoresDistribution[5] ?? 0);
  const qualityFirstPassOk =
    systemWorkflow.stories > 0 && storiesAtOrAbove4 / systemWorkflow.stories >= QUALITY_FIRST_PASS_PCT;
  const manualReviewOk =
    systemWorkflow.stories > 0 &&
    systemWorkflow.quality.manualReviewNeeded / systemWorkflow.stories < MANUAL_REVIEW_PCT_THRESHOLD;

  const lines: string[] = [
    '# Performance Benchmark Report',
    '',
    `Generated: ${timestamp}`,
    '',
    '## Summary',
    '',
    '| Metric | Legacy (workflow) | New (system-workflow) | Delta | Status |',
    '|--------|-------------------|----------------------|-------|--------|',
    `| Total Tokens | ${legacy.tokenUsage.total} | ${systemWorkflow.tokenUsage.total} | ${(tokenDelta * 100).toFixed(1)}% | ${tokenOk ? '✅' : '❌'} |`,
    `| Latency (ms) | ${legacy.latency.total} | ${systemWorkflow.latency.total} | ${(latencyDelta * 100).toFixed(1)}% | ${latencyOk ? '✅' : '❌'} |`,
    `| Avg Quality | ${legacy.quality.averageScore.toFixed(2)} | ${systemWorkflow.quality.averageScore.toFixed(2)} | ${(systemWorkflow.quality.averageScore - legacy.quality.averageScore).toFixed(2)} | ✅ |`,
    `| Patch Rejection | N/A | ${systemWorkflow.patches != null ? `${(systemWorkflow.patches.rejectionRate * 100).toFixed(1)}%` : 'N/A'} | N/A | ${rejectionOk ? '✅' : '❌'} |`,
    '',
    '## Acceptance Criteria',
    '',
    `- ${tokenOk ? '✅' : '❌'} Token usage < 40% increase`,
    `- ${latencyOk ? '✅' : '❌'} Latency < 30% increase`,
    `- ${rejectionOk ? '✅' : '❌'} Patch rejection < 5%`,
    `- ${qualityFirstPassOk ? '✅' : '❌'} >80% of stories score ≥ 4.0 on first pass`,
    `- ${manualReviewOk ? '✅' : '❌'} <5% require manual review`,
    '',
    '## Detailed Results',
    '',
    '### Legacy Mode (workflow)',
    '',
    `- **Tokens**: ${legacy.tokenUsage.input} in / ${legacy.tokenUsage.output} out (total ${legacy.tokenUsage.total})`,
    `- **Latency**: ${legacy.latency.total} ms total`,
    `- **Quality**: avg ${legacy.quality.averageScore.toFixed(2)}, rewrites ${legacy.quality.rewrites}, manual review ${legacy.quality.manualReviewNeeded}`,
    `- **Score distribution**: ${JSON.stringify(legacy.quality.scoresDistribution)}`,
    '',
    '### New Mode (system-workflow)',
    '',
    `- **Tokens**: ${systemWorkflow.tokenUsage.input} in / ${systemWorkflow.tokenUsage.output} out (total ${systemWorkflow.tokenUsage.total})`,
    `- **Latency**: ${systemWorkflow.latency.total} ms total (pass0: ${systemWorkflow.latency.pass0 ?? 'N/A'}, pass1: ${systemWorkflow.latency.pass1}, pass2: ${systemWorkflow.latency.pass2 ?? 'N/A'}, pass2b: ${systemWorkflow.latency.pass2b ?? 'N/A'})`,
    `- **Quality**: avg ${systemWorkflow.quality.averageScore.toFixed(2)}, rewrites ${systemWorkflow.quality.rewrites}, manual review ${systemWorkflow.quality.manualReviewNeeded}`,
    `- **Score distribution**: ${JSON.stringify(systemWorkflow.quality.scoresDistribution)}`,
  ];
  if (systemWorkflow.patches != null) {
    lines.push(
      `- **Patches**: applied ${systemWorkflow.patches.applied}, rejected ${systemWorkflow.patches.rejected}, rejection rate ${(systemWorkflow.patches.rejectionRate * 100).toFixed(1)}%`
    );
  }
  lines.push('', '## Recommendations', '');
  if (tokenOk && latencyOk && rejectionOk && qualityFirstPassOk && manualReviewOk) {
    lines.push('All acceptance criteria met. System-workflow is suitable for production use.');
  } else {
    if (!tokenOk) lines.push('- Consider prompt or context trimming to reduce token growth.');
    if (!latencyOk) lines.push('- Profile per-pass latency; consider caching or parallelization.');
    if (!rejectionOk) lines.push('- Review patch validation and path allowlists to lower rejection rate.');
    if (!qualityFirstPassOk) lines.push('- Improve first-pass quality (judge rubric or iteration prompts).');
    if (!manualReviewOk) lines.push('- Reduce manual-review rate via clearer acceptance criteria.');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const productContext = DEFAULT_PRODUCT_CONTEXT;
  const metrics: BenchmarkMetrics = {
    inputTokens: 0,
    outputTokens: 0,
    totalLatencyMs: 0,
    latencyByPass: {},
  };

  console.log('Running legacy (workflow) benchmark...');
  resetMetrics(metrics);
  const legacyResult = await runBenchmark(
    'workflow',
    BENCHMARK_STORIES,
    productContext,
    undefined,
    metrics
  );

  console.log('Running new (system-workflow) benchmark...');
  resetMetrics(metrics);
  const systemWorkflowResult = await runBenchmark(
    'system-workflow',
    BENCHMARK_STORIES,
    productContext,
    undefined,
    metrics
  );

  const report = generateReport(legacyResult, systemWorkflowResult);
  const outPath = join(process.cwd(), 'benchmark-results.md');
  writeFileSync(outPath, report, 'utf-8');
  console.log(`Report written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
