# API Reference

Programmatic API for User Story Agent.

## Installation

```typescript
import {
  UserStoryAgent,
  createAgent,
  type UserStoryAgentConfig,
  type AgentResult,
} from 'user-story-agent';
```

## Quick Start

```typescript
import { createAgent } from 'user-story-agent';

const agent = createAgent({
  mode: 'workflow',
  productContext: {
    productName: 'MyApp',
    productType: 'web',
    clientInfo: 'Acme Corp',
    targetAudience: 'Small business owners',
    keyFeatures: ['Dashboard', 'Reports', 'Settings'],
    businessContext: 'SaaS application for business analytics',
  },
});

const result = await agent.processUserStory('Login form with email and password');
console.log(result.enhancedStory);
```

## Classes

### UserStoryAgent

Main agent class for processing user stories through iterations.

#### Constructor

```typescript
new UserStoryAgent(config: UserStoryAgentConfig)
```

Creates a new agent instance.

**Throws:**
- `Error` if configuration is invalid
- `Error` if API key is missing

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `streaming` | `boolean` | Whether streaming is enabled (readonly) |

#### Methods

##### processUserStory

```typescript
async processUserStory(initialStory: string): Promise<AgentResult>
```

Main entry point for processing a user story.

**Parameters:**
- `initialStory` - The initial user story text to process

**Returns:** `Promise<AgentResult>` - The processing result

**Example:**
```typescript
const result = await agent.processUserStory(`
  As a user, I want to log in with my email and password
  so that I can access my account.
`);

if (result.success) {
  console.log('Enhanced story:', result.enhancedStory);
  console.log('Applied:', result.appliedIterations.join(', '));
} else {
  console.error('Failed:', result.summary);
}
```

#### Events

When streaming is enabled, the agent emits events:

```typescript
agent.on('stream', (event: StreamEventUnion) => {
  switch (event.type) {
    case 'start':
      console.log(`Starting: ${event.iterationId}`);
      break;
    case 'chunk':
      process.stdout.write(event.content);
      break;
    case 'complete':
      console.log(`Done: ${event.iterationId}`);
      break;
    case 'error':
      console.error(event.error);
      break;
  }
});
```

## Factory Functions

### createAgent

```typescript
function createAgent(config: UserStoryAgentConfig): UserStoryAgent
```

Factory function to create a configured agent instance.

**Example:**
```typescript
const agent = createAgent({
  mode: 'individual',
  iterations: ['validation', 'accessibility'],
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### loadConfigFromEnv

```typescript
function loadConfigFromEnv(): Partial<UserStoryAgentConfig>
```

Loads configuration from environment variables.

**Environment Variables:**
- `ANTHROPIC_API_KEY` - API key
- `CLAUDE_MODEL` - Model name

### mergeConfigWithDefaults

```typescript
function mergeConfigWithDefaults(
  partial: Partial<UserStoryAgentConfig>
): UserStoryAgentConfig
```

Merges partial configuration with defaults.

## Types

### UserStoryAgentConfig

Configuration for the agent.

```typescript
interface UserStoryAgentConfig {
  /** Mode: 'individual' | 'workflow' | 'interactive' */
  mode: 'individual' | 'workflow' | 'interactive';

  /** Iteration IDs (required for individual mode) */
  iterations?: IterationId[];

  /** Product context (required for workflow mode) */
  productContext?: ProductContext;

  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;

  /** Claude model (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Selection callback (required for interactive mode) */
  onIterationSelection?: IterationSelectionCallback;

  /** Max retry attempts (defaults to 3) */
  maxRetries?: number;

  /** Enable streaming (defaults to false) */
  streaming?: boolean;

  /** Enable output verification (defaults to false) */
  verify?: boolean;
}
```

### ProductContext

Context about the product being developed.

```typescript
interface ProductContext {
  /** Product name */
  productName: string;

  /** Product type: 'web' | 'mobile-native' | 'mobile-web' | 'desktop' | 'api' */
  productType: string;

  /** Client information */
  clientInfo: string;

  /** Target audience description */
  targetAudience: string;

  /** Key features list */
  keyFeatures: string[];

  /** Business context and goals */
  businessContext: string;

  /** Specific requirements (optional) */
  specificRequirements?: string;

  /** i18n requirements (optional) */
  i18nRequirements?: string;
}
```

### AgentResult

Result of processing a user story.

```typescript
interface AgentResult {
  /** Whether processing succeeded */
  success: boolean;

  /** Original input story */
  originalStory: string;

  /** Final enhanced story */
  enhancedStory: string;

  /** IDs of applied iterations */
  appliedIterations: string[];

  /** Detailed results from each iteration */
  iterationResults: IterationResult[];

  /** Human-readable summary */
  summary: string;
}
```

### IterationResult

Result from a single iteration.

```typescript
interface IterationResult {
  /** Iteration ID */
  iterationId: string;

  /** Story before iteration */
  inputStory: string;

  /** Story after iteration */
  outputStory: string;

  /** Changes applied */
  changesApplied: ChangeApplied[];

  /** Timestamp */
  timestamp: string;

  /** Verification result (if enabled) */
  verification?: VerificationResult;
}
```

### ChangeApplied

A single change made by an iteration.

```typescript
interface ChangeApplied {
  /** Change category */
  category: string;

  /** Change description */
  description: string;

  /** Change type: 'added' | 'modified' | 'removed' */
  type: 'added' | 'modified' | 'removed';
}
```

### IterationOption

Information about an available iteration (for interactive mode).

```typescript
interface IterationOption {
  /** Iteration ID */
  id: IterationId;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /** Category */
  category: IterationCategory;
}
```

### IterationSelectionCallback

Callback for interactive mode selection.

```typescript
type IterationSelectionCallback = (
  options: IterationOption[]
) => Promise<IterationId[]>;
```

## Streaming Types

### StreamEventUnion

Union of all streaming event types.

```typescript
type StreamEventUnion =
  | StreamStartEvent
  | StreamChunkEvent
  | StreamCompleteEvent
  | StreamErrorEvent;
```

### StreamStartEvent

```typescript
interface StreamStartEvent {
  type: 'start';
  iterationId: string;
  timestamp: number;
}
```

### StreamChunkEvent

```typescript
interface StreamChunkEvent {
  type: 'chunk';
  iterationId: string;
  timestamp: number;
  content: string;      // New content chunk
  accumulated: string;  // All content so far
}
```

### StreamCompleteEvent

```typescript
interface StreamCompleteEvent {
  type: 'complete';
  iterationId: string;
  timestamp: number;
  fullContent: string;
  tokenUsage: { input: number; output: number };
}
```

### StreamErrorEvent

```typescript
interface StreamErrorEvent {
  type: 'error';
  iterationId: string;
  timestamp: number;
  error: Error;
}
```

## Error Types

### AgentError

Base error class for all agent errors.

```typescript
class AgentError extends Error {
  code: string;
  cause?: Error;
}
```

### APIError

Error from API calls.

```typescript
class APIError extends AgentError {
  statusCode: number;
  retryable: boolean;
}
```

### ValidationError

Error from input validation.

```typescript
class ValidationError extends AgentError {
  field: string;
}
```

### TimeoutError

Error from request timeouts.

```typescript
class TimeoutError extends AgentError {}
```

## Iteration Registry Functions

### getAllIterations

```typescript
function getAllIterations(): IterationRegistryEntry[]
```

Returns all iterations in workflow order.

### getApplicableIterations

```typescript
function getApplicableIterations(productType: ProductType): IterationRegistryEntry[]
```

Returns iterations applicable to a product type.

### getIterationById

```typescript
function getIterationById(id: string): IterationRegistryEntry | undefined
```

Returns a single iteration by ID.

### getIterationsByCategory

```typescript
function getIterationsByCategory(category: IterationCategory): IterationRegistryEntry[]
```

Returns iterations matching a category.

## Constants

### PRODUCT_TYPES

```typescript
const PRODUCT_TYPES = ['web', 'mobile-native', 'mobile-web', 'desktop', 'api'] as const;
```

### WORKFLOW_ORDER

```typescript
const WORKFLOW_ORDER = [
  'user-roles',
  'interactive-elements',
  'validation',
  'accessibility',
  'performance',
  'security',
  'responsive-web',
  'responsive-native',
  'language-support',
  'locale-formatting',
  'cultural-appropriateness',
  'analytics',
] as const;
```

### ITERATION_CATEGORIES

```typescript
const ITERATION_CATEGORIES = [
  'roles',
  'elements',
  'validation',
  'quality',
  'responsive',
  'i18n',
  'analytics',
  'post-processing',
] as const;
```

## Usage Examples

### Individual Mode

```typescript
const agent = createAgent({
  mode: 'individual',
  iterations: ['validation', 'accessibility', 'security'],
});

const result = await agent.processUserStory('Contact form with name, email, message');
```

### Workflow Mode with Full Context

```typescript
const agent = createAgent({
  mode: 'workflow',
  productContext: {
    productName: 'HealthTracker Pro',
    productType: 'mobile-native',
    clientInfo: 'HealthCo Inc.',
    targetAudience: 'Health-conscious adults 25-55',
    keyFeatures: ['Activity tracking', 'Meal logging', 'Progress charts'],
    businessContext: 'Mobile health app with subscription model',
    i18nRequirements: 'Support for English, Spanish, French',
  },
  streaming: true,
  verify: true,
});

agent.on('stream', (event) => {
  if (event.type === 'chunk') {
    process.stdout.write(event.content);
  }
});

const result = await agent.processUserStory(`
  Dashboard screen showing:
  - Daily step count with goal progress ring
  - Calories consumed vs burned
  - Water intake tracker
  - "Log meal" quick action button
`);
```

### Interactive Mode

```typescript
const agent = createAgent({
  mode: 'interactive',
  onIterationSelection: async (options) => {
    // Custom UI for selection
    const selected = await showCheckboxDialog(
      'Select iterations:',
      options.map(o => ({ id: o.id, label: `${o.name}: ${o.description}` }))
    );
    return selected;
  },
});

const result = await agent.processUserStory('User profile settings page');
```

### Error Handling

```typescript
import { AgentError, APIError, ValidationError } from 'user-story-agent';

try {
  const result = await agent.processUserStory(story);
} catch (error) {
  if (error instanceof APIError) {
    if (error.retryable) {
      console.log('Retryable API error:', error.statusCode);
    } else {
      console.error('Fatal API error:', error.message);
    }
  } else if (error instanceof ValidationError) {
    console.error(`Validation error in ${error.field}:`, error.message);
  } else if (error instanceof AgentError) {
    console.error(`Agent error [${error.code}]:`, error.message);
  } else {
    throw error;
  }
}
```
