# USA-57: System-workflow & Core Concepts Documentation

**Status**: Ready
**Depends on**: None
**Size**: Medium (~400 lines)
**Track**: Track 6 (Integration & Testing)

## Description

Document system-workflow mode, pipeline passes, patch-based iterations, judge output, stable IDs, and troubleshooting. Greenfield codebase; no migration guide.

## Tasks

1. Document workflow modes (individual, workflow, interactive, system-workflow) and when to use system-workflow
2. Document patch-based advisor format (SectionPatch, PatchPath, path-specific ID prefixes)
3. Document judge output format (JudgeRubric dimensions, recommendation, newRelationships; Pass 1c / Pass 2b)
4. Document stable ID conventions (COMP-, C-STATE-, E-, DF-; normalization and collision)
5. Add examples for each pass (Pass 0, Pass 1, Pass 2, Pass 2b) with sample inputs/outputs or artifacts
6. Add troubleshooting: low judge scores, patch rejections, refinement/convergence failures
7. Update README: mention system-workflow in modes and Quick Start/options where appropriate

## Acceptance Criteria

- System-workflow and pipeline passes (Pass 0 → 1 → 2 → 2b) documented
- Patch format and stable ID conventions documented
- All concepts documented with examples
- README updated
- Troubleshooting guide included

## Files Created/Modified

- `docs/system-workflow.md` (new)
- `docs/EXAMPLES.md` (new)
- `docs/architecture.md` (updated)
- `docs/troubleshooting.md` (updated)
- `README.md` (updated)

## Dependencies

None

## Notes

- System-workflow flow: Pass 0 (discovery) → Pass 1 (generation with judge/rewrite and refinement) → Pass 2 (interconnection) → Pass 2b (global consistency)
- Examples show each pass with sample inputs/outputs
- Troubleshooting covers low judge scores, patch rejections, convergence failures
- README has mode overview and quick start including system-workflow
