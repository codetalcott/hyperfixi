/**
 * Portuguese Language Module
 *
 * Self-registering module for Portuguese language support.
 * Importing this module registers Portuguese tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { portugueseTokenizer } from '../tokenizers/portuguese';
import { portugueseProfile } from '../generators/profiles/portuguese';

export { portugueseTokenizer } from '../tokenizers/portuguese';
export { portugueseProfile } from '../generators/profiles/portuguese';

registerLanguage('pt', portugueseTokenizer, portugueseProfile);
