---
id: user-roles
name: User Roles Analysis
description: Identifies distinct user roles and their interactions with the interface
category: roles
order: 1
applicableWhen: When the mockup shows features that may vary by user type
applicableTo: all
allowedPaths: story.asA, story.iWant, story.soThat, outcomeAcceptanceCriteria
outputFormat: patches
---

# PATH SCOPE

This iteration may modify only these sections (exact values):

- `story.asA`
- `story.iWant`
- `story.soThat`
- `outcomeAcceptanceCriteria` (AC-OUT-* items only)

Any patch targeting other paths must be rejected.

# OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "replace",
      "path": "story.asA",
      "item": { "id": "story.asA", "text": "…" },
      "metadata": { "advisorId": "user-roles", "reasoning": "…" }
    }
  ]
}
```

# PATCH RULES

Required fields by op:

- **op: "add"**
  - required: op, path, item, metadata
  - forbidden: match
- **op: "replace"**
  - required: op, path, match, item, metadata
  - match must include: `{ "id": "…" }`
- **op: "remove"**
  - required: op, path, match, metadata
  - match must include: `{ "id": "…" }`
  - forbidden: item

Path constraints and item.id rules:

- If path is `story.asA`, `story.iWant`, or `story.soThat`:
  - item.id MUST equal the path string (e.g., `"story.asA"`)
  - item.text MUST be a single sentence fragment appropriate for a user story field
- If path is `outcomeAcceptanceCriteria`:
  - item.id MUST start with `AC-OUT-`

Metadata constraints:

- metadata.advisorId MUST be `"user-roles"`
- metadata.reasoning is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

# NON-INVENTION RULE

Do not invent new roles, permissions, or workflows that are not supported by the user story or mockups.

Only add or refine role-related content that is:

- explicitly stated in the story/criteria, OR
- clearly implied by visible UI evidence (e.g., admin controls, moderation tools, "manage users", role labels), OR
- necessary to remove ambiguity in who the story applies to.

# VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify role signals such as:

- **Account state:** guest vs signed-in user (login/logout, profile menu)
- **Admin/power tools:** user management, configuration, approvals, bulk actions
- **Role labels:** "Admin", "Editor", "Moderator", "Owner", "Member"
- **Permission cues:** disabled actions with "not allowed", "request access", "upgrade"
- **Content variants:** dashboards, queues, review screens suggesting specialized roles

Use images to clarify roles and role-specific outcomes; do not override explicit written requirements.

# WRITING RULES (PLAIN, USER-CENTRIC)

- **Use first-person voice** ("I see", "I can", "I click") in all user-facing content.
- **Use Gherkin format** for acceptance criteria:
  - **Given** [context] **When** [action] **Then** [outcome]
  - Example: **Given** I entered an invalid email **When** I submit the form **Then** I see an error message next to the email field
- Keep roles human-readable (e.g., "signed-in customer", "admin", "content editor").
- Avoid internal org jargon and system terms ("RBAC", "ACL") in AC-OUT text.
- If multiple roles exist, prefer:
  - a single primary role in story.asA, AND
  - acceptance criteria describing differences for other roles.
- Split role differences into clear, testable outcomes.

# ROLE COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the resulting story + AC-OUT cover, as applicable:

1. **Role clarity in the story**
   - story.asA names the primary role unambiguously.
   - story.iWant describes the user goal (not the UI).
   - story.soThat explains the value/outcome.

2. **Role-based visibility and access (if applicable)**
   - Which actions/content are available to each role.
   - What users see when they do not have access (clear message and next step).

3. **Role-based outcomes**
   - Each role's "happy path" outcome is clear.
   - Any role-specific restrictions or alternative flows are captured.

4. **Avoid over-splitting**
   - Only create multiple role behaviors if the story/mockup indicates meaningful differences.

# TASK

Review the existing story fields (asA/iWant/soThat) and outcomeAcceptanceCriteria (AC-OUT-*) for role ambiguity, overlaps, and missing role-specific outcomes. Consolidate redundant criteria, clarify the primary role in the story fields when needed, and add role-specific AC-OUT items only when justified by the NON-INVENTION RULE. Output patches only.