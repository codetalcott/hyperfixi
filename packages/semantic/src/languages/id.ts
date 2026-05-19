/**
 * Indonesian Language Module
 *
 * Self-registering module for Indonesian language support.
 * Importing this module registers Indonesian tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { indonesianTokenizer } from '../tokenizers/indonesian';
import { indonesianProfile } from '../generators/profiles/indonesian';

export { indonesianTokenizer } from '../tokenizers/indonesian';
export { indonesianProfile } from '../generators/profiles/indonesian';

registerLanguage('id', indonesianTokenizer, indonesianProfile);
