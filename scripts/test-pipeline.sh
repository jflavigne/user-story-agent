#!/bin/bash
set -e

echo "=== Testing Pipeline with 10-Story Subset ==="

# Clean previous test artifacts
rm -rf ./test-artifacts-dev

# Run with minimal config
npm run agent -- \
  --mode system-workflow \
  --input "tests/fixtures/component-subset-10.csv" \
  --save-artifacts ./test-artifacts-dev \
  --project "test-run" \
  --product-type web \
  --debug

# Verify artifacts created
echo ""
echo "=== Verifying Artifacts ==="
find ./test-artifacts-dev -type f | head -20

# Check for incremental saves
echo ""
echo "=== Checking Incremental Saves ==="
ls -la ./test-artifacts-dev/projects/test-run/runs/*/stories/*/round-1/ 2>/dev/null || echo "No round-1 directories found"

# Check API logging
echo ""
echo "=== Checking API Logs ==="
ls -la ./test-artifacts-dev/projects/test-run/runs/*/api-calls/ 2>/dev/null | head -10 || echo "No API logs found"
