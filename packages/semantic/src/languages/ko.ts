/**
 * Korean Language Module
 *
 * Self-registering module for Korean language support.
 * Importing this module registers Korean tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/ko';
import { registerLanguage, registerHandcrafted } from '../core';
import { koreanTokenizer } from '../tokenizers/korean';
import { koreanProfile } from '../generators/profiles/korean';

export { koreanTokenizer } from '../tokenizers/korean';
export { koreanProfile } from '../generators/profiles/korean';

registerHandcrafted('ko', handcraftedPatterns);
registerLanguage('ko', koreanTokenizer, koreanProfile);
