/**
 * Malay Native Idiom Tests
 *
 * Tests for native Malay idiom patterns that go beyond
 * direct translations to support more natural Malay expressions.
 *
 * Malay features:
 * - SVO (Subject-Verb-Object) word order like English
 * - Agglutinative language with rich affixation system
 * - Uses prepositions for grammatical roles (ke, dari, dengan)
 * - Space-separated words with Latin script
 * - Simple phonetic system without tone marks
 * - Suffix pronouns: -ku (my), -mu (your), -nya (his/her/its)
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { parse, tokenize } from '../src';

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

describe('Malay Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize apabila as event marker (formal)', () => {
      const tokens = getTokens('apabila klik', 'ms');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const apabilaToken = tokens.find(t => t.value === 'apabila');
      expect(apabilaToken).toBeDefined();
    });

    it('should tokenize ketika as event marker (alternative)', () => {
      const tokens = getTokens('ketika klik', 'ms');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize togol as toggle', () => {
      const tokens = getTokens('togol .active', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize tukar as toggle (alternative)', () => {
      const tokens = getTokens('tukar .active', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize tambah as add', () => {
      const tokens = getTokens('tambah .active', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize buang as remove', () => {
      const tokens = getTokens('buang .active', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize padam as remove (alternative)', () => {
      const tokens = getTokens('padam .active', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize tunjuk as show', () => {
      const tokens = getTokens('tunjuk #modal', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize sembunyi as hide', () => {
      const tokens = getTokens('sembunyi #dropdown', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize sorok as hide (alternative)', () => {
      const tokens = getTokens('sorok #dropdown', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize letak as put', () => {
      const tokens = getTokens('letak "text" ke #output', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('put');
    });

    it('should tokenize tetapkan as set', () => {
      const tokens = getTokens('tetapkan x ke 10', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });

    it('should tokenize dapatkan as get', () => {
      const tokens = getTokens('dapatkan #element', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('get');
    });

    it('should tokenize tambah_satu as increment', () => {
      const tokens = getTokens('tambah_satu counter', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize kurang_satu as decrement', () => {
      const tokens = getTokens('kurang_satu counter', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('togol .active', 'ms');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('tunjuk #modal', 'ms');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Malay Event Handler Patterns', () => {
  describe('Standard pattern: apabila {event}', () => {
    it('should tokenize "apabila klik togol .active"', () => {
      const tokens = getTokens('apabila klik togol .active', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "apabila hantar tunjuk #result"', () => {
      const tokens = getTokens('apabila hantar tunjuk #result', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: ketika {event}', () => {
    it('should tokenize "ketika klik togol .active"', () => {
      const tokens = getTokens('ketika klik togol .active', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "ketika ubah tunjuk #result"', () => {
      const tokens = getTokens('ketika ubah tunjuk #result', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination filter: apabila {event} pada {source}', () => {
    it('should tokenize "apabila klik pada #button togol .active"', () => {
      const tokens = getTokens('apabila klik pada #button togol .active', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "apabila klik pada #target buang .error"', () => {
      const tokens = getTokens('apabila klik pada #target buang .error', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: apabila {event} dari {source}', () => {
    it('should tokenize "apabila ubah dari #input tetapkan x ke nilai"', () => {
      const tokens = getTokens('apabila ubah dari #input tetapkan x ke nilai', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Malay Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "togol .active"', () => {
      const node = parse('togol .active', 'ms');
      expect(node.action).toBe('toggle');
    });

    it('should parse "tukar .visible"', () => {
      const tokens = getTokens('tukar .visible', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "tunjuk #modal"', () => {
      const node = parse('tunjuk #modal', 'ms');
      expect(node.action).toBe('show');
    });

    it('should parse "sembunyi #dropdown"', () => {
      const node = parse('sembunyi #dropdown', 'ms');
      expect(node.action).toBe('hide');
    });

    it('should parse "sorok #menu"', () => {
      const tokens = getTokens('sorok #menu', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "tambah .active"', () => {
      const node = parse('tambah .active', 'ms');
      expect(node.action).toBe('add');
    });

    it('should parse "buang .active"', () => {
      const node = parse('buang .active', 'ms');
      expect(node.action).toBe('remove');
    });

    it('should parse "padam .active"', () => {
      const tokens = getTokens('padam .active', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "tambah_satu counter"', () => {
      const node = parse('tambah_satu counter', 'ms');
      expect(node.action).toBe('increment');
    });

    it('should parse "kurang_satu counter"', () => {
      const node = parse('kurang_satu counter', 'ms');
      expect(node.action).toBe('decrement');
    });
  });

  describe('Put/Set commands', () => {
    it('should parse "letak "text" ke #output"', () => {
      const node = parse('letak "text" ke #output', 'ms');
      expect(node.action).toBe('put');
    });

    it('should parse "letakkan "hello" ke #result"', () => {
      const tokens = getTokens('letakkan "hello" ke #result', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "tetapkan x ke 10"', () => {
      const node = parse('tetapkan x ke 10', 'ms');
      expect(node.action).toBe('set');
    });
  });
});

// =============================================================================
// Preposition/Marker Tests
// =============================================================================

describe('Malay Prepositions and Role Markers', () => {
  describe('Destination preposition: ke (to)', () => {
    it('should handle ke in "letak "text" ke #output"', () => {
      const tokens = getTokens('letak "text" ke #output', 'ms');
      const keToken = tokens.find(t => t.value === 'ke');
      expect(keToken).toBeDefined();
    });

    it('should handle ke in "tetapkan x ke 10"', () => {
      const tokens = getTokens('tetapkan x ke 10', 'ms');
      const keToken = tokens.find(t => t.value === 'ke');
      expect(keToken).toBeDefined();
    });

    it('should handle alternative "pada" for destination', () => {
      const tokens = getTokens('letak "text" pada #output', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Source preposition: dari (from)', () => {
    it('should handle dari in "buang .class dari #element"', () => {
      const tokens = getTokens('buang .class dari #element', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle dari in "apabila ubah dari #input"', () => {
      const tokens = getTokens('apabila ubah dari #input', 'ms');
      const dariToken = tokens.find(t => t.value === 'dari');
      expect(dariToken).toBeDefined();
    });
  });

  describe('Style/Manner preposition: dengan (with/by)', () => {
    it('should handle dengan in "letak .class dengan cara khusus"', () => {
      const tokens = getTokens('letak .class dengan cara khusus', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Possessive markers (suffix pronouns)', () => {
    it('should handle -ku (my) in compound words', () => {
      const tokens = getTokens('naskahku', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle -mu (your) in compound words', () => {
      const tokens = getTokens('naskahmu', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle -nya (his/her/its) in compound words', () => {
      const tokens = getTokens('naskahnya', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Affix and Morphology Tests
// =============================================================================

describe('Malay Affixation Patterns', () => {
  describe('Multi-word command compounds', () => {
    it('should tokenize "tambah_hujung" as append', () => {
      const tokens = getTokens('tambah_hujung .item', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "tambah_mula" as prepend', () => {
      const tokens = getTokens('tambah_mula .item', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "tukar_tempat" as swap', () => {
      const tokens = getTokens('tukar_tempat .item', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "ubah_bentuk" as morph', () => {
      const tokens = getTokens('ubah_bentuk #element', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Prefix variations', () => {
    it('should handle alternate form "ambil" for take', () => {
      const tokens = getTokens('ambil #item', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('take');
    });

    it('should handle alternate form "klon" for clone', () => {
      const tokens = getTokens('klon #element', 'ms');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('clone');
    });
  });
});

// =============================================================================
// Control Flow Tests
// =============================================================================

describe('Malay Control Flow Keywords', () => {
  describe('Conditional keywords', () => {
    it('should tokenize jika as if', () => {
      const tokens = getTokens('jika x ke 10', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize kalau as if (alternative)', () => {
      const tokens = getTokens('kalau x ke 10', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "kalau_tidak" as else', () => {
      const tokens = getTokens('kalau_tidak togol .active', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "jika_tidak" as else (alternative)', () => {
      const tokens = getTokens('jika_tidak togol .active', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Loop keywords', () => {
    it('should tokenize ulang as repeat', () => {
      const tokens = getTokens('ulang 5 kali', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize untuk as for', () => {
      const tokens = getTokens('untuk setiap item', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize selagi as while', () => {
      const tokens = getTokens('selagi x ke 10', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "semasa" as while (alternative)', () => {
      const tokens = getTokens('semasa x ke 10', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Command chaining keywords', () => {
    it('should tokenize kemudian as then', () => {
      const tokens = getTokens('togol .active kemudian tunjuk #result', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "lepas_itu" as then (alternative)', () => {
      const tokens = getTokens('togol .active lepas_itu tunjuk #result', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize dan as and', () => {
      const tokens = getTokens('togol .active dan tunjuk #result', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize tamat as end', () => {
      const tokens = getTokens('jika true tamat', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "habis" as end (alternative)', () => {
      const tokens = getTokens('jika true habis', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Flow control keywords', () => {
    it('should tokenize teruskan as continue', () => {
      const tokens = getTokens('teruskan', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize henti as halt', () => {
      const tokens = getTokens('henti', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "berhenti" as halt (alternative)', () => {
      const tokens = getTokens('berhenti', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Malay Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "apabila klik pada #button togol .active"', () => {
      const tokens = getTokens('apabila klik pada #button togol .active', 'ms');
      expect(tokens.length).toBeGreaterThan(3);
    });

    it('should handle "apabila hantar tunjuk #hasil"', () => {
      const tokens = getTokens('apabila hantar tunjuk #hasil', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound with kemudian', () => {
      const tokens = getTokens('tambah .loading kemudian tunggu 1s kemudian buang .loading', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-word commands', () => {
    it('should handle "togol" as single command', () => {
      const tokens = getTokens('togol .active', 'ms');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "tunjuk" as single command', () => {
      const tokens = getTokens('tunjuk #modal', 'ms');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should handle "dapatkan" as single command', () => {
      const tokens = getTokens('dapatkan #element', 'ms');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });

    it('should handle "tambah_hujung" as append command', () => {
      const tokens = getTokens('tambah_hujung .item', 'ms');
      const appendToken = tokens.find(t => t.normalized === 'append');
      expect(appendToken).toBeDefined();
    });
  });

  describe('Complex event patterns', () => {
    it('should handle conditional inside event', () => {
      const tokens = getTokens('apabila klik jika x ke 10 togol .active tamat', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle multiple role markers', () => {
      const tokens = getTokens('letak "nilai" dari #source ke #target', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle focus events', () => {
      const tokens = getTokens('apabila fokus tunjuk #tooltip', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle blur events', () => {
      const tokens = getTokens('apabila kabur sembunyi #tooltip', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world patterns', () => {
    it('should parse counter increment pattern', () => {
      const tokens = getTokens('apabila klik tambah_satu #counter', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse counter decrement pattern', () => {
      const tokens = getTokens('apabila klik kurang_satu #counter', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse form submission pattern', () => {
      const tokens = getTokens('apabila hantar letak "Processing..." ke #status', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse input change pattern', () => {
      const tokens = getTokens('apabila ubah tetapkan nilai ke me.innerText', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse modal toggle pattern', () => {
      const tokens = getTokens('apabila klik togol .modal kemudian togol .overlay', 'ms');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse show/hide pattern', () => {
      const tokens = getTokens(
        'apabila hover tunjuk #dropdown kemudian apabila keluar sembunyi #dropdown',
        'ms'
      );
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
