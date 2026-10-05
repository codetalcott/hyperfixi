/**
 * Arabic Language Module
 *
 * Self-registering module for Arabic language support.
 * Importing this module registers Arabic tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/ar';
import { registerLanguage, registerHandcrafted } from '../core';
import { arabicTokenizer } from '../tokenizers/arabic';
import { arabicProfile } from '../generators/profiles/arabic';

export { arabicTokenizer } from '../tokenizers/arabic';
export { arabicProfile } from '../generators/profiles/arabic';

registerHandcrafted('ar', handcraftedPatterns);
registerLanguage('ar', arabicTokenizer, arabicProfile);
