/**
 * Vietnamese Language Module
 *
 * Self-registering module that initializes Vietnamese language support.
 * Import this file to enable Vietnamese semantic parsing.
 */

import { registerLanguage } from '../registry';
import { vietnameseTokenizer } from '../tokenizers/vietnamese';
import { vietnameseProfile } from '../generators/profiles/vietnamese';

// Register Vietnamese with the semantic parser
registerLanguage('vi', vietnameseTokenizer, vietnameseProfile);

// Re-export for direct access
export { vietnameseTokenizer, vietnameseProfile };
