/**
 * Portuguese Language Module
 *
 * Self-registering module for Portuguese language support.
 * Importing this module registers Portuguese tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/pt';
import { registerLanguage, registerHandcrafted } from '../core';
import { portugueseTokenizer } from '../tokenizers/portuguese';
import { portugueseProfile } from '../generators/profiles/portuguese';

export { portugueseTokenizer } from '../tokenizers/portuguese';
export { portugueseProfile } from '../generators/profiles/portuguese';

registerHandcrafted('pt', handcraftedPatterns);
registerLanguage('pt', portugueseTokenizer, portugueseProfile);
