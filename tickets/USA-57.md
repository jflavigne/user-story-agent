# USA-57: Migration Guide & Documentation

**Status**: BLOCKED (needs USA-56)
**Depends on**: USA-56
**Size**: Medium (~400 lines)
**Track**: Track 6 (Integration & Testing)

## Description

Create documentation for new system.

## Tasks

1. Write migration guide (legacy → system-workflow mode)
2. Document patch-based advisor format
3. Document judge output format
4. Document stable ID conventions
5. Add examples for each pass
6. Add troubleshooting guide
7. Update README

## Acceptance Criteria

- Migration guide complete
- All concepts documented with examples
- README updated
- Troubleshooting guide included

## Files Created/Modified

- `docs/MIGRATION.md` (new)
- `docs/ARCHITECTURE.md` (new)
- `docs/EXAMPLES.md` (new)
- `README.md` (updated)

## Dependencies

**Blocked by USA-56** - System must be finalized and tuned

## Notes

- Migration guide shows before/after (legacy workflow vs system-workflow)
- Examples show each pass with sample inputs/outputs
- Troubleshooting covers common issues (low judge scores, patch rejections, convergence failures)
- README gets high-level overview and quick start
