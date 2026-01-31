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

## Implementation Steps

1. Use Figma MCP tool to download screenshot:
```typescript
mcp__figma__get_screenshot({
  fileKey: "MHujefjiDpZQVpSQzE3pq1",
  nodeId: "0:1",
  clientLanguages: "typescript",
  clientFrameworks: "unknown"
})
```

2. Save screenshot to `tests/fixtures/figma-filter-components.png`

3. Verify file size is realistic (should be >10KB for actual screenshot)

4. Optionally run live vision test to validate:
```bash
RUN_LIVE_VISION_TESTS=1 npm test tests/live/vision-discovery.live.test.ts
```

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
