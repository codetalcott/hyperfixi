/**
 * Quechua Language Module
 *
 * Self-registering module for Quechua language support.
 * Importing this module registers Quechua tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/qu';
import { registerLanguage, registerHandcrafted } from '../core';
import { quechuaTokenizer } from '../tokenizers/quechua';
import { quechuaProfile } from '../generators/profiles/quechua';

export { quechuaTokenizer } from '../tokenizers/quechua';
export { quechuaProfile } from '../generators/profiles/quechua';

registerHandcrafted('qu', handcraftedPatterns);
registerLanguage('qu', quechuaTokenizer, quechuaProfile);
