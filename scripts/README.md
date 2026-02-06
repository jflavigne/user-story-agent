# Scripts

One-off and development scripts. Run from the **user-story-agent** package root (`npm run` from this directory, or `node scripts/<name>` / `npx tsx scripts/<name>.ts` where applicable).

## Benchmarks

| Script | Purpose | When to use |
|--------|---------|-------------|
| `benchmark.ts` | **Main benchmark** – system-workflow vs legacy with mocked Claude; token usage, latency, quality. | `npm run benchmark` – regression/performance checks. |
| `real-benchmark.ts` | **Live API benchmark** – real Anthropic calls; judge scores, rewrite effectiveness. | When validating thresholds and manual review rates; requires `BENCHMARK_SCRATCHPAD` and API key. |
| `expanded-benchmark.ts` | Extended benchmark variant (e.g. 16 stories). | Ad-hoc analysis; uses `BENCHMARK_SCRATCHPAD_DIR` or `benchmark-fixtures/`. |
| `vision-benchmark.ts` | Vision-related benchmarking. | Vision pipeline performance. |
| `compare-vision-benchmarks.ts` | Compare two or more vision benchmark JSON outputs. | After running vision benchmarks; see `docs/vision-functional-guidelines.md`. |

Benchmark output is typically written under `benchmark-results/` or root `benchmark-results.md` / `real-benchmark-results.json` (these paths are gitignored).

## Figma

| Script | Purpose | When to use |
|--------|---------|-------------|
| `download-figma-fixture.mjs` | Download Figma fixture for tests. | `npm run download-fixture` – test setup; see `docs/figma-fixture-setup.md`. |
| `download-figma-components.ts` | Download Figma component set as screenshots. | Pipeline or inventory setup; requires `FIGMA_ACCESS_TOKEN`. |
| `download-figma-screenshot.ts` | Download screenshot(s) from Figma. | One-off asset fetch; requires `FIGMA_ACCESS_TOKEN`. |
| `figma-pipeline/run-resume.sh` | Resume interrupted Figma pipeline run. | After partial pipeline failure; invokes `generate-stories-resume.ts`. |
| `figma-pipeline/generate-stories-resume.ts` | Generate stories from a resume state (CSV + checkpoint). | Used by `run-resume.sh`. |
| `figma-pipeline/get-node-ids.ts` | Print node IDs for components from a CSV. | Debug or pipeline config; expects CSV at `/tmp/components-with-figma-links.csv` (pass component names as args). |

## Token / prompt

| Script | Purpose | When to use |
|--------|---------|-------------|
| `calculate-tokens.mjs` | Estimate token counts for system and post-processing prompts. | `node scripts/calculate-tokens.mjs` – prompt sizing. |

## Test helpers

| Script | Purpose | When to use |
|--------|---------|-------------|
| `test-confidence-detection.ts` | Test confidence-based Figma component detection. | Debug or validation; `npx tsx scripts/test-confidence-detection.ts`. |
| `test-figma-auto-detect.ts` | Test Figma URL parsing and metadata parsing. | Figma pipeline debugging; `npx tsx scripts/test-figma-auto-detect.ts`. |
| `test-image-compression.ts` | Test image compression for vision pipeline. | Vision/image tuning; uses paths under `benchmark-assets/` if present. |
| `test-pipeline.sh` | Run Figma pipeline smoke test (10-story subset). | Manual smoke test; uses `tests/fixtures/component-subset-10.csv`. |
