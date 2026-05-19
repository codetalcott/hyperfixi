/**
 * Bengali Language Registration
 *
 * Self-registering language module for Bengali.
 * Import this module to enable Bengali language support.
 */

import { registerLanguage } from '../core';
import { bengaliTokenizer } from '../tokenizers/bengali';
import { bengaliProfile } from '../generators/profiles/bengali';

// Register Bengali with the tokenizer and profile
registerLanguage('bn', bengaliTokenizer, bengaliProfile);

// Re-export for direct access
export { bengaliTokenizer, bengaliProfile };
