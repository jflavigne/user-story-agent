# Getting Started

This guide walks you through setting up and using User Story Agent.

## Prerequisites

- **Node.js 20.0.0** or later
- **npm** (comes with Node.js)
- **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/jflavigne-sidlee/user-story-agent.git
cd user-story-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
# Create environment file (optional)
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > .env

# Or export directly
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 4. Verify Installation

```bash
npm run agent -- --version
# Output: User Story Agent v0.1.0

npm run agent -- --list-skills
# Lists all available iterations
```

## Your First User Story

### Basic Example

```bash
echo "Login form with email and password fields" | \
  npm run agent -- --mode workflow --product-type web
```

This will:
1. Analyze your input
2. Run all applicable iterations (user-roles, validation, accessibility, etc.)
3. Output an enhanced user story with acceptance criteria

### Expected Output

```markdown
# User Story: User Login

As a registered user, I want to log in with my email and password
so that I can access my personalized account.

## Acceptance Criteria

### User Roles
- [ ] Anonymous users see the login form
- [ ] Authenticated users are redirected to dashboard

### Interactive Elements
- [ ] Email input field with placeholder "Enter your email"
- [ ] Password input field with show/hide toggle
- [ ] "Sign In" button, disabled until form is valid
- [ ] "Forgot password?" link below password field

### Validation
- [ ] Email field validates format on blur
- [ ] Password field requires minimum 8 characters
- [ ] Error messages appear below respective fields
- [ ] Form cannot submit with validation errors

### Accessibility (WCAG 2.1 AA)
- [ ] Form fields have visible labels (not just placeholders)
- [ ] Error messages have role="alert" for screen readers
- [ ] Tab order: email → password → sign in → forgot password
- [ ] Focus visible on all interactive elements

[...more criteria...]
```

## Usage Modes

### Workflow Mode (Recommended)

Best for comprehensive story generation. Runs all applicable iterations.

```bash
# For a web application
npm run agent -- --mode workflow --product-type web --input story.txt

# For a mobile app
npm run agent -- --mode workflow --product-type mobile-native --input story.txt
```

### Individual Mode

Run specific iterations only.

```bash
# Just validation and accessibility
echo "Registration form" | \
  npm run agent -- --mode individual --iterations validation,accessibility
```

### Interactive Mode

Select iterations via prompt.

```bash
npm run agent -- --mode interactive --input story.txt
```

## Working with Files

### Input from File

```bash
# Create input file
cat > mockup.txt << 'EOF'
Dashboard screen showing:
- Navigation sidebar with Home, Reports, Settings links
- Main area with 4 metric cards
- Recent activity table
- "Export" button in header
EOF

# Process it
npm run agent -- --mode workflow --product-type web --input mockup.txt
```

### Output to File

```bash
npm run agent -- --mode workflow --product-type web \
  --input mockup.txt --output stories.md
```

### Piping

```bash
# From another command
pbpaste | npm run agent -- --mode workflow --product-type web

# To another command
npm run agent -- --mode workflow --product-type web --input story.txt | \
  tee stories.md
```

## Real-Time Progress with Streaming

Watch iterations execute in real-time:

```bash
npm run agent -- --mode workflow --product-type web --stream --input story.txt
```

Output shows progress on stderr:

```
[user-roles] Starting...
Analyzing user roles in the interface...
[user-roles] Complete (1234 in / 567 out tokens)

[interactive-elements] Starting...
Identifying buttons, inputs, and interactive components...
[interactive-elements] Complete (1456 in / 789 out tokens)

...
```

## Quality Verification

Enable verification to check iteration outputs:

```bash
npm run agent -- --mode workflow --product-type web --verify --input story.txt
```

Summary shows verification results:

```
Verification: 10 passed, 2 failed
  accessibility: Missing ARIA labels for custom components (score: 0.65)
  performance: Incomplete loading state coverage (score: 0.72)
```

## Programmatic Usage

### Basic TypeScript Example

```typescript
import { createAgent } from 'user-story-agent';

async function main() {
  const agent = createAgent({
    mode: 'workflow',
    productContext: {
      productName: 'MyApp',
      productType: 'web',
      clientInfo: 'Acme Corp',
      targetAudience: 'Business users',
      keyFeatures: ['Dashboard', 'Reports', 'Settings'],
      businessContext: 'B2B SaaS application',
    },
  });

  const result = await agent.processUserStory(`
    User settings page with:
    - Profile section (name, email, avatar)
    - Password change form
    - Notification preferences toggles
    - "Save" and "Cancel" buttons
  `);

  if (result.success) {
    console.log(result.enhancedStory);
    console.log(`Applied: ${result.appliedIterations.join(', ')}`);
  } else {
    console.error('Failed:', result.summary);
  }
}

main();
```

### With Streaming

```typescript
import { createAgent, StreamEventUnion } from 'user-story-agent';

const agent = createAgent({
  mode: 'workflow',
  productContext: { /* ... */ },
  streaming: true,
});

agent.on('stream', (event: StreamEventUnion) => {
  switch (event.type) {
    case 'start':
      console.log(`\n=== ${event.iterationId} ===`);
      break;
    case 'chunk':
      process.stdout.write(event.content);
      break;
    case 'complete':
      console.log(`\n(${event.tokenUsage.input}/${event.tokenUsage.output} tokens)`);
      break;
  }
});

await agent.processUserStory(story);
```

## Claude Code Skills

If you're using [Claude Code](https://claude.ai/claude-code), use slash commands:

```
/user-story/write
```

Then provide your mockup description when prompted.

Other available skills:
- `/user-story/interactive` - Select iterations
- `/user-story/consolidate` - Refine existing stories
- `/user-story/accessibility` - Run accessibility iteration only
- `/user-story/validation` - Run validation iteration only

## Common Workflows

### From Design Tool Export

1. Export text from Figma/Sketch annotations
2. Save to file
3. Process with agent

```bash
npm run agent -- --mode workflow --product-type web \
  --input figma-export.txt --output user-stories.md
```

### Batch Processing

```bash
for file in mockups/*.txt; do
  npm run agent -- --mode workflow --product-type web \
    --input "$file" --output "stories/$(basename "$file" .txt).md"
done
```

### Integration with Git

```bash
# Generate stories and commit
npm run agent -- --mode workflow --product-type web \
  --input mockup.txt --output docs/user-stories.md

git add docs/user-stories.md
git commit -m "Add user stories for login feature"
```

## Troubleshooting

### "ANTHROPIC_API_KEY not set"

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### "Invalid iteration ID"

Check available iterations:

```bash
npm run agent -- --list-skills
```

### Slow Performance

- Use `--stream` to see progress
- Reduce iterations with `--mode individual`
- Check your network connection

### Empty Output

- Ensure input is not empty
- Check for error messages with `--debug`

See [Troubleshooting Guide](troubleshooting.md) for more help.

## Next Steps

- [CLI Reference](cli.md) - Full command documentation
- [API Reference](api/README.md) - Programmatic usage
- [Iterations Guide](iterations.md) - What each iteration does
- [Configuration](configuration.md) - All configuration options
