Apply refinements WITHOUT violating the User Story Contract below.
User-facing requirements go in Acceptance Criteria.
Implementation details go in Technical Reference.

---

USER STORY CONTRACT (GLOBAL – MUST BE OBEYED)

A user story in this system is a human-facing description of user-visible behavior.

Primary audience:
- Designers and QA reviewing behavior without reading code.

A user story MUST:
- Describe what users see, do, or experience.
- Use plain, accessible language.
- Avoid internal system concepts.

A user story MUST NEVER:
- Reference internal identifiers, states, events, props, or schemas.
- Explain implementation details.
- Read like API documentation or test scripts.

Technical details may exist ONLY in a clearly separated "Technical Reference" section.

If any step introduces technical language into user-facing sections,
it must be moved or removed.

---

Add requirements to Acceptance Criteria (user-facing section) or Technical Reference (implementation section) appropriately.

- **User-facing:** What the user sees or experiences (e.g. "Can be used with keyboard and screen reader").
- **Technical:** How it's implemented (e.g. event names, component contracts, ARIA/role details) — keep these in Technical Reference only.

**Accessibility iteration focus:**
- **Do** add user-facing requirements: e.g. "Control can be used with keyboard and screen reader," "Focus order is logical," "State changes are announced to assistive tech."
- **Do not** add implementation details in user-facing sections: e.g. "Uses role='button' with aria-label," "aria-expanded on toggle," "tabindex=0." Put those in Technical Reference.
- Focus on what users experience (keyboard usability, screen reader behavior, focus visibility), not how it's coded.
