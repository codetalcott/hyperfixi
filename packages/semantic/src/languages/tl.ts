/**
 * Tagalog Language Registration
 *
 * Self-registering language module for Tagalog.
 * Import this module to enable Tagalog language support.
 */

import { registerLanguage } from '../registry';
import { tagalogTokenizer } from '../tokenizers/tl';
import { tagalogProfile } from '../generators/profiles/tl';

// Register Tagalog with the tokenizer and profile
registerLanguage('tl', tagalogTokenizer, tagalogProfile);

// Re-export for direct access
export { tagalogTokenizer, tagalogProfile };
