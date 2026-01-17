# USA-21: Logger Utility

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** Low
**Dependencies:** USA-1

## Description

Create a lightweight, zero-dependency logging utility for improved debugging and observability. The logger provides level-based filtering, timestamp formatting, and token usage tracking.

## Acceptance Criteria

- [x] Create `src/utils/logger.ts` with singleton logger
- [x] Implement log levels: Silent (0), Error (1), Warn (2), Info (3), Debug (4)
- [x] Add timestamp formatting with millisecond precision
- [x] Add token usage accumulation for API calls
- [x] Add session start/end tracking with timing summaries
- [x] All output goes to stderr (keeps stdout clean for data)
- [x] Support `LOG_LEVEL` environment variable
- [x] Create unit tests in `tests/utils/logger.test.ts`

## Files

- `src/utils/logger.ts` - Logger implementation (~150 lines)
- `tests/utils/logger.test.ts` - Unit tests (25 tests)

## Technical Notes

### Log Levels

```
Silent (0) → Error (1) → Warn (2) → Info (3) → Debug (4)
                                      ↑
                                   default
```

### Output Format

```
[HH:MM:SS.mmm] [LEVEL] message
```

### Key Features

- Singleton pattern (matches existing architecture)
- `initializeLogger()` function for CLI/env configuration
- `addTokenUsage()` for API call tracking
- `startSession()` / `endSession()` for timing summaries
