# USA-80: Improve error messages from iteration prompt loader

## Status
Open

## Priority
P2

## Description
The iteration prompt loader (`src/shared/prompt-loader.ts`) propagates raw Node.js errors (ENOENT, EACCES, etc.) when files are missing or inaccessible. Users get unclear error messages.

## Current Behavior
```
Error: ENOENT: no such file or directory, open '/path/to/iterations/missing.md'
```

## Desired Behavior
```
Error: Iteration prompts directory not found: /path/to/iterations
Error: Failed to load iteration prompt from user-roles.md: File not accessible
```

## Implementation
In `loadIterationPrompts` and `loadIterationPrompt`, catch filesystem errors and rethrow with contextual messages:
- Missing directory: "Iteration prompts directory not found: {path}"
- File read error: "Failed to load iteration prompt from {filename}: {reason}"

## Origin
Code review finding F3 from USA-79 implementation
