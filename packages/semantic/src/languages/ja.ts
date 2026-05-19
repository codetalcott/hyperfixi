/**
 * Japanese Language Module
 *
 * Self-registering module for Japanese language support.
 * Importing this module registers Japanese tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { japaneseTokenizer } from '../tokenizers/japanese';
import { japaneseProfile } from '../generators/profiles/japanese';

export { japaneseTokenizer } from '../tokenizers/japanese';
export { japaneseProfile } from '../generators/profiles/japanese';

registerLanguage('ja', japaneseTokenizer, japaneseProfile);
