/**
 * Ukrainian Language Module
 *
 * Self-registering module that sets up Ukrainian language support.
 * Import this module to enable Ukrainian in the semantic parser.
 *
 * @example
 * ```typescript
 * // Enable Ukrainian
 * import '@lokascript/semantic/languages/uk';
 *
 * // Or import everything
 * import '@lokascript/semantic/languages/_all';
 * ```
 */

import { registerLanguage } from '../core';
import { ukrainianTokenizer } from '../tokenizers/ukrainian';
import { ukrainianProfile } from '../generators/profiles/ukrainian';

// Re-export for direct access
export { ukrainianTokenizer } from '../tokenizers/ukrainian';
export { ukrainianProfile } from '../generators/profiles/ukrainian';

// Self-register on import
registerLanguage('uk', ukrainianTokenizer, ukrainianProfile);
