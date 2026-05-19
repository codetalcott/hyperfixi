/**
 * English Language Module
 *
 * Self-registering module for English language support.
 * Importing this module registers English tokenizer, profile, and patterns.
 *
 * This module enables tree-shaking by directly importing only English-specific
 * code, avoiding the patterns/index.ts barrel which pulls in all languages.
 *
 * @example
 * ```typescript
 * import '@lokascript/semantic/languages/en';
 * ```
 */

import { registerLanguage, registerPatterns } from '../core';
import { englishTokenizer } from '../tokenizers/english';
import { englishProfile } from '../generators/profiles/english';
import { buildEnglishPatterns } from '../patterns/en';

// Re-export for direct access
export { englishTokenizer } from '../tokenizers/english';
export { englishProfile } from '../generators/profiles/english';

// Auto-register when this module is imported
registerLanguage('en', englishTokenizer, englishProfile);

// Register English patterns directly (enables tree-shaking)
registerPatterns('en', buildEnglishPatterns());
