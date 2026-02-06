# Scripts

One-off and development scripts. Run from the **user-story-agent** package root (`npm run` from this directory, or `node scripts/<name>` where applicable).

## Benchmarks

| Script | Purpose | When to use |
|--------|---------|-------------|
| `benchmark.ts` | **Main benchmark** – system-workflow vs legacy with mocked Claude; token usage, latency, quality. | `npm run benchmark` – regression/performance checks. |
| `real-benchmark.ts` | **Live API benchmark** – real Anthropic calls; judge scores, rewrite effectiveness. | When validating thresholds and manual review rates; requires `BENCHMARK_SCRATCHPAD` and API key. |
| `expanded-benchmark.ts` | Extended benchmark variant. | Ad-hoc analysis. |
| `vision-benchmark.ts` | Vision-related benchmarking. | Vision pipeline performance. |
| `monitor-benchmark.ts` | Monitor or watch benchmark runs. | Long-running or repeated runs. |
| `compare-vision-benchmarks.ts` | Compare two vision benchmark outputs. | After running vision benchmarks. |

Benchmark output is typically written under `benchmark-results/` or root `benchmark-results.md` / `real-benchmark-results.json` (these paths are gitignored).

## Figma

| Script | Purpose | When to use |
|--------|---------|-------------|
| `download-figma-fixture.mjs` | Download Figma fixture for tests. | `npm run download-fixture` – test setup. |
| `download-figma-components.ts` | Download Figma component set. | Pipeline or inventory setup. |
| `download-figma-screenshot.ts` | Download screenshot(s) from Figma. | One-off asset fetch. |
| `figma-pipeline/run-resume.sh` | Resume interrupted Figma pipeline run. | After partial pipeline failure. |
| `figma-pipeline/generate-stories-resume.ts` | Generate stories from a resume state. | Used by run-resume flow. |
| `figma-pipeline/get-node-ids.ts` | Get node IDs from Figma file. | Debug or pipeline config. |

## Migrations

| Script | Purpose | When to use |
|--------|---------|-------------|
| `migrate-iterations-to-md.mjs` | Migrate iteration prompts from TS to Markdown. | One-off; iterations are now in `src/prompts/iterations/*.md`. |
| `migrate-iterations.ts` | TS-based iteration migration. | Historical; superseded by .mjs or current loader. |

## Token / prompt dev (one-off)

| Script | Purpose | When to use |
|--------|---------|-------------|
| `calculate-tokens.mjs` | Estimate token counts for system and post-processing prompts. | `node scripts/calculate-tokens.mjs` – prompt sizing. |
| `verify-tokens.mjs` | Verify token estimates for specific iteration prompts (e.g. user-roles, interactive-elements). | When tuning iteration prompt length. |
| `verify-tokens.js` | Verify system and post-processing token estimates. | Same as above; legacy .js version. |
| `check_prompts.js` | Check validation and accessibility prompt lengths vs targets. | Prompt audit. |
| `count-tokens.js` | Print character and token estimates for system and post-processing. | Quick token check. |
| `char-count.mjs` | Count chars/tokens from temp files (`temp-system-prompt.txt`, `temp-post-processing-prompt.txt`). | Ad-hoc; requires creating those files. |

## Ad-hoc / test helpers

| Script | Purpose | When to use |
|--------|---------|-------------|
| `test-confidence-detection.ts` | Test confidence detection logic. | Debug or validation. |
| `test-figma-auto-detect.ts` | Test Figma URL/context auto-detection. | Figma pipeline debugging. |
| `test-image-compression.ts` | Test image compression (e.g. for vision). | Vision/image pipeline tuning. |
| `test-pipeline.sh` | Run Figma pipeline test. | Manual pipeline smoke test. |

## Other

| Script | Purpose |
|--------|---------|
| `patch-orchestrator-type-fix.patch` | Saved patch for patch-orchestrator type fixes (reference only; may already be applied). |
