/**
 * Spanish Language Module
 *
 * Self-registering module for Spanish language support.
 * Importing this module registers Spanish tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/es';
import { registerLanguage, registerHandcrafted } from '../core';
import { spanishTokenizer } from '../tokenizers/spanish';
import { spanishProfile } from '../generators/profiles/spanish';

export { spanishTokenizer } from '../tokenizers/spanish';
export { spanishProfile } from '../generators/profiles/spanish';

registerHandcrafted('es', handcraftedPatterns);
registerLanguage('es', spanishTokenizer, spanishProfile);
