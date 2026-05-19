/**
 * Chinese Language Module
 *
 * Self-registering module for Chinese language support.
 * Importing this module registers Chinese tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { chineseTokenizer } from '../tokenizers/chinese';
import { chineseProfile } from '../generators/profiles/chinese';

export { chineseTokenizer } from '../tokenizers/chinese';
export { chineseProfile } from '../generators/profiles/chinese';

registerLanguage('zh', chineseTokenizer, chineseProfile);
