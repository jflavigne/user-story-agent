# USA-82: Add error handling to test setup

## Status
Open

## Priority
P2

## Description
The test setup file (`tests/setup.ts`) calls `initializeIterationPrompts()` without error handling. If initialization fails, tests get an unhandled rejection instead of a clear setup failure message.

## Current Behavior
```typescript
await initializeIterationPrompts(ITERATIONS_DIR);
```
If this fails, Vitest shows:
```
UnhandledPromiseRejectionWarning: Error: ...
```

## Desired Behavior
Clear test setup failure:
```
Test setup failed: Could not load iteration prompts from src/prompts/iterations
```

## Implementation
Wrap initialization in try/catch:
```typescript
try {
  await initializeIterationPrompts(ITERATIONS_DIR);
} catch (error) {
  console.error('Test setup failed: Could not load iteration prompts', error);
  process.exit(1);
}
```

## Origin
Code review finding F6 from USA-79 implementation
