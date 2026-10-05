/**
 * Tagalog Language Registration
 *
 * Self-registering language module for Tagalog.
 * Import this module to enable Tagalog language support.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/tl';
import { registerLanguage, registerHandcrafted } from '../core';
import { tagalogTokenizer } from '../tokenizers/tl';
import { tagalogProfile } from '../generators/profiles/tl';

// Register Tagalog with the tokenizer and profile
registerHandcrafted('tl', handcraftedPatterns);
registerLanguage('tl', tagalogTokenizer, tagalogProfile);

// Re-export for direct access
export { tagalogTokenizer, tagalogProfile };
