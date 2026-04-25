/**
 * Language Detector Tests (Phase 5.1)
 *
 * Tests for Nearley-based language detection from semantic profiles.
 */

import { describe, it, expect } from 'vitest';
import { detectLanguage, needsLanguageDetection } from '../src/parser/language-detector';
import { parseAutoDetect } from '../src/parser/semantic-parser';

// Set up the pattern generator (required for non-English languages)
import '../src/patterns/index';

// Register languages for test
import '../src/languages/en';
import '../src/languages/es';
import '../src/languages/ja';
import '../src/languages/ko';
import '../src/languages/ar';
import '../src/languages/fr';
import '../src/languages/de';
import '../src/languages/zh';
import '../src/languages/tr';
import '../src/languages/pt';

describe('detectLanguage', () => {
  describe('script detection (non-Latin)', () => {
    it('detects Japanese from hiragana/katakana', () => {
      const result = detectLanguage('トグル .active');
      expect(result.language).toBe('ja');
      expect(result.method).toBe('script');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('detects Korean from hangul', () => {
      const result = detectLanguage('토글 .active');
      expect(result.language).toBe('ko');
      expect(result.method).toBe('script');
    });

    it('detects Arabic from Arabic script', () => {
      const result = detectLanguage('بدّل .active');
      expect(result.language).toBe('ar');
      expect(result.method).toBe('script');
    });

    it('detects Chinese from CJK without kana', () => {
      const result = detectLanguage('切换 .active');
      expect(result.language).toBe('zh');
      expect(result.method).toBe('script');
    });

    it('distinguishes Japanese CJK+kana from pure CJK', () => {
      // Japanese uses mixed CJK + hiragana
      const ja = detectLanguage('切り替え .active');
      expect(ja.language).toBe('ja');

      // Chinese uses only CJK
      const zh = detectLanguage('添加 .active');
      expect(zh.language).toBe('zh');
    });
  });

  describe('keyword detection (Latin script)', () => {
    it('detects Spanish from unique keywords', () => {
      const result = detectLanguage('alternar .active');
      expect(result.language).toBe('es');
    });

    it('detects French from unique keywords', () => {
      const result = detectLanguage('basculer .active');
      expect(result.language).toBe('fr');
    });

    it('detects German from unique keywords', () => {
      const result = detectLanguage('umschalten .active');
      expect(result.language).toBe('de');
    });

    it('detects Turkish from unique keywords', () => {
      const result = detectLanguage('değiştir .active');
      expect(result.language).toBe('tr');
    });

    it('defaults to English for English keywords', () => {
      const result = detectLanguage('toggle .active');
      expect(result.language).toBe('en');
    });

    it('returns alternatives for ambiguous inputs', () => {
      // "toggle" is an English keyword
      const result = detectLanguage('toggle .active on #button');
      expect(result.language).toBe('en');
    });
  });

  describe('registered languages filtering', () => {
    it('limits detection to registered languages', () => {
      const registered = new Set(['en', 'es']);
      const result = detectLanguage('alternar .active', registered);
      expect(result.language).toBe('es');
    });

    it('falls back to English when non-Latin script language not registered', () => {
      const registered = new Set(['en', 'es']);
      // Japanese script, but ja not registered — falls through to keyword scoring
      const result = detectLanguage('トグル .active', registered);
      // Should not detect as 'ja' since it's not registered
      expect(['en', 'es']).toContain(result.language);
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = detectLanguage('');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('handles CSS selectors only', () => {
      const result = detectLanguage('.active #button');
      expect(result.language).toBe('en');
    });
  });
});

describe('needsLanguageDetection', () => {
  it('returns true for non-ASCII input', () => {
    expect(needsLanguageDetection('トグル .active')).toBe(true);
    expect(needsLanguageDetection('değiştir .active')).toBe(true); // Turkish, non-ASCII ğ/ş
  });

  it('returns true for non-English keywords (Latin script)', () => {
    expect(needsLanguageDetection('alternar .active')).toBe(true);
    expect(needsLanguageDetection('basculer .active')).toBe(true); // French keyword
  });

  it('returns false for explicit syntax', () => {
    expect(needsLanguageDetection('[toggle patient:.active]')).toBe(false);
  });

  it('returns false for English-only input', () => {
    expect(needsLanguageDetection('toggle .active')).toBe(false);
  });
});

describe('parseAutoDetect', () => {
  it('parses Japanese with auto-detection', () => {
    // Japanese is SOV: patient を verb
    const result = parseAutoDetect('.active を 切り替え');
    expect(result.language).toBe('ja');
    expect(result.node.action).toBe('toggle');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('parses Spanish with auto-detection', () => {
    const result = parseAutoDetect('alternar .active');
    expect(result.language).toBe('es');
    expect(result.node.action).toBe('toggle');
  });

  it('parses English with auto-detection', () => {
    const result = parseAutoDetect('toggle .active');
    expect(result.language).toBe('en');
    expect(result.node.action).toBe('toggle');
  });

  it('parses Korean with auto-detection', () => {
    // Korean is SOV: patient 를 verb
    const result = parseAutoDetect('.active 를 토글하다');
    expect(result.language).toBe('ko');
    expect(result.node.action).toBe('toggle');
  });

  it('parses Arabic with auto-detection', () => {
    const result = parseAutoDetect('بدّل .active');
    expect(result.language).toBe('ar');
    expect(result.node.action).toBe('toggle');
  });

  it('limits detection to registered languages', () => {
    const registered = new Set(['en', 'es']);
    const result = parseAutoDetect('alternar .active', registered);
    expect(result.language).toBe('es');
    expect(result.node.action).toBe('toggle');
  });
});
