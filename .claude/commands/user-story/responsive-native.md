---
description: Identifies responsive design requirements for native mobile applications focusing on device-specific functional behaviors
allowed-tools: [read, write, search_replace]
---

# /user-story/responsive-native - Responsive Native Requirements Iteration

## Purpose

Enhance an existing user story by analyzing native mobile design requirements. This iteration adds acceptance criteria for native mobile layouts, device-specific features, and platform conventions.

## Usage

```
/user-story/responsive-native [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/responsive-native stories/example.md
/user-story/responsive-native tickets/USA-X.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Responsive Native Requirements Iteration Prompt

Analyze the user story using the following prompt:

```
Analyze the mockup or design to identify responsive native app requirements and how users experience functional behaviors specific to mobile devices (iOS and Android).

## Device Capabilities and Features

1. **Camera Integration**: Identify camera-related functionality:
   - How do users capture photos or videos within the app?
   - What happens when users need to access the camera but don't have permission?
   - How are camera features presented and accessed in the interface?
   - What feedback do users receive during photo/video capture?
   - How do users preview, edit, or retake captured media?

2. **Location Services**: Document location-based features:
   - How do users enable location services for the app?
   - What happens when location permission is denied or unavailable?
   - How is user location displayed or used in the interface?
   - What feedback indicates location is being accessed or updated?
   - How do users control location sharing or privacy settings?

3. **Biometric Authentication**: Identify biometric security features:
   - How do users authenticate using Face ID, Touch ID, or fingerprint?
   - What happens when biometric authentication fails or isn't available?
   - How are biometric options presented alongside password authentication?
   - What feedback confirms successful biometric authentication?
   - How do users set up or manage biometric authentication?

4. **Device Sensors**: Determine sensor-based functionality:
   - How do accelerometer or gyroscope features work (shake to refresh, orientation)?
   - What happens when required sensors aren't available on a device?
   - How are sensor-based interactions communicated to users?
   - What feedback indicates sensor data is being used?

5. **File System Access**: Document file access and storage:
   - How do users access device files, photos, or documents?
   - What happens when file permissions are denied?
   - How are files selected, uploaded, or shared from the device?
   - What feedback indicates file operations are in progress or complete?

## Platform Conventions (iOS vs Android)

6. **Navigation Patterns**: Identify platform-specific navigation:
   - How does iOS navigation (back button, navigation bar) differ from Android?
   - What navigation patterns follow platform conventions?
   - How do users understand navigation differences between platforms?
   - Are there platform-specific navigation gestures (swipe back, hamburger menu)?

7. **UI Components**: Document platform-specific UI elements:
   - How do buttons, inputs, and controls follow platform design guidelines?
   - What platform-specific components are used (iOS pickers, Android material design)?
   - How do users recognize familiar platform patterns?
   - Are there platform-specific interaction patterns (long press, force touch)?

8. **System Integration**: Determine system-level integrations:
   - How does the app integrate with iOS Share Sheet or Android Share menu?
   - What system notifications or alerts are used?
   - How does the app appear in system settings or app switcher?
   - What platform-specific features are leveraged (iOS widgets, Android shortcuts)?

9. **Platform-Specific Behaviors**: Identify behaviors unique to each platform:
   - How do iOS and Android handle app backgrounding differently?
   - What platform-specific permissions or settings are needed?
   - How do platform conventions affect user workflows?
   - What platform differences should users be aware of?

## Offline Functionality

10. **Offline Detection**: Identify offline state handling:
    - How do users know when the app is offline vs. online?
    - What visual indicators show connection status?
    - How does the app behave differently when offline?
    - What features are available when offline vs. require connectivity?

11. **Data Synchronization**: Document offline data handling:
    - How does the app store data locally for offline access?
    - What happens to user actions performed while offline?
    - How are offline changes synchronized when connection is restored?
    - What feedback indicates data is syncing or has synced?

12. **Offline Feature Availability**: Determine offline capabilities:
    - What features work completely offline?
    - What features are limited or unavailable offline?
    - How do users understand what they can do offline?
    - What happens when users try to use online-only features offline?

13. **Conflict Resolution**: Identify data conflict handling:
    - How are conflicts resolved when offline changes conflict with data from other devices or the cloud?
    - What feedback do users receive about data conflicts?
    - How do users resolve or choose between conflicting data?
    - What happens to user work if conflicts can't be automatically resolved?

## Push Notifications and Background Behavior

14. **Notification Permissions**: Document notification setup:
    - How do users grant permission for push notifications?
    - What happens when notification permission is denied?
    - How are notification preferences presented and managed?
    - What feedback confirms notification settings have been saved?

15. **Notification Types**: Identify different notification scenarios:
    - What types of notifications does the app send (alerts, badges, sounds)?
    - How do users understand what each notification means?
    - What actions can users take directly from notifications?
    - How do users manage notification frequency or types?

16. **Background Behavior**: Determine app behavior when backgrounded:
    - What happens to ongoing tasks when the app goes to background?
    - How do users know if background tasks are still running?
    - What features continue working when the app is in background?
    - How do users resume tasks when returning to the app?

17. **Background Updates**: Document background data and updates:
    - How does the app update content in the background?
    - What feedback indicates background updates are happening?
    - How do users control background data usage?
    - What happens when background updates fail or are interrupted?

## Device Orientation Handling

18. **Orientation Support**: Identify orientation requirements:
    - Does the app support portrait, landscape, or both orientations?
    - How does the layout adapt when users rotate their device?
    - What features work better in one orientation vs. another?
    - How do users understand orientation support and limitations?

19. **Orientation Transitions**: Document orientation change behavior:
    - How smoothly does the layout transition when orientation changes?
    - What happens to user state or position when orientation changes?
    - Are there features that lock to a specific orientation?
    - How do users experience orientation changes (smooth, jarring, helpful)?

20. **Orientation-Specific Features**: Determine orientation-optimized features:
    - What features are optimized for portrait mode (reading, scrolling)?
    - What features are optimized for landscape mode (video, games, data entry)?
    - How do users understand which orientation works best for each feature?
    - Are there features that require a specific orientation?

## Device-Specific User Experience

21. **Screen Size Adaptation**: Identify behavior across device sizes:
    - How does the app adapt to different phone and tablet screen sizes?
    - What layout changes occur on larger vs. smaller devices?
    - Are there features optimized for tablet vs. phone screens?
    - How do users experience the app on different device sizes?

22. **Performance on Different Devices**: Document performance considerations:
    - How does the app perform on older or less capable devices?
    - What features might be disabled or simplified on lower-end devices?
    - How do users understand performance limitations?
    - What feedback indicates the app is working within device capabilities?

23. **Accessibility Features**: Determine accessibility support:
    - How does the app work with screen readers (VoiceOver, TalkBack)?
    - What accessibility features are supported (larger text, reduced motion)?
    - How do users with disabilities experience the app?
    - What accessibility settings affect app behavior?

## User Story Implications

24. **Story Requirements**: For each native app feature, determine:
    - What device capabilities are required and how permissions are handled?
    - How do platform conventions (iOS vs Android) affect the feature?
    - What offline functionality is needed?
    - How do push notifications and background behavior work?
    - How does device orientation affect the feature?
    - What device-specific adaptations are needed?

25. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Device capability requirements and permission handling
    - Platform-specific behaviors (iOS vs Android)
    - Offline functionality and data synchronization
    - Push notification setup and management
    - Background behavior and task handling
    - Device orientation support and transitions
    - Screen size adaptation and performance considerations
    - Functional behaviors users experience on native devices

## Output

Provide a comprehensive analysis that:
- Identifies device capability requirements and permission handling
- Documents platform-specific conventions and behaviors (iOS vs Android)
- Explains offline functionality and data synchronization
- Describes push notification setup and background behavior
- Covers device orientation handling and transitions
- Maps device-specific adaptations to user experience
- Focuses on functional behaviors users experience, not implementation details
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the Responsive Native Requirements iteration prompt to identify requirements
3. Add new acceptance criteria
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New acceptance criteria clearly marked with a "### Native Mobile" section
- Notes on any considerations

---

## Notes

- This iteration focuses on native mobile design requirements
- New criteria should be additive, not replacing existing requirements
- Follow platform-specific design guidelines
- Consider device capabilities and constraints
