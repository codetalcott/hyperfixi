/**
 * Turkish Tokenizer
 *
 * Tokenizes Turkish hyperscript input.
 * Turkish is challenging because:
 * - Highly agglutinative (many suffixes attach to words)
 * - Strict vowel harmony rules
 * - Postpositions instead of prepositions
 * - No grammatical gender
 * - Word order is typically SOV
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
  type CreateTokenOptions,
} from './base';
import { TurkishMorphologicalNormalizer } from './morphology/turkish-normalizer';

// =============================================================================
// Turkish Character Classification
// =============================================================================

/**
 * Turkish special characters.
 */
const TURKISH_SPECIAL_CHARS = 'çÇğĞıİöÖşŞüÜ';

/**
 * Check if character is a Turkish letter.
 */
function isTurkishLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  // Basic Latin letters
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
    return true;
  }
  // Turkish special characters
  return TURKISH_SPECIAL_CHARS.includes(char);
}

// =============================================================================
// Turkish Particles and Postpositions
// =============================================================================

/**
 * Turkish postpositions (come after the noun they modify).
 */
const POSTPOSITIONS = new Set([
  'ile', // with
  'için', // for
  'kadar', // until, as far as
  'gibi', // like
  'sonra', // after
  'önce', // before
  'üzerinde', // on, above
  'altında', // under
  'içinde', // inside
  'dışında', // outside
  'arasında', // between
  'karşı', // against, towards
  'göre', // according to
  'rağmen', // despite
  'doğru', // towards
  'boyunca', // along, throughout
]);

/**
 * Turkish case suffixes (attach to nouns).
 * These are often used as particles in semantic parsing.
 */
const CASE_SUFFIXES = new Set([
  'de',
  'da',
  'te',
  'ta', // locative (at, in)
  'den',
  'dan',
  'ten',
  'tan', // ablative (from)
  'e',
  'a',
  'ye',
  'ya', // dative (to)
  'i',
  'ı',
  'u',
  'ü', // accusative (object)
  'in',
  'ın',
  'un',
  'ün', // genitive (of)
  'le',
  'la',
  'yle',
  'yla', // instrumental (with)
]);

// =============================================================================
// Turkish Keywords
// =============================================================================

/**
 * Turkish command keywords mapped to their English equivalents.
 */
const TURKISH_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['değiştir', 'toggle'],
  ['değistir', 'toggle'], // without diacritics
  ['ekle', 'add'],
  ['kaldır', 'remove'],
  ['kaldir', 'remove'], // without diacritics
  ['sil', 'remove'],
  // Commands - Content operations
  ['koy', 'put'],
  ['yerleştir', 'put'],
  ['yerlestir', 'put'], // without diacritics
  ['sonunaekle', 'append'],
  ['sona_ekle', 'append'],
  ['basaekle', 'prepend'],
  ['başa_ekle', 'prepend'],
  ['basa_ekle', 'prepend'], // without diacritics
  ['al', 'get'], // common colloquial form for "get" (test case)
  ['yap', 'set'], // common colloquial form for "set" (test case)
  ['oluştur', 'make'],
  ['olustur', 'make'], // without diacritics
  ['kopyala', 'clone'],
  ['klonla', 'clone'],
  // Commands - Variable operations
  ['ayarla', 'set'],
  ['belirle', 'set'],
  ['getir', 'get'],
  ['elde_et', 'get'],
  ['artır', 'increment'],
  ['artir', 'increment'], // without diacritics
  ['azalt', 'decrement'],
  ['kaydet', 'log'],
  ['yazdır', 'log'],
  ['yazdir', 'log'], // without diacritics
  // Commands - Visibility
  ['göster', 'show'],
  ['goster', 'show'], // without diacritics
  ['gizle', 'hide'],
  ['sakla', 'hide'],
  ['geçiş', 'transition'],
  ['gecis', 'transition'], // without diacritics
  ['animasyon', 'transition'],
  // Commands - Events
  ['üzerinde', 'on'],
  ['uzerinde', 'on'], // without diacritics
  ['olduğunda', 'on'],
  ['oldugunda', 'on'], // without diacritics
  ['tetikle', 'trigger'],
  ['ateşle', 'trigger'],
  ['atesle', 'trigger'], // without diacritics
  ['gönder', 'send'],
  ['gonder', 'send'], // without diacritics
  // Commands - DOM focus
  ['odakla', 'focus'],
  ['odaklan', 'focus'],
  ['bulanıklaştır', 'blur'],
  ['bulaniklastir', 'blur'], // without diacritics
  ['odak_kaldır', 'blur'],
  ['odak_kaldir', 'blur'], // without diacritics
  // Commands - Navigation
  ['git', 'go'],
  ['yönlendir', 'go'],
  ['yonlendir', 'go'], // without diacritics
  // Commands - Async
  ['bekle', 'wait'],
  ['getir', 'fetch'],
  ['çek', 'fetch'],
  ['cek', 'fetch'], // without diacritics
  ['yerleş', 'settle'],
  ['yerles', 'settle'], // without diacritics
  ['istikrar', 'settle'],
  ['sabitlen', 'settle'], // profile primary
  // Commands - Control flow
  ['eğer', 'if'],
  ['eger', 'if'], // without diacritics
  ['yoksa', 'else'],
  ['değilse', 'else'],
  ['degilse', 'else'], // without diacritics
  ['tekrarla', 'repeat'],
  ['herbir', 'for'],
  ['her', 'for'],
  ['iken', 'while'],
  ['durumunda', 'when'], // conditional "when"
  ['nerede', 'where'], // element filter "where"
  ['devam', 'continue'],
  ['devam_et', 'continue'],
  ['dur', 'halt'],
  ['durdur', 'halt'],
  ['fırlat', 'throw'],
  ['firlat', 'throw'], // without diacritics
  ['at', 'throw'],
  ['çağır', 'call'],
  ['cagir', 'call'], // without diacritics
  ['dön', 'return'],
  ['don', 'return'], // without diacritics
  ['döndür', 'return'],
  ['dondur', 'return'], // without diacritics
  // Commands - Advanced
  ['js', 'js'],
  ['javascript', 'js'],
  ['asenkron', 'async'],
  ['eşzamansız', 'async'],
  ['eszamansiz', 'async'], // without diacritics
  ['söyle', 'tell'],
  ['soyle', 'tell'], // without diacritics
  ['varsayılan', 'default'],
  ['varsayilan', 'default'], // without diacritics
  ['başlat', 'init'],
  ['baslat', 'init'], // without diacritics
  ['başla', 'init'],
  ['basla', 'init'], // without diacritics
  ['davranış', 'behavior'],
  ['davranis', 'behavior'], // without diacritics
  ['yükle', 'install'],
  ['yukle', 'install'], // without diacritics
  ['ölç', 'measure'],
  ['olc', 'measure'], // without diacritics
  ['kadar', 'until'],
  ['olay', 'event'],
  ['-den', 'from'],
  ['-dan', 'from'],
  // Modifiers
  ['içine', 'into'],
  ['icine', 'into'], // without diacritics
  ['önce', 'before'],
  ['once', 'before'], // without diacritics
  ['sonra', 'after'],
  // Control flow helpers
  ['sonra', 'then'],
  ['o_zaman', 'then'],
  ['son', 'end'],
  ['bitir', 'end'],
  ['kadar', 'until'],

  // Events (for event name recognition)
  ['tıklama', 'click'],
  ['tiklama', 'click'], // without diacritics
  ['tık', 'click'],
  ['tik', 'click'], // without diacritics
  ['giriş', 'input'],
  ['giris', 'input'], // without diacritics
  ['değişim', 'change'],
  ['degisim', 'change'], // without diacritics
  ['gönder', 'submit'],
  ['gonder', 'submit'], // without diacritics
  ['odak', 'focus'],
  ['bulanık', 'blur'],
  ['bulanik', 'blur'], // without diacritics
  ['fare üzerinde', 'mouseover'],
  ['fare uzerinde', 'mouseover'], // without diacritics
  ['fare dışında', 'mouseout'],
  ['fare disinda', 'mouseout'], // without diacritics
  ['yükle', 'load'],
  ['yukle', 'load'], // without diacritics
  ['kaydır', 'scroll'],
  ['kaydir', 'scroll'], // without diacritics
  ['tuş_bas', 'keydown'],
  ['tus_bas', 'keydown'], // without diacritics
  ['tuş_bırak', 'keyup'],
  ['tus_birak', 'keyup'], // without diacritics

  // References
  ['ben', 'me'],
  ['benim', 'my'],
  ['o', 'it'],
  ['onun', 'its'],
  ['sonuç', 'result'],
  ['sonuc', 'result'], // without diacritics
  ['olay', 'event'],
  ['hedef', 'target'],

  // Positional
  ['ilk', 'first'],
  ['son', 'last'],
  ['sonraki', 'next'],
  ['önceki', 'previous'],
  ['onceki', 'previous'], // without diacritics

  // Time units
  ['saniye', 's'],
  ['milisaniye', 'ms'],
  ['dakika', 'm'],
  ['saat', 'h'],

  // Boolean
  ['doğru', 'true'],
  ['dogru', 'true'], // without diacritics
  ['yanlış', 'false'],
  ['yanlis', 'false'], // without diacritics

  // Logical
  ['ve', 'and'],
  ['veya', 'or'],
  ['değil', 'not'],
  ['degil', 'not'], // without diacritics

  // Modifiers (postpositions)
  ['ile', 'with'],
  ['için', 'for'],
  ['icin', 'for'], // without diacritics
]);

// =============================================================================
// Turkish Tokenizer Implementation
// =============================================================================

export class TurkishTokenizer extends BaseTokenizer {
  readonly language = 'tr';
  readonly direction = 'ltr' as const;

  /** Morphological normalizer for Turkish verb conjugations */
  private morphNormalizer = new TurkishMorphologicalNormalizer();

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // Try CSS selector first (ASCII-based)
      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // Try string literal
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Try URL (/path, ./path, http://, etc.)
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Try number (including Turkish time units)
      if (isDigit(input[pos])) {
        const numberToken = this.extractTurkishNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Try variable reference (:varname)
      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Try Turkish word
      if (isTurkishLetter(input[pos])) {
        const wordToken = this.extractTurkishWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'tr');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (POSTPOSITIONS.has(lower)) return 'particle';
    if (CASE_SUFFIXES.has(lower)) return 'particle';
    if (TURKISH_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Extract a Turkish word.
   * Uses morphological normalization to handle verb conjugations.
   */
  private extractTurkishWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    // Extract Turkish letters (including special chars)
    while (pos < input.length && (isTurkishLetter(input[pos]) || input[pos] === '_')) {
      word += input[pos++];
    }

    if (!word) return null;

    const lowerWord = word.toLowerCase();

    // Check if this is a known keyword (exact match)
    const normalized = TURKISH_KEYWORDS.get(lowerWord);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
    }

    // Check if it's a postposition
    if (POSTPOSITIONS.has(lowerWord)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // Try morphological normalization for conjugated forms
    const morphResult = this.morphNormalizer.normalize(lowerWord);

    if (morphResult.stem !== lowerWord && morphResult.confidence >= 0.7) {
      // Check if the stem is a known keyword
      const stemNormalized = TURKISH_KEYWORDS.get(morphResult.stem);

      if (stemNormalized) {
        const tokenOptions: CreateTokenOptions = {
          normalized: stemNormalized,
          stem: morphResult.stem,
          stemConfidence: morphResult.confidence,
        };

        return createToken(word, 'keyword', createPosition(startPos, pos), tokenOptions);
      }
    }

    // Not a keyword or recognized form, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Turkish time unit suffixes.
   */
  private extractTurkishNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    // Optional decimal
    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    // Skip any whitespace before time unit
    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    // Check for Turkish time units
    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('milisaniye')) {
      number += 'ms';
      pos = unitPos + 10;
    } else if (remaining.startsWith('saniye')) {
      number += 's';
      pos = unitPos + 6;
    } else if (remaining.startsWith('dakika')) {
      number += 'm';
      pos = unitPos + 6;
    } else if (remaining.startsWith('saat')) {
      number += 'h';
      pos = unitPos + 4;
    } else if (remaining.startsWith('ms')) {
      number += 'ms';
      pos = unitPos + 2;
    } else if (remaining.startsWith('s') && !isTurkishLetter(remaining[1] || '')) {
      number += 's';
      pos = unitPos + 1;
    } else if (remaining.startsWith('dk')) {
      number += 'm';
      pos = unitPos + 2;
    } else if (remaining.startsWith('sa') && !isTurkishLetter(remaining[2] || '')) {
      number += 'h';
      pos = unitPos + 2;
    }

    if (!number) return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

/**
 * Singleton instance.
 */
export const turkishTokenizer = new TurkishTokenizer();
