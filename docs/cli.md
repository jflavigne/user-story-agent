# CLI Reference

Complete reference for the User Story Agent command-line interface.

## Synopsis

```bash
npm run agent -- [options]
```

## Options

### Required Options

| Option | Description |
|--------|-------------|
| `--mode <mode>` | Agent execution mode (see [Modes](#modes)) |

### Mode-Specific Options

| Option | Required For | Description |
|--------|--------------|-------------|
| `--iterations <ids>` | `individual` | Comma-separated iteration IDs |
| `--product-type <type>` | `workflow` | Product type for filtering iterations |

### I/O Options

| Option | Default | Description |
|--------|---------|-------------|
| `--input <file>` | stdin | Input file path |
| `--output <file>` | stdout | Output file path |

### API Options

| Option | Default | Description |
|--------|---------|-------------|
| `--api-key <key>` | `ANTHROPIC_API_KEY` env var | Anthropic API key |
| `--model <model>` | `claude-sonnet-4-20250514` | Claude model to use |
| `--max-retries <n>` | `3` | Maximum retry attempts for API calls |

### Feature Flags

| Option | Description |
|--------|-------------|
| `--stream` | Enable streaming output for real-time progress |
| `--verify` | Enable verification of each iteration's output quality |
| `--no-strict-evaluation` | On evaluator crash, continue with degraded state (default: fail fast, CLI exits 1) |

### Logging Options

| Option | Description |
|--------|-------------|
| `--verbose` | Enable info-level logging (default) |
| `--debug` | Enable debug-level logging (most verbose) |
| `--quiet`, `-q` | Suppress all output except errors |

### Information Options

| Option | Description |
|--------|-------------|
| `--help`, `-h` | Show help message |
| `--version`, `-v` | Show version number |
| `--list-skills` | List all available skills and exit |

## Modes

### Individual Mode

Run specific iterations in the order provided.

```bash
npm run agent -- --mode individual --iterations validation,accessibility
```

- Requires `--iterations` argument
- Does not run consolidation step
- Useful for targeted enhancements

### Workflow Mode

Run all applicable iterations based on product type.

```bash
npm run agent -- --mode workflow --product-type web
```

- Requires `--product-type` argument
- Filters iterations by product type
- Runs consolidation as final step
- Best for comprehensive story generation

### Interactive Mode

Select iterations via interactive prompt.

```bash
npm run agent -- --mode interactive --input story.txt
```

- Displays available iterations
- User selects by number or ID
- Runs selected iterations in workflow order
- Runs consolidation as final step

## Product Types

| Type | Description | Excluded Iterations |
|------|-------------|---------------------|
| `web` | Web applications | `responsive-native` |
| `mobile-native` | Native iOS/Android apps | `responsive-web` |
| `mobile-web` | Mobile web / PWA | `responsive-native` |
| `desktop` | Desktop applications | `responsive-web`, `responsive-native` |
| `api` | API/backend services | Most UI iterations |

## Available Iterations

| ID | Category | Description |
|----|----------|-------------|
| `user-roles` | roles | User roles and permissions |
| `interactive-elements` | elements | Buttons, inputs, links, icons |
| `validation` | validation | Form validation rules |
| `accessibility` | quality | WCAG compliance |
| `performance` | quality | Load times, responsiveness |
| `security` | quality | Security UX, data protection |
| `responsive-web` | responsive | Web breakpoints |
| `responsive-native` | responsive | Native device behaviors |
| `language-support` | i18n | Multi-language support |
| `locale-formatting` | i18n | Date/number/currency formatting |
| `cultural-appropriateness` | i18n | Cultural sensitivity |
| `analytics` | analytics | User behavior tracking |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude API (required) |
| `LOG_LEVEL` | Logging level: `silent`, `error`, `warn`, `info`, `debug` |

## Examples

### Basic Usage

```bash
# From stdin to stdout
echo "User login form with email and password" | \
  npm run agent -- --mode workflow --product-type web

# From file to file
npm run agent -- --mode workflow --product-type web \
  --input mockup.txt --output stories.md
```

### Individual Iterations

```bash
# Run only validation and accessibility
echo "Registration form" | \
  npm run agent -- --mode individual --iterations validation,accessibility

# Run all i18n iterations
echo "Product catalog" | \
  npm run agent -- --mode individual \
  --iterations language-support,locale-formatting,cultural-appropriateness
```

### Streaming Output

```bash
# Watch progress in real-time
cat design-spec.txt | \
  npm run agent -- --mode workflow --product-type mobile-native --stream
```

Output appears on stderr:
```
[user-roles] Starting...
As a registered user, I want to...
[user-roles] Complete (1234 in / 567 out tokens)

[interactive-elements] Starting...
...
```

### With Verification

```bash
# Verify each iteration's output quality
npm run agent -- --mode workflow --product-type web \
  --input story.txt --verify
```

Verification results are logged:
```
Verification: 10 passed, 2 failed
  accessibility: Missing ARIA labels (score: 0.65)
  security: Incomplete data protection (score: 0.72)
```

### Interactive Selection

```bash
npm run agent -- --mode interactive --input story.txt

# Output:
# Available iterations:
#   1. [user-roles] User Roles - Identifies user roles...
#   2. [interactive-elements] Interactive Elements - ...
#   ...
#
# Enter iteration IDs (comma-separated) or numbers:
# > 1,3,4
```

### Different Models

```bash
# Use a specific model
npm run agent -- --mode workflow --product-type web \
  --model claude-sonnet-4-20250514 --input story.txt
```

### Debug Logging

```bash
# Maximum verbosity
npm run agent -- --mode workflow --product-type web \
  --debug --input story.txt

# Quiet mode (errors only)
npm run agent -- --mode workflow --product-type web \
  --quiet --input story.txt --output stories.md
```

### List Available Skills

```bash
npm run agent -- --list-skills

# Output:
# Available Skills (User Story Iterations):
#
#   Category: quality
#     accessibility             Accessibility
#                               WCAG compliance and inclusive design
#                               When: UI contains interactive elements
#     ...
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (invalid arguments, API failure, etc.) |

## Input Format

The CLI accepts any text input representing a user story or mockup description:

```
As a [user type], I want to [action] so that [benefit].

The screen contains:
- Email input field
- Password input field
- "Remember me" checkbox
- "Sign In" button
- "Forgot password?" link
```

## Output Format

The output is the enhanced user story with acceptance criteria added by each iteration:

```markdown
# User Story: User Login

As a registered user, I want to log in to my account so that I can access personalized features.

## Acceptance Criteria

### Authentication
- [ ] User can enter email address
- [ ] User can enter password
- [ ] User can check "Remember me" to stay logged in
...

### Accessibility (WCAG 2.1 AA)
- [ ] All form fields have visible labels
- [ ] Error messages are announced to screen readers
...

### Validation
- [ ] Email field validates format on blur
- [ ] Password field shows requirements
...
```

## Security Notes

- Prefer using `ANTHROPIC_API_KEY` environment variable over `--api-key` flag
- Command-line arguments may be visible in process lists
- File paths are validated to prevent path traversal attacks
