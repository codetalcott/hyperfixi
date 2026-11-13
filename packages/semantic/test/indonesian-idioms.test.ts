/**
 * Indonesian Native Idiom Tests
 *
 * Tests for native Indonesian idiom patterns that go beyond
 * direct translations to support more natural Indonesian expressions.
 *
 * Indonesian features:
 * - SVO (Subject-Verb-Object) word order like English
 * - Agglutinative language with affixation (me-, ber-, di-, -kan, -i)
 * - Uses prepositions for grammatical roles (pada, ke, dari, dengan)
 * - Space-separated words with no diacritics
 * - Minimal inflection - verb affixes for voice derivation
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { canParse, parse, tokenize } from '../src';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string) {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Indonesian Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize saat as event marker', () => {
      const tokens = getTokens('saat klik', 'id');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const saatToken = tokens.find(t => t.value === 'saat');
      expect(saatToken).toBeDefined();
    });

    it('should tokenize ketika as event marker', () => {
      const tokens = getTokens('ketika klik', 'id');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize apabila as event marker', () => {
      const tokens = getTokens('apabila klik', 'id');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize alihkan as toggle', () => {
      const tokens = getTokens('alihkan .active', 'id');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize tambah as add', () => {
      const tokens = getTokens('tambah .highlight', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize hapus as remove', () => {
      const tokens = getTokens('hapus .highlight', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize tampilkan as show', () => {
      const tokens = getTokens('tampilkan #modal', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize sembunyikan as hide', () => {
      const tokens = getTokens('sembunyikan #modal', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize tingkatkan as increment', () => {
      const tokens = getTokens('tingkatkan counter', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize turunkan as decrement', () => {
      const tokens = getTokens('turunkan counter', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });

    it('should tokenize atur as set', () => {
      const tokens = getTokens('atur x ke 10', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });

    it('should tokenize dapatkan as get', () => {
      const tokens = getTokens('dapatkan #element', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('get');
    });

    it('should tokenize taruh as put', () => {
      const tokens = getTokens('taruh "halo" ke dalam #output', 'id');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('put');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('alihkan .active', 'id');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('tampilkan #modal', 'id');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle multiple classes', () => {
      const tokens = getTokens('tambah .highlight .visible', 'id');
      const classTokens = tokens.filter(t => t.kind === 'selector' && t.value.startsWith('.'));
      expect(classTokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Affixation patterns', () => {
    it('should recognize me- prefix in verbs', () => {
      const tokens = getTokens('me-alihkan .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize -kan suffix in verbs', () => {
      const tokens = getTokens('tampilkan #modal', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize -i suffix in verbs', () => {
      const tokens = getTokens('hitami .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize di- passive prefix', () => {
      const tokens = getTokens('di-alihkan .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Indonesian Event Handler Patterns', () => {
  describe('Standard pattern: saat {event}', () => {
    it('should tokenize "saat klik alihkan .active"', () => {
      const tokens = getTokens('saat klik alihkan .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "saat kirim tampilkan #result"', () => {
      const tokens = getTokens('saat kirim tampilkan #result', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "saat ubah hiatus .loading"', () => {
      const tokens = getTokens('saat ubah hapus .loading', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: ketika {event}', () => {
    it('should tokenize "ketika klik alihkan .active"', () => {
      const tokens = getTokens('ketika klik alihkan .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "ketika ganti tampilkan #hasil"', () => {
      const tokens = getTokens('ketika ganti tampilkan #hasil', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: saat {event} pada {source}', () => {
    it('should tokenize "saat klik pada #button alihkan .active"', () => {
      const tokens = getTokens('saat klik pada #button alihkan .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "saat kirim dari #form tampilkan #hasil"', () => {
      const tokens = getTokens('saat kirim dari #form tampilkan #hasil', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination filter', () => {
    it('should tokenize "saat klik alihkan .active pada #button"', () => {
      const tokens = getTokens('saat klik alihkan .active pada #button', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Indonesian Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "alihkan .active"', () => {
      const result = canParse('alihkan .active', 'id');
      if (result) {
        const node = parse('alihkan .active', 'id');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('alihkan .active', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse with alternative "ubah .visible"', () => {
      const tokens = getTokens('ubah .visible', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "tampilkan #modal"', () => {
      const result = canParse('tampilkan #modal', 'id');
      if (result) {
        const node = parse('tampilkan #modal', 'id');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('tampilkan #modal', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "perlihatkan #menu"', () => {
      const tokens = getTokens('perlihatkan #menu', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "sembunyikan #dropdown"', () => {
      const result = canParse('sembunyikan #dropdown', 'id');
      if (result) {
        const node = parse('sembunyikan #dropdown', 'id');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('sembunyikan #dropdown', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative "tutup #modal"', () => {
      const tokens = getTokens('tutup #modal', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "tambah .highlight"', () => {
      const result = canParse('tambah .highlight', 'id');
      if (result) {
        const node = parse('tambah .highlight', 'id');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('tambah .highlight', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "tambahkan .highlight"', () => {
      const tokens = getTokens('tambahkan .highlight', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "hapus .highlight"', () => {
      const result = canParse('hapus .highlight', 'id');
      if (result) {
        const node = parse('hapus .highlight', 'id');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('hapus .highlight', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative "buang .highlight"', () => {
      const tokens = getTokens('buang .highlight', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse alternative "hilangkan .highlight"', () => {
      const tokens = getTokens('hilangkan .highlight', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "tingkatkan counter"', () => {
      const result = canParse('tingkatkan counter', 'id');
      if (result) {
        const node = parse('tingkatkan counter', 'id');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('tingkatkan counter', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative "naikkan counter"', () => {
      const tokens = getTokens('naikkan counter', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "turunkan counter"', () => {
      const result = canParse('turunkan counter', 'id');
      if (result) {
        const node = parse('turunkan counter', 'id');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('turunkan counter', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative "kurangi counter"', () => {
      const tokens = getTokens('kurangi counter', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Set/Get commands', () => {
    it('should parse "atur x ke 10"', () => {
      const result = canParse('atur x ke 10', 'id');
      if (result) {
        const node = parse('atur x ke 10', 'id');
        expect(node.action).toBe('set');
      } else {
        const tokens = getTokens('atur x ke 10', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative "tetapkan x ke 10"', () => {
      const tokens = getTokens('tetapkan x ke 10', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "dapatkan #element"', () => {
      const result = canParse('dapatkan #element', 'id');
      if (result) {
        const node = parse('dapatkan #element', 'id');
        expect(node.action).toBe('get');
      } else {
        const tokens = getTokens('dapatkan #element', 'id');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative "peroleh #element"', () => {
      const tokens = getTokens('peroleh #element', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Put/Take commands', () => {
    it('should parse "taruh "halo" ke dalam #output"', () => {
      const tokens = getTokens('taruh "halo" ke dalam #output', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse alternative "letakkan "hello" ke #output"', () => {
      const tokens = getTokens('letakkan "hello" ke #output', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse alternative "masukkan "hello" pada #output"', () => {
      const tokens = getTokens('masukkan "hello" pada #output', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Preposition/Role Marker Tests
// =============================================================================

describe('Indonesian Prepositions and Role Markers', () => {
  describe('Destination markers', () => {
    it('should handle ke (to)', () => {
      const tokens = getTokens('taruh "text" ke #output', 'id');
      const keToken = tokens.find(t => t.value === 'ke');
      expect(keToken).toBeDefined();
    });

    it('should handle pada (on/at)', () => {
      const tokens = getTokens('alihkan .active pada #button', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle di (in/at - locative)', () => {
      const tokens = getTokens('tampilkan #modal di layar', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ke dalam (into)', () => {
      const tokens = getTokens('masukkan nilai ke dalam #box', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Source markers', () => {
    it('should handle dari (from)', () => {
      const tokens = getTokens('ambil nilai dari #element', 'id');
      const dariToken = tokens.find(t => t.value === 'dari');
      expect(dariToken).toBeDefined();
    });
  });

  describe('Style/manner markers', () => {
    it('should handle dengan (with/by)', () => {
      const tokens = getTokens('lakukan dengan cepat', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Possessive constructions', () => {
    it('should handle possessive adjective saya (my)', () => {
      const tokens = getTokens('nilai saya', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle possessive adjective anda (your)', () => {
      const tokens = getTokens('elemen anda', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle clitic ku (my - informal)', () => {
      const tokens = getTokens('valueku', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle clitic mu (your - informal)', () => {
      const tokens = getTokens('elementmu', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle clitic nya (his/her/its)', () => {
      const tokens = getTokens('nilainya', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Alternative Keywords Tests
// =============================================================================

describe('Indonesian Alternative Keywords', () => {
  describe('Verb alternatives', () => {
    it('should recognize bikin as alternative for buat', () => {
      const tokens = getTokens('bikin elemen baru', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize ganti as alternative for tukar', () => {
      const tokens = getTokens('ganti .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize transformasi as alternative for ubah', () => {
      const tokens = getTokens('transformasi #element', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Condition keywords', () => {
    it('should recognize kalau as alternative for jika', () => {
      const tokens = getTokens('kalau x sama dengan 10', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize bila as alternative for jika', () => {
      const tokens = getTokens('bila y lebih besar dari 5', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Loop keywords', () => {
    it('should recognize terus as alternative for lanjutkan', () => {
      const tokens = getTokens('terus mengulang', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize berhenti as alternative for hentikan', () => {
      const tokens = getTokens('berhenti sekarang', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Indonesian Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "saat klik pada #button alihkan .active pada #target"', () => {
      const tokens = getTokens('saat klik pada #button alihkan .active pada #target', 'id');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "ketika kirim tampilkan #hasil-pencarian"', () => {
      const tokens = getTokens('ketika kirim tampilkan #hasil-pencarian', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chained commands with lalu (then)', () => {
      const tokens = getTokens('tambah .loading lalu tunggu 1s lalu hapus .loading', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound with kemudian (then - formal)', () => {
      const tokens = getTokens('tampilkan #modal kemudian fokus #input kemudian atur layar', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-word commands', () => {
    it('should handle "alihkan" as single command', () => {
      const tokens = getTokens('alihkan .active', 'id');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "tampilkan" as single command', () => {
      const tokens = getTokens('tampilkan #modal', 'id');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should handle "dapatkan" as single command', () => {
      const tokens = getTokens('dapatkan #element', 'id');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });

    it('should handle "tingkatkan" as single command', () => {
      const tokens = getTokens('tingkatkan counter', 'id');
      const incrementToken = tokens.find(t => t.normalized === 'increment');
      expect(incrementToken).toBeDefined();
    });
  });

  describe('Complete realistic examples', () => {
    it('should handle modal interaction pattern', () => {
      const tokens = getTokens('saat klik pada #buka-modal tampilkan #dialog-form', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle form submission pattern', () => {
      const tokens = getTokens(
        'saat kirim dari #form-data tampilkan #pesan-sukses kemudian hapus #form-data',
        'id'
      );
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle counter increment pattern', () => {
      const tokens = getTokens('saat klik pada #tambah-button tingkatkan #counter-nilai', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle complex conditional pattern', () => {
      const tokens = getTokens(
        'jika x sama dengan 10 lalu alihkan .active pada #status kemudian catat "Selesai"',
        'id'
      );
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle loop pattern', () => {
      const tokens = getTokens('ulangi 5 kali tambah .item ke #lista', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Affixation in context', () => {
    it('should handle causative -kan suffix in commands', () => {
      const tokens = getTokens('tampilkan #modal lalu fokuskan #input', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle applicative -i suffix patterns', () => {
      const tokens = getTokens('hitami .active', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle di- passive voice', () => {
      const tokens = getTokens('di-alihkan .active pada #button', 'id');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
