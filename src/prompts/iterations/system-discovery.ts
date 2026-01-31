/**
 * System Discovery (Pass 0) iteration prompt module
 *
 * Discovers system structure from mockups and reference documents. Extracts
 * component mentions, canonical names, vocabulary, and evidence. NO ID generation
 * in this pass—IDs are minted separately by USA-45 ID Registry.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for extracting the component graph and product vocabulary from
 * mockups and reference documents (Pass 0).
 *
 * This prompt guides extraction of:
 * - UI components (buttons, forms, modals, screens)
 * - Features (authentication, search, notifications)
 * - Parent-child relationships (composition)
 * - Coordination relationships (events, callbacks)
 * - Raw mentions and canonical names (no IDs)
 * - Product vocabulary mapping
 * - Evidence/justification for each entity
 */
export const SYSTEM_DISCOVERY_PROMPT = `You are performing **Pass 0: System Discovery** from mockups and reference documents.

## Input Format

You may receive:
- **Text descriptions** of mockups and designs
- **Images** of mockups, wireframes, or screenshots
- **Reference documentation** (architecture specs, component libraries)

**IMPORTANT:** If images are provided, prioritize visual evidence over text descriptions. Text descriptions may be incomplete or miss visual details.

## Visual Analysis (when images provided)

From the mockup images, identify:

1. **UI Components** - Visible elements:
   - Controls: Buttons (identify primary vs secondary from visual styling), inputs, checkboxes, toggles
   - Containers: Forms, modals, sheets, cards, panels
   - Navigation: Headers, menus, breadcrumbs, tabs
   - Feedback: Spinners, progress bars, toasts, banners

2. **Visual Hierarchy** - Spatial relationships:
   - Parent-child containment (which components are inside others)
   - Visual grouping (components grouped by proximity, borders, backgrounds)
   - Z-index (modals over screens, dropdowns over content)

3. **Component States** - Variations shown:
   - Default, hover, focus, active, disabled, error states
   - Empty states, loading states, success states

4. **Visual Properties**:
   - Button types (primary buttons are prominent - larger, colored; secondary are subtle)
   - Icon presence (buttons with icons, inputs with prefix/suffix icons)
   - Required field indicators (asterisks, visual markers)
   - Error indicators (red borders, error icons, validation messages)

5. **Layout Structure**:
   - Screen sections (header, main content, sidebar, footer)
   - Grid layouts, flex layouts, multi-column designs

Your goal is to extract the system structure—components, features, relationships, and vocabulary—as **raw mentions** and **canonical names** only. Do **not** generate or assign any IDs; ID minting is done separately.

## 1. Extract the Component Graph

### 1.1 UI Components

Identify every UI component visible or referenced in the mockups and docs:

- **Controls**: Buttons, links, inputs, checkboxes, radio buttons, selects, toggles, sliders
- **Containers**: Forms, modals, dialogs, sheets, drawers, panels, cards, lists
- **Screens/Views**: Full screens, pages, tabs, sections
- **Composite components**: Headers, footers, navigation bars, sidebars, filter bars
- **Feedback**: Toasts, banners, spinners, progress indicators

For each, capture every **mention** you see: labels in the UI, variable names, CSS classes, component names in specs (e.g., "Login Button", "login-btn", "LoginButton", "LOGIN_BTN", "auth form").

### 1.2 Features

Identify features (capabilities or domains) referenced in the materials:

- **Authentication**: Login, logout, sign-up, password reset, session
- **Search**: Search bar, filters, sort, facets
- **Notifications**: In-app alerts, push, badges, notification center
- **Profile/Settings**: User profile, account settings, preferences
- **Content**: Feeds, lists, detail views, creation/editing
- **Navigation**: Menus, breadcrumbs, back, deep links

Capture all mentions (e.g., "userProfile", "user-profile-state", "UserProfileScreen").

### 1.3 State Models

From reference docs or inferred from the UI, identify state or data models:

- User/session state, profile state, form state
- List/filter state, selection state
- Any named state or store (e.g., "userProfile", "cartState", "searchFilters")

Capture every variation (camelCase, kebab-case, CONSTANT_CASE, human phrases).

### 1.4 Events and Callbacks

Identify events and callbacks that coordinate components:

- User actions: "user-authenticated", "form-submitted", "item-selected"
- System events: "session-expired", "network-error"
- Callbacks or hooks referenced in docs: "onLogin", "handleSubmit", "USER_AUTH"

Capture all naming variants (e.g., "user-authenticated", "USER_AUTH", "onUserAuthenticated").

## 2. Relationships (Describe, Do Not Assign IDs)

### 2.1 Parent–Child (Composition)

For each container or screen, list what it **contains**:

- "Login Form contains Email Input, Password Input, Login Button"
- "Header contains Logo, Nav Menu, User Menu"
- "User Profile screen contains Profile Card, Edit Button, Settings Link"

Use the **canonical names** you will define below when describing containment. Note the **evidence** (e.g., "Wireframe 2 shows Login Form with email and password fields").

### 2.2 Coordination (Events / Callbacks)

For each event or callback, note:

- **Who emits**: Which component or feature triggers it (e.g., "Login Button emits user-authenticated")
- **Who listens**: Which component or feature reacts (e.g., "App Shell listens to user-authenticated to show User Menu")

Again, cite **evidence** from the mockup or doc (e.g., "Spec says: 'On successful login, header updates to show user name'").

## 3. Raw Mentions

Collect **every** variation and alias you find. Do not merge or deduplicate at this stage.

- **components**: All strings that refer to a UI component (labels, class names, component names, spec terms). Examples: "Login Button", "login-btn", "LoginButton", "Submit", "auth form"
- **stateModels**: All strings that refer to state or data models. Examples: "userProfile", "user-profile-state", "UserProfileState"
- **events**: All strings that refer to events or callbacks. Examples: "user-authenticated", "USER_AUTH", "onLoginSuccess"

Put each mention in the appropriate array exactly as it appears in the source.

## 4. Canonical Names

For each **entity** (one logical component, one state model, one event), choose a single **canonical name**:

- **Normalized, human-readable** (e.g., "Login Button", "Login Form", "User Profile")
- **One canonical name per entity** even if there are many mentions
- Map **all mentions** that refer to that entity to this one canonical name

Output: \`canonicalNames\` is an object where each **key** is the canonical name and each **value** is an array of every mention that refers to it.

Example:

- "Login Button" → ["Login Button", "login-btn", "LoginButton", "Submit"]
- "User Profile" → ["userProfile", "user-profile-state", "UserProfileScreen"]

## 5. Product Vocabulary Mapping

Build two kinds of mappings (both go in \`vocabulary\`):

- **Technical → product**: Map technical or code-like terms to product-facing names.  
  Example: \`userProfile\` → "User Profile", \`LOGIN_BTN\` → "Login Button"
- **UI element → component**: Map UI descriptions to component names.  
  Example: "heart icon" → "Favorite Button", "top bar" → "Header"

Every key in \`vocabulary\` should be a mention (technical or UI phrase); every value should be the canonical product/component name.

## 6. Evidence and Justification

For each **canonical name** (and important relationships), provide evidence:

- **Quote or paraphrase** from the mockup or doc that shows the entity (e.g., "Wireframe 2 shows 'Login' button in top-right")
- **Relationship evidence** (e.g., "Login Form contains Email Input (seen in wireframe 2)")
- **Source**: Which document, wireframe, or section (e.g., "Data model doc references userProfile state")

Output: \`evidence\` is an object where each **key** is the **canonical name** and each **value** is a short string describing the evidence (quote or reference).

## 7. Output Format: SystemDiscoveryMentions JSON

Respond with **valid JSON only** (no markdown code fence, no prose outside the JSON). (Example format — respond with raw JSON, no code fence.) Structure:

{
  "mentions": {
    "components": ["Login Button", "login-btn", "LoginButton", "..."],
    "stateModels": ["userProfile", "user-profile-state", "..."],
    "events": ["user-authenticated", "USER_AUTH", "..."]
  },
  "canonicalNames": {
    "Login Button": ["Login Button", "login-btn", "LoginButton"],
    "User Profile": ["userProfile", "user-profile-state"],
    "user-authenticated": ["user-authenticated", "USER_AUTH", "onLoginSuccess"]
  },
  "evidence": {
    "Login Button": "Wireframe 2 shows 'Login' button in top-right",
    "User Profile": "Data model doc references userProfile state",
    "Login Form": "Wireframe 2: form with email, password, and Login button"
  },
  "vocabulary": {
    "userProfile": "User Profile",
    "login-btn": "Login Button",
    "heart icon": "Favorite Button"
  }
}

### Rules

- **Do not** add any \`id\`, \`idRef\`, or similar fields. No ID generation in Pass 0.
- **mentions**: Capture every variation; arrays may contain duplicates if the same string appears in multiple places.
- **canonicalNames**: One key per entity; value = array of all mentions that refer to that entity.
- **evidence**: One key per canonical name (and optionally key relationships); value = short justification with quote or reference.
- **vocabulary**: Map technical/UI terms (keys) to canonical product/component names (values).
- Ensure the JSON is well-formed and parseable.`;

/**
 * Metadata for the system discovery (Pass 0) iteration
 */
export const SYSTEM_DISCOVERY_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'system-discovery',
  name: 'System Discovery (Pass 0)',
  description:
    'Extracts component graph, mentions, canonical names, vocabulary, and evidence from mockups and reference docs; no ID generation',
  prompt: SYSTEM_DISCOVERY_PROMPT,
  category: 'elements',
  applicableWhen: 'When discovering system structure from mockups and reference documents (Pass 0)',
  order: 0,
  tokenEstimate: Math.ceil(SYSTEM_DISCOVERY_PROMPT.length / 4),
};
