/**
 * A translation that would lose part of the script is refused at run time too
 * (M1 fail-loud, owner decision F2): the plugin keeps the author's text, which
 * the host then reports as a parse error naming code the author wrote, and
 * warns once per language with what the translation would drop. Before, the
 * partial English ran as though it were the whole: `alternar .foo .bar`
 * toggled `.foo` only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hyperscriptI18n, preprocess, resetTranslationWarnings } from '../src/plugin';
import { preprocessToEnglish as slimPreprocess } from '../src/slim-preprocessor';
import { preprocessToEnglish as fullPreprocess } from '../src/preprocessor';
import { lossyRefusalOf, warnLossyOnce, type LossyRefusal } from '../src/host-validate';

beforeEach(() => resetTranslationWarnings());

const LOSSY = 'al clic alternar .foo .bar'; // es: the parse reads `toggle .foo` only

describe.each([
  ['full', fullPreprocess],
  ['slim', slimPreprocess],
] as const)('the %s preprocessor', (_path, preprocessToEnglish) => {
  it('returns the original text and reports what it would lose', () => {
    let refusal: LossyRefusal | undefined;
    const out = preprocessToEnglish(LOSSY, 'es', { onLossy: r => void (refusal = r) });
    expect(out).toBe(LOSSY);
    expect(refusal?.lost).toEqual(['.bar']);
    expect(refusal?.partial).toBe('on click toggle .foo');
  });

  it('translates a whole script as before', () => {
    let refusal: LossyRefusal | undefined;
    const out = preprocessToEnglish('al clic alternar .activo', 'es', {
      onLossy: r => void (refusal = r),
    });
    expect(out).toBe('on click toggle .activo');
    expect(refusal).toBeUndefined();
  });
});

describe('the plugin', () => {
  function host() {
    const hooks: Array<(elt: Element) => void> = [];
    return {
      config: {},
      parse: () => ({ errors: [] }),
      addBeforeProcessHook: (fn: (elt: Element) => void) => void hooks.push(fn),
      process: (root: Element) => hooks.forEach(fn => fn(root)),
    };
  }

  it("keeps the author's text and warns once per language", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hs = host();
    hyperscriptI18n()(hs);
    const a = document.createElement('button');
    const b = document.createElement('button');
    for (const elt of [a, b]) {
      elt.setAttribute('_', LOSSY);
      elt.setAttribute('lang', 'es');
      document.body.appendChild(elt);
    }
    hs.process(document.body);

    expect(a.getAttribute('_')).toBe(LOSSY);
    expect(b.getAttribute('_')).toBe(LOSSY);
    const lossy = warn.mock.calls.filter(([m]) => String(m).includes('would lose'));
    expect(lossy).toHaveLength(1);
    expect(String(lossy[0]?.[0])).toContain('.bar');
    warn.mockRestore();
    a.remove();
    b.remove();
  });

  it('preprocess() for programmatic use returns the original text', () => {
    expect(preprocess(LOSSY, 'es')).toBe(LOSSY);
  });
});

describe('lossyRefusalOf / warnLossyOnce', () => {
  it("reads semantic's error by name, and nothing else", () => {
    const error = Object.assign(new Error('x'), {
      name: 'LossyTranslationError',
      partial: 'toggle .a',
      loss: { kind: 'truncation', lost: ['.b'] },
    });
    expect(lossyRefusalOf(error)).toEqual({ partial: 'toggle .a', lost: ['.b'] });
    expect(lossyRefusalOf(new Error('x'))).toBeUndefined();
    expect(lossyRefusalOf('nope')).toBeUndefined();
  });

  it('warns once per language', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnLossyOnce('es', 'a', { partial: '', lost: ['.x'] });
    warnLossyOnce('es', 'b', { partial: '', lost: ['.y'] });
    warnLossyOnce('ja', 'c', { partial: '', lost: ['.z'] });
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
