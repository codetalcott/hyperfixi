/**
 * Chinese Language Module
 *
 * Self-registering module for Chinese language support.
 * Importing this module registers Chinese tokenizer and profile.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/zh';
import { registerLanguage, registerHandcrafted } from '../core';
import { chineseTokenizer } from '../tokenizers/chinese';
import { chineseProfile } from '../generators/profiles/chinese';

export { chineseTokenizer } from '../tokenizers/chinese';
export { chineseProfile } from '../generators/profiles/chinese';

registerHandcrafted('zh', handcraftedPatterns);
registerLanguage('zh', chineseTokenizer, chineseProfile);
