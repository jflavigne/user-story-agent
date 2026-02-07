# .claude layout

- **commands/** – Slash-command and workflow triggers (flat `.md` files). Used when invoking a command by name.
- **skills/** – Skill definitions (per-topic dirs with `SKILL.md` and workflow docs). Loaded by the skills system for structured workflows.

Some content is **mirrored** between `commands/` and `skills/` (e.g. `audit/`, `constants/`, `ast-grep/`, `user-story/`) so that the same behavior is available both as a command and as a skill. Edits to shared behavior should be applied in both places (or consider symlinks / a single source in a later cleanup).

- **session/** – Session notes, implementation plans, and audit outputs (ephemeral or working context).
- **MEMORY_STRATEGY.md**, **memory-config.json** – Memory and context configuration.
