/**
 * Italian Language Module
 *
 * Self-registering module for Italian language support.
 * Importing this module registers Italian tokenizer and profile.
 */

import { registerLanguage } from '../registry';
import { italianTokenizer } from '../tokenizers/italian';
import { italianProfile } from '../generators/profiles/italian';

export { italianTokenizer } from '../tokenizers/italian';
export { italianProfile } from '../generators/profiles/italian';

registerLanguage('it', italianTokenizer, italianProfile);
