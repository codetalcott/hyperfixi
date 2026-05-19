/**
 * Turkish Language Module
 *
 * Self-registering module for Turkish language support.
 * Importing this module registers Turkish tokenizer and profile.
 */

import { registerLanguage } from '../core';
import { turkishTokenizer } from '../tokenizers/turkish';
import { turkishProfile } from '../generators/profiles/turkish';

export { turkishTokenizer } from '../tokenizers/turkish';
export { turkishProfile } from '../generators/profiles/turkish';

registerLanguage('tr', turkishTokenizer, turkishProfile);
