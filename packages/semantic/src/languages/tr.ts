/**
 * Turkish Language Module
 *
 * Self-registering module for Turkish language support.
 * Importing this module registers Turkish tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/tr';
import { registerLanguage, registerHandcrafted } from '../core';
import { turkishTokenizer } from '../tokenizers/turkish';
import { turkishProfile } from '../generators/profiles/turkish';

export { turkishTokenizer } from '../tokenizers/turkish';
export { turkishProfile } from '../generators/profiles/turkish';

registerHandcrafted('tr', handcraftedPatterns);
registerLanguage('tr', turkishTokenizer, turkishProfile);
