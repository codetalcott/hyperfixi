/**
 * Turkish Morphological Normalizer
 *
 * Turkish is a highly agglutinative language with strict vowel harmony.
 * Suffixes attach in sequence and their vowels change based on the last
 * vowel of the stem (front/back, rounded/unrounded).
 *
 * Vowel Harmony Rules:
 * - Back vowels (a, ı, o, u) take back vowel suffixes
 * - Front vowels (e, i, ö, ü) take front vowel suffixes
 *
 * Common verb suffixes:
 * - Infinitive: -mak/-mek (değiştirmek = to change)
 * - Present continuous: -iyor/-ıyor/-üyor/-uyor (değiştiriyor = is changing)
 * - Past: -di/-dı/-dü/-du (değiştirdi = changed)
 * - Reported past: -miş/-mış/-müş/-muş (değiştirmiş = apparently changed)
 * - Future: -ecek/-acak (değiştirecek = will change)
 * - Negation: -me/-ma before tense (değiştirmiyor = is not changing)
 * - Passive: -il/-ıl/-ül/-ul (değiştirildi = was changed)
 * - Causative: -tir/-tır/-tür/-tur (değiştirtmek = to make change)
 *
 * Person suffixes (after tense):
 * - 1sg: -im/-ım/-üm/-um or -m (yapıyorum = I am doing)
 * - 2sg: -sin/-sın/-sün/-sun (yapıyorsun = you are doing)
 * - 3sg: (no suffix) (yapıyor = he/she is doing)
 * - 1pl: -iz/-ız/-üz/-uz (yapıyoruz = we are doing)
 * - 2pl: -siniz/-sınız/-sünüz/-sunuz (yapıyorsunuz = you all are doing)
 * - 3pl: -ler/-lar (yapıyorlar = they are doing)
 *
 * Examples:
 *   değiştiriyorum → değiştir (I am changing)
 *   değiştirmek → değiştir (to change)
 *   gösterdi → göster (showed)
 *   gizleniyor → gizle (is being hidden)
 */

import type {
  MorphologicalNormalizer,
  NormalizationResult,
  SuffixRule,
  ConjugationType,
} from './types';
import { noChange, normalized } from './types';

/**
 * Check if a character is a Turkish letter.
 * Turkish uses Latin alphabet with special characters: ç, ğ, ı, ö, ş, ü
 */
function isTurkishLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  // Basic Latin letters
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
    return true;
  }
  // Turkish special characters
  const turkishChars = 'çÇğĞıİöÖşŞüÜ';
  return turkishChars.includes(char);
}

/**
 * Check if a word contains Turkish characters (including special chars).
 */
function containsTurkish(word: string): boolean {
  for (const char of word) {
    if (isTurkishLetter(char)) return true;
  }
  return false;
}

/**
 * Check if a vowel is a back vowel.
 */
function isBackVowel(char: string): boolean {
  return 'aıouAIOU'.includes(char);
}

/**
 * Check if a vowel is a front vowel.
 */
function isFrontVowel(char: string): boolean {
  return 'eiöüEİÖÜ'.includes(char);
}

/**
 * Check if a character is a vowel.
 */
function isVowel(char: string): boolean {
  return isBackVowel(char) || isFrontVowel(char);
}

/**
 * Get the last vowel in a word.
 */
function getLastVowel(word: string): string | null {
  for (let i = word.length - 1; i >= 0; i--) {
    if (isVowel(word[i])) {
      return word[i];
    }
  }
  return null;
}

/**
 * Check if a suffix matches vowel harmony with the stem.
 * This helps validate that a potential suffix actually belongs.
 */
function matchesVowelHarmony(stem: string, suffix: string): boolean {
  const stemLastVowel = getLastVowel(stem);
  if (!stemLastVowel) return true; // No vowel in stem, can't validate

  const suffixFirstVowel = suffix.split('').find(c => isVowel(c));
  if (!suffixFirstVowel) return true; // No vowel in suffix, can't validate

  // Back vowel stems take back vowel suffixes
  if (isBackVowel(stemLastVowel)) {
    return isBackVowel(suffixFirstVowel);
  }
  // Front vowel stems take front vowel suffixes
  return isFrontVowel(suffixFirstVowel);
}

/**
 * Suffix rules for Turkish verb conjugation.
 * Each pattern includes all vowel harmony variants.
 * Ordered by length (longest first) to ensure greedy matching.
 */
const TURKISH_SUFFIX_RULES: readonly SuffixRule[] = [
  // Compound tense + person (longest patterns first)
  // Present continuous + person
  { pattern: 'iyorsunuz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ıyorsunuz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'üyorsunuz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'uyorsunuz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'iyorsun', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ıyorsun', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'üyorsun', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'uyorsun', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'iyoruz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ıyoruz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'üyoruz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'uyoruz', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'iyorum', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ıyorum', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'üyorum', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'uyorum', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'iyorlar', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ıyorlar', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'üyorlar', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'uyorlar', confidence: 0.82, conjugationType: 'progressive', minStemLength: 2 },

  // Future tense + person
  { pattern: 'eceksiniz', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'acaksınız', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'eceksin', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'acaksın', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'eceğiz', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'acağız', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'eceğim', confidence: 0.85, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'acağım', confidence: 0.85, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'ecekler', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'acaklar', confidence: 0.82, conjugationType: 'future', minStemLength: 2 },

  // Reported past + person
  { pattern: 'mişsiniz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mışsınız', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'müşsünüz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'muşsunuz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mişsin', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mışsın', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'müşsün', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'muşsun', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mişiz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mışız', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'müşüz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'muşuz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mişim', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mışım', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'müşüm', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'muşum', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mişler', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mışlar', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'müşler', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'muşlar', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },

  // Past tense + person
  { pattern: 'diniz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dınız', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dünüz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dunuz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tiniz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tınız', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tünüz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tunuz', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'diler', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dılar', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'düler', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dular', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tiler', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tılar', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tüler', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tular', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'din', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dın', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dün', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dun', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tin', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tın', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tün', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tun', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dik', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dık', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dük', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'duk', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tik', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tık', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tük', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tuk', confidence: 0.82, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dim', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dım', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'düm', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dum', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tim', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tım', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tüm', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tum', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },

  // Present continuous (no person - 3rd person singular)
  { pattern: 'iyor', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'ıyor', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'üyor', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },
  { pattern: 'uyor', confidence: 0.85, conjugationType: 'progressive', minStemLength: 2 },

  // Future (no person - 3rd person singular)
  { pattern: 'ecek', confidence: 0.85, conjugationType: 'future', minStemLength: 2 },
  { pattern: 'acak', confidence: 0.85, conjugationType: 'future', minStemLength: 2 },

  // Reported past (no person - 3rd person singular)
  { pattern: 'miş', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'mış', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'müş', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'muş', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },

  // Simple past (no person - 3rd person singular)
  { pattern: 'di', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dı', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'dü', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'du', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'ti', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tı', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tü', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },
  { pattern: 'tu', confidence: 0.85, conjugationType: 'past', minStemLength: 2 },

  // Infinitive
  { pattern: 'mek', confidence: 0.88, conjugationType: 'dictionary', minStemLength: 2 },
  { pattern: 'mak', confidence: 0.88, conjugationType: 'dictionary', minStemLength: 2 },

  // Optative mood (let me/us...) - -eyim/-ayım/-elim/-alım
  { pattern: 'eyelim', confidence: 0.82, conjugationType: 'optative', minStemLength: 2 },
  { pattern: 'ayalım', confidence: 0.82, conjugationType: 'optative', minStemLength: 2 },
  { pattern: 'eyim', confidence: 0.82, conjugationType: 'optative', minStemLength: 2 },
  { pattern: 'ayım', confidence: 0.82, conjugationType: 'optative', minStemLength: 2 },
  { pattern: 'elim', confidence: 0.82, conjugationType: 'optative', minStemLength: 2 },
  { pattern: 'alım', confidence: 0.82, conjugationType: 'optative', minStemLength: 2 },

  // Necessitative (must/should) - -meli/-malı
  { pattern: 'melisiniz', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'malısınız', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'melisin', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'malısın', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'meliyiz', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'malıyız', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'meliyim', confidence: 0.85, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'malıyım', confidence: 0.85, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'meliler', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'malılar', confidence: 0.82, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'meli', confidence: 0.85, conjugationType: 'necessitative', minStemLength: 2 },
  { pattern: 'malı', confidence: 0.85, conjugationType: 'necessitative', minStemLength: 2 },

  // Ability (can) - -ebil/-abil + tense suffixes
  { pattern: 'ebiliyor', confidence: 0.82, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'abiliyor', confidence: 0.82, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'ebilir', confidence: 0.85, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'abilir', confidence: 0.85, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'ebildi', confidence: 0.82, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'abildi', confidence: 0.82, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'ebilmek', confidence: 0.85, conjugationType: 'potential', minStemLength: 2 },
  { pattern: 'abilmek', confidence: 0.85, conjugationType: 'potential', minStemLength: 2 },

  // Imperative (2nd person singular is just stem, 2nd person plural has suffix)
  { pattern: 'iniz', confidence: 0.82, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'ınız', confidence: 0.82, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'ünüz', confidence: 0.82, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'unuz', confidence: 0.82, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'in', confidence: 0.8, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'ın', confidence: 0.8, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'ün', confidence: 0.8, conjugationType: 'imperative', minStemLength: 2 },
  { pattern: 'un', confidence: 0.8, conjugationType: 'imperative', minStemLength: 2 },

  // Passive voice
  { pattern: 'ildi', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'ıldı', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'üldü', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'uldu', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'ilir', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'ılır', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'ülür', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },
  { pattern: 'ulur', confidence: 0.82, conjugationType: 'passive', minStemLength: 2 },

  // Causative
  { pattern: 'tirmek', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'tırmak', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'türmek', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'turmak', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'dirmek', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'dırmak', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'dürmek', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },
  { pattern: 'durmak', confidence: 0.82, conjugationType: 'causative', minStemLength: 2 },

  // Negation + tense combinations (very common)
  { pattern: 'miyorsunuz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'mıyorsunuz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'müyorsunuz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'muyorsunuz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'miyorsun', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'mıyorsun', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'müyorsun', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'muyorsun', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'miyoruz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'mıyoruz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'müyoruz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'muyoruz', confidence: 0.8, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'miyorum', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'mıyorum', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'müyorum', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'muyorum', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'miyor', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'mıyor', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'müyor', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'muyor', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'medi', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'madı', confidence: 0.82, conjugationType: 'negative', minStemLength: 2 },
  { pattern: 'me', confidence: 0.75, conjugationType: 'negative', minStemLength: 3 },
  { pattern: 'ma', confidence: 0.75, conjugationType: 'negative', minStemLength: 3 },
];

/**
 * Turkish morphological normalizer.
 */
export class TurkishMorphologicalNormalizer implements MorphologicalNormalizer {
  readonly language = 'tr';

  /**
   * Check if a word might be a Turkish verb that can be normalized.
   */
  isNormalizable(word: string): boolean {
    // Must contain Turkish characters
    if (!containsTurkish(word)) return false;

    // Must be at least 3 characters (Turkish verb stems are usually 2+ chars)
    if (word.length < 3) return false;

    return true;
  }

  /**
   * Normalize a Turkish word to its stem form.
   */
  normalize(word: string): NormalizationResult {
    // Convert to lowercase for matching
    const lowerWord = word.toLowerCase();

    // Try suffix rules
    for (const rule of TURKISH_SUFFIX_RULES) {
      if (lowerWord.endsWith(rule.pattern)) {
        const stem = lowerWord.slice(0, -rule.pattern.length);

        // Validate stem length
        const minLength = rule.minStemLength ?? 2;
        if (stem.length < minLength) continue;

        // Validate vowel harmony (optional, can help avoid false positives)
        if (!matchesVowelHarmony(stem, rule.pattern)) {
          // Lower confidence if vowel harmony doesn't match
          // but still allow it since there are exceptions
          const adjustedConfidence = rule.confidence * 0.9;

          const metadata: { removedSuffixes: string[]; conjugationType?: ConjugationType } = {
            removedSuffixes: [rule.pattern],
          };
          if (rule.conjugationType) {
            metadata.conjugationType = rule.conjugationType;
          }
          return normalized(stem, adjustedConfidence, metadata);
        }

        const metadata: { removedSuffixes: string[]; conjugationType?: ConjugationType } = {
          removedSuffixes: [rule.pattern],
        };
        if (rule.conjugationType) {
          metadata.conjugationType = rule.conjugationType;
        }
        return normalized(stem, rule.confidence, metadata);
      }
    }

    // No normalization needed
    return noChange(word);
  }
}

// Export singleton instance
export const turkishMorphologicalNormalizer = new TurkishMorphologicalNormalizer();
