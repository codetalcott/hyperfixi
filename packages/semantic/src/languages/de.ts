/**
 * German Language Module
 *
 * Self-registering module for German language support.
 * Importing this module registers German tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { germanTokenizer } from '../tokenizers/german';
import { germanProfile } from '../generators/profiles/german';

export { germanTokenizer } from '../tokenizers/german';
export { germanProfile } from '../generators/profiles/german';

registerLanguage('de', germanTokenizer, germanProfile);
