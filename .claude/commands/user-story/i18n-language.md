---
description: Enhance user stories with multi-language and i18n requirements
allowed-tools: [read, write, search_replace]
---

# /user-story/i18n-language - Language Support Iteration

## Purpose

Enhance an existing user story by analyzing language support requirements for internationalization. This iteration adds acceptance criteria for language selection mechanisms, RTL text display, character encoding, language-specific content, and fallback behavior when translations are missing.

## Usage

```
/user-story/i18n-language [story-path]
```

**Arguments:**
- `$1` (story-path): Path to user story file or story text to enhance

**Examples:**
```
/user-story/i18n-language stories/global-header.md
/user-story/i18n-language tickets/USA-9.md
```

If `$1` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If `$1` is a file path, use the `read` tool to load the file content
2. If `$1` is story text, use it directly
3. If `$1` is missing, prompt the user for the story path or text

### Step 2: Apply Language Support Iteration Prompt

Analyze the user story using the following prompt:

```
Analyze the mockup or design to identify language support requirements and how users experience multi-language interfaces.

## Language Selection and Switching

1. **Language Discovery**: Identify how users discover available languages:
   - How do users know the application supports multiple languages?
   - Where is language selection presented (header, footer, settings, first-time setup)?
   - What visual indicators show the current language (flag icons, language codes, full names)?
   - How do users understand which languages are available?

2. **Language Switching Mechanism**: Document how users change languages:
   - How do users access the language selection interface?
   - What happens when users select a different language (immediate change, page reload, confirmation)?
   - How do users know their language selection was successful?
   - Is language preference remembered across sessions?

3. **Language Selection Experience**: Determine the user experience of language selection:
   - How are languages presented (native names, English names, flags, both)?
   - Can users search or filter available languages?
   - What happens if a user's preferred language isn't available?
   - How do users understand language availability for different parts of the application?

4. **Contextual Language Selection**: Identify language selection in different contexts:
   - Can users set different languages for different sections or features?
   - How does language selection work in multi-user scenarios?
   - What language is used for system messages, errors, and notifications?
   - How do users manage language preferences for different devices?

## Right-to-Left (RTL) Text Display and Interaction

5. **RTL Layout Adaptation**: Identify how RTL languages affect layout:
   - How does the interface adapt when displaying RTL languages (Arabic, Hebrew, etc.)?
   - How do navigation menus, buttons, and controls reorient for RTL?
   - What happens to icons, images, and visual elements in RTL layouts?
   - How do users experience the mirrored layout compared to LTR languages?

6. **RTL Interaction Patterns**: Document interaction behavior in RTL layouts:
   - How do users navigate and interact with RTL content?
   - How do scrolling, swiping, and navigation gestures work in RTL?
   - What happens to form fields, input directions, and text alignment?
   - How do users understand interaction patterns in RTL vs LTR?

7. **Mixed Content Handling**: Determine how mixed LTR/RTL content is handled:
   - How are mixed-language paragraphs displayed (numbers, English words in Arabic text)?
   - What happens when RTL and LTR content appear together?
   - How do users read and understand mixed-direction content?
   - How are embedded links, buttons, or controls handled in mixed content?

8. **RTL Visual Consistency**: Identify visual consistency in RTL layouts:
   - How do icons, arrows, and directional elements adapt for RTL?
   - What happens to logos, branding, and non-textual elements?
   - How do users experience visual balance and hierarchy in RTL layouts?
   - Are there visual elements that don't make sense when mirrored?

## Character Encoding and Special Characters

9. **Character Display**: Identify how special characters are displayed:
   - How are accented characters, diacritics, and special symbols displayed?
   - What happens with characters from different scripts (Cyrillic, Chinese, Arabic, etc.)?
   - How do users see and interact with emoji, symbols, and special punctuation?
   - Are there character display issues that affect readability?

10. **Input Method Support**: Document how users input special characters:
    - How do users enter accented characters, special symbols, or non-Latin scripts?
    - What input methods are supported (virtual keyboards, IME, handwriting)?
    - How do users know which characters they can enter in form fields?
    - What happens when users try to enter unsupported characters?

11. **Font and Typography**: Determine typography requirements for different languages:
    - How are fonts selected to support different character sets?
    - What happens if a font doesn't support required characters?
    - How do users experience text rendering quality for their language?
    - Are there readability issues with font choices for specific languages?

12. **Search and Filtering**: Identify how special characters affect search:
    - How do users search for content with special characters or accents?
    - What happens when users search without accents but content has accents?
    - How are search results filtered and sorted for different character sets?
    - Can users find content regardless of how they type special characters?

## Language-Specific Content

13. **Translation Completeness**: Identify translation coverage:
    - How do users experience the application when some content isn't translated?
    - What happens when users encounter untranslated text or mixed languages?
    - How do users understand which parts of the application are available in their language?
    - Are there clear indicators when content is machine-translated vs. human-translated?

14. **Localized Images and Media**: Document how images adapt to languages:
    - How are images with text handled (screenshots, infographics, banners)?
    - What happens to images that contain language-specific content?
    - How do users see culturally appropriate images for their region?
    - Are there images that need to be different for different languages or regions?

15. **Content Length Variations**: Determine how text length differences are handled:
    - How does the interface adapt when translations are longer or shorter than the original?
    - What happens to layouts when translated text doesn't fit (truncation, wrapping, scrolling)?
    - How do users experience buttons, menus, and UI elements with varying text lengths?
    - Are there layout issues caused by text length differences?

16. **Cultural Content Adaptation**: Identify culturally specific content:
    - How are examples, references, and cultural content adapted for different regions?
    - What happens to date formats, names, addresses, and other locale-specific data?
    - How do users see content that's relevant to their cultural context?
    - Are there content elements that don't make sense in certain cultural contexts?

## Fallback Behavior When Translations Missing

17. **Fallback Language Strategy**: Document what happens when translations are missing:
    - What language do users see when their preferred language isn't available?
    - How do users understand that content is shown in a fallback language?
    - What happens when only part of the interface is translated?
    - How do users experience mixed-language interfaces?

18. **Partial Translation Handling**: Identify how partial translations are handled:
    - How do users experience interfaces where some sections are translated and others aren't?
    - What happens to navigation, menus, and UI elements when partially translated?
    - How do users understand which parts are available in their language?
    - Are there user experience issues with partial translations?

19. **Error Message Localization**: Determine how errors are communicated:
    - What language are error messages, validation messages, and system notifications shown in?
    - How do users understand errors when they're in a different language?
    - What happens when error messages reference content in a different language?
    - How do users get help or support in their preferred language?

20. **Dynamic Content Translation**: Identify how dynamic content is translated:
    - How are user-generated content, comments, and dynamic text handled?
    - What happens when content is created in one language but viewed in another?
    - How do users experience content that may not be translated?
    - Are there translation options for user-generated or dynamic content?

## User Story Implications

21. **Story Requirements**: For each language support feature, determine:
    - How users discover and select their preferred language
    - How RTL languages affect layout and interaction patterns
    - How special characters and different scripts are displayed and input
    - How language-specific content is presented and adapted
    - How fallback behavior works when translations are missing
    - How users experience partial translations and mixed-language interfaces

22. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Language selection and switching mechanisms
    - RTL layout adaptation and interaction patterns
    - Character encoding and special character support
    - Language-specific content presentation
    - Fallback behavior for missing translations
    - Partial translation handling
    - User experience of multi-language interfaces, not technical implementation

## Output

Provide a comprehensive analysis that:
- Identifies language selection and switching mechanisms from a user perspective
- Documents RTL text display and interaction requirements
- Explains character encoding and special character handling
- Describes language-specific content adaptation
- Maps fallback behavior when translations are missing
- Covers partial translation and mixed-language scenarios
- Focuses on user experience behaviors, not technical implementation details
```

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the language support iteration prompt to identify:
   - Language selection and switching mechanisms
   - RTL layout and interaction requirements
   - Character encoding and special character handling
   - Language-specific content needs
   - Fallback behavior for missing translations
3. Add new acceptance criteria for language support
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New language support acceptance criteria clearly marked with a "### Language Support" section
- Notes on RTL handling and translation completeness

---

## Notes

- This iteration focuses on multi-language user experience
- New criteria should be additive, not replacing existing requirements
- Consider RTL languages, special characters, and translation completeness
- Focus on user experience, not technical i18n implementation
