---
description: Identifies distinct user roles and their interactions with the interface
allowed-tools: [read, write, search_replace]
---

# /user-story/user-roles - User Roles Analysis Iteration

## Purpose

Enhance an existing user story by analyzing user roles and permissions. This iteration adds role-based acceptance criteria covering user types, goals, permissions, and role-specific behaviors.

## Usage

```
/user-story/user-roles [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/user-roles stories/example.md
/user-story/user-roles tickets/USA-X.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply User Roles Analysis Iteration Prompt

Analyze the user story using the following prompt:

```
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

Provide a structured analysis that:
- Lists all identified user roles
- Describes each role's goals and interactions
- Maps role-specific features and permissions
- Recommends how to structure user stories to accommodate role differences
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the User Roles Analysis iteration prompt to identify requirements
3. Add new acceptance criteria
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New acceptance criteria clearly marked with a "### User Roles" section
- Notes on any considerations

---

## Notes

- This iteration focuses on user roles and permissions
- New criteria should be additive, not replacing existing requirements
- Consider whether the story needs to be split for different roles
- Role-specific behaviors should be testable and specific
