#!/usr/bin/env tsx
/**
 * USA-56: Vision benchmark comparison
 *
 * Compares benchmark results (text-only vs vision-baseline vs vision-functional)
 * by counting over-specification patterns in story content. Generates a
 * comparison report with quality metrics.
 *
 * Usage:
 *   npx tsx scripts/compare-vision-benchmarks.ts [bench1.json [bench2.json [bench3.json]]]
 *   npx tsx scripts/compare-vision-benchmarks.ts real-benchmark-results.json
 *
 * If one file: report over-spec counts for that run.
 * If 2–3 files: first = text-only, second = vision-baseline, third = vision-functional.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { countOverSpecification, extractOverSpecSamples } from '../src/shared/overspecification-patterns.js';

// ---------------------------------------------------------------------------
// Over-specification patterns (aligned with tests/prompts/functional-vision-boundary.test.ts)
// ---------------------------------------------------------------------------

export interface OverSpecCounts {
  exactColor: number;
  pixelMeasurement: number;
  fontSpec: number;
  total: number;
}

export function countOverSpecificationInText(text: string): OverSpecCounts {
  return countOverSpecification(text);
}

export interface StoryOverSpec {
  storyId: string;
  counts: OverSpecCounts;
  sampleMatches?: { color: string[]; px: string[]; font: string[] };
}

export interface BenchmarkOverSpecReport {
  label: string;
  stories: StoryOverSpec[];
  totals: OverSpecCounts;
  storyCount: number;
  storiesWithOverSpec: number;
  avgPerStory: number;
}

export interface BenchmarkResultStory {
  id: string;
  content?: string;
}

export interface BenchmarkResultFile {
  stories?: BenchmarkResultStory[];
  metrics?: Record<string, unknown>;
}

function analyzeBenchmarkFile(
  filePath: string,
  label: string,
  includeSamples: boolean = false
): BenchmarkOverSpecReport {
  const raw = readFileSync(filePath, 'utf-8');
  const data: BenchmarkResultFile = JSON.parse(raw);
  const stories = data.stories ?? [];
  const storyReports: StoryOverSpec[] = [];
  const totals: OverSpecCounts = { exactColor: 0, pixelMeasurement: 0, fontSpec: 0, total: 0 };

  for (const story of stories) {
    const content = story.content ?? '';
    const counts = countOverSpecificationInText(content);
    totals.exactColor += counts.exactColor;
    totals.pixelMeasurement += counts.pixelMeasurement;
    totals.fontSpec += counts.fontSpec;
    totals.total += counts.total;

    const report: StoryOverSpec = { storyId: story.id, counts };
    if (includeSamples && counts.total > 0) {
      report.sampleMatches = extractOverSpecSamples(content, 5);
    }
    storyReports.push(report);
  }

  const storiesWithOverSpec = storyReports.filter((s) => s.counts.total > 0).length;
  const avgPerStory = stories.length > 0 ? totals.total / stories.length : 0;

  return {
    label,
    stories: storyReports,
    totals,
    storyCount: stories.length,
    storiesWithOverSpec,
    avgPerStory,
  };
}

function printReport(reports: BenchmarkOverSpecReport[], compare: boolean): void {
  console.log('# Vision Benchmark Over-Specification Report\n');

  for (const r of reports) {
    console.log(`## ${r.label}`);
    console.log(`- Stories: ${r.storyCount}`);
    console.log(`- Stories with over-spec: ${r.storiesWithOverSpec}`);
    console.log(`- Total matches: color ${r.totals.exactColor}, px/rem/em ${r.totals.pixelMeasurement}, font ${r.totals.fontSpec}`);
    console.log(`- Avg per story: ${r.avgPerStory.toFixed(2)}`);
    console.log('');
  }

  if (compare && reports.length >= 2) {
    console.log('## Comparison');
    const [a, b] = reports;
    const diffTotal = b.totals.total - a.totals.total;
    const diffStories = b.storiesWithOverSpec - a.storiesWithOverSpec;
    console.log(`- Total over-spec: ${a.label} ${a.totals.total} → ${b.label} ${b.totals.total} (${diffTotal >= 0 ? '+' : ''}${diffTotal})`);
    console.log(`- Stories with over-spec: ${a.storiesWithOverSpec} → ${b.storiesWithOverSpec} (${diffStories >= 0 ? '+' : ''}${diffStories})`);
    if (reports.length === 3) {
      const c = reports[2];
      console.log(`- Vision-functional total: ${c.totals.total}, stories with over-spec: ${c.storiesWithOverSpec}`);
    }
    console.log('');
  }

  // Optional: list stories with most over-spec
  for (const r of reports) {
    const withSpec = r.stories.filter((s) => s.counts.total > 0);
    if (withSpec.length === 0) continue;
    const top = [...withSpec].sort((x, y) => y.counts.total - x.counts.total).slice(0, 5);
    console.log(`### ${r.label} – Top stories by over-spec count`);
    for (const s of top) {
      console.log(`- ${s.storyId}: ${s.counts.total} (color ${s.counts.exactColor}, px ${s.counts.pixelMeasurement}, font ${s.counts.fontSpec})`);
      if (s.sampleMatches) {
        if (s.sampleMatches.color.length) console.log(`  color samples: ${s.sampleMatches.color.join(', ')}`);
        if (s.sampleMatches.px.length) console.log(`  px samples: ${s.sampleMatches.px.join(', ')}`);
        if (s.sampleMatches.font.length) console.log(`  font samples: ${s.sampleMatches.font.join(', ')}`);
      }
    }
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0) {
  const defaultPath = join(process.cwd(), 'real-benchmark-results.json');
  console.error('Usage: npx tsx scripts/compare-vision-benchmarks.ts [file1.json [file2.json [file3.json]]]');
  console.error(`Defaulting to single file: ${defaultPath}`);
  args.push(defaultPath);
}

const labels =
  args.length === 1
    ? ['Current run']
    : args.length === 2
      ? ['Text-only (baseline)', 'Vision']
      : ['Text-only', 'Vision-baseline', 'Vision-functional'];

const reports: BenchmarkOverSpecReport[] = args.map((path, i) =>
  analyzeBenchmarkFile(path, labels[i], true)
);
const compare = args.length >= 2;
printReport(reports, compare);
