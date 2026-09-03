import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hyperscriptI18n, preprocess, resetTranslationWarnings } from '../src/plugin';

beforeEach(() => resetTranslationWarnings());

// Mocks the _hyperscript.org host surface this plugin actually depends on:
// addBeforeProcessHook (public), not internals.runtime.getScript — that's a
// private class field (`#getScript`) in current _hyperscript.org builds, so
// monkey-patching `internals.runtime.getScript` silently no-ops against the
// real runtime. See attribute-translator.ts for the full explanation.
// An optional `parse` makes the mock a validity-gate host too (F8); hosts
// without it exercise the gate's feature-detected no-op path.
function createMockHyperscript(parse?: (src: string) => { errors?: unknown[] }) {
  const hooks: Array<(elt: Element) => void> = [];
  return {
    config: {},
    ...(parse ? { parse } : {}),
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

/** A host parser that rejects everything — the gate must keep the original. */
const rejectAll = () => ({ errors: [{ message: 'nope' }] });

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

  it('leaves no marker attribute on the DOM — the element reads as authored', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n()(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'alternar .active');
    elt.setAttribute('data-lang', 'es');
    document.body.appendChild(elt);

    hs.process(document.body);
    expect(elt.getAttribute('_')).toBe('toggle .active');
    expect(elt.getAttributeNames().sort()).toEqual(['_', 'data-lang']);
    elt.remove();
  });

  it('stays correct after a serialize→reparse round-trip loses processed-set membership', () => {
    const hs = createMockHyperscript();
    hyperscriptI18n()(hs);

    const container = document.createElement('div');
    container.innerHTML = '<button _="alternar .active" data-lang="es"></button>';
    document.body.appendChild(container);

    hs.process(container);
    expect(container.querySelector('button')!.getAttribute('_')).toBe('toggle .active');

    // Serialize and reparse (as an hx-boost-style morph or template clone
    // would): the WeakSet no longer knows the new element. Re-processing it
    // feeds already-English text back through translation under lang="es" —
    // which must be an identity no-op, not a mangle.
    container.innerHTML = container.innerHTML;
    hs.process(container);
    expect(container.querySelector('button')!.getAttribute('_')).toBe('toggle .active');
    container.remove();
  });
});

describe('host-parser validity gate (validateWithHost)', () => {
  function addSpanish(src: string): Element {
    const elt = document.createElement('button');
    elt.setAttribute('_', src);
    elt.setAttribute('data-lang', 'es');
    document.body.appendChild(elt);
    return elt;
  }

  it('falls back to the original text when the host parser rejects the rewrite', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hs = createMockHyperscript(rejectAll);
    hyperscriptI18n()(hs);

    const elt = addSpanish('alternar .active');
    hs.process(document.body);

    // Translation happened ('toggle .active') but the host rejected it —
    // the author's text must survive untouched.
    expect(elt.getAttribute('_')).toBe('alternar .active');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('rejects');
    warnSpy.mockRestore();
    elt.remove();
  });

  it('warns once per language, not per element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hs = createMockHyperscript(rejectAll);
    hyperscriptI18n()(hs);

    const a = addSpanish('alternar .active');
    const b = addSpanish('mostrar #modal');
    hs.process(document.body);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
    a.remove();
    b.remove();
  });

  it('validateWithHost: false commits the rewrite even when the host rejects it', () => {
    const hs = createMockHyperscript(rejectAll);
    hyperscriptI18n({ validateWithHost: false })(hs);

    const elt = addSpanish('alternar .active');
    hs.process(document.body);

    expect(elt.getAttribute('_')).toBe('toggle .active');
    elt.remove();
  });

  it('accepting hosts commit the rewrite through the gate', () => {
    const parse = vi.fn(() => ({ errors: [] }));
    const hs = createMockHyperscript(parse);
    hyperscriptI18n()(hs);

    const elt = addSpanish('alternar .active');
    hs.process(document.body);

    expect(elt.getAttribute('_')).toBe('toggle .active');
    // The gate consulted the host about the RENDERED English.
    expect(parse).toHaveBeenCalledWith('toggle .active');
    elt.remove();
  });

  it('only changed translations pay the parse — passthrough never hits the gate', () => {
    const parse = vi.fn(() => ({ errors: [] }));
    const hs = createMockHyperscript(parse);
    hyperscriptI18n()(hs);

    const elt = document.createElement('button');
    elt.setAttribute('_', 'toggle .active'); // English, no data-lang
    document.body.appendChild(elt);
    hs.process(document.body);

    expect(parse).not.toHaveBeenCalled();
    elt.remove();
  });

  it('debug mode logs the rejection, still falls back, and never warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const hs = createMockHyperscript(rejectAll);
    hyperscriptI18n({ debug: true })(hs);

    const elt = addSpanish('alternar .active');
    hs.process(document.body);

    expect(elt.getAttribute('_')).toBe('alternar .active');
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.some(c => String(c[0]).includes('host rejected'))).toBe(true);
    warnSpy.mockRestore();
    logSpy.mockRestore();
    elt.remove();
  });
});

describe('unchanged-translation warnings', () => {
  // Garbled inputs at threshold 1.0 reliably produce unchanged output
  // (same technique as preprocessor.test.ts's confidence-fallback case).
  const OPTS = { confidenceThreshold: 1.0 };

  function addGarbage(lang: string, src: string): Element {
    const elt = document.createElement('button');
    elt.setAttribute('_', src);
    elt.setAttribute('data-lang', lang);
    document.body.appendChild(elt);
    return elt;
  }

  it('warns once per language, not per element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hs = createMockHyperscript();
    hyperscriptI18n(OPTS)(hs);

    const a = addGarbage('es', 'xyz abc 123');
    const b = addGarbage('es', 'qrs tuv 789');
    hs.process(document.body);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('lang="es"'));

    // A different language still gets its own (single) warning.
    const c = addGarbage('ja', 'xyz abc 123');
    hs.process(document.body);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining('lang="ja"'));

    warnSpy.mockRestore();
    a.remove();
    b.remove();
    c.remove();
  });

  it('debug mode logs per element and never warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const hs = createMockHyperscript();
    hyperscriptI18n({ ...OPTS, debug: true })(hs);

    const a = addGarbage('es', 'xyz abc 123');
    const b = addGarbage('es', 'qrs tuv 789');
    hs.process(document.body);

    expect(warnSpy).not.toHaveBeenCalled();
    const unchangedLogs = logSpy.mock.calls.filter(c => String(c[0]).includes('unchanged'));
    expect(unchangedLogs).toHaveLength(2);

    warnSpy.mockRestore();
    logSpy.mockRestore();
    a.remove();
    b.remove();
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
