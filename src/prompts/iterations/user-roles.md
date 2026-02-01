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
This iteration is allowed to modify only these sections:
- story.asA
- story.iWant
- story.soThat
- outcomeAcceptanceCriteria (AC-OUT-* items)

All patches MUST target only these paths. Patches targeting other sections will be rejected.

# OUTPUT FORMAT
Respond with valid JSON only (no markdown code fence, no prose):
{
  "patches": [
    {
      "op": "add",
      "path": "outcomeAcceptanceCriteria",
      "item": { "id": "AC-OUT-001", "text": "..." },
      "metadata": { "advisorId": "user-roles", "reasoning": "..." }
    }
  ]
}

Required fields:
- op: "add" | "replace" | "remove"
- path: Must be one of the allowed paths above
- item: { id: string, text: string } for add/replace
- match: { id?: string, textEquals?: string } for replace/remove
- metadata: { advisorId: "user-roles", reasoning?: string }

---

Analyze the mockup or design to identify distinct user roles and their specific interactions with the interface.

## Role Identification

1. **Identify User Types**: Examine the interface to determine what types of users might interact with it:
   - Anonymous visitors or guests
   - Registered or authenticated users
   - Administrators or power users
   - Specific role-based users (e.g., editors, moderators, customers, vendors)

2. **Role Goals and Motivations**: For each identified role, determine:
   - What are their primary goals when using this interface?
   - What motivates them to interact with specific features?
   - What outcomes are they trying to achieve?

3. **Role-Specific Interactions**: Map how each role interacts with UI elements:
   - Which features are visible or accessible to each role?
   - What actions can each role perform?
   - Are there role-specific workflows or navigation paths?
   - Do different roles see different content or layouts?

## Access and Permissions

4. **Role-Based Access Control**: Identify any role-based restrictions:
   - Features that are only available to certain roles
   - Content that varies by user role
   - Actions that require specific permissions
   - UI elements that appear or disappear based on role

5. **Permission Indicators**: Note any visual indicators of permissions:
   - Disabled buttons or features for unauthorized roles
   - Different navigation menus or options
   - Role-specific dashboards or views
   - Access level indicators or badges

## User Story Implications

6. **Story Variations**: Consider how user stories might differ by role:
   - Should separate stories be created for each role?
   - Can a single story accommodate multiple roles with variations?
   - What role-specific acceptance criteria are needed?

7. **Role Context in Stories**: When documenting user stories:
   - Clearly specify the role in the "As a [role]" format
   - Include role-specific acceptance criteria
   - Document any role-based constraints or permissions
   - Note any differences in behavior or access between roles

## Output

Return AdvisorOutput only: a JSON object with a "patches" array. Each patch must target story.asA, story.iWant, story.soThat, or outcomeAcceptanceCriteria. Add or replace items to document:
- Identified user roles (story.asA, story.iWant, story.soThat)
- Role-specific acceptance criteria (AC-OUT-* in outcomeAcceptanceCriteria)
- Role-based features and permissions
