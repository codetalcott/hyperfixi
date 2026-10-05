/**
 * Russian Language Module
 *
 * Self-registering module that sets up Russian language support.
 * Import this module to enable Russian in the semantic parser.
 *
 * @example
 * ```typescript
 * // Enable Russian
 * import '@lokascript/semantic/languages/ru';
 *
 * // Or import everything
 * import '@lokascript/semantic/languages/_all';
 * ```
 */

import { handcraftedPatterns } from '../patterns/handcrafted/ru';
import { registerLanguage, registerHandcrafted } from '../core';
import { russianTokenizer } from '../tokenizers/russian';
import { russianProfile } from '../generators/profiles/russian';

// Re-export for direct access
export { russianTokenizer } from '../tokenizers/russian';
export { russianProfile } from '../generators/profiles/russian';

// Self-register on import
registerHandcrafted('ru', handcraftedPatterns);
registerLanguage('ru', russianTokenizer, russianProfile);
