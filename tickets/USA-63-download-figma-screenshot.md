# USA-63: Download Actual Figma Screenshot for Vision Tests

**Status:** Open
**Priority:** P3
**Sprint:** Post-Vision Implementation
**Estimated Effort:** 15 minutes

## Problem

The Figma fixture at `tests/fixtures/figma-filter-components.png` is currently a 1x1 placeholder PNG (70 bytes). This prevents realistic validation of vision support in live tests.

**Current state:**
```bash
$ file tests/fixtures/figma-filter-components.png
tests/fixtures/figma-filter-components.png: PNG image data, 1 x 1, 8-bit/color RGBA, non-interlaced

$ ls -lh tests/fixtures/figma-filter-components.png
-rw-r--r--  1 user  staff    70B Jan 31 12:42 tests/fixtures/figma-filter-components.png
```

## Solution

Download the actual Figma screenshot using the Figma MCP tool:

**Figma Details:**
- File Key: `MHujefjiDpZQVpSQzE3pq1`
- Node ID: `0:1`
- URL: `https://www.figma.com/design/MHujefjiDpZQVpSQzE3pq1/Test_Component-Inventory?node-id=0-1`

**Expected Components in Screenshot:**
1. FilterSheet (Mobile Bottom Sheet)
2. FilterBar (Desktop Horizontal Bar)
3. FilterGroup (Accordion Component)
4. FilterItem (Individual Filter)
5. SpinnerLoading (Loading State)

## Implementation Steps (Enhanced Script – USA-63)

The script `scripts/download-figma-fixture.mjs` provides automated download when `FIGMA_ACCESS_TOKEN` is set, and formatted user guidance when it is missing. Run via:

```bash
npm run download-fixture
```

**When token is present:** Script downloads from Figma API and exits 0. Verify: file size >10KB.

**When token is missing:** Script prints 3 options (box-drawing formatted) and exits 1. A 70-byte placeholder is still written for path compatibility.

### Option A: Figma Personal Access Token (Recommended – ~5 min)

1. Create token at [Figma Settings → Personal access tokens](https://www.figma.com/settings) with "File content" read access.
2. `export FIGMA_ACCESS_TOKEN="your-token"` then `npm run download-fixture`.
3. Verify: `ls -l tests/fixtures/figma-filter-components.png` shows >10KB.

### Option B: Manual Save via Figma MCP (Fastest – ~1 min)

1. Use Figma MCP in Cursor/Claude to get screenshot of file `MHujefjiDpZQVpSQzE3pq1`, node `0:1`.
2. Save the image from the conversation to `tests/fixtures/figma-filter-components.png`.
3. Verify: file size >10KB (not 70 bytes).

### Option C: Export from Figma Desktop App (~2 min)

1. Open [Test_Component-Inventory (node 0:1)](https://www.figma.com/design/MHujefjiDpZQVpSQzE3pq1/Test_Component-Inventory?node-id=0-1).
2. Select frame (node 0:1), right-click → Export → PNG.
3. Save to `tests/fixtures/figma-filter-components.png`. Verify >10KB.

### Verification Steps

- `ls -l tests/fixtures/figma-filter-components.png` → >10KB.
- `file tests/fixtures/figma-filter-components.png` → PNG with dimensions >100×100.
- Optional live test: `RUN_LIVE_VISION_TESTS=1 npm test tests/live/vision-discovery.live.test.ts`.

See **docs/figma-fixture-setup.md** for full setup guide, troubleshooting, and CI recommendations.

## Acceptance Criteria

- [ ] Figma screenshot downloaded and saved to `tests/fixtures/figma-filter-components.png`
- [ ] File size is >10KB (realistic screenshot, not placeholder)
- [ ] `file` command confirms it's a valid PNG image with dimensions >100x100
- [ ] Recorded integration tests still pass (they use golden files, not the image directly)
- [ ] Optional: Live test produces output with >= 3 component synonyms and >= 3 evidence anchors

## Impact

**Without this fix:**
- Recorded integration tests: ✅ Work fine (use golden files)
- Live tests: ⚠️ Run but produce unrealistic output based on 1x1 placeholder

**With this fix:**
- Live tests will analyze actual component mockup
- Human inspection of artifacts will show realistic vision analysis
- Better validation of vision support quality

## Priority Justification

**P3 (Nice-to-have)** because:
- Live tests are opt-in only (require `RUN_LIVE_VISION_TESTS=1`)
- CI tests use golden files and don't need the actual image
- Core vision functionality is validated by contract and recorded tests
- Main impact is on manual validation and artifact inspection quality
