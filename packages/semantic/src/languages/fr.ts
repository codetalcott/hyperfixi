/**
 * French Language Module
 *
 * Self-registering module for French language support.
 * Importing this module registers French tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { frenchTokenizer } from '../tokenizers/french';
import { frenchProfile } from '../generators/profiles/french';

export { frenchTokenizer } from '../tokenizers/french';
export { frenchProfile } from '../generators/profiles/french';

registerLanguage('fr', frenchTokenizer, frenchProfile);
