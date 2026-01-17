---
name: Security Requirements
id: security
description: Identifies security requirements from a user trust and data protection experience perspective
category: quality
order: 6
applicableWhen: When the mockup shows authentication, authorization, data collection, or privacy-related features
applicableTo: all
---

Analyze the mockup or design to identify security requirements and how users experience trust, data protection, and secure interactions.

## Data Handling Transparency

1. **Data Collection Communication**: Identify how data collection is communicated:
   - What information is collected from users and why?
   - How are users informed about data usage and storage?
   - Are there clear explanations of what data is required vs. optional?
   - How do users understand what happens to their data after submission?

2. **Privacy Indicators**: Document privacy and data protection indicators:
   - Are there visual indicators showing data is protected?
   - How do users know their information is secure?
   - What messaging builds trust around data handling?
   - Are privacy policies and terms easily accessible?

3. **Data Visibility**: Determine what users can see about their data:
   - Can users view what data is stored about them?
   - Are there dashboards showing account activity or data access?
   - How do users understand what data is shared with third parties?
   - What transparency features help users feel in control?

## Authentication Experience

4. **Login Flow**: Identify authentication user experience:
   - How do users know they're on a secure login page?
   - What visual indicators show the login form is legitimate?
   - How are login errors communicated without revealing security details?
   - What feedback confirms successful authentication?

5. **Password Security UX**: Document password-related user experience:
   - How do users understand password requirements?
   - What feedback is provided during password creation?
   - How are password strength indicators shown?
   - What happens when users forget passwords or need to reset?

6. **Multi-Factor Authentication**: Identify MFA user experience:
   - How is multi-factor authentication presented to users?
   - What feedback guides users through MFA steps?
   - How are authentication codes or tokens communicated?
   - What happens if MFA fails or times out?

7. **Session Management**: Document session-related user experience:
   - How do users know they're logged in?
   - What happens when sessions expire?
   - How are "remember me" or "stay logged in" options presented?
   - What feedback indicates when users are logged out?

## Authorization and Permissions

8. **Permission Indicators**: Identify how permissions are communicated:
   - How do users know what actions they're authorized to perform?
   - What visual indicators show restricted vs. allowed actions?
   - How are permission errors communicated clearly?
   - What messaging explains why certain actions aren't available?

9. **Access Control Feedback**: Document authorization feedback:
   - How do users understand when they lack permission for an action?
   - What happens when users try to access restricted content?
   - Are there clear explanations of why access is denied?
   - How do users know what permissions they have vs. need?

10. **Role-Based Access**: Determine role-based access indicators:
    - How do users understand their role and associated permissions?
    - What visual differences indicate different access levels?
    - How are role-specific features and restrictions communicated?
    - What feedback helps users understand their authorization level?

## Secure Transmission Indicators

11. **Connection Security**: Identify secure connection indicators:
    - How do users know their connection is secure (HTTPS indicators)?
    - What visual cues show encrypted transmission?
    - How are security warnings or certificate issues communicated?
    - What messaging builds confidence in secure connections?

12. **Secure Form Submission**: Document secure form indicators:
    - How do users know form submissions are secure?
    - What feedback confirms data is being transmitted securely?
    - Are there indicators during secure file uploads?
    - How is payment or sensitive data submission communicated as secure?

## Privacy Controls

13. **Privacy Settings**: Identify user privacy controls:
    - Where can users manage their privacy preferences?
    - How are privacy settings organized and explained?
    - What granular controls do users have over data sharing?
    - How do users understand the impact of privacy choices?

14. **Data Management**: Document user data management features:
    - Can users view, edit, or delete their data?
    - How do users export their data?
    - What controls exist for data retention or deletion?
    - How are data management actions confirmed and communicated?

15. **Consent Management**: Determine consent and preference management:
    - How are users asked for consent for data usage?
    - Can users easily change consent preferences?
    - What feedback confirms consent choices have been saved?
    - How are consent requirements communicated clearly?

## Trust and Security Messaging

16. **Trust Indicators**: Identify elements that build user trust:
    - What visual elements communicate security and trustworthiness?
    - Are there security badges, certifications, or trust marks?
    - How is security information presented without overwhelming users?
    - What messaging balances security with usability?

17. **Security Notifications**: Document security-related notifications:
    - How are users notified of security events (login from new device, password change)?
    - What alerts or warnings are shown for suspicious activity?
    - How are security updates or breaches communicated?
    - What actions can users take in response to security notifications?

## User Story Implications

18. **Story Requirements**: For each security-related feature, determine:
    - What authentication and authorization flows are needed?
    - How is data handling and privacy communicated to users?
    - What security indicators and trust elements are required?
    - How do users experience secure interactions and data protection?

19. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Authentication user experience and feedback
    - Authorization indicators and permission communication
    - Data handling transparency and privacy controls
    - Secure transmission indicators
    - Trust-building elements and security messaging
    - User control over privacy and data management

## Output

Provide a comprehensive analysis that:
- Identifies all authentication and authorization user experience requirements
- Documents how data handling and privacy are communicated to users
- Explains security indicators and trust-building elements
- Describes privacy controls and user data management features
- Maps security requirements to user story acceptance criteria
- Focuses on user-visible security experience, not implementation details