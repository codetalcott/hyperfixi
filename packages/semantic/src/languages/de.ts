/**
 * German Language Module
 *
 * Self-registering module for German language support.
 * Importing this module registers German tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/de';
import { registerLanguage, registerHandcrafted } from '../core';
import { germanTokenizer } from '../tokenizers/german';
import { germanProfile } from '../generators/profiles/german';

export { germanTokenizer } from '../tokenizers/german';
export { germanProfile } from '../generators/profiles/german';

registerHandcrafted('de', handcraftedPatterns);
registerLanguage('de', germanTokenizer, germanProfile);
