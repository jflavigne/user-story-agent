# User Story Agent

Generate comprehensive user stories from mockups and designs using Claude AI.

## Overview

User Story Agent analyzes visual mockups and existing user stories to generate detailed, well-structured user stories with acceptance criteria. It applies specialized "iterations" that focus on different aspects like accessibility, validation, responsive design, internationalization, and more.

## Features

- **Multiple iteration types** - 12 specialized iterations covering accessibility, validation, performance, security, i18n, and more
- **Three execution modes** - Individual (specific iterations), Workflow (full product-aware pipeline), Interactive (checkbox selection)
- **Streaming support** - Real-time progress output for long-running operations
- **Output verification** - Optional evaluator to verify iteration output quality
- **Claude Code integration** - Available as slash commands (`/user-story/write`, etc.)
- **Programmatic API** - Use as a TypeScript/JavaScript library

## Requirements

- Node.js 20.0.0 or later
- Anthropic API key

## Installation

```bash
# Clone the repository
git clone https://github.com/jflavigne-sidlee/user-story-agent.git
cd user-story-agent

# Install dependencies
npm install

# Build (optional, for production)
npm run build
```

## Quick Start

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Generate user stories from a mockup description
echo "Login page with email/password fields and a 'Remember me' checkbox" | \
  npm run agent -- --mode workflow --product-type web
```

## CLI Usage

```
npm run agent -- [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--mode <mode>` | Agent mode: `individual`, `workflow`, or `interactive` (required) |
| `--iterations <ids>` | Comma-separated iteration IDs (required for individual mode) |
| `--product-type <type>` | Product type: `web`, `mobile-native`, `mobile-web`, `desktop`, `api` |
| `--input <file>` | Input file path (default: stdin) |
| `--output <file>` | Output file path (default: stdout) |
| `--stream` | Enable streaming output for real-time progress |
| `--verify` | Enable verification of each iteration's output quality |
| `--no-strict-evaluation` | On evaluator crash, continue (default: fail fast) |
| `--model <model>` | Claude model to use (default: claude-sonnet-4-20250514) |
| `--verbose` | Enable info-level logging |
| `--debug` | Enable debug-level logging |
| `--quiet` | Suppress all output except errors |
| `--list-skills` | List all available skills and exit |

### Examples

```bash
# Individual mode - apply specific iterations
echo "User registration form" | \
  npm run agent -- --mode individual --iterations validation,accessibility

# Workflow mode - full iteration pipeline for web product
npm run agent -- --mode workflow --product-type web --input mockup.txt --output stories.md

# Interactive mode - select iterations via checkboxes
npm run agent -- --mode interactive --input story.txt

# With streaming output
cat design-spec.txt | npm run agent -- --mode workflow --product-type mobile-native --stream
```

## Available Iterations

| ID | Category | Description |
|----|----------|-------------|
| `user-roles` | Core | Identifies distinct user roles and their interactions |
| `interactive-elements` | Core | Documents buttons, inputs, links, icons and states |
| `validation` | Core | Identifies form validation rules and user feedback |
| `accessibility` | Quality | WCAG compliance and inclusive design requirements |
| `performance` | Quality | Load times, response times, loading feedback |
| `security` | Quality | Security UX and data protection requirements |
| `responsive-web` | Responsive | Web responsive design across breakpoints |
| `responsive-native` | Responsive | Native mobile device-specific behaviors |
| `language-support` | i18n | Multi-language interface requirements |
| `locale-formatting` | i18n | Locale-specific formatting (dates, numbers, currency) |
| `cultural-appropriateness` | i18n | Cultural sensitivity requirements |
| `analytics` | Insights | User behavior tracking and analytics requirements |

## Programmatic Usage

```typescript
import { createAgent, type UserStoryAgentConfig } from 'user-story-agent';

const config: UserStoryAgentConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  mode: 'workflow',
  productType: 'web',
  streaming: true,
};

const agent = createAgent(config);

const result = await agent.run({
  input: 'Login page with email and password fields',
  productContext: {
    name: 'MyApp',
    description: 'A web application',
  },
});

console.log(result.output);
```

### Streaming Events

```typescript
const agent = createAgent({ ...config, streaming: true });

for await (const event of agent.runStreaming({ input })) {
  switch (event.type) {
    case 'iteration:start':
      console.log(`Starting: ${event.iterationId}`);
      break;
    case 'iteration:content':
      process.stdout.write(event.content);
      break;
    case 'iteration:complete':
      console.log(`Completed: ${event.iterationId}`);
      break;
    case 'error':
      console.error(event.error);
      break;
  }
}
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude API (required) |
| `LOG_LEVEL` | Logging level: `silent`, `error`, `warn`, `info`, `debug` |

### Product Types

The `--product-type` flag determines which iterations are applicable:

| Product Type | Description | Excluded Iterations |
|--------------|-------------|---------------------|
| `web` | Web applications | `responsive-native` |
| `mobile-native` | Native iOS/Android apps | `responsive-web` |
| `mobile-web` | Mobile web (PWA) | `responsive-native` |
| `desktop` | Desktop applications | `responsive-web`, `responsive-native` |
| `api` | API/backend services | Most UI-focused iterations |

## Claude Code Skills

When using [Claude Code](https://claude.ai/claude-code), invoke the agent via slash commands:

```
/user-story/write          # Full workflow with all iterations
/user-story/interactive    # Select iterations interactively
/user-story/consolidate    # Refine and consolidate stories
/user-story/accessibility  # Run accessibility iteration only
/user-story/validation     # Run validation iteration only
```

## Development

```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint
npm run lint

# Type check
npm run typecheck

# Generate skill files from registry
npm run generate-skills
```

## Project Structure

```
user-story-agent/
├── src/
│   ├── index.ts              # Main entry point
│   ├── cli.ts                # CLI implementation
│   ├── agent/                # Core agent SDK
│   │   ├── user-story-agent.ts
│   │   ├── claude-client.ts
│   │   ├── evaluator.ts
│   │   └── state/
│   ├── prompts/              # System and iteration prompts
│   │   └── iterations/
│   └── shared/               # Types, schemas, utilities
├── tests/                    # Test files
├── docs/                     # Documentation
└── .claude/skills/           # Claude Code skill definitions
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [CLI Reference](docs/cli.md)
- [API Reference](docs/api/README.md)
- [Iteration Guide](docs/iterations.md)

## License

MIT
