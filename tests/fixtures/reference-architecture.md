# System Architecture Reference

## State Management
- User authentication state (logged in/out, user profile)
- Session management with JWT tokens
- Form validation state

## Events
- user-authenticated: Fired on successful login
- user-logged-out: Fired on logout
- form-validation-error: Fired on validation failure

## Components
- LoginForm: Handles authentication UI
- DashboardContainer: Main dashboard layout
- NavigationBar: Top navigation with user menu
