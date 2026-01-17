# Skill: /find-resource-leaks

Find resources (connections, streams, event listeners) that aren't properly cleaned up.

## Usage

```
/find-resource-leaks [path]
```

**Arguments:**
- `path` (optional): Directory or file to scan. Defaults to `src/`

## What It Finds

| Pattern | Severity | Example |
|---------|----------|---------|
| Class with connection, no cleanup | High | DB/HTTP connections leaked |
| Event listener never removed | High | Memory leak |
| Stream not closed | Medium | File descriptors exhausted |
| setInterval without clear | Medium | Timer leak |
| Missing finally block | Medium | Resource not released on error |

## Implementation

### Pattern 1: addEventListener without removeEventListener

```yaml
id: listener-no-remove
language: typescript
rule:
  kind: call_expression
  pattern: $OBJ.addEventListener($EVENT, $HANDLER)
  not:
    follows:
      pattern: $OBJ.removeEventListener($EVENT, $$$)
      stopBy: end
```

### Pattern 2: setInterval without clearInterval

```yaml
id: interval-no-clear
language: typescript
rule:
  pattern: setInterval($$$)
  not:
    inside:
      kind: variable_declarator
```

### Pattern 3: createReadStream without close handling

```yaml
id: stream-no-close
language: typescript
rule:
  pattern: createReadStream($$$)
  not:
    follows:
      any:
        - pattern: $STREAM.on('close', $$$)
        - pattern: $STREAM.destroy()
```

## Example Output

```
Resource Leak Analysis: src/

HIGH - Event Listener Leak (2):
  src/services/websocket.ts:45
    socket.addEventListener('message', handler)
    Missing: removeEventListener in cleanup
    Impact: Memory leak on reconnect

  src/ui/component.ts:23
    window.addEventListener('resize', onResize)
    Missing: Cleanup on unmount
    Fix: Add removeEventListener in destructor

MEDIUM - Timer Leak (1):
  src/services/poller.ts:67
    setInterval(poll, 5000)
    Missing: clearInterval reference
    Fix: Store interval ID for cleanup

MEDIUM - Stream (0):
  None found - streams properly handled

INFO - Proper Cleanup:
  src/services/database.ts:89
    try { ... } finally { await conn.close(); }
    Status: ✓ Cleanup in finally block
```

## Common TypeScript/Node.js Resources

| Resource | Create | Cleanup |
|----------|--------|---------|
| Event listeners | `addEventListener` | `removeEventListener` |
| Timers | `setInterval` | `clearInterval` |
| Timers | `setTimeout` | `clearTimeout` |
| Streams | `createReadStream` | `.destroy()` or `pipeline()` |
| DB connections | `pool.connect()` | `client.release()` |
| HTTP servers | `server.listen()` | `server.close()` |
| WebSockets | `new WebSocket()` | `.close()` |

## When to Use

- Before deploying long-running services
- When debugging memory leaks
- Code review for stateful components
- As part of `/audit-module`
