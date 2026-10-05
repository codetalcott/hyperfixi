/**
 * Polish Language Module
 *
 * Self-registering module for Polish language support.
 * Importing this module registers Polish tokenizer and profile.
 *
 * Polish is unique among supported languages in using IMPERATIVE form
 * for commands in software UI (not infinitive like most other languages).
 */

import { handcraftedPatterns } from '../patterns/handcrafted/pl';
import { registerLanguage, registerHandcrafted } from '../core';
import { polishTokenizer } from '../tokenizers/polish';
import { polishProfile } from '../generators/profiles/polish';

export { polishTokenizer } from '../tokenizers/polish';
export { polishProfile } from '../generators/profiles/polish';

registerHandcrafted('pl', handcraftedPatterns);
registerLanguage('pl', polishTokenizer, polishProfile);
