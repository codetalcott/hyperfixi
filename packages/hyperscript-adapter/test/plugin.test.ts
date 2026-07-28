import { describe, it, expect, vi } from 'vitest';
import { hyperscriptI18n, preprocess } from '../src/plugin';

// Mocks the _hyperscript.org host surface this plugin actually depends on:
// addBeforeProcessHook (public), not internals.runtime.getScript — that's a
// private class field (`#getScript`) in current _hyperscript.org builds, so
// monkey-patching `internals.runtime.getScript` silently no-ops against the
// real runtime. See attribute-translator.ts for the full explanation.
function createMockHyperscript() {
  const hooks: Array<(elt: Element) => void> = [];
  return {
    config: {},
    addBeforeProcessHook: vi.fn((fn: (elt: Element) => void) => {
      hooks.push(fn);
    }),
    // Simulates _hyperscript.org's Runtime#processNode: runs every
    // beforeProcessHook against the given root before scanning its subtree.
    process(root: Element) {
      hooks.forEach(fn => fn(root));
    },
  };
}

describe('hyperscriptI18n plugin', () => {
  it('registers without error', () => {
    const hs = createMockHyperscript();
    const plugin = hyperscriptI18n();
    expect(() => plugin(hs)).not.toThrow();
    expect(hs.addBeforeProcessHook).toHaveBeenCalled();
  });

  it('passes through English (no data-lang)', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n()(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'toggle .active');
    document.body.appendChild(elt);

    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');
    elt.remove();
  });

  it('translates non-English with data-lang', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n()(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'alternar .active');
    elt.setAttribute('data-lang', 'es');
    document.body.appendChild(elt);

    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');
    elt.remove();
  });

  it('uses defaultLanguage when no data-lang', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n({ defaultLanguage: 'es' })(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'alternar .active');
    document.body.appendChild(elt);

    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');
    elt.remove();
  });

  it('leaves elements without a script attribute untouched', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n()(hs);

    const elt = document.createElement('div');
    document.body.appendChild(elt);

    expect(() => hs.process(document.body)).not.toThrow();
    elt.remove();
  });

  it('respects custom languageAttribute', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n({ languageAttribute: 'data-hs-lang' })(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'alternar .active');
    elt.setAttribute('data-hs-lang', 'es');
    document.body.appendChild(elt);

    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');
    elt.remove();
  });

  it('logs when debug is enabled', () => {
    const hs = createMockHyperscript();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    hyperscriptI18n({ debug: true })(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'alternar .active');
    elt.setAttribute('data-lang', 'es');
    document.body.appendChild(elt);

    hs.process(document.body);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[hyperscript-i18n]'));
    consoleSpy.mockRestore();
    elt.remove();
  });

  it('does not re-translate an element it already translated', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n()(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'alternar .active');
    elt.setAttribute('data-lang', 'es');
    document.body.appendChild(elt);

    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');

    // A later processNode over the same subtree (e.g. an unrelated sibling
    // swap re-scanning a shared ancestor) must not re-translate already-
    // English text as if it were still Spanish.
    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');
    elt.remove();
  });
});

describe('preprocess (standalone)', () => {
  it('translates Spanish to English', () => {
    expect(preprocess('alternar .active', 'es')).toBe('toggle .active');
  });

  it('passes through English', () => {
    const result = preprocess('toggle .active', 'en');
    expect(result).toBe('toggle .active');
  });

  it('handles Japanese', () => {
    expect(preprocess('.active を 切り替え', 'ja')).toBe('toggle .active');
  });
});
