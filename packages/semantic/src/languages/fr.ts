/**
 * French Language Module
 *
 * Self-registering module for French language support.
 * Importing this module registers French tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/fr';
import { registerLanguage, registerHandcrafted } from '../core';
import { frenchTokenizer } from '../tokenizers/french';
import { frenchProfile } from '../generators/profiles/french';

export { frenchTokenizer } from '../tokenizers/french';
export { frenchProfile } from '../generators/profiles/french';

registerHandcrafted('fr', handcraftedPatterns);
registerLanguage('fr', frenchTokenizer, frenchProfile);
