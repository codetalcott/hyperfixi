/**
 * Language Profiles Index
 *
 * Re-exports all 10 language profiles and provides a registry lookup.
 */

import type { LearnLanguageProfile } from '../types';
import { enProfile } from './en';
import { jaProfile } from './ja';
import { esProfile } from './es';
import { arProfile } from './ar';
import { zhProfile } from './zh';
import { koProfile } from './ko';
import { frProfile } from './fr';
import { trProfile } from './tr';
import { deProfile } from './de';
import { ptProfile } from './pt';

export { enProfile, jaProfile, esProfile, arProfile, zhProfile };
export { koProfile, frProfile, trProfile, deProfile, ptProfile };

/** All profiles indexed by language code */
export const ALL_PROFILES: Record<string, LearnLanguageProfile> = {
  en: enProfile,
  ja: jaProfile,
  es: esProfile,
  ar: arProfile,
  zh: zhProfile,
  ko: koProfile,
  fr: frProfile,
  tr: trProfile,
  de: deProfile,
  pt: ptProfile,
};
