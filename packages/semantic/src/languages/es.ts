/**
 * Spanish Language Module
 *
 * Self-registering module for Spanish language support.
 * Importing this module registers Spanish tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { spanishTokenizer } from '../tokenizers/spanish';
import { spanishProfile } from '../generators/profiles/spanish';

export { spanishTokenizer } from '../tokenizers/spanish';
export { spanishProfile } from '../generators/profiles/spanish';

registerLanguage('es', spanishTokenizer, spanishProfile);
