/**
 * Italian Language Module
 *
 * Self-registering module for Italian language support.
 * Importing this module registers Italian tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/it';
import { registerLanguage, registerHandcrafted } from '../core';
import { italianTokenizer } from '../tokenizers/italian';
import { italianProfile } from '../generators/profiles/italian';

export { italianTokenizer } from '../tokenizers/italian';
export { italianProfile } from '../generators/profiles/italian';

registerHandcrafted('it', handcraftedPatterns);
registerLanguage('it', italianTokenizer, italianProfile);
