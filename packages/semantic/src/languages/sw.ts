/**
 * Swahili Language Module
 *
 * Self-registering module for Swahili language support.
 * Importing this module registers Swahili tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/sw';
import { registerLanguage, registerHandcrafted } from '../core';
import { swahiliTokenizer } from '../tokenizers/swahili';
import { swahiliProfile } from '../generators/profiles/swahili';

export { swahiliTokenizer } from '../tokenizers/swahili';
export { swahiliProfile } from '../generators/profiles/swahili';

registerHandcrafted('sw', handcraftedPatterns);
registerLanguage('sw', swahiliTokenizer, swahiliProfile);
