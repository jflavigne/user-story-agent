# Skills Adaptation Journal

Log of adaptations made to skills for TypeScript/Node.js context.

---

## 2026-01-16: Initial Assessment

### Source
Skills copied from `reachy-workspace` which is a **Python** project.

### Target
`user-story-agent` - a **TypeScript/Node.js** project.

### Decision Framework
- **Generalize** if language-agnostic concepts with minimal additions
- **Create TypeScript variant** if Python-specific patterns dominate
- **Remove** if not applicable to TypeScript

---

## Adaptations Log

### CLAUDE.md (NEW)
- **Status:** Pending
- **Action:** Create from scratch for TypeScript/Node.js context
- **Source:** Inspired by `reachy-workspace/CLAUDE.md` and `reachy-mini/CLAUDE.md`
- **Changes:**
  - Technology stack: TypeScript, Node.js, npm
  - Quality commands: `eslint`, `tsc`, `jest`/`vitest`
  - No robot-specific content

---

### software-development-workflow.md
- **Status:** Pending
- **Action:** Adapt for TypeScript
- **Python-specific items to change:**
  - `pytest` → `jest` or `vitest`
  - `ruff` → `eslint`
  - `mypy` → `tsc`
  - `pyproject.toml` → `package.json`
  - `pytest-xdist` → (jest parallel by default)

---

### code-review.md
- **Status:** Pending
- **Action:** Minor adaptation
- **Changes needed:**
  - Example paths: `.py` → `.ts`
  - Methodology (Steve McConnell) is language-agnostic

---

### audit/SKILL.md
- **Status:** Pending
- **Action:** Create TypeScript variant
- **Rationale:** Python-specific tools (`ruff`, `mypy`) dominate
- **TypeScript equivalents:**
  - `ruff` → `eslint`
  - `mypy` → `tsc --noEmit`
  - `language: python` → `language: typescript`

---

### audit/find-injection-risks.md
- **Status:** Pending
- **Action:** Create TypeScript variant
- **Rationale:** All patterns are Python (`subprocess.run`, `os.system`, `shlex.quote`)
- **TypeScript patterns:**
  - `child_process.exec()` with template literals
  - SQL injection via string concatenation
  - `eval()` with dynamic input

---

### audit/find-silent-errors.md
- **Status:** Pending
- **Action:** Create TypeScript variant
- **Rationale:** Python exception syntax (`except: pass`)
- **TypeScript patterns:**
  - Empty `catch {}` blocks
  - `catch (e) {}` with no logging

---

### audit/find-dead-code.md
- **Status:** Pending
- **Action:** Adapt for TypeScript
- **Python-specific:** `ruff F401`, `ruff F841`
- **TypeScript equivalents:**
  - `eslint @typescript-eslint/no-unused-vars`
  - `tsc` with `noUnusedLocals`, `noUnusedParameters`

---

### audit/find-hardcoded-secrets.md
- **Status:** Pending
- **Action:** Minimal changes (language-agnostic patterns)
- **Changes:**
  - Update file extensions: `.py` → `.ts`, `.js`
  - Patterns are mostly regex-based, language-agnostic

---

### audit/find-resource-leaks.md
- **Status:** Pending
- **Action:** Create TypeScript variant
- **Python-specific:** `__exit__`, `with` blocks, `close()`
- **TypeScript patterns:**
  - Unclosed streams, connections
  - Missing `finally` blocks
  - Event listeners not removed

---

### audit/find-type-gaps.md
- **Status:** Pending
- **Action:** Create TypeScript variant
- **Python-specific:** `mypy`, `Any` types
- **TypeScript equivalents:**
  - `any` types that could be narrower
  - Missing return types
  - `tsc --strict` errors

---

### constant-audit.md
- **Status:** Pending
- **Action:** Adapt for TypeScript
- **Python-specific:**
  - Test patterns: `test_*.py` → `*.test.ts`, `*.spec.ts`
  - Module paths: `constants/network.py` → `constants/network.ts`
  - `language: python` → `language: typescript`

---

### constants/best-practices.md
- **Status:** Pending
- **Action:** Light adaptation
- **Rationale:** Concepts are universal, examples are Python
- **Changes:**
  - Code examples: Python → TypeScript
  - `SCREAMING_SNAKE_CASE` → `SCREAMING_SNAKE_CASE` or `PascalCase` enums

---

### constants/rules/*.yaml
- **Status:** Pending
- **Action:** Create TypeScript versions
- **Rationale:** All rules use `language: python`

---

### constant-extract.md
- **Status:** Pending
- **Action:** Adapt for TypeScript
- **Similar changes to constant-audit.md**

---

### ast-grep/SKILL.md
- **Status:** Pending
- **Action:** Add TypeScript examples
- **Note:** ast-grep supports TypeScript natively
- **Changes:**
  - Add TypeScript pattern examples alongside Python

---

### doc-write.md, doc-review.md
- **Status:** Pending
- **Action:** Review for language specificity
- **Expected:** Mostly language-agnostic

---

### workflow-overview.md
- **Status:** Pending
- **Action:** Review for language specificity

---

## Token Efficiency Notes

When adapting skills:
1. Avoid duplicating entire skills for minor changes
2. If >70% of content changes, create a new TypeScript-specific file
3. If <30% changes, make the skill language-aware with minimal additions
4. Delete Python-only content that has no TypeScript equivalent

---

## Completed Adaptations

| Skill | Action | Date |
|-------|--------|------|
| CLAUDE.md | Created for TypeScript/Node.js context | 2026-01-16 |
| software-development-workflow.md | Adapted: pytest→jest, ruff→eslint, mypy→tsc | 2026-01-16 |
| code-review.md | Minor: updated example paths (.py→.ts) | 2026-01-16 |
| audit/SKILL.md | Rewritten for TypeScript: eslint, tsc, ast-grep rules | 2026-01-16 |
| audit/find-silent-errors.md | Rewritten: catch {} patterns for TypeScript | 2026-01-16 |
| audit/find-injection-risks.md | Rewritten: exec(), SQL, eval() for TypeScript | 2026-01-16 |
| audit/find-dead-code.md | Rewritten: eslint rules, tsc flags | 2026-01-16 |
| audit/find-type-gaps.md | Rewritten: tsc --strict, any usage | 2026-01-16 |
| audit/find-resource-leaks.md | Rewritten: event listeners, timers, streams | 2026-01-16 |
| audit/find-hardcoded-secrets.md | Adapted: TypeScript syntax, process.env | 2026-01-16 |
| audit/audit-module.md | Adapted: eslint, tsc, npm test | 2026-01-16 |
| constant-audit.md | Rewritten: TypeScript patterns, .test.ts files | 2026-01-16 |
| constant-extract.md | Rewritten: TypeScript modules (.ts), imports | 2026-01-16 |
| constants/best-practices.md | Rewritten: TypeScript examples, enums | 2026-01-16 |

## Not Adapted (Not Required)

| Skill | Reason |
|-------|--------|
| constants/rules/*.yaml | Language: python → need TypeScript rules (future work) |
| ast-grep/SKILL.md | Already language-agnostic, supports TypeScript |
| doc-write.md | Language-agnostic |
| doc-review.md | Language-agnostic |
| workflow-overview.md | Language-agnostic |
