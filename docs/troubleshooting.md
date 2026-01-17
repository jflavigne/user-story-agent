# Troubleshooting Guide

Solutions for common issues with User Story Agent.

## Quick Diagnostics

```bash
# Check version
npm run agent -- --version

# Verify API key is set
echo $ANTHROPIC_API_KEY | head -c 20

# List available iterations
npm run agent -- --list-skills

# Run with debug logging
npm run agent -- --mode workflow --product-type web --debug --input test.txt
```

## Common Issues

### API Key Issues

#### "ANTHROPIC_API_KEY environment variable is not set"

**Cause:** API key not configured.

**Solution:**
```bash
# Set for current session
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Or add to shell profile (~/.bashrc, ~/.zshrc)
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.zshrc
source ~/.zshrc
```

#### "Invalid API key"

**Cause:** Key is malformed or revoked.

**Solution:**
1. Verify key at [console.anthropic.com](https://console.anthropic.com/)
2. Generate new key if needed
3. Ensure no extra whitespace:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-..." # No trailing spaces
   ```

#### "Authentication failed" (401)

**Cause:** Key doesn't have required permissions.

**Solution:**
- Check key has "messages" API access
- Verify billing is active
- Try generating a new key

### Input/Output Issues

#### "Input story is empty"

**Cause:** No input provided or file is empty.

**Solution:**
```bash
# Check file has content
cat your-file.txt

# Verify stdin is working
echo "test input" | npm run agent -- --mode workflow --product-type web
```

#### "Path traversal detected"

**Cause:** File path contains `../` sequences.

**Solution:**
```bash
# Use absolute path
npm run agent -- --input /full/path/to/file.txt

# Or relative from current directory (no ..)
npm run agent -- --input ./subdir/file.txt
```

#### Output is empty

**Cause:** Processing failed silently.

**Solution:**
1. Enable debug logging:
   ```bash
   npm run agent -- --debug --input file.txt ...
   ```
2. Check stderr for error messages
3. Verify input is valid text (not binary)

### Mode Configuration Issues

#### "Individual mode requires --iterations"

**Solution:**
```bash
npm run agent -- --mode individual --iterations validation,accessibility
```

#### "Workflow mode requires --product-type"

**Solution:**
```bash
npm run agent -- --mode workflow --product-type web
```

#### "Interactive mode requires onIterationSelection callback"

**Cause:** Using interactive mode programmatically without callback.

**Solution:**
```typescript
const agent = createAgent({
  mode: 'interactive',
  onIterationSelection: async (options) => {
    // Must provide this callback
    return options.map(o => o.id);
  },
});
```

### Iteration Issues

#### "Invalid iteration ID"

**Cause:** Typo or non-existent iteration.

**Solution:**
```bash
# List valid iterations
npm run agent -- --list-skills

# Valid IDs:
# user-roles, interactive-elements, validation, accessibility,
# performance, security, responsive-web, responsive-native,
# language-support, locale-formatting, cultural-appropriateness, analytics
```

#### Iteration skipped

**Cause:** Iteration failed after retries (graceful degradation).

**Solution:**
1. Check logs for specific error
2. The iteration may have timeout or API issues
3. Retry the operation
4. If persistent, check iteration prompt for issues

### API Issues

#### "Rate limited" (429)

**Cause:** Too many requests to Anthropic API.

**Solution:**
1. Wait and retry (automatic with exponential backoff)
2. Reduce request frequency
3. Check your API tier limits

#### "Request timeout"

**Cause:** API took too long to respond.

**Solution:**
1. Retry the operation
2. Check Anthropic status page
3. Try a smaller input
4. Increase timeout in code if using programmatic API

#### "Server error" (500/502/503)

**Cause:** Anthropic API issue.

**Solution:**
1. Wait and retry (automatic)
2. Check [status.anthropic.com](https://status.anthropic.com/)
3. If persistent, contact Anthropic support

### Performance Issues

#### Slow processing

**Causes:**
- Large input
- Many iterations
- API latency

**Solutions:**
1. Use `--stream` to see progress
2. Use individual mode with fewer iterations
3. Check network connection
4. Verify API is not rate-limited

#### High token usage

**Cause:** Long inputs or many iterations.

**Solutions:**
1. Reduce input size
2. Use fewer iterations
3. Use individual mode for specific needs

### Build/Development Issues

#### "Cannot find module"

**Cause:** Dependencies not installed or build missing.

**Solution:**
```bash
npm install
npm run build
```

#### TypeScript errors

**Cause:** Type definitions out of sync.

**Solution:**
```bash
npm run typecheck
# Fix reported errors
```

#### Tests failing

**Solution:**
```bash
# Run specific test with verbose output
npm test -- --run -t "test name" --reporter=verbose

# Check for environment issues
npm test -- --run --no-threads
```

### Node.js Issues

#### "Unsupported Node.js version"

**Cause:** Node.js < 20.0.0.

**Solution:**
```bash
# Check version
node --version

# Install Node.js 20+
nvm install 20
nvm use 20
```

#### "Cannot use import statement"

**Cause:** Running TypeScript directly without tsx.

**Solution:**
```bash
# Use npm script (uses tsx)
npm run agent -- ...

# Or install tsx globally
npm install -g tsx
tsx src/cli.ts ...
```

## Debug Logging

### Enable Debug Mode

```bash
# CLI
npm run agent -- --debug ...

# Environment variable
LOG_LEVEL=debug npm run agent -- ...
```

### Log Levels

| Level | Shows |
|-------|-------|
| `silent` | Nothing |
| `error` | Errors only |
| `warn` | Errors + warnings |
| `info` | Normal operation |
| `debug` | Everything |

### Debug Output Example

```
[DEBUG] Mode: workflow, Input: stdin, Output: stdout
[DEBUG] Input story: 156 characters
[INFO] Starting iteration: user-roles
[DEBUG] Iteration details: User Roles (category: roles)
[DEBUG] Context prompt: 0 chars, appliedIterations: 0
[INFO] Completed: user-roles (2.3s, 1234 in / 567 out tokens)
[DEBUG] Iteration user-roles confidence: 0.92
...
```

## Getting Help

### Check Documentation

1. [CLI Reference](cli.md)
2. [API Reference](api/README.md)
3. [Configuration](configuration.md)

### Report Issues

1. Gather information:
   - Node.js version: `node --version`
   - Package version: `npm run agent -- --version`
   - Debug output: `npm run agent -- --debug ...`

2. Open issue at [GitHub Issues](https://github.com/jflavigne-sidlee/user-story-agent/issues)

### Minimal Reproduction

Create a minimal example that reproduces the issue:

```bash
# Create test file
echo "Simple login form" > test.txt

# Run with debug
npm run agent -- --mode workflow --product-type web --debug --input test.txt 2>&1 | tee debug.log

# Include debug.log in issue report
```
