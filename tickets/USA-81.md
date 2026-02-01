# USA-81: Validate outputFormat in iteration prompt frontmatter

## Status
Open

## Priority
P2

## Description
The `outputFormat` field in iteration prompt frontmatter is not validated. Any string value is accepted and cast to 'patches', which could lead to type safety issues if the code is extended.

## Current Behavior
- Frontmatter can have `outputFormat: anything`
- Value is cast to `'patches'` regardless of actual value
- No validation or error for invalid values

## Desired Behavior
- Validate `outputFormat` is one of: `'patches'` (or other allowed enum values if added later)
- Default to `'patches'` if omitted
- Throw error if invalid value provided

## Implementation
In `src/shared/prompt-loader.ts`, `validateAndNormalize`:
```typescript
const outputFormat = data.outputFormat ? String(data.outputFormat).trim() : 'patches';
if (outputFormat !== 'patches') {
  throw new Error(`Invalid outputFormat "${outputFormat}" in ${filePath}. Must be "patches"`);
}
```

## Origin
Code review finding F5 from USA-79 implementation
