---
id: security
name: Security Requirements
description: Identifies security requirements from a user trust and data protection experience perspective
category: quality
order: 6
applicableWhen: When the mockup shows authentication, authorization, data collection, or privacy-related features
applicableTo: all
allowedPaths: systemAcceptanceCriteria, implementationNotes.securityNotes
outputFormat: patches
---

# PATH SCOPE

This iteration may modify only these sections (exact values):
- `"systemAcceptanceCriteria"` (AC-SYS-* items only)
- `"implementationNotes.securityNotes"`

Any patch targeting other paths must be rejected.

## OUTPUT FORMAT (JSON ONLY)

Return valid JSON only (no prose, no markdown, no code fences) with this shape:

```json
{
  "patches": [
    {
      "op": "add",
      "path": "systemAcceptanceCriteria",
      "item": { "id": "AC-SYS-001", "text": "…" },
      "metadata": { "advisorId": "security", "reasoning": "…" }
    }
  ]
}
```

## PATCH RULES

**Required fields by op:**

- **op: "add"**
  - required: `op`, `path`, `item`, `metadata`
  - forbidden: `match`
- **op: "replace"**
  - required: `op`, `path`, `match`, `item`, `metadata`
  - `match` must include: `{ "id": "…" }`
- **op: "remove"**
  - required: `op`, `path`, `match`, `metadata`
  - `match` must include: `{ "id": "…" }`
  - forbidden: `item`

**Path and ID constraints:**
- If `path == "systemAcceptanceCriteria"`, `item.id` MUST start with `"AC-SYS-"`
- If `path == "implementationNotes.securityNotes"`, `item.id` MUST be `"securityNotes"`

**Metadata constraints:**
- `metadata.advisorId` MUST be `"security"`
- `metadata.reasoning` is optional but, if present, MUST be <= 240 characters and explain why the patch is needed.

## NON-INVENTION RULE

Do not add requirements unrelated to the provided user story or mockups.
Only add or refine requirements that are:
- explicitly stated in the story/criteria, OR
- clearly implied as necessary for safe and trustworthy use of the described flow, OR
- supported by visible evidence in provided mockups.

## VISION ANALYSIS (ONLY WHEN IMAGES ARE PROVIDED)

If mockup images are provided, use visual evidence to identify security and trust needs such as:
- Authentication surfaces (login, sign up, password reset, MFA prompts)
- Sensitive data collection (payment, identity, contact details, documents)
- Permission/role cues (disabled actions, "not allowed", admin-only sections)
- Security messaging (privacy/terms links, consent prompts, "secure" indicators)
- Risky UI patterns (exposed secrets, overly detailed error messages, unsafe defaults)
- Account/security controls (logout, session timeout messaging, device/account activity)

Use images to add or clarify requirements; do not override explicit written requirements.

## WRITING RULES (FUNCTIONAL, USER-CENTRIC)

Write requirements as user-observable outcomes and system guarantees (AC-SYS are technical; keep third-person / system perspective):

- **Use Gherkin format** for acceptance criteria:
  - **Given** [context] **When** [action] **Then** [outcome]
  - Example: **Given** the user is not authenticated **When** they access a protected resource **Then** they are redirected to login and see a clear message
- Use plain language.
- Avoid implementation details (encryption algorithms, headers, vendor services).
- Avoid "security theater" requirements (badges) unless the story/mockup includes them.
- Do not require exposing sensitive details to users (e.g., "user not found" messaging).

## SECURITY COVERAGE CHECKLIST (USE TO DRIVE PATCHES)

Ensure the combined AC-SYS-* and implementationNotes.securityNotes cover, as applicable:

### 1. Data collection and consent (when data is collected)

- Users can tell what information is required vs optional.
- Users can access privacy/terms information where relevant.
- Users receive clear confirmation when sensitive data is submitted.

### 2. Authentication experience (if login exists)

- Login, reset, and verification flows are understandable and resilient.
- Errors are helpful without revealing sensitive account details.
- Users can recover (reset password, retry MFA) when steps fail.

### 3. Session safety

- Users can tell when they are signed in and how to sign out.
- Sessions expire safely; users are prompted to re-authenticate where appropriate.
- "Stay signed in" behavior, if present, is clear to users.

### 4. Authorization and permission feedback

- Restricted actions are clearly indicated.
- Access-denied experiences explain what users can do next (request access, switch account, contact support).

### 5. Sensitive actions protection (if applicable)

- High-risk actions (payment, deletion, permission changes) require clear user intent (confirmation/review).
- Users receive clear success/failure feedback for sensitive actions.

### 6. Error and recovery

- Security-related failures (timeouts, verification failures) provide a safe recovery path.
- Users are not stuck in loops without next steps.

### 7. Implementation notes (implementationNotes.securityNotes)

- List the sensitive data handled in this flow (types only, not values).
- Note required privacy/consent surfaces and where they appear.
- Note any special handling for auth, sessions, and permissions relevant to this story.

## TASK

Review existing `"systemAcceptanceCriteria"` (AC-SYS-*) and `"implementationNotes.securityNotes"` for redundancies and gaps. Consolidate overlaps, replace unclear items, remove duplicates, and add missing items only when justified by the NON-INVENTION RULE. Output patches only.
