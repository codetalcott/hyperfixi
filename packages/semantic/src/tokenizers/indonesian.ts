/**
 * Indonesian Tokenizer
 *
 * Tokenizes Indonesian hyperscript input.
 * Indonesian characteristics:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Agglutinative prefixes/suffixes (me-, ber-, di-, -kan, -i)
 * - No grammatical gender or conjugation
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
} from './base';

// =============================================================================
// Indonesian Character Classification
// =============================================================================

function isIndonesianLetter(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

function isIndonesianIdentifierChar(char: string): boolean {
  return isIndonesianLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// Indonesian Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'di', // at, in
  'ke', // to
  'dari', // from
  'pada', // on, at
  'dengan', // with
  'tanpa', // without
  'untuk', // for
  'oleh', // by
  'antara', // between
  'sebelum', // before
  'sesudah', // after
  'setelah', // after
  'selama', // during
  'sampai', // until
  'hingga', // until
  'sejak', // since
  'menuju', // towards
  'tentang', // about
  'terhadap', // towards, against
  'melalui', // through
  'dalam', // inside
  'luar', // outside
]);

// =============================================================================
// Indonesian Keywords
// =============================================================================

const INDONESIAN_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['alihkan', 'toggle'],
  ['ganti', 'toggle'],
  ['tukar', 'toggle'],
  ['tambah', 'add'],
  ['tambahkan', 'add'],
  ['hapus', 'remove'],
  ['buang', 'remove'],
  ['hilangkan', 'remove'],
  // Commands - Content operations
  ['taruh', 'put'],
  ['letakkan', 'put'],
  ['masukkan', 'put'],
  ['sisipkan', 'append'],
  ['tambahkan', 'append'],
  ['awali', 'prepend'],
  ['ambil', 'take'],
  ['buat', 'make'],
  ['bikin', 'make'],
  ['ciptakan', 'make'],
  ['klon', 'clone'],
  ['salin', 'clone'],
  ['tiru', 'clone'],
  ['ubah', 'morph'],
  ['transformasi', 'morph'],
  // Commands - Variable operations
  ['atur', 'set'],
  ['tetapkan', 'set'],
  ['dapatkan', 'get'],
  ['peroleh', 'get'],
  ['tingkatkan', 'increment'],
  ['naikkan', 'increment'],
  ['turunkan', 'decrement'],
  ['kurangi', 'decrement'],
  ['catat', 'log'],
  ['rekam', 'log'],
  ['cetak', 'log'],
  // Commands - Visibility
  ['tampilkan', 'show'],
  ['perlihatkan', 'show'],
  ['sembunyikan', 'hide'],
  ['tutup', 'hide'],
  ['transisi', 'transition'],
  ['animasikan', 'transition'],
  // Commands - Events
  ['pada', 'on'],
  ['saat', 'on'],
  ['ketika', 'on'],
  ['picu', 'trigger'],
  ['jalankan', 'trigger'],
  ['kirim', 'send'],
  ['kirimkan', 'send'],
  // Commands - DOM focus
  ['fokus', 'focus'],
  ['fokuskan', 'focus'],
  ['hilangkan fokus', 'blur'],
  ['blur', 'blur'],
  // Commands - Navigation
  ['pergi', 'go'],
  ['pindah', 'go'],
  ['navigasi', 'go'],
  // Commands - Async
  ['tunggu', 'wait'],
  ['ambil', 'fetch'],
  ['muat', 'fetch'],
  ['stabilkan', 'settle'],
  // Commands - Control flow
  ['jika', 'if'],
  ['kalau', 'if'],
  ['bila', 'if'],
  ['selainnya', 'else'],
  ['jika tidak', 'else'],
  ['ulangi', 'repeat'],
  ['untuk', 'for'],
  ['selama', 'while'],
  ['lanjutkan', 'continue'],
  ['terus', 'continue'],
  ['hentikan', 'halt'],
  ['berhenti', 'halt'],
  ['lempar', 'throw'],
  ['panggil', 'call'],
  ['kembalikan', 'return'],
  ['kembali', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['javascript', 'js'],
  ['asinkron', 'async'],
  ['katakan', 'tell'],
  ['beritahu', 'tell'],
  ['bawaan', 'default'],
  ['inisialisasi', 'init'],
  ['mulai', 'init'],
  ['perilaku', 'behavior'],
  ['pasang', 'install'],
  ['ukur', 'measure'],
  ['sampai', 'until'],
  ['peristiwa', 'event'],
  ['dari', 'from'],
  // Modifiers
  ['ke dalam', 'into'],
  ['sebelum', 'before'],
  ['sesudah', 'after'],
  ['setelah', 'after'],
  // Control flow helpers
  ['maka', 'then'],
  ['lalu', 'then'],
  ['kemudian', 'then'],
  ['akhir', 'end'],
  ['selesai', 'end'],
  ['tamat', 'end'],
  ['sampai', 'until'],
  // Events
  ['klik', 'click'],
  ['click', 'click'],
  ['masukan', 'input'],
  ['input', 'input'],
  ['perubahan', 'change'],
  ['kirim', 'submit'],
  ['tombol turun', 'keydown'],
  ['tombol naik', 'keyup'],
  ['mouse masuk', 'mouseover'],
  ['mouse keluar', 'mouseout'],
  ['fokus', 'focus'],
  ['blur', 'blur'],
  ['muat', 'load'],
  ['gulir', 'scroll'],
  // References
  ['aku', 'me'],
  ['saya', 'me'],
  ['ini', 'me'],
  ['milikku', 'my'],
  ['itu', 'it'],
  ['dia', 'it'],
  ['hasil', 'result'],
  ['peristiwa', 'event'],
  ['kejadian', 'event'],
  ['target', 'target'],
  ['sasaran', 'target'],
  // Positional
  ['pertama', 'first'],
  ['terakhir', 'last'],
  ['selanjutnya', 'next'],
  ['berikutnya', 'next'],
  ['sebelumnya', 'previous'],
  // Boolean
  ['benar', 'true'],
  ['salah', 'false'],
  // Time units
  ['detik', 's'],
  ['milidetik', 'ms'],
  ['menit', 'm'],
  ['jam', 'h'],
]);

// =============================================================================
// Indonesian Tokenizer Implementation
// =============================================================================

export class IndonesianTokenizer extends BaseTokenizer {
  readonly language = 'id';
  readonly direction = 'ltr' as const;

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.extractNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      if (isIndonesianLetter(input[pos])) {
        const wordToken = this.extractWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      const operatorToken = this.tryOperator(input, pos);
      if (operatorToken) {
        tokens.push(operatorToken);
        pos = operatorToken.position.end;
        continue;
      }

      pos++;
    }

    return new TokenStreamImpl(tokens, 'id');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    if (INDONESIAN_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isIndonesianIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = INDONESIAN_KEYWORDS.get(lower);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
    }

    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  private extractNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    if (input[pos] === '-' || input[pos] === '+') {
      number += input[pos++];
    }

    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('milidetik')) {
      number += 'ms';
      pos = unitPos + 9;
    } else if (remaining.startsWith('detik')) {
      number += 's';
      pos = unitPos + 5;
    } else if (remaining.startsWith('menit')) {
      number += 'm';
      pos = unitPos + 5;
    } else if (remaining.startsWith('jam')) {
      number += 'h';
      pos = unitPos + 3;
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }

  private tryOperator(input: string, pos: number): LanguageToken | null {
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }
}

export const indonesianTokenizer = new IndonesianTokenizer();
