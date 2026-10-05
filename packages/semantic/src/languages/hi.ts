/**
 * Hindi Language Module
 *
 * Self-registering module that sets up Hindi language support.
 * Import this module to enable Hindi in the semantic parser.
 *
 * @example
 * ```typescript
 * // Enable Hindi
 * import '@lokascript/semantic/languages/hi';
 *
 * // Or import everything
 * import '@lokascript/semantic/languages/_all';
 * ```
 */

import { handcraftedPatterns } from '../patterns/handcrafted/hi';
import { registerLanguage, registerHandcrafted } from '../core';
import { hindiTokenizer } from '../tokenizers/hindi';
import { hindiProfile } from '../generators/profiles/hindi';

// Re-export for direct access
export { hindiTokenizer } from '../tokenizers/hindi';
export { hindiProfile } from '../generators/profiles/hindi';

// Self-register on import
registerHandcrafted('hi', handcraftedPatterns);
registerLanguage('hi', hindiTokenizer, hindiProfile);
