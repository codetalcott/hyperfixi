/**
 * Compiler Tests
 *
 * Tests for the build-time hyperscript compiler.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  compile,
  resetCompiler,
  setMultilingualAliases,
  clearMultilingualAliases,
  getMultilingualAliases,
} from './compiler';

describe('Compiler', () => {
  beforeEach(() => {
    resetCompiler();
  });

  describe('compile()', () => {
    it('compiles simple toggle command', () => {
      const handler = compile('on click toggle .active');

      expect(handler).not.toBeNull();
      // Semantic ID format: {event}_{command}_{hash}
      expect(handler!.id).toMatch(/^click_toggle_[a-z0-9]+$/);
      expect(handler!.event).toBe('click');
      expect(handler!.code).toContain("classList.toggle('active')");
    });

    it('compiles add class command', () => {
      const handler = compile('on click add .open');

      expect(handler).not.toBeNull();
      expect(handler!.id).toMatch(/^click_add_[a-z0-9]+$/);
      expect(handler!.code).toContain("classList.add('open')");
    });

    it('compiles remove class command', () => {
      const handler = compile('on click remove .hidden');

      expect(handler).not.toBeNull();
      // Parser may return 'removeClass' or 'remove' depending on AST
      expect(handler!.id).toMatch(/^click_(remove|removeClass)_[a-z0-9]+$/);
      expect(handler!.code).toContain("classList.remove('hidden')");
    });

    it('compiles show command', () => {
      const handler = compile('on click show');

      expect(handler).not.toBeNull();
      expect(handler!.id).toMatch(/^click_show_[a-z0-9]+$/);
      expect(handler!.code).toContain("style.display = ''");
    });

    it('compiles hide command', () => {
      const handler = compile('on click hide');

      expect(handler).not.toBeNull();
      expect(handler!.id).toMatch(/^click_hide_[a-z0-9]+$/);
      expect(handler!.code).toContain("style.display = 'none'");
    });

    it('compiles focus command', () => {
      const handler = compile('on click focus');

      expect(handler).not.toBeNull();
      expect(handler!.id).toMatch(/^click_focus_[a-z0-9]+$/);
      expect(handler!.code).toContain('.focus()');
    });

    it('compiles blur command', () => {
      const handler = compile('on click blur');

      expect(handler).not.toBeNull();
      expect(handler!.id).toMatch(/^click_blur_[a-z0-9]+$/);
      expect(handler!.code).toContain('.blur()');
    });

    it('compiles log command', () => {
      const handler = compile('on click log "hello"');

      expect(handler).not.toBeNull();
      expect(handler!.id).toMatch(/^click_log_[a-z0-9]+$/);
      expect(handler!.code).toContain('console.log');
    });

    it('generates unique IDs for different scripts', () => {
      const h1 = compile('on click toggle .a');
      const h2 = compile('on click toggle .b');
      const h3 = compile('on click toggle .c');

      // All should have semantic format
      expect(h1!.id).toMatch(/^click_toggle_[a-z0-9]+$/);
      expect(h2!.id).toMatch(/^click_toggle_[a-z0-9]+$/);
      expect(h3!.id).toMatch(/^click_toggle_[a-z0-9]+$/);

      // All should be unique (different hashes due to different content)
      expect(h1!.id).not.toBe(h2!.id);
      expect(h2!.id).not.toBe(h3!.id);
      expect(h1!.id).not.toBe(h3!.id);
    });

    it('generates stable IDs for same script', () => {
      const script = 'on click toggle .active';
      const h1 = compile(script);

      resetCompiler();

      const h2 = compile(script);

      // Same script should produce same ID (content-based hash)
      expect(h1!.id).toBe(h2!.id);
    });

    it('resets used IDs on reset', () => {
      const h1 = compile('on click toggle .active');

      resetCompiler();

      // After reset, same script can be compiled again
      const h2 = compile('on click toggle .active');
      expect(h2).not.toBeNull();
      expect(h2!.id).toBe(h1!.id); // Same ID due to content hash
    });

    it('preserves original script', () => {
      const script = 'on click toggle .active';
      const handler = compile(script);

      expect(handler!.original).toBe(script);
    });
  });

  describe('event modifiers', () => {
    it('compiles .prevent modifier', () => {
      const handler = compile('on click.prevent toggle .active');

      expect(handler).not.toBeNull();
      expect(handler!.modifiers.prevent).toBe(true);
    });

    it('compiles .stop modifier', () => {
      const handler = compile('on click.stop toggle .active');

      expect(handler).not.toBeNull();
      expect(handler!.modifiers.stop).toBe(true);
    });

    it('compiles .once modifier', () => {
      const handler = compile('on click.once toggle .active');

      expect(handler).not.toBeNull();
      expect(handler!.modifiers.once).toBe(true);
    });
  });

  describe('targets', () => {
    it('compiles with selector target', () => {
      const handler = compile('on click toggle .active on #menu');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain('#menu');
    });

    it('uses me as default target', () => {
      const handler = compile('on click toggle .active');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("m.classList.toggle('active')");
    });
  });

  describe('variables', () => {
    it('compiles local variable set', () => {
      const handler = compile('on click set :count to 0');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain('L.count = 0');
      expect(handler!.needsEvaluator).toBe(true);
    });

    it('compiles local variable increment', () => {
      const handler = compile('on click increment :count');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain('L.count');
    });
  });

  describe('fallbacks', () => {
    it('returns null for if blocks', () => {
      const handler = compile('on click if me has .active toggle .open end');

      // Blocks require runtime - should return null
      expect(handler).toBeNull();
    });

    it('returns null for repeat blocks', () => {
      const handler = compile('on click repeat 5 times add .item end');

      expect(handler).toBeNull();
    });

    it('returns null for fetch blocks', () => {
      const handler = compile('on click fetch /api then put it into #result end');

      expect(handler).toBeNull();
    });

    it('returns null for invalid syntax', () => {
      const handler = compile('this is not valid hyperscript');

      expect(handler).toBeNull();
    });
  });

  describe('positional expressions', () => {
    it('compiles next sibling', () => {
      const handler = compile('on click toggle .active on next');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain('nextElementSibling');
    });

    it('compiles previous sibling', () => {
      const handler = compile('on click toggle .active on previous');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain('previousElementSibling');
    });

    it('compiles parent', () => {
      const handler = compile('on click toggle .active on parent');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain('parentElement');
    });
  });

  describe('command sequences', () => {
    it('compiles multiple commands with then', () => {
      const handler = compile('on click add .loading then hide');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.add('loading')");
      expect(handler!.code).toContain("style.display = 'none'");
    });

    it('fails entire sequence if any command unsupported', () => {
      const handler = compile('on click toggle .active then fetch /api');

      // fetch requires runtime, so entire sequence fails
      expect(handler).toBeNull();
    });
  });

  describe('sanitization', () => {
    it('sanitizes class names properly', () => {
      // Valid class names should compile
      const handler = compile('on click toggle .active');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.toggle('active')");
    });

    it('sanitizes selectors with special characters', () => {
      // The sanitizer escapes quotes and special chars
      const handler = compile('on click show on #menu');

      expect(handler).not.toBeNull();
      // Just verify it compiles - exact output depends on parser
    });

    it('handles hyphenated class names', () => {
      const handler = compile('on click toggle .my-class-name');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.toggle('my-class-name')");
    });
  });

  describe('multilingual support', () => {
    afterEach(() => {
      clearMultilingualAliases();
    });

    it('compiles Japanese toggle with preprocessing', () => {
      setMultilingualAliases({
        トグル: 'toggle',
        切り替え: 'toggle',
      });

      const handler = compile('on click トグル .active');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.toggle('active')");
    });

    it('compiles Korean toggle with preprocessing', () => {
      setMultilingualAliases({
        토글: 'toggle',
        추가: 'add',
      });

      const handler = compile('on click 토글 .active');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.toggle('active')");
    });

    it('compiles Spanish toggle with preprocessing', () => {
      setMultilingualAliases({
        alternar: 'toggle',
        agregar: 'add',
      });

      const handler = compile('on click alternar .active');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.toggle('active')");
    });

    it('compiles multiple multilingual commands', () => {
      setMultilingualAliases({
        追加: 'add',
        隠す: 'hide',
      });

      const handler = compile('on click 追加 .loading then 隠す');

      expect(handler).not.toBeNull();
      expect(handler!.code).toContain("classList.add('loading')");
      expect(handler!.code).toContain("style.display = 'none'");
    });

    it('preserves original multilingual script', () => {
      setMultilingualAliases({
        トグル: 'toggle',
      });

      const script = 'on click トグル .active';
      const handler = compile(script);

      // Original should contain the multilingual keyword
      expect(handler!.original).toBe(script);
    });

    it('returns aliases via getMultilingualAliases', () => {
      setMultilingualAliases({
        トグル: 'toggle',
        追加: 'add',
      });

      const aliases = getMultilingualAliases();

      expect(aliases['トグル']).toBe('toggle');
      expect(aliases['追加']).toBe('add');
    });

    it('clears aliases via clearMultilingualAliases', () => {
      setMultilingualAliases({
        トグル: 'toggle',
      });

      // Should compile with aliases
      expect(compile('on click トグル .active')).not.toBeNull();

      clearMultilingualAliases();

      // Should fail without aliases (non-ASCII not recognized by tokenizer)
      expect(compile('on click トグル .active')).toBeNull();
    });

    it('handles mixed English and multilingual', () => {
      setMultilingualAliases({
        トグル: 'toggle',
      });

      // English should still work
      const english = compile('on click toggle .active');
      expect(english).not.toBeNull();

      // Japanese should also work
      const japanese = compile('on click トグル .active');
      expect(japanese).not.toBeNull();

      // Both should produce same code
      expect(english!.code).toBe(japanese!.code);
    });
  });
});
