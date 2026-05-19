/**
 * Hebrew Language Module
 *
 * Self-registering module for Hebrew language support.
 * Importing this module registers Hebrew tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { hebrewTokenizer } from '../tokenizers/he';
import { hebrewProfile } from '../generators/profiles/he';

export { hebrewTokenizer } from '../tokenizers/he';
export { hebrewProfile } from '../generators/profiles/he';

registerLanguage('he', hebrewTokenizer, hebrewProfile);
