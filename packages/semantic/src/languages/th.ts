/**
 * Thai Language Registration
 *
 * Self-registering language module for Thai.
 * Import this module to enable Thai language support.
 */

import { registerLanguage } from '../core';
import { thaiTokenizer } from '../tokenizers/thai';
import { thaiProfile } from '../generators/profiles/thai';

// Register Thai with the tokenizer and profile
registerLanguage('th', thaiTokenizer, thaiProfile);

// Re-export for direct access
export { thaiTokenizer, thaiProfile };
