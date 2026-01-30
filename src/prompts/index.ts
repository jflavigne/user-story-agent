/**
 * Prompts module - exports all system and iteration prompts
 */

export { SYSTEM_PROMPT, SYSTEM_PROMPT_METADATA } from './system.js';
export { POST_PROCESSING_PROMPT, POST_PROCESSING_PROMPT_METADATA } from './post-processing.js';

// Iteration prompts
export { USER_ROLES_PROMPT, USER_ROLES_METADATA } from './iterations/user-roles.js';
export { INTERACTIVE_ELEMENTS_PROMPT, INTERACTIVE_ELEMENTS_METADATA } from './iterations/interactive-elements.js';
export { VALIDATION_PROMPT, VALIDATION_METADATA } from './iterations/validation.js';
export { ACCESSIBILITY_PROMPT, ACCESSIBILITY_METADATA } from './iterations/accessibility.js';
export { PERFORMANCE_PROMPT, PERFORMANCE_METADATA } from './iterations/performance.js';
export { SECURITY_PROMPT, SECURITY_METADATA } from './iterations/security.js';
export { RESPONSIVE_WEB_PROMPT, RESPONSIVE_WEB_METADATA } from './iterations/responsive-web.js';
export { RESPONSIVE_NATIVE_PROMPT, RESPONSIVE_NATIVE_METADATA } from './iterations/responsive-native.js';
export { LANGUAGE_SUPPORT_PROMPT, LANGUAGE_SUPPORT_METADATA } from './iterations/language-support.js';
export { LOCALE_FORMATTING_PROMPT, LOCALE_FORMATTING_METADATA } from './iterations/locale-formatting.js';
export { CULTURAL_APPROPRIATENESS_PROMPT, CULTURAL_APPROPRIATENESS_METADATA } from './iterations/cultural-appropriateness.js';
export { ANALYTICS_PROMPT, ANALYTICS_METADATA } from './iterations/analytics.js';
export {
  STORY_INTERCONNECTION_PROMPT,
  STORY_INTERCONNECTION_METADATA,
} from './iterations/story-interconnection.js';

// Judge rubrics
export { GLOBAL_CONSISTENCY_JUDGE_PROMPT } from './judge-rubrics/global-consistency.js';
