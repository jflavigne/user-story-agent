/**
 * Cultural Appropriateness iteration prompt module
 * 
 * This prompt guides analysis of cultural sensitivity requirements for internationalization
 * from a user experience perspective, focusing on how cultural context affects user understanding.
 */

import type { IterationDefinition } from '../../shared/types.js';

/**
 * Prompt for identifying cultural appropriateness requirements from a user experience perspective.
 * 
 * This prompt guides analysis of:
 * - Color meanings across cultures
 * - Icons and symbols interpretation
 * - Cultural sensitivity in imagery
 * - Name and title conventions
 * - Cultural assumptions in workflows
 * 
 * Focus on USER EXPERIENCE behaviors, not technical implementation details.
 */
export const CULTURAL_APPROPRIATENESS_PROMPT = `Analyze the mockup or design to identify cultural appropriateness requirements and how users from different cultural backgrounds experience and interpret interface elements.

## Color Meanings Across Cultures

1. **Color Symbolism**: Identify how colors are interpreted:
   - How do different colors convey meaning in different cultures (red for danger vs. luck, white for weddings vs. funerals)?
   - What color associations could be confusing or offensive in certain cultures?
   - How do users understand color-coded information when meanings differ?
   - Are there color choices that could negatively impact user experience in specific regions?

2. **Color Usage in UI**: Document how colors are used in the interface:
   - How are colors used to indicate status, importance, or actions?
   - What happens when color meanings conflict with cultural expectations?
   - How do users understand color-coded features when cultural meanings differ?
   - Are there color-dependent features that need alternative indicators?

3. **Accessibility and Color**: Determine how color usage affects accessibility:
   - How do users with color vision deficiencies experience color-coded information?
   - What alternative indicators exist beyond color for important information?
   - How do users understand information when color is the only indicator?
   - Are there color-dependent features that exclude users with color blindness?

4. **Cultural Color Preferences**: Identify color preferences by region:
   - What color palettes are preferred or avoided in different regions?
   - How do users experience color choices that don't align with cultural preferences?
   - What happens when brand colors conflict with cultural associations?
   - Are there color choices that could affect user engagement in specific markets?

## Icons and Symbols Interpretation

5. **Icon Meaning Variations**: Identify how icons are interpreted:
   - How do common icons (checkmarks, X marks, arrows, gestures) vary in meaning across cultures?
   - What icons could be confusing or have negative associations in certain cultures?
   - How do users understand icon meanings when they differ from expectations?
   - Are there icons that need to be replaced or adapted for different regions?

6. **Symbol Recognition**: Document how symbols are recognized:
   - How do users recognize and understand symbols from different cultural contexts?
   - What happens when symbols are unfamiliar to users from certain regions?
   - How do users understand symbolic representations that differ from their culture?
   - Are there symbols that need explanation or alternatives for international users?

7. **Gesture Icons**: Determine how gesture-based icons are understood:
   - How are hand gestures and body language icons interpreted across cultures?
   - What gesture icons could be offensive or inappropriate in certain cultures?
   - How do users understand gesture-based interactions when meanings differ?
   - Are there gesture icons that need to be avoided or replaced?

8. **Religious and Cultural Symbols**: Identify potentially sensitive symbols:
   - How are religious or cultural symbols used in the interface?
   - What symbols could be offensive or inappropriate in certain cultural contexts?
   - How do users experience symbols that conflict with their beliefs or values?
   - Are there symbols that should be avoided or require careful consideration?

## Cultural Sensitivity in Imagery

9. **People and Representation**: Document how people are represented:
   - How are people of different ethnicities, genders, and ages represented in imagery?
   - What happens when imagery doesn't reflect the diversity of the user base?
   - How do users see themselves represented in the application?
   - Are there representation issues that could affect user engagement or trust?

10. **Cultural Context in Images**: Identify cultural context in imagery:
    - How are cultural settings, clothing, and environments depicted?
    - What happens when imagery shows cultural contexts unfamiliar to users?
    - How do users understand imagery that reflects different cultural norms?
    - Are there images that could be confusing or inappropriate for certain audiences?

11. **Stereotypes and Assumptions**: Determine how stereotypes are avoided:
    - How are cultural stereotypes avoided in imagery and content?
    - What happens when imagery reinforces negative stereotypes?
    - How do users experience content that makes cultural assumptions?
    - Are there imagery choices that could perpetuate harmful stereotypes?

12. **Localized Imagery**: Document how imagery is adapted for regions:
    - How is imagery selected or adapted for different cultural contexts?
    - What happens when imagery needs to be culturally appropriate for specific regions?
    - How do users see imagery that's relevant to their cultural context?
    - Are there imagery requirements that vary by region or market?

## Name and Title Conventions

13. **Name Format Variations**: Identify how names are displayed and entered:
    - How are names formatted for different cultures (given name first vs. last, middle names, honorifics)?
    - What name format do users expect in their region?
    - How do users understand name fields that don't match their cultural conventions?
    - Are there name formats that could cause confusion or validation issues?

14. **Title and Honorific Conventions**: Document how titles are used:
    - How are titles and honorifics used in different cultures (Mr., Mrs., Dr., san, sama)?
    - What title conventions do users expect in their region?
    - How do users understand title options when they differ from cultural norms?
    - Are there title conventions that could be confusing or inappropriate?

15. **Name Input Fields**: Determine how name input is structured:
    - How are name input fields organized for different naming conventions?
    - What name fields are required or optional for different cultures?
    - How do users understand which name format to use?
    - Are there name input methods that work better for specific naming conventions?

16. **Name Display and Sorting**: Identify how names are displayed:
    - How are names sorted and displayed in lists (by first name vs. last name)?
    - What name display format do users expect?
    - How do users find and identify people when name formats differ?
    - Are there name display methods that could be confusing for international users?

## Cultural Assumptions in Workflows

17. **Workflow Cultural Context**: Document how workflows reflect cultural assumptions:
    - How do workflows assume certain cultural norms or practices?
    - What happens when workflows don't align with cultural expectations?
    - How do users understand workflows that reflect different cultural contexts?
    - Are there workflow assumptions that could confuse or exclude users?

18. **Business Practice Assumptions**: Identify assumptions about business practices:
    - How do workflows assume certain business practices or norms?
    - What happens when business practices differ across cultures?
    - How do users understand workflows that reflect unfamiliar business contexts?
    - Are there business practice assumptions that need adaptation?

19. **Social and Communication Norms**: Determine how social norms affect workflows:
    - How do workflows assume certain communication styles or social norms?
    - What happens when communication norms differ across cultures?
    - How do users understand workflows that reflect different social contexts?
    - Are there social norm assumptions that could affect user experience?

20. **Time and Scheduling Assumptions**: Identify assumptions about time and scheduling:
    - How do workflows assume certain time conventions (work hours, weekends, holidays)?
    - What happens when time conventions differ across cultures?
    - How do users understand scheduling features that reflect different time contexts?
    - Are there time assumptions that could cause confusion or scheduling issues?

## User Story Implications

21. **Story Requirements**: For each cultural appropriateness feature, determine:
    - How colors are interpreted and used in culturally appropriate ways
    - How icons and symbols are understood across different cultural contexts
    - How imagery reflects cultural sensitivity and diversity
    - How names and titles follow cultural conventions
    - How workflows avoid cultural assumptions and accommodate different practices
    - How users experience culturally appropriate and sensitive interfaces

22. **Acceptance Criteria**: Document acceptance criteria that cover:
    - Color choices that respect cultural meanings and associations
    - Icon and symbol selection that's appropriate across cultures
    - Imagery that's culturally sensitive and representative
    - Name and title conventions that match cultural expectations
    - Workflows that avoid cultural assumptions and accommodate differences
    - User experience of culturally appropriate interfaces, not technical implementation

## Output

Provide a comprehensive analysis that:
- Identifies color meanings and usage that respect cultural differences
- Documents icon and symbol interpretation across cultures
- Explains cultural sensitivity requirements for imagery
- Describes name and title convention adaptations
- Maps cultural assumptions in workflows that need consideration
- Covers user experience of culturally appropriate interfaces, not technical implementation details`;

/**
 * Metadata for the cultural appropriateness iteration
 */
export const CULTURAL_APPROPRIATENESS_METADATA: IterationDefinition & { tokenEstimate: number } = {
  id: 'cultural-appropriateness',
  name: 'Cultural Appropriateness',
  description: 'Identifies cultural sensitivity requirements focusing on user experience of culturally appropriate interfaces',
  prompt: CULTURAL_APPROPRIATENESS_PROMPT,
  category: 'i18n',
  applicableWhen: 'When analyzing an application that will be used by users from diverse cultural backgrounds',
  order: 11,
  tokenEstimate: 2397, // ~9589 chars / 4
};
