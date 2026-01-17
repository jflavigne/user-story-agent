# Skill: /find-silent-errors

Find exception handlers that silently swallow errors without logging or re-throwing.

## Usage

```
/find-silent-errors [path]
```

**Arguments:**
- `path` (optional): Directory or file to scan. Defaults to `src/`

## What It Finds

| Pattern | Severity | Example |
|---------|----------|---------|
| Empty `catch {}` | High | `catch (e) {}` |
| Catch with only comment | Medium | `catch (e) { /* ignore */ }` |
| Catch without logging | Medium | `catch (e) { return null; }` |

## Implementation

Use ast-grep to find empty or minimal catch blocks:

```yaml
# Empty catch block
id: empty-catch
language: typescript
rule:
  kind: catch_clause
  has:
    kind: statement_block
    not:
      has:
        kind: expression_statement

# Catch with only return
id: catch-silent-return
language: typescript
rule:
  kind: catch_clause
  has:
    kind: statement_block
    has:
      kind: return_statement
    not:
      has:
        pattern: console.$METHOD($$$)
    not:
      has:
        pattern: logger.$METHOD($$$)
```

## Example Output

```
Silent Error Handlers Found: 3

HIGH SEVERITY:
  src/api/client.ts:98
    catch (error) {}
    Context: fetchData()
    Issue: HTTP errors silently ignored

MEDIUM SEVERITY:
  src/utils/parser.ts:45
    catch (e) { return null; }
    Context: parseConfig()
    Issue: Parse failures return null without logging
```

## When to Use

- Before code review to identify error handling gaps
- During security audits
- When debugging "silent failures"
- As part of `/audit-module`
