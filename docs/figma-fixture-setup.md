# Figma Fixture Setup Guide

The vision tests use a Figma screenshot at `tests/fixtures/figma-filter-components.png`. Without a valid image (>10KB), live vision tests produce unrealistic output. This guide covers all ways to obtain the fixture.

## Quick Start

```bash
npm run download-fixture
```

- **If `FIGMA_ACCESS_TOKEN` is set:** The script downloads the image from the Figma API and exits 0.
- **If the token is missing:** The script prints guidance for 3 manual options and exits 1 (a 70-byte placeholder is still written for path compatibility).

## Option A: Figma Personal Access Token (Recommended – ~5 minutes)

Best for automation and repeat runs.

1. **Create a token**
   - Go to [Figma Settings → Personal access tokens](https://www.figma.com/settings).
   - Click **Create new token**.
   - Name it (e.g. `user-story-agent-fixture`).
   - Ensure **File content** read access is enabled.
   - Copy the token (it is shown only once).

2. **Set the token and run**
   ```bash
   export FIGMA_ACCESS_TOKEN="figd_xxxxxxxxxxxx"
   npm run download-fixture
   ```

3. **Verify**
   ```bash
   ls -l tests/fixtures/figma-filter-components.png   # expect >10KB
   file tests/fixtures/figma-filter-components.png   # PNG with real dimensions
   ```

## Option B: Manual Save via Figma MCP (Fastest – ~1 minute)

Use when you have Figma MCP in Cursor/Claude and want the image without creating a token.

1. **Get a screenshot in the conversation**
   - Use the Figma MCP tool to get a screenshot of the file.
   - File: [Test_Component-Inventory](https://www.figma.com/design/MHujefjiDpZQVpSQzE3pq1/Test_Component-Inventory?node-id=0-1), node ID `0:1`.

2. **Save the image**
   - Save the image returned in the conversation to:
   - `tests/fixtures/figma-filter-components.png` (from repo root).

3. **Verify**
   - File size should be >10KB (not 70 bytes).
   - `file tests/fixtures/figma-filter-components.png` should show PNG with dimensions >100×100.

## Option C: Export from Figma Desktop App (~2 minutes)

Use when you prefer the Figma app and don’t need automation.

1. **Open the file**
   - [Test_Component-Inventory (node 0:1)](https://www.figma.com/design/MHujefjiDpZQVpSQzE3pq1/Test_Component-Inventory?node-id=0-1).

2. **Export**
   - Select the frame for node `0:1`.
   - Right-click → **Export** (or use the Export section in the right panel).
   - Choose PNG, export once (e.g. 1x).
   - Save as `tests/fixtures/figma-filter-components.png` in the repo.

3. **Verify**
   - Same as Option B: >10KB, valid PNG with real dimensions.

## Verification

| Check | Placeholder (bad) | Real screenshot (good) |
|-------|-------------------|-------------------------|
| `ls -l tests/fixtures/figma-filter-components.png` | ~70 bytes | >10KB |
| `file ...` | 1 x 1 PNG | e.g. 800×600 or larger |

After replacing the placeholder, run a live vision test (optional):

```bash
RUN_LIVE_VISION_TESTS=1 npm test tests/live/vision-discovery.live.test.ts
```

## Troubleshooting

- **Script exits 1:** Token not set. Use one of the 3 options above; Option B is fastest if you have MCP.
- **Script exits 2:** API error (invalid token, no access to file, or Figma API issue). Check token scope and file link.
- **File still 70 bytes:** You’re still using the placeholder. Ensure you saved the real image to `tests/fixtures/figma-filter-components.png` and that the path is correct from the repo root.
- **Live tests still behave like placeholder:** Confirm `figma-filter-components.png` is >10KB and that tests are reading from that path.

## CI / Automation

- **With token:** In CI, set `FIGMA_ACCESS_TOKEN` as a secret and run `npm run download-fixture` before vision-related steps. Exit 0 means success; exit 2 means API failure.
- **Without token:** Either skip downloading (and skip live vision tests that need the real image) or check in a committed screenshot and do not run the download script in CI.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Image downloaded successfully. |
| 1 | Token missing; manual action needed (guidance printed). |
| 2 | API or image fetch error. |

## Reference

- Figma file: `MHujefjiDpZQVpSQzE3pq1`, node `0:1`.
- Fixture path: `tests/fixtures/figma-filter-components.png`.
- Script: `scripts/download-figma-fixture.mjs` (run via `npm run download-fixture`).
