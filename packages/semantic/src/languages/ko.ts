/**
 * Korean Language Module
 *
 * Self-registering module for Korean language support.
 * Importing this module registers Korean tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { koreanTokenizer } from '../tokenizers/korean';
import { koreanProfile } from '../generators/profiles/korean';

export { koreanTokenizer } from '../tokenizers/korean';
export { koreanProfile } from '../generators/profiles/korean';

registerLanguage('ko', koreanTokenizer, koreanProfile);
