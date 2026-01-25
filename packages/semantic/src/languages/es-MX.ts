/**
 * Mexican Spanish Language Module
 *
 * Self-registering module for Mexican Spanish (es-MX) language support.
 * Registers the Mexican Spanish profile with the base Spanish tokenizer.
 *
 * This demonstrates the language variant feature:
 * - Reuses the Spanish tokenizer (Mexican Spanish has same tokenization rules)
 * - Has its own profile with Mexican-specific keywords and alternatives
 * - Profile extends 'es' for inheritance of common properties
 *
 * @example
 * ```typescript
 * // Import to register
 * import '@lokascript/semantic/languages/es-MX';
 *
 * // Parse with Mexican Spanish
 * parse('ahorita mostrar .loading', 'es-MX');  // "ahorita" is Mexican for "wait"
 * parse('jalar datos de /api', 'es-MX');       // "jalar" is Mexican for "fetch/pull"
 * ```
 */

import { registerLanguage } from '../registry';
import { spanishTokenizer } from '../tokenizers/spanish';
import { spanishMexicoProfile } from '../generators/profiles/spanishMexico';

export { spanishMexicoProfile } from '../generators/profiles/spanishMexico';
// Re-export Spanish tokenizer since we use it for es-MX
export { spanishTokenizer } from '../tokenizers/spanish';

// Register es-MX with the Mexican Spanish profile and Spanish tokenizer
registerLanguage('es-MX', spanishTokenizer, spanishMexicoProfile);
