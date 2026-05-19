/**
 * Quechua Language Module
 *
 * Self-registering module for Quechua language support.
 * Importing this module registers Quechua tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { quechuaTokenizer } from '../tokenizers/quechua';
import { quechuaProfile } from '../generators/profiles/quechua';

export { quechuaTokenizer } from '../tokenizers/quechua';
export { quechuaProfile } from '../generators/profiles/quechua';

registerLanguage('qu', quechuaTokenizer, quechuaProfile);
