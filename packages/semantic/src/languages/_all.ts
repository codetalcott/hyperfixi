/**
 * All Languages Module
 *
 * Imports and registers all 24 supported languages.
 * Use this for the full bundle with all language support.
 *
 * @example
 * ```typescript
 * import '@lokascript/semantic/languages/_all';
 * // or
 * import '@lokascript/semantic/languages';
 * ```
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

// Import all language modules to trigger registration
import './ar';
import './bn';
import './de';
import './en';
import './es';
import './fr';
import './he';
import './hi';
import './id';
import './it';
import './ja';
import './ko';
import './ms';
import './pl';
import './pt';
import './qu';
import './ru';
import './sw';
import './th';
import './tl';
import './tr';
import './uk';
import './vi';
import './zh';

// Render vocabulary for all of them (separate modules so parse-only consumers
// can drop it — see ../lexicon-registry.ts)
import '../lexicons/ar';
import '../lexicons/bn';
import '../lexicons/de';
import '../lexicons/en';
import '../lexicons/es';
import '../lexicons/fr';
import '../lexicons/he';
import '../lexicons/hi';
import '../lexicons/id';
import '../lexicons/it';
import '../lexicons/ja';
import '../lexicons/ko';
import '../lexicons/ms';
import '../lexicons/pl';
import '../lexicons/pt';
import '../lexicons/qu';
import '../lexicons/ru';
import '../lexicons/sw';
import '../lexicons/th';
import '../lexicons/tl';
import '../lexicons/tr';
import '../lexicons/uk';
import '../lexicons/vi';
import '../lexicons/zh';

// Re-export everything for convenience
export * from './ar';
export * from './bn';
export * from './de';
export * from './en';
export * from './es';
export * from './fr';
export * from './he';
export * from './hi';
export * from './id';
export * from './it';
export * from './ja';
export * from './ko';
export * from './ms';
export * from './pl';
export * from './pt';
export * from './qu';
export * from './ru';
export * from './sw';
export * from './th';
export * from './tl';
export * from './tr';
export * from './uk';
export * from './vi';
export * from './zh';
