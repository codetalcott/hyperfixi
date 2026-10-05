/**
 * Indonesian Language Module
 *
 * Self-registering module for Indonesian language support.
 * Importing this module registers Indonesian tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/id';
import { registerLanguage, registerHandcrafted } from '../core';
import { indonesianTokenizer } from '../tokenizers/indonesian';
import { indonesianProfile } from '../generators/profiles/indonesian';

export { indonesianTokenizer } from '../tokenizers/indonesian';
export { indonesianProfile } from '../generators/profiles/indonesian';

registerHandcrafted('id', handcraftedPatterns);
registerLanguage('id', indonesianTokenizer, indonesianProfile);
