/**
 * Test fixtures for E2E tests
 *
 * Sample stories, mock responses, and expected outputs for testing.
 */

import type { MockResponse } from './mock-server.js';

/**
 * Sample user stories for testing
 */
export const SAMPLE_STORIES = {
  /** Simple login story */
  login: 'As a user, I want to login to my account so that I can access my personal dashboard.',

  /** Simple registration story */
  registration:
    'As a new user, I want to create an account so that I can use the application.',

  /** E-commerce checkout story */
  checkout:
    'As a customer, I want to complete my purchase with a credit card so that I can receive my items.',

  /** Minimal story for testing */
  minimal: 'As a user, I want to view my profile.',

  /** Story with special characters */
  special:
    'As a user, I want to search for items using special characters like @, #, and & so that I can find relevant results.',

  /** Multi-line story */
  multiLine: `As a user, I want to:
1. Create a new project
2. Add team members
3. Set permissions
so that I can collaborate with my team.`,
};

/**
 * Mock API responses for different scenarios
 */
export const MOCK_RESPONSES = {
  /**
   * Creates a simple success response with enhanced story content
   */
  simple: (content: string): MockResponse => ({
    content,
    stopReason: 'end_turn',
    inputTokens: 100,
    outputTokens: 50,
  }),

  /**
   * Creates a validation iteration response
   */
  validation: (): MockResponse => ({
    content: `# User Story: Login with Validation

## Story
As a user, I want to login to my account so that I can access my personal dashboard.

## Validation Requirements
- Email format: Must be valid email format (user@domain.com)
- Password: Minimum 8 characters, at least one uppercase, one lowercase, one number
- Login attempts: Maximum 5 failed attempts before account lockout

## Error Messages
- Invalid email: "Please enter a valid email address"
- Invalid password: "Password does not meet requirements"
- Login failed: "Invalid email or password"`,
    stopReason: 'end_turn',
    inputTokens: 150,
    outputTokens: 200,
  }),

  /**
   * Creates an accessibility iteration response
   */
  accessibility: (): MockResponse => ({
    content: `# User Story: Login with Accessibility

## Story
As a user, I want to login to my account so that I can access my personal dashboard.

## Accessibility Requirements
- WCAG 2.1 AA compliant
- All form fields have visible labels and ARIA labels
- Error messages announced by screen readers
- Keyboard navigation: Tab through fields, Enter to submit
- Focus indicators visible on all interactive elements`,
    stopReason: 'end_turn',
    inputTokens: 150,
    outputTokens: 180,
  }),

  /**
   * Creates a user-roles iteration response
   */
  userRoles: (): MockResponse => ({
    content: `# User Story: Login with User Roles

## Story
As a user, I want to login to my account so that I can access my personal dashboard.

## User Roles
- Guest: Can view public pages only
- Registered User: Can access dashboard, profile, settings
- Admin: Full access including user management

## Role-based Behavior
- After login, redirect based on user role
- Display role-appropriate navigation`,
    stopReason: 'end_turn',
    inputTokens: 120,
    outputTokens: 150,
  }),

  /**
   * Creates a consolidation iteration response
   */
  consolidation: (): MockResponse => ({
    content: `# User Story: Login (Consolidated)

## Story
As a user, I want to login to my account so that I can access my personal dashboard.

## Acceptance Criteria

### Validation
1. Email must be valid format
2. Password minimum 8 characters with complexity requirements
3. Maximum 5 failed login attempts

### User Roles
1. Role-based dashboard redirect after login
2. Role-appropriate navigation display

### Accessibility
1. WCAG 2.1 AA compliant
2. Full keyboard navigation support
3. Screen reader compatible`,
    stopReason: 'end_turn',
    inputTokens: 200,
    outputTokens: 250,
  }),

  /**
   * Creates an API error response
   */
  apiError: (message: string = 'Internal server error'): MockResponse => ({
    content: '',
    statusCode: 500,
    errorBody: {
      type: 'error',
      error: {
        type: 'api_error',
        message,
      },
    },
  }),

  /**
   * Creates a rate limit error response
   */
  rateLimitError: (): MockResponse => ({
    content: '',
    statusCode: 429,
    errorBody: {
      type: 'error',
      error: {
        type: 'rate_limit_error',
        message: 'Rate limit exceeded. Please retry after 60 seconds.',
      },
    },
  }),

  /**
   * Creates an authentication error response
   */
  authError: (): MockResponse => ({
    content: '',
    statusCode: 401,
    errorBody: {
      type: 'error',
      error: {
        type: 'authentication_error',
        message: 'Invalid API key provided.',
      },
    },
  }),

  /**
   * Creates an empty content response (edge case)
   */
  emptyContent: (): MockResponse => ({
    content: '   ',
    stopReason: 'end_turn',
    inputTokens: 100,
    outputTokens: 0,
  }),
};

/**
 * Standard CLI arguments for common scenarios
 */
export const CLI_ARGS = {
  /** Help flag */
  help: ['--help'],

  /** Version flag */
  version: ['--version'],

  /** Individual mode with validation iteration */
  individualValidation: ['--mode', 'individual', '--iterations', 'validation'],

  /** Individual mode with multiple iterations */
  individualMultiple: ['--mode', 'individual', '--iterations', 'user-roles,validation'],

  /** Workflow mode for web product */
  workflowWeb: ['--mode', 'workflow', '--product-type', 'web'],

  /** Workflow mode for mobile product */
  workflowMobile: ['--mode', 'workflow', '--product-type', 'mobile-native'],

  /** Quiet mode */
  quiet: ['--quiet'],

  /** Debug mode */
  debug: ['--debug'],
};

/**
 * Creates an array of mock responses for a workflow sequence
 *
 * @param count - Number of responses to create
 * @returns Array of mock responses
 */
export function createWorkflowResponses(count: number): MockResponse[] {
  const responses: MockResponse[] = [];
  for (let i = 0; i < count; i++) {
    responses.push({
      content: `Enhanced story iteration ${i + 1}`,
      stopReason: 'end_turn',
      inputTokens: 100 + i * 20,
      outputTokens: 50 + i * 10,
    });
  }
  return responses;
}
