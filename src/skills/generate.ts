/**
 * Skill Generation Script
 * 
 * Generates Claude Code skill files from iteration registry definitions.
 * This script is idempotent and can be safely re-run.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getAllIterations, initializeIterationPrompts } from '../shared/iteration-registry.js';
import type { IterationRegistryEntry } from '../shared/iteration-registry.js';

/**
 * Map iteration IDs to skill names for i18n iterations
 */
const SKILL_NAME_MAP: Record<string, string> = {
  'language-support': 'i18n-language',
  'locale-formatting': 'i18n-locale',
  'cultural-appropriateness': 'i18n-cultural',
};

/**
 * Map iteration IDs to section names for acceptance criteria
 */
const SECTION_NAME_MAP: Record<string, string> = {
  'user-roles': 'User Roles',
  'interactive-elements': 'Interactive Elements',
  'validation': 'Validation',
  'accessibility': 'Accessibility',
  'performance': 'Performance',
  'security': 'Security',
  'responsive-web': 'Responsive Design',
  'responsive-native': 'Native Mobile',
  'language-support': 'Language Support',
  'locale-formatting': 'Locale Formatting',
  'cultural-appropriateness': 'Cultural Considerations',
  'analytics': 'Analytics',
};

/**
 * Get the skill name for an iteration ID
 */
function getSkillName(iterationId: string): string {
  return SKILL_NAME_MAP[iterationId] || iterationId;
}

/**
 * Get the section name for an iteration ID
 */
function getSectionName(iterationId: string): string {
  return SECTION_NAME_MAP[iterationId] || 'Requirements';
}

/**
 * Generate the markdown content for a skill file
 */
function generateSkillContent(iteration: IterationRegistryEntry): string {
  const skillName = getSkillName(iteration.id);
  const sectionName = getSectionName(iteration.id);
  const name = iteration.name;
  const description = iteration.description;
  const prompt = iteration.prompt;

  // Determine focus area and what it adds based on iteration category
  let focusArea = '';
  let whatItAdds = '';
  let additionalNotes = '';

  switch (iteration.category) {
    case 'roles':
      focusArea = 'user roles and permissions';
      whatItAdds = 'role-based acceptance criteria covering user types, goals, permissions, and role-specific behaviors';
      additionalNotes = '- Consider whether the story needs to be split for different roles\n- Role-specific behaviors should be testable and specific';
      break;
    case 'elements':
      focusArea = 'interactive elements and user interactions';
      whatItAdds = 'acceptance criteria for interactive elements, user interactions, and element-specific behaviors';
      additionalNotes = '- Focus on user interactions, not technical implementation\n- Interactive elements should be clearly identifiable and testable';
      break;
    case 'validation':
      focusArea = 'input validation and error handling';
      whatItAdds = 'acceptance criteria for validation rules, error messages, and user feedback';
      additionalNotes = '- Validation should be user-friendly and clear\n- Error messages should guide users to correct input';
      break;
    case 'quality':
      if (iteration.id === 'accessibility') {
        focusArea = 'accessibility requirements';
        whatItAdds = 'acceptance criteria for accessibility features, keyboard navigation, screen reader support, and WCAG compliance';
        additionalNotes = '- Focus on user experience for users with disabilities\n- Accessibility should be built-in, not an afterthought';
      } else if (iteration.id === 'performance') {
        focusArea = 'performance requirements';
        whatItAdds = 'acceptance criteria for performance metrics, loading times, and responsiveness';
        additionalNotes = '- Focus on user-perceived performance\n- Performance criteria should be measurable and realistic';
      } else if (iteration.id === 'security') {
        focusArea = 'security requirements';
        whatItAdds = 'acceptance criteria for security features, data protection, and secure user interactions';
        additionalNotes = '- Security should be transparent to users when possible\n- Security criteria should be testable';
      }
      break;
    case 'responsive':
      if (iteration.id === 'responsive-web') {
        focusArea = 'responsive web design requirements';
        whatItAdds = 'acceptance criteria for responsive layouts, breakpoints, and multi-device compatibility';
        additionalNotes = '- Consider different screen sizes and orientations\n- Layout should adapt gracefully across devices';
      } else if (iteration.id === 'responsive-native') {
        focusArea = 'native mobile design requirements';
        whatItAdds = 'acceptance criteria for native mobile layouts, device-specific features, and platform conventions';
        additionalNotes = '- Follow platform-specific design guidelines\n- Consider device capabilities and constraints';
      }
      break;
    case 'i18n':
      if (iteration.id === 'language-support') {
        focusArea = 'multi-language and i18n requirements';
        whatItAdds = 'acceptance criteria for language selection mechanisms, RTL text display, character encoding, language-specific content, and fallback behavior when translations are missing';
        additionalNotes = '- Consider RTL languages, special characters, and translation completeness\n- Focus on user experience, not technical i18n implementation';
      } else if (iteration.id === 'locale-formatting') {
        focusArea = 'locale-specific formatting requirements';
        whatItAdds = 'acceptance criteria for date, time, number, currency, and address formatting based on locale';
        additionalNotes = '- Formatting should match user expectations for their locale\n- Consider cultural differences in data presentation';
      } else if (iteration.id === 'cultural-appropriateness') {
        focusArea = 'cultural appropriateness and localization';
        whatItAdds = 'acceptance criteria for culturally appropriate content, imagery, colors, symbols, and cultural sensitivity';
        additionalNotes = '- Content should be respectful and appropriate for target cultures\n- Avoid cultural assumptions and stereotypes';
      }
      break;
    case 'analytics':
      focusArea = 'analytics and tracking requirements';
      whatItAdds = 'acceptance criteria for analytics events, user tracking, and data collection';
      additionalNotes = '- Analytics should respect user privacy\n- Tracking should be transparent and configurable';
      break;
    default:
      focusArea = 'user story requirements';
      whatItAdds = 'acceptance criteria for the story';
      additionalNotes = '- New criteria should be additive, not replacing existing requirements';
  }

  return `---
description: ${description}
allowed-tools: [read, write, search_replace]
---

# /user-story/${skillName} - ${name} Iteration

## Purpose

Enhance an existing user story by analyzing ${focusArea}. This iteration adds ${whatItAdds}.

## Usage

\`\`\`
/user-story/${skillName} [story-path]
\`\`\`

**Arguments:**
- \`$1\` (story-path): Path to user story file or story text to enhance

**Examples:**
\`\`\`
/user-story/${skillName} stories/example.md
/user-story/${skillName} tickets/USA-X.md
\`\`\`

If \`$1\` is not provided, prompt the user: "Please provide the path to the user story file or paste the story text:"

---

## Instructions

### Step 1: Read Story

1. If \`$1\` is a file path, use the \`read\` tool to load the file content
2. If \`$1\` is story text, use it directly
3. If \`$1\` is missing, prompt the user for the story path or text

### Step 2: Apply ${name} Iteration Prompt

Analyze the user story using the following prompt:

\`\`\`
${prompt}
\`\`\`

### Step 3: Enhance Story

1. Analyze the existing user story content
2. Apply the ${name} iteration prompt to identify requirements
3. Add new acceptance criteria
4. Preserve all existing acceptance criteria

### Step 4: Output Enhanced Story

Present the enhanced user story with:
- Original user story template (As a [role], I want [goal], So that [reason])
- All existing acceptance criteria preserved
- New acceptance criteria clearly marked with a "### ${sectionName}" section
- Notes on any considerations

---

## Notes

- This iteration focuses on ${focusArea}
- New criteria should be additive, not replacing existing requirements
${additionalNotes}
`;
}

/**
 * Main function to generate all skill files
 */
async function main(): Promise<void> {
  console.log('Generating skill files...');

  const iterationsDir = join(process.cwd(), 'src', 'prompts', 'iterations');
  await initializeIterationPrompts(iterationsDir);
  const iterations = getAllIterations();
  const outputDir = join(process.cwd(), '.claude', 'commands', 'user-story');

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  let count = 0;

  for (const iteration of iterations) {
    const skillName = getSkillName(iteration.id);
    const filename = `${skillName}.md`;
    const filepath = join(outputDir, filename);

    const content = generateSkillContent(iteration);
    try {
      writeFileSync(filepath, content, 'utf-8');
      console.log(`Generated: ${filename}`);
      count++;
    } catch (error) {
      console.error(`Failed to write ${filename}:`, error);
      process.exit(1);
    }
  }

  console.log(`Done! Generated ${count} skill files.`);
}

// Run the script
main().catch((err) => {
  console.error(err);
  process.exit(1);
});