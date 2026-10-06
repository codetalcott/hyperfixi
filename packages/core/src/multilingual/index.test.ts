/**
 * `@hyperfixi/core/multilingual`: parse, render and translate over
 * `@lokascript/semantic`. (The `SemanticGrammarBridge` these tests used to
 * share a file with built core's AST, and left with core's engine in 4.0.)
 */
import { describe, it, expect } from 'vitest';
import * as entry from './index';

const { parse, render, translate } = entry;

describe('@hyperfixi/core/multilingual', () => {
  it('exports exactly the three functions', () => {
    expect(Object.keys(entry).sort()).toEqual(['parse', 'render', 'translate']);
  });

  describe('parse', () => {
    it('should parse English input', async () => {
      const node = await parse('toggle .active on #button', 'en');
      expect(node).not.toBeNull();
      expect(node?.action).toBe('toggle');
    });

    it('should default to English language', async () => {
      const node = await parse('toggle .active');
      expect(node).not.toBeNull();
    });

    it('returns null for input that does not parse', async () => {
      expect(await parse('completely unparseable gibberish', 'en')).toBeNull();
    });
  });

  describe('translate', () => {
    it('should translate English to Japanese', async () => {
      const result = await translate('toggle .active', 'en', 'ja');
      expect(result).toContain('.active');
      expect(result).not.toBe('toggle .active');
    });

    it('should return same text for same language', async () => {
      const result = await translate('toggle .active', 'en', 'en');
      expect(result).toBe('toggle .active');
    });

    // semantic refuses a translation that would drop part of the script; core
    // does not swallow that as "cannot be translated" (M1 fail-loud).
    it('refuses a translation that would drop part of the script', async () => {
      await expect(translate('on click toggle .a .b', 'en', 'es')).rejects.toMatchObject({
        name: 'LossyTranslationError',
        loss: { kind: 'truncation', lost: ['.b'] },
      });
      const partial = await translate('on click toggle .a .b', 'en', 'es', { lossy: 'allow' });
      expect(partial).not.toContain('.b');
    });

    it('returns the input unchanged when it does not parse', async () => {
      expect(await translate('))) ((( ', 'en', 'es')).toBe('))) ((( ');
    });
  });

  describe('render', () => {
    it('should render node to target language', async () => {
      const node = await parse('toggle .active', 'en');
      expect(node).not.toBeNull();
      const japanese = await render(node!, 'ja');
      expect(japanese).toContain('.active');
      expect(await render(node!, 'en')).toBe('toggle .active');
    });
  });
});
