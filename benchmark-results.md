# Performance Benchmark Report

Generated: 2026-01-31T01:17:09.138Z

## Summary

| Metric | Legacy (workflow) | New (system-workflow) | Delta | Status |
|--------|-------------------|----------------------|-------|--------|
| Total Tokens | 61250 | 68450 | 11.8% | ✅ |
| Latency (ms) | 780 | 864 | 10.8% | ✅ |
| Avg Quality | 0.00 | 0.00 | 0.00 | ✅ |
| Patch Rejection | N/A | 0.0% | N/A | ✅ |

## Acceptance Criteria

- ✅ Token usage < 40% increase
- ✅ Latency < 30% increase
- ✅ Patch rejection < 5%
- ❌ >80% of stories score ≥ 4.0 on first pass
- ✅ <5% require manual review

## Detailed Results

### Legacy Mode (workflow)

- **Tokens**: 38250 in / 23000 out (total 61250)
- **Latency**: 780 ms total
- **Quality**: avg 0.00, rewrites 0, manual review 0
- **Score distribution**: {"0":0,"1":0,"2":0,"3":0,"4":0,"5":0}

### New Mode (system-workflow)

- **Tokens**: 43250 in / 25200 out (total 68450)
- **Latency**: 864 ms total (pass0: 12, pass1: 780, pass2: 72, pass2b: 0)
- **Quality**: avg 0.00, rewrites 0, manual review 0
- **Score distribution**: {"0":0,"1":0,"2":0,"3":0,"4":0,"5":0}
- **Patches**: applied 0, rejected 0, rejection rate 0.0%

## Recommendations

- Improve first-pass quality (judge rubric or iteration prompts).