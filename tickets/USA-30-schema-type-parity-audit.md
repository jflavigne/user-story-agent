# USA-30: Schema/Type Parity Audit

**Date**: 2026-01-30
**Status**: COMPLETE
**Purpose**: Mechanical inventory of type/schema mismatches to guide USA-31 fixes

---

## Summary

This audit compares **Phase 1 TypeScript types** in `src/shared/types.ts` with their corresponding **Zod schemas** in `src/shared/schemas.ts`. Mismatches identified below must be fixed in USA-31.

---

## Parity Table

| Type (types.ts) | Schema (schemas.ts) | Parse Site(s) | Mismatch? | Details |
|-----------------|---------------------|---------------|-----------|---------|
| **Item** (L92-101) | ItemSchema (L83-86) | *(via parent schemas)* | ✅ YES | **Schema**: `id` is optional<br>**Type**: `id` is required<br>**Fix**: Make `id` required in schema |
| **ImplementationNotes** (L106-114) | ImplementationNotesSchema (L88-96) | *(via StoryStructure)* | ✅ YES | **Schema**: All fields optional<br>**Type**: All fields required arrays<br>**Fix**: Make all fields required |
| **UIMappingItem** (L119-128) | UIMappingItemSchema (L98-102) | *(via StoryStructure)* | ✅ YES | **Schema**: Uses `element`, `behavior`<br>**Type**: Uses `productTerm`, `componentName`, `contractId?`<br>**Fix**: Update schema to match type |
| **PatchPath** (L133-150) | PatchPathSchema (L104-112) | *(via SectionPatch)* | ✅ MATCH | Both define same enum values |
| **SectionPatch** (L155-162) | SectionPatchSchema (L114-120) | *(via AdvisorOutput)* | ✅ MATCH | Structure matches |
| **AdvisorOutput** (L167-169) | AdvisorOutputSchema (L122-125) | *(not directly parsed)* | ⚠️ MINOR | Schema has extra `rawSummary?` field (harmless) |
| **ValidationResult** (L174-177) | *(none)* | - | ❌ MISSING | No schema exists (not used in LLM parsing) |
| **StoryStructure** (L182-196) | StoryStructureSchema (L196-210) | *(not directly parsed)* | ✅ YES | **Schema**: Uses old UIMappingItemSchema<br>**Fix**: Will be fixed when UIMappingItemSchema updated |
| **JudgeRubric** (L205-236) | JudgeRubricSchema (L260-270) | story-judge.ts:61 | ✅ YES | **Type**: Has detailed violation structure<br>**Schema**: Missing detailed structure<br>**Fix**: Add violation/hallucination fields |
| **GlobalConsistencyReport** (L241-244) | GlobalConsistencyReportSchema (L161-164) | story-judge.ts:104 | ✅ MATCH | Structure matches |
| **ConsistencyIssue** (L249-254) | ConsistencyIssueSchema (L143-148) | *(via GlobalReport)* | ✅ MATCH | Structure matches |
| **FixPatch** (L259-268) | FixPatchSchema (L150-159) | *(via GlobalReport)* | ✅ MATCH | Structure matches |
| **Relationship** (L389-400) | RelationshipSchema (L131-136) | *(via JudgeRubric)* | ✅ YES | **Schema**: Only has `type`, `sourceId`, `targetId`, `description?`<br>**Type**: Has `id`, `operation`, `name`, `evidence`, etc.<br>**Fix**: Add all missing fields |
| **StoryInterconnections** (L407-418) | StoryInterconnectionsSchema (L138-141) | *(not parsed yet)* | ✅ YES | **Schema**: Only has `relationships`, `crossReferences?`<br>**Type**: Has `storyId`, `uiMapping`, `contractDependencies`, `ownership`, `relatedStories`<br>**Fix**: Complete rewrite needed |
| **RelatedStory** (L423-427) | *(none)* | - | ❌ MISSING | No schema exists (will be needed when StoryInterconnections parsed) |
| **SystemDiscoveryContext** (L277-284) | SystemDiscoveryContextSchema (L184-194) | *(not parsed yet)* | ✅ YES | **Schema**: Uses old structure with `digest?`, `summary?`<br>**Type**: Has `componentGraph`, `sharedContracts`, `componentRoles`, `productVocabulary`, `timestamp`, `referenceDocuments?`<br>**Fix**: Complete rewrite needed |
| **ComponentGraph** (L289-294) | ComponentGraphSchema (L179-182) | *(via SystemDiscovery)* | ✅ YES | **Schema**: Uses `nodes[]`, `edges[]`<br>**Type**: Uses `components`, `compositionEdges`, `coordinationEdges`, `dataFlows`<br>**Fix**: Complete rewrite needed |
| **Component** (L299-308) | ComponentGraphNodeSchema (L166-171) | *(via ComponentGraph)* | ✅ YES | **Schema**: Uses `type: 'feature' \| 'component' \| 'screen'`<br>**Type**: Has `id`, `productName`, `technicalName?`, `description`, `children?`, `dataSources?`, etc.<br>**Fix**: Update to match type |
| **CompositionEdge** (L313-316) | *(none - merged into ComponentGraphEdgeSchema)* | - | ⚠️ MISMATCH | Type separates composition/coordination, schema doesn't |
| **CoordinationEdge** (L319-325) | *(none - merged into ComponentGraphEdgeSchema)* | - | ⚠️ MISMATCH | Type separates composition/coordination, schema doesn't |
| **SharedContracts** (L330-335) | *(partial in SystemDiscoveryContextSchema)* | - | ✅ YES | **Schema**: Only has generic `contracts[]`<br>**Type**: Has `stateModels[]`, `eventRegistry[]`, `standardStates[]`, `dataFlows[]`<br>**Fix**: Create proper schema |
| **StateModel** (L340-346) | *(none)* | - | ❌ MISSING | No schema exists |
| **EventDefinition** (L351-357) | *(none)* | - | ❌ MISSING | No schema exists |
| **DataFlow** (L362-367) | *(none)* | - | ❌ MISSING | No schema exists |
| **StandardState** (L372-375) | *(none)* | - | ❌ MISSING | No schema exists |
| **ComponentRole** (L379-384) | *(none)* | - | ❌ MISSING | No schema exists |

---

## Critical Parse Sites

These are where schemas are actually used to validate LLM output:

| Schema | Parse Site | Method | Impact |
|--------|------------|--------|--------|
| IterationOutputSchema | user-story-agent.ts:496 | `.parse()` | Legacy iteration output (not Phase 1) |
| VerificationResultSchema | evaluator.ts:77 | `.parse()` | Legacy evaluator (not Phase 1) |
| **JudgeRubricSchema** | story-judge.ts:61 | `.safeParse()` | **CRITICAL** - Used in Pass 1c |
| **GlobalConsistencyReportSchema** | story-judge.ts:104 | `.safeParse()` | **CRITICAL** - Used in Pass 2b |

**Note**: AdvisorOutputSchema, StoryInterconnectionsSchema, SystemDiscoveryContextSchema not yet used in parse sites (will be added in USA-37+).

---

## Priority Fixes for USA-31

### P0 - Blocks current functionality
1. **JudgeRubricSchema** - Missing violation details structure
2. **RelationshipSchema** - Missing required fields (`id`, `operation`, `name`, `evidence`)

### P1 - Blocks USA-32+ (PatchValidator, Renderer, etc.)
3. **ItemSchema** - `id` should be required
4. **ImplementationNotesSchema** - All fields should be required arrays
5. **UIMappingItemSchema** - Rename fields to match type

### P2 - Blocks USA-43+ (Pass 0 System Discovery)
6. **SystemDiscoveryContextSchema** - Complete rewrite
7. **ComponentGraphSchema** - Separate composition/coordination edges
8. **Component/StateModel/EventDefinition/DataFlow schemas** - Create all missing schemas
9. **SharedContracts schemas** - Create proper structure

### P3 - Blocks USA-48+ (Pass 2 Interconnection)
10. **StoryInterconnectionsSchema** - Complete rewrite
11. **RelatedStorySchema** - Create new schema

---

## Estimated Fix Effort (USA-31)

- **Lines to modify**: ~150 lines in schemas.ts
- **New schemas to create**: 8 (StateModel, EventDefinition, DataFlow, StandardState, ComponentRole, RelatedStory, + rewrites)
- **Test updates needed**: Minimal (most schemas not yet used in tests)
- **Risk**: Low (most changes won't break existing code since schemas aren't used yet)

---

## Success Criteria

After USA-31 is complete:
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] All Phase 1 types have corresponding schemas
- [ ] All schema fields match type fields (names, optionality, structure)
- [ ] Existing parse sites (story-judge.ts) still work
- [ ] Ready for USA-32 (PatchValidator) and beyond

---

## Notes

- **ValidationResult** has no schema because it's not used for LLM parsing (internal use only)
- **AdvisorOutputSchema.rawSummary** is extra field not in type (harmless, can be removed)
- Legacy schemas (IterationOutputSchema, VerificationResultSchema) not included in this audit (pre-Phase 1)
- Some schemas exist but aren't used in parse sites yet (will be integrated in USA-37+)
