# USA-43: Create System Discovery Prompt

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: None
**Size**: Large (~400 lines)
**Track**: Track 4 (Pass 0 - System Discovery)

## Description

Create Pass 0 prompt for extracting component mentions and canonical names. This is prompt writing only - NO ID generation (IDs come from USA-45).

## Tasks

1. Write prompt to extract component graph from mockups/reference docs
2. Prompt outputs raw mentions (e.g., "Login Button", "userProfile", "LOGIN_BTN")
3. Prompt outputs canonical names for each entity (normalized, human-readable)
4. Include product vocabulary mapping extraction
5. Include evidence/justification for each discovered entity
6. Define output format as `SystemDiscoveryMentions` JSON (mentions + canonical names, NO IDs)

## Acceptance Criteria

- Prompt extracts component mentions and canonical names
- NO ID generation in Pass 0 (IDs come from USA-45)
- Output includes evidence/justification for discovered entities
- Output format matches intermediate structure (to be defined in USA-44)

## Files Created

- `src/prompts/iterations/system-discovery.ts`

## Files Modified

None

## Dependencies

None (prompt writing can start immediately)

## Notes

- Pass 0 discovers system structure from mockups/docs
- Mentions are raw (e.g., "login btn", "LoginButton", "LOGIN_FORM")
- Canonical names are normalized (e.g., "Login Button", "Login Form")
- ID minting happens separately in USA-45 (deterministic, not LLM-based)
