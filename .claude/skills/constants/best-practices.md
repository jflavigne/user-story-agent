# Best Practices for Identifying Constants

## The Core Question
**"Should this literal be a constant?"** boils down to:
> **Will someone need to find, understand, or change this value in the future?**

If **yes**, extract it. If **no**, inline it.

---

## Decision Framework (Level 2 Default)

### Always Extract

#### 1. Repeated Literals (The "Rule of Three")
If a literal appears **3+ times**, it's a constant.

```typescript
// Bad
if (statusCode === 200) { ... }
if (statusCode === 200) { ... }
return statusCode === 200;

// Good
const HTTP_OK = 200;
if (statusCode === HTTP_OK) { ... }
```

**Exception:** Truly universal constants (`0`, `1`, `true`, `false`, `null`, `undefined`, `''`) where context is obvious.

---

#### 2. Configuration Values
Literals that control **behavior** or **limits**.

```typescript
// Bad
const response = await fetch(url, { timeout: 5000 });

// Good
const DEFAULT_TIMEOUT_MS = 5000;
const response = await fetch(url, { timeout: DEFAULT_TIMEOUT_MS });
```

**Examples:**
- Timeouts: `timeout: 5000` → `DEFAULT_TIMEOUT_MS = 5000`
- Retry counts: `maxRetries: 3` → `MAX_RETRIES = 3`
- Thresholds: `if (score > 0.75)` → `CONFIDENCE_THRESHOLD = 0.75`

---

#### 3. Contract Strings (API/Protocol Keys)
String literals used in **serialization or external APIs**.

```typescript
// Bad
const hasMethod = typeof obj.setTarget === 'function';
const data = { user_id: 123, action: 'login' };

// Good
const SDK_METHOD_SET_TARGET = 'setTarget';
const KEY_USER_ID = 'user_id';
const ACTION_LOGIN = 'login';
```

**Why:** These strings encode **external contracts**. If they break, your integration fails.

---

#### 4. Magic Numbers with Hidden Meaning
Numeric literals where the **value is arbitrary** or has **domain significance**.

```typescript
// Bad
if (password.length < 8) { ... }  // Why 8?

// Good
const MIN_PASSWORD_LENGTH = 8;  // NIST recommends 8+ characters
if (password.length < MIN_PASSWORD_LENGTH) { ... }
```

**Test:** If a new dev asks *"Why this number?"*, it's a constant.

---

#### 5. Environment-Specific Values
Literals that change between **dev/staging/prod**.

```typescript
// Bad
const apiUrl = 'https://api.production.com';

// Good
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.staging.com';
```

---

### Never Extract (Keep Inline)

#### 1. Obvious Literals in Context
Values where the **name would add no information**.

```typescript
// Bad (over-engineering)
const ZERO = 0;
const EMPTY_STRING = '';

if (count === ZERO) { ... }  // Worse than "count === 0"
```

---

#### 2. Distinct, Non-Repeated Values
Literals that appear **once** with **no external significance**.

```typescript
// OK (appears once, obvious meaning)
logger.info('Starting server...');

// OK (HTTP status in single location)
if (response.status === 200) {
  return response.json();
}
```

---

#### 3. Test Data
Literals in **test assertions** where uniqueness matters.

```typescript
// OK (test data)
test('parse email', () => {
  expect(parseEmail('user@example.com')).toBe('user');
  expect(parseEmail('admin@test.org')).toBe('admin');
});
```

**Exception:** Shared test **configuration** (e.g., `TEST_TIMEOUT_MS = 100`) should be constants.

---

## Naming Conventions

### TypeScript Constants
```typescript
// SCREAMING_SNAKE_CASE for module-level constants
export const MAX_RETRIES = 3;
export const DEFAULT_TIMEOUT_MS = 5000;
export const HTTP_OK = 200;

// Include units in name
const CACHE_TTL_SECONDS = 3600;  // Not just CACHE_TTL
const MIN_PASSWORD_LENGTH = 8;  // Not just MIN_PASSWORD
```

### Enums for Related Values
```typescript
// Use enums for related constants
enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
}

enum StoryStatus {
  Draft = 'draft',
  Review = 'review',
  Approved = 'approved',
}
```

---

## The "Grep Test"

**Scenario:** 6 months from now, a bug report says *"The connection times out too quickly."*

**Question:** Can you find the timeout value in **<10 seconds** using grep?

```bash
$ grep -r "TIMEOUT" src/
./src/constants/timeouts.ts:export const CONNECTION_TIMEOUT_MS = 5000;
# Found in 2 seconds

# vs.

$ grep -r "5000" src/
./src/api/client.ts:    timeout: 5000
./src/websocket/client.ts:    timeout: 5000
./src/polling/service.ts:    delay: 5000
# Which 5000 is the connection timeout?
```

---

## Summary Checklist

Extract a literal if it is:
- [ ] **Repeated** 3+ times
- [ ] A **configuration value** (timeout, limit, threshold)
- [ ] A **contract string** (API key, method name, JSON field)
- [ ] A **magic number** with hidden meaning
- [ ] **Environment-dependent**

Keep it inline if:
- [ ] **Obvious in context** (`0`, `true`, `100` for percentage)
- [ ] **Used once** with no external significance
- [ ] **Test data** requiring uniqueness

---

## Rule of Thumb
When in doubt, ask:
> *"If this value changes, will I remember where to find it?"*

If the answer is *"maybe not"*, make it a constant.
