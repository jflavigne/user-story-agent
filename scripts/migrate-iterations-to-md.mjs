#!/usr/bin/env node
/**
 * One-time script: migrate iteration .ts files to .md with frontmatter.
 * Reads each TS file, extracts PROMPT and METADATA, writes .md.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITERATIONS_DIR = path.join(__dirname, '..', 'src', 'prompts', 'iterations');

const META = {
  'interactive-elements': {
    id: 'interactive-elements',
    name: 'Interactive Elements',
    description: 'Documents buttons, inputs, links, icons and their interaction states',
    category: 'elements',
    order: 2,
    applicableWhen: 'When the mockup contains interactive UI components',
    applicableTo: 'all',
    allowedPaths: 'userVisibleBehavior, outcomeAcceptanceCriteria',
    supportsVision: true,
  },
  validation: {
    id: 'validation',
    name: 'Validation Rules',
    description: 'Identifies form field validation rules and user feedback requirements',
    category: 'validation',
    order: 3,
    applicableWhen: 'When the mockup contains forms or input fields',
    applicableTo: 'all',
    allowedPaths: 'outcomeAcceptanceCriteria, systemAcceptanceCriteria',
    supportsVision: true,
  },
  accessibility: {
    id: 'accessibility',
    name: 'Accessibility Requirements',
    description: 'Identifies WCAG compliance and accessibility requirements for inclusive design',
    category: 'quality',
    order: 4,
    applicableWhen: 'For all mockups to ensure inclusive design',
    applicableTo: 'all',
    allowedPaths: 'outcomeAcceptanceCriteria, systemAcceptanceCriteria',
    supportsVision: true,
  },
  performance: {
    id: 'performance',
    name: 'Performance Requirements',
    description: 'Identifies user-perceived performance requirements including load times, response times, and loading feedback',
    category: 'quality',
    order: 5,
    applicableWhen: 'When the mockup shows loading states, actions that may take time, or performance-critical interactions',
    applicableTo: 'all',
    allowedPaths: 'systemAcceptanceCriteria, implementationNotes.performanceNotes, implementationNotes.loadingStates',
    supportsVision: true,
  },
  security: {
    id: 'security',
    name: 'Security Requirements',
    description: 'Identifies security requirements from a user trust and data protection experience perspective',
    category: 'quality',
    order: 6,
    applicableWhen: 'When the mockup shows authentication, authorization, data collection, or privacy-related features',
    applicableTo: 'all',
    allowedPaths: 'systemAcceptanceCriteria, implementationNotes.securityNotes',
  },
  'responsive-web': {
    id: 'responsive-web',
    name: 'Responsive Web Requirements',
    description: 'Identifies responsive design requirements for web applications focusing on functional behaviors across breakpoints',
    category: 'responsive',
    order: 7,
    applicableWhen: 'When analyzing a web application or website that needs to work across different screen sizes',
    applicableTo: 'web, mobile-web, desktop',
    allowedPaths: 'userVisibleBehavior, systemAcceptanceCriteria',
    supportsVision: true,
  },
  'responsive-native': {
    id: 'responsive-native',
    name: 'Responsive Native Requirements',
    description: 'Identifies responsive design requirements for native mobile applications focusing on device-specific functional behaviors',
    category: 'responsive',
    order: 8,
    applicableWhen: 'When analyzing a native mobile application (iOS or Android)',
    applicableTo: 'mobile-native',
    allowedPaths: 'userVisibleBehavior, systemAcceptanceCriteria',
  },
  'language-support': {
    id: 'language-support',
    name: 'Language Support',
    description: 'Identifies language support requirements focusing on user experience of multi-language interfaces',
    category: 'i18n',
    order: 9,
    applicableWhen: 'When analyzing an application that needs to support multiple languages or international users',
    applicableTo: 'all',
    allowedPaths: 'outcomeAcceptanceCriteria',
  },
  'locale-formatting': {
    id: 'locale-formatting',
    name: 'Locale Formatting',
    description: 'Identifies locale-specific formatting requirements focusing on user experience of formatted data',
    category: 'i18n',
    order: 10,
    applicableWhen: 'When analyzing an application that needs to display dates, numbers, currency, addresses, or measurements for international users',
    applicableTo: 'all',
    allowedPaths: 'outcomeAcceptanceCriteria',
  },
  'cultural-appropriateness': {
    id: 'cultural-appropriateness',
    name: 'Cultural Appropriateness',
    description: 'Identifies cultural sensitivity requirements focusing on user experience of culturally appropriate interfaces',
    category: 'i18n',
    order: 11,
    applicableWhen: 'When analyzing an application that will be used by users from diverse cultural backgrounds',
    applicableTo: 'all',
    allowedPaths: 'outcomeAcceptanceCriteria',
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics',
    description: 'Identifies analytics requirements focusing on user behavior patterns and experience insights',
    category: 'analytics',
    order: 12,
    applicableWhen: 'When analyzing an application that needs to understand user behavior patterns and engagement metrics',
    applicableTo: 'all',
    allowedPaths: 'systemAcceptanceCriteria, implementationNotes.telemetryNotes',
    supportsVision: true,
  },
};

function extractPrompt(tsContent) {
  const re = /export const \w+_PROMPT = `([\s\S]*?)`;/;
  const m = tsContent.match(re);
  return m ? m[1].trim() : null;
}

function buildFrontmatter(meta) {
  const lines = [
    '---',
    `id: ${meta.id}`,
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    `category: ${meta.category}`,
    `order: ${meta.order}`,
    `applicableWhen: ${meta.applicableWhen}`,
    `applicableTo: ${meta.applicableTo}`,
    `allowedPaths: ${meta.allowedPaths}`,
    'outputFormat: patches',
  ];
  if (meta.supportsVision) lines.push('supportsVision: true');
  lines.push('---');
  return lines.join('\n');
}

for (const [name, meta] of Object.entries(META)) {
  const tsPath = path.join(ITERATIONS_DIR, `${name}.ts`);
  const mdPath = path.join(ITERATIONS_DIR, `${name}.md`);
  const tsContent = fs.readFileSync(tsPath, 'utf8');
  const prompt = extractPrompt(tsContent);
  if (!prompt) {
    console.error(`Could not extract prompt from ${tsPath}`);
    process.exit(1);
  }
  const mdContent = buildFrontmatter(meta) + '\n\n' + prompt + '\n';
  fs.writeFileSync(mdPath, mdContent);
  console.log('Wrote', mdPath);
}
console.log('Done.');
