# Implementation Ticket Index (USA-30 through USA-57)

**Total Tickets**: 28 (USA-30 already complete)
**Remaining**: 27 tickets
**Estimated Duration**: 10-12 weeks with parallelization

---

## Track 1: Foundation & Schemas (USA-30 to USA-35)

| Ticket | Title | Status | Size | Dependencies |
|--------|-------|--------|------|--------------|
| USA-30 | Schema/Type Parity Audit | ✅ COMPLETE | Tiny (~30 mins) | None |
| USA-31 | Fix Schema Mismatches | 🚫 BLOCKED | Small (~200 lines) | USA-30 |
| USA-32 | Create PatchValidator Module | 🚫 BLOCKED | Small (~150 lines) | USA-31 |
| USA-33 | Complete StoryRenderer Implementation | 🚫 BLOCKED | Medium (~200 lines) | USA-31 |
| USA-34 | Complete StoryJudge Implementation | 🚫 BLOCKED | Medium (~300 lines) | USA-31 |
| USA-35 | Complete StoryRewriter Implementation | 🚫 BLOCKED | Small (~100 lines) | USA-31, USA-34 |

**Track Status**: USA-30 complete, USA-31 is next critical path item

---

## Track 2: Patch-Based Infrastructure (USA-36 to USA-40)

| Ticket | Title | Status | Size | Dependencies |
|--------|-------|--------|------|--------------|
| USA-36 | Add allowedPaths to IterationDefinition | 🚫 BLOCKED | Small (~50 lines) | USA-31 |
| USA-37 | Update One Iteration to Return Patches | 🚫 BLOCKED | Medium (~200 lines) | USA-36 |
| USA-38 | Update Remaining 11 Iterations | 🚫 BLOCKED | Large (~1000 lines) | USA-37 |
| USA-39 | Integrate PatchOrchestrator | 🚫 BLOCKED | Medium (~200 lines) | USA-32, USA-38 |
| USA-40 | Add Judge-First Workflow (Pass 1c) | 🚫 BLOCKED | Medium (~150 lines) | USA-34, USA-39 |

**Track Status**: Blocked on USA-31

---

## Track 3: System Prompt & Template (USA-41 to USA-42)

| Ticket | Title | Status | Size | Dependencies |
|--------|-------|--------|------|--------------|
| USA-41 | Update System Prompt with Section Rules | ✅ READY | Medium (~200 lines) | None (prompt writing) |
| USA-42 | Add Context Manager Support | 🚫 BLOCKED | Small (~100 lines) | USA-31, USA-41 |

**Track Status**: USA-41 ready to start (prompt writing), USA-42 blocked on USA-31

---

## Track 4: Pass 0 - System Discovery (USA-43 to USA-47)

| Ticket | Title | Status | Size | Dependencies |
|--------|-------|--------|------|--------------|
| USA-43 | Create System Discovery Prompt | ✅ READY | Large (~400 lines) | None (prompt writing) |
| USA-44 | Implement runPass0Discovery() | 🚫 BLOCKED | Medium (~200 lines) | USA-43 |
| USA-45 | Implement ID Registry | ✅ READY | Medium (~200 lines) | None (pure function) |
| USA-46 | Implement Refinement Loop | 🚫 BLOCKED | Large (~300 lines) | USA-40, USA-44 |
| USA-47 | Implement mergeNewRelationships() | 🚫 BLOCKED | Medium (~150 lines) | USA-46 |

**Track Status**: USA-43 and USA-45 ready to start, others blocked

---

## Track 5: Pass 2 - Story Interconnection (USA-48 to USA-52)

| Ticket | Title | Status | Size | Dependencies |
|--------|-------|--------|------|--------------|
| USA-48 | Create Story Interconnection Prompt | ✅ READY | Large (~300 lines) | None (prompt writing) |
| USA-49 | Implement runPass2Interconnection() | 🚫 BLOCKED | Medium (~200 lines) | USA-48 |
| USA-50 | Create Global Consistency Judge Prompt | ✅ READY | Large (~300 lines) | None (prompt writing) |
| USA-51 | Implement judgeGlobalConsistency() | 🚫 BLOCKED | Medium (~150 lines) | USA-34, USA-50 |
| USA-52 | Implement Auto-Apply Fixes | 🚫 BLOCKED | Medium (~150 lines) | USA-51 |

**Track Status**: USA-48 and USA-50 ready to start (prompt writing), others blocked

---

## Track 6: Integration & Testing (USA-53 to USA-57)

| Ticket | Title | Status | Size | Dependencies |
|--------|-------|--------|------|--------------|
| USA-53 | Add 'system-workflow' Mode | 🚫 BLOCKED | Medium (~200 lines) | USA-32 through USA-52 |
| USA-54 | End-to-End Integration Tests | 🚫 BLOCKED | Large (~500 lines) | USA-53 |
| USA-55 | Performance Benchmarking | 🚫 BLOCKED | Medium (~200 lines) | USA-54 |
| USA-56 | Tune Judge Thresholds | 🚫 BLOCKED | Small (~50 lines) | USA-55 |
| USA-57 | Migration Guide & Documentation | 🚫 BLOCKED | Medium (~400 lines) | USA-56 |

**Track Status**: All blocked on earlier tracks

---

## Critical Path

The longest dependency chain (determines minimum time):

```
USA-30 → USA-31 → USA-36 → USA-37 → USA-38 → USA-39 → USA-40 → USA-46 → USA-53 → USA-54 → USA-55 → USA-56 → USA-57
```

**Critical path length**: 13 tickets

---

## Ready to Start NOW

These tickets have no dependencies and can start immediately:

1. **USA-41** - Update System Prompt (prompt writing)
2. **USA-43** - Create System Discovery Prompt (prompt writing)
3. **USA-45** - Implement ID Registry (pure function)
4. **USA-48** - Create Story Interconnection Prompt (prompt writing)
5. **USA-50** - Create Global Consistency Judge Prompt (prompt writing)

---

## Next Steps (Week 1)

### Immediate (Parallel Execution)
1. **Start USA-31** (schema fixes) - MUST GO FIRST, blocks most work
2. **In parallel while USA-31 runs**:
   - USA-41 (system prompt)
   - USA-43 (Pass 0 prompt)
   - USA-45 (ID Registry)
   - USA-48 (Pass 2 prompt)
   - USA-50 (global consistency prompt)

### After USA-31 Complete
3. **Start in parallel**:
   - USA-32 (PatchValidator)
   - USA-33 (StoryRenderer)
   - USA-34 (StoryJudge)
   - USA-36 (allowedPaths)
   - USA-42 (Context Manager)

---

## Size Legend

- **Tiny**: < 1 hour
- **Small**: 1-4 hours
- **Medium**: 4-8 hours
- **Large**: 8-16 hours

---

## Status Legend

- ✅ **READY** - Can start immediately
- 🚫 **BLOCKED** - Waiting on dependencies
- ✅ **COMPLETE** - Done

---

Last Updated: 2026-01-30
