/**
 * Locale Formatting iteration prompt module
 * 
 * This prompt guides analysis of locale-specific formatting requirements for internationalization
 * from a user experience perspective, focusing on how users see and interact with formatted data.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for identifying locale formatting requirements from a user experience perspective.
 * 
 * This prompt guides analysis of:
 * - Date and time display formats
 * - Number formatting (decimals, thousands separators)
 * - Currency display and symbols
 * - Address and phone number formats
 * - Measurement units (metric vs imperial)
 * 
 * Focus on USER EXPERIENCE behaviors, not technical implementation details.
 */
export const LOCALE_FORMATTING_PROMPT = `# PATH SCOPE
This iteration is allowed to modify only these sections:
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
      "metadata": { "advisorId": "locale-formatting", "reasoning": "..." }
    }
  ]
}

Required fields:
- op: "add" | "replace" | "remove"
- path: Must be one of the allowed paths above
- item: { id: string, text: string } for add/replace
- match: { id?: string, textEquals?: string } for replace/remove
- metadata: { advisorId: "locale-formatting", reasoning?: string }

---

Analyze the mockup or design to identify locale-specific formatting requirements and how users experience formatted data in different regions.

## Date and Time Display Formats

1. **Date Format Variations**: Identify how dates are displayed:
   - How are dates formatted for different regions (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)?
   - What date format do users expect in their region?
   - How do users understand date formats that differ from their expectations?
   - Are there date formats that could be confusing for users from different regions?

2. **Time Format Variations**: Document how times are displayed:
   - How are times formatted (12-hour vs 24-hour, AM/PM indicators)?
   - What time format do users expect in their region?
   - How do users understand time zones and time displays?
   - Are there time formats that could be ambiguous or confusing?

3. **Date and Time Input**: Determine how users enter dates and times:
   - How do users input dates in formats familiar to their region?
   - What happens when users enter dates in unexpected formats?
   - How do users understand which date format to use when entering data?
   - Are there date input methods that work better for different regions?

4. **Relative Time Display**: Identify how relative times are shown:
   - How are relative times displayed ("2 hours ago", "yesterday", "last week")?
   - How do users understand relative time expressions in different languages?
   - What happens when relative time needs to be localized?
   - Are there relative time expressions that don't translate well?

## Number Formatting

5. **Decimal Separators**: Identify how decimal numbers are displayed:
   - How are decimal numbers formatted (period vs comma as decimal separator)?
   - What decimal format do users expect in their region?
   - How do users understand decimal numbers when the format differs from expectations?
   - Are there decimal formats that could cause confusion or errors?

6. **Thousands Separators**: Document how large numbers are formatted:
   - How are thousands separated (commas, periods, spaces, no separator)?
   - What thousands separator format do users expect?
   - How do users read and understand large numbers with different separators?
   - Are there number formats that could be misinterpreted?

7. **Number Input**: Determine how users enter numbers:
   - How do users input numbers with their expected decimal and thousands separators?
   - What happens when users enter numbers in unexpected formats?
   - How do users understand which number format to use?
   - Are there number input methods that prevent format-related errors?

8. **Percentage Display**: Identify how percentages are shown:
   - How are percentages formatted and displayed?
   - What percentage format do users expect (with or without space, symbol placement)?
   - How do users understand percentage values in different contexts?
   - Are there percentage displays that could be confusing?

## Currency Display and Symbols

9. **Currency Symbols**: Identify how currency is displayed:
   - How are currency symbols positioned (before or after amount)?
   - What currency symbols do users expect to see?
   - How do users understand currency displays in different formats?
   - Are there currency symbols that could be confusing or ambiguous?

10. **Currency Formatting**: Document how currency amounts are formatted:
    - How are currency amounts formatted with decimal places and separators?
    - What currency format do users expect in their region?
    - How do users understand currency amounts with different formatting?
    - Are there currency formats that could lead to misinterpretation?

11. **Multi-Currency Support**: Determine how multiple currencies are handled:
    - How do users see and select different currencies?
    - What happens when users view prices in currencies they're not familiar with?
    - How do users understand currency conversion and exchange rates?
    - Are there currency displays that need clarification for international users?

12. **Currency Input**: Identify how users enter currency amounts:
    - How do users input currency amounts with their expected format?
    - What happens when users enter currency in unexpected formats?
    - How do users understand which currency format to use?
    - Are there currency input methods that prevent format errors?

## Address and Phone Number Formats

13. **Address Format Variations**: Document how addresses are displayed and entered:
    - How are addresses formatted for different countries (street first vs last, postal code placement)?
    - What address format do users expect in their region?
    - How do users understand address fields that don't match their country's format?
    - Are there address formats that could cause delivery or validation issues?

14. **Address Input Fields**: Identify how address input is structured:
    - How are address input fields organized for different countries?
    - What address fields are required or optional for different regions?
    - How do users understand which address format to use?
    - Are there address input methods that work better for specific countries?

15. **Phone Number Formats**: Determine how phone numbers are displayed and entered:
    - How are phone numbers formatted for different countries (spacing, parentheses, dashes)?
    - What phone number format do users expect in their region?
    - How do users understand phone number formats that differ from expectations?
    - Are there phone number formats that could be confusing or cause dialing errors?

16. **Phone Number Input**: Document how users enter phone numbers:
    - How do users input phone numbers with their expected format?
    - What happens when users enter phone numbers in unexpected formats?
    - How do users understand which phone number format to use?
    - Are there phone number input methods that prevent format errors?

## Measurement Units

17. **Unit System Selection**: Identify how measurement units are displayed:
    - How are measurement units shown (metric vs imperial, kg vs lbs, km vs miles)?
    - What unit system do users expect in their region?
    - How do users understand measurements in units they're not familiar with?
    - Are there unit displays that could be confusing or lead to errors?

18. **Unit Conversion**: Document how unit conversions are handled:
    - How do users see measurements converted between unit systems?
    - What happens when users need to work with unfamiliar units?
    - How do users understand unit conversions and their accuracy?
    - Are there unit conversions that need clarification for users?

19. **Unit Input**: Determine how users enter measurements:
    - How do users input measurements with their expected units?
    - What happens when users enter measurements in unexpected units?
    - How do users understand which unit system to use?
    - Are there unit input methods that prevent unit-related errors?

20. **Context-Specific Units**: Identify how units vary by context:
    - How are units displayed in different contexts (temperature, distance, weight, volume)?
    - What unit formats do users expect in specific contexts?
    - How do users understand context-specific unit displays?
    - Are there unit displays that need context-specific formatting?

## User Story Implications

21. **Story Requirements**: For each locale formatting feature, determine:
    - How dates and times are displayed and entered for different regions
    - How numbers are formatted with appropriate separators and decimal places
    - How currency is displayed with correct symbols and formatting
    - How addresses and phone numbers are formatted for different countries
    - How measurement units are displayed and converted
    - How users understand and interact with locale-specific formats

22. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Date and time format variations by region
    - Number formatting with appropriate decimal and thousands separators
    - Currency display with correct symbols and positioning
    - Address and phone number formats for different countries
    - Measurement unit system selection and conversion
    - User experience of formatted data, not technical formatting implementation

## Output

Return AdvisorOutput only: a JSON object with a "patches" array. Each patch must target outcomeAcceptanceCriteria. Add or replace items to document:
- Date and time display format requirements by region
- Number formatting with appropriate separators
- Currency display and symbol positioning
- Address and phone number format variations
- Acceptance criteria for locale formatting (AC-OUT-*)`;

/**
 * Metadata for the locale formatting iteration
 */
export const LOCALE_FORMATTING_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'locale-formatting',
  name: 'Locale Formatting',
  description: 'Identifies locale-specific formatting requirements focusing on user experience of formatted data',
  prompt: LOCALE_FORMATTING_PROMPT,
  category: 'i18n',
  applicableWhen: 'When analyzing an application that needs to display dates, numbers, currency, addresses, or measurements for international users',
  order: 10,
  tokenEstimate: 2188, // ~8750 chars / 4
};
