# USA-22: Logger Integration

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** Low
**Dependencies:** USA-21, USA-13, USA-16

## Description

Integrate the logger utility into the CLI and agent components for improved debugging and observability.

## Acceptance Criteria

- [x] Add CLI flags: `--verbose`, `--debug`, `--quiet`
- [x] Document `LOG_LEVEL` environment variable in help text
- [x] Integrate logger into `claude-client.ts` with API timing and token tracking
- [x] Integrate logger into `user-story-agent.ts` with iteration lifecycle events
- [x] Initialize logger early in CLI before any processing
- [x] Add session tracking (start/end) in CLI main function
- [x] All existing tests continue to pass

## Files

- `src/cli.ts` - Add logging flags and initialization
- `src/agent/claude-client.ts` - API call logging
- `src/agent/user-story-agent.ts` - Iteration lifecycle logging

## Status: COMPLETE (2026-01-31)

## Technical Notes

### CLI Flags

| Flag | Effect |
|------|--------|
| `--verbose` | Info level (default) |
| `--debug` | Debug level (most verbose) |
| `--quiet` / `-q` | Error level only |

### What Gets Logged

| Level | Content |
|-------|---------|
| Error | API failures, validation errors |
| Warn | Empty responses, deprecations |
| Info | Iteration lifecycle, token/timing summary |
| Debug | Full API details, context building, per-call metrics |

### Example Output

```
[12:34:56.789] [INFO] Session started
[12:34:56.790] [DEBUG] Mode: individual, Input: stdin, Output: stdout
[12:34:56.792] [INFO] Starting iteration: validation
[12:34:57.123] [DEBUG] API call starting (model: claude-sonnet-4-20250514, maxTokens: 4096)
[12:34:58.456] [DEBUG] API call completed (1.33s, 280 in / 65 out tokens)
[12:34:58.457] [INFO] Completed: validation (1.7s, 280 in / 65 out tokens)
[12:34:58.458] [INFO] Processed 1 iterations
[12:34:58.459] [INFO] Session ended (1.67s, 1 API calls, 280 in / 65 out tokens)
```
