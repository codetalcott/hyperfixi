/**
 * Bengali Language Registration
 *
 * Self-registering language module for Bengali.
 * Import this module to enable Bengali language support.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/bn';
import { registerLanguage, registerHandcrafted } from '../core';
import { bengaliTokenizer } from '../tokenizers/bengali';
import { bengaliProfile } from '../generators/profiles/bengali';

// Register Bengali with the tokenizer and profile
registerHandcrafted('bn', handcraftedPatterns);
registerLanguage('bn', bengaliTokenizer, bengaliProfile);

// Re-export for direct access
export { bengaliTokenizer, bengaliProfile };
