/**
 * Malay Language Registration
 *
 * Self-registering language module for Malay.
 * Import this module to enable Malay language support.
 */

import { handcraftedPatterns } from '../patterns/handcrafted/ms';
import { registerLanguage, registerHandcrafted } from '../core';
import { malayTokenizer } from '../tokenizers/ms';
import { malayProfile } from '../generators/profiles/ms';

// Register Malay with the tokenizer and profile
registerHandcrafted('ms', handcraftedPatterns);
registerLanguage('ms', malayTokenizer, malayProfile);

// Re-export for direct access
export { malayTokenizer, malayProfile };
