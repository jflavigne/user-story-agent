# Implementation Audit: Root-Level Tickets (2026-02-06)

**Scope:** Tickets in `tickets/` root (excluding README, index, summaries, and `complete/`).  
**Method:** For each ticket, acceptance criteria and described behavior were checked against the current codebase.

---

## Summary

| Result | Count | Tickets |
|--------|--------|--------|
| **Complete (verified)** | 1 | USA-31 |
| **Not implemented** | Remain Open/Ready | AUDIT-001–008, USA-80–84, USA-52, USA-57, USA-58, USA-61-url, USA-62-url, USA-32–48 |

---

## USA-31: Fix Schema Mismatches — COMPLETE

**Verified in code:**

- `src/shared/schemas.ts`: `RelationshipSchema` has `id`, `operation`, `name`, `evidence`. `ItemSchema` has required `id`. `ImplementationNotesSchema` uses required arrays. `UIMappingItemSchema` uses `productTerm`/`componentName`. `JudgeRubricSchema` uses `SectionSeparationDimensionSchema` with `violations`. `GlobalConsistencyReportSchema` uses `issues`/`fixes`. `StoryInterconnectionsSchema`, `SystemDiscoveryContextSchema`, `ComponentGraphSchema`, `SharedContractsSchema`, and related Phase 1 schemas are present and aligned with `src/shared/types.ts`.

**Action:** Status set to COMPLETE; ticket moved to `../archive/`.

---

## AUDIT-001–008 — NOT COMPLETE

- **AUDIT-001 (Token estimation):** `iteration-registry.ts` and other call sites still use `length / 4`. No tokenization library or accuracy tests found.
- **AUDIT-002 (Evaluator silent failures):** No `evaluationFailed` or `strictEvaluation` in `evaluator.ts` or schemas.
- **AUDIT-003 (Streaming error clarity):** `claude-client.ts` still has dual error path; no JSDoc or test for empty stream.
- **AUDIT-004 (Model validation):** No `KNOWN_MODELS` or invalid-model validation in `config.ts`.
- **AUDIT-005 (Skills cache):** No TTL/LRU or analysis doc; cache remains unbounded.
- **AUDIT-006 (Streaming timeout):** Not re-verified; left as Ready.
- **AUDIT-007 (Verification score semantics):** Not re-verified; left as Ready.
- **AUDIT-008 (Logger timestamp):** Not re-verified; left as Ready.

---

## USA-80–84 — NOT COMPLETE

- **USA-80 (Prompt loader errors):** No "Iteration prompts directory not found" or "Failed to load iteration prompt" in `prompt-loader.ts`; raw Node errors still propagate.
- **USA-81 (outputFormat validation):** `prompt-loader.ts` defaults `outputFormat` to `'patches'` but does not throw for invalid values.
- **USA-82 (Test setup error handling):** `tests/setup.ts` still has bare `await initializeIterationPrompts()` with no try/catch.
- **USA-83 (--list-iterations):** No `listIterations` or `--list-iterations` in CLI.
- **USA-84 (Rewriter duplicate sections):** `section-separation.ts` prompt has no instructions for `duplicateSections`; post-processing has generic “remove duplicate sections” but rewriter does not use judge’s duplicate report.

---

## USA-58, USA-61-url, USA-62-url — NOT COMPLETE

- **USA-58 (buildModelFromArgs tests):** No `buildModelFromArgs.test.ts` in `tests/`.
- **USA-61 (Host validation for mockup image URLs):** Ticket targets `image-utils.ts`; Figma-specific validation exists in `url-validator.ts` / `figma-utils.ts`, but generic image URL host validation is not in `image-utils.ts`.
- **USA-62 (Response size limiting for mockup URLs):** Ticket targets `image-utils.ts`; size check exists in `figma-utils.ts` for Figma image download only. Generic mockup URL fetch in `image-utils.ts` not updated.

---

## USA-32–48 (Enterprise)

Not re-audited; README states "Enterprise Deployment Progress: 0/18". Left as-is.

---

## Recommendation

Only **USA-31** had sufficient implementation evidence to mark complete and archive. If you believe other tickets are done, sharing which ones (and where the implementation lives) will allow updating status and this audit doc.
