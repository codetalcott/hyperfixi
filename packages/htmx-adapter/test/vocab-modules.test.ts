/**
 * Reuse guard: the generated vocab modules under
 * `packages/core/vocab/htmx/{lang}.js` must load and register cleanly
 * against THIS adapter's registry, because the adapter's whole data story
 * is "one generated artifact, two consumers" (embedded htmx-compat layer
 * + upstream-htmx adapter). If core's generator output shape drifts,
 * this suite fails here rather than silently in a browser.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register, resetRegistry, isLangRegistered, vocabFor } from '../src/registry.js';
import { canonicalizeTree } from '../src/canonicalize.js';

const VOCAB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/vocab/htmx');
const WINDOW_KEY = '__hyperfixi_i18n';

function loadVocabModule(lang: string): void {
  const source = readFileSync(resolve(VOCAB_DIR, `${lang}.js`), 'utf8');
  // The modules are classic IIFEs targeting window — evaluate in this
  // jsdom context. indirect eval keeps them in global scope.
  (0, eval)(source);
}

beforeEach(() => {
  resetRegistry();
  document.body.innerHTML = '';
  (window as unknown as Record<string, unknown>)[WINDOW_KEY] = { register };
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)[WINDOW_KEY];
});

describe('generated vocab modules (packages/core/vocab/htmx)', () => {
  it('every emitted module self-registers against the adapter registry', () => {
    const langs = readdirSync(VOCAB_DIR)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace(/\.js$/, ''));
    expect(langs.length).toBeGreaterThanOrEqual(20);
    for (const lang of langs) {
      loadVocabModule(lang);
      expect(isLangRegistered(lang), `vocab module ${lang}.js failed to register`).toBe(true);
    }
  });

  it('es vocab drives real canonicalization end to end', () => {
    loadVocabModule('es');
    const attrs = vocabFor('es')?.attrs ?? {};
    expect(attrs['hx-obtener']).toBe('hx-get');

    document.body.innerHTML = `<section lang="es">
      <button hx-obtener="/api/usuarios" hx-objetivo="#out" hx-disparar="clic"></button>
    </section>`;
    canonicalizeTree(document.body);
    const btn = document.querySelector('button')!;
    expect(btn.getAttribute('hx-get')).toBe('/api/usuarios');
    expect(btn.getAttribute('hx-target')).toBe('#out');
    expect(btn.getAttribute('hx-trigger')).toBe('click');
    // Authored attributes stay verbatim.
    expect(btn.getAttribute('hx-obtener')).toBe('/api/usuarios');
  });

  it('ja vocab canonicalizes CJK attribute names', () => {
    loadVocabModule('ja');
    const attrs = vocabFor('ja')?.attrs ?? {};
    const localizedGet = Object.keys(attrs).find(k => attrs[k] === 'hx-get');
    expect(localizedGet, 'ja vocab has no hx-get mapping').toBeTruthy();

    document.body.innerHTML = `<section lang="ja"><button></button></section>`;
    const btn = document.querySelector('button')!;
    btn.setAttribute(localizedGet!, '/api');
    canonicalizeTree(document.body);
    expect(btn.getAttribute('hx-get')).toBe('/api');
  });

  // The book's Contact.app (Hypermedia Systems, ch10) uses exactly these 12
  // hx- attributes. ja/es must localize all of them — the five that come from
  // the semantic profile plus the seven authored in core's
  // scripts/htmx-attr-vocab.mjs. Parsed from markup, not setAttribute, so the
  // HTML parser's handling of each name is part of what is pinned.
  const CONTACT_APP: Record<string, Record<string, string>> = {
    ja: {
      'hx-取得': 'hx-get',
      'hx-投稿': 'hx-post',
      'hx-削除': 'hx-delete',
      'hx-ターゲット': 'hx-target',
      'hx-交換': 'hx-swap',
      'hx-引き金': 'hx-trigger',
      'hx-確認': 'hx-confirm',
      'hx-ブースト': 'hx-boost',
      'hx-プッシュ-url': 'hx-push-url',
      'hx-インジケーター': 'hx-indicator',
      'hx-含める': 'hx-include',
    },
    es: {
      'hx-obtener': 'hx-get',
      'hx-publicar': 'hx-post',
      'hx-eliminar': 'hx-delete',
      'hx-objetivo': 'hx-target',
      'hx-intercambiar': 'hx-swap',
      'hx-disparar': 'hx-trigger',
      'hx-confirmar': 'hx-confirm',
      'hx-impulsar': 'hx-boost',
      'hx-empujar-url': 'hx-push-url',
      'hx-indicador': 'hx-indicator',
      'hx-incluir': 'hx-include',
    },
  };

  for (const [lang, expected] of Object.entries(CONTACT_APP)) {
    it(`${lang} vocab canonicalizes every Contact.app attribute from parsed markup`, () => {
      loadVocabModule(lang);
      const names = Object.keys(expected);
      const markup = names.map((n, i) => `${n}="v${i}"`).join(' ');
      document.body.innerHTML = `<section lang="${lang}"><button ${markup}></button></section>`;
      canonicalizeTree(document.body);
      const btn = document.querySelector('button')!;
      names.forEach((n, i) => {
        expect(btn.getAttribute(expected[n]), `${n} → ${expected[n]}`).toBe(`v${i}`);
        expect(btn.getAttribute(n), `${n} stays authored`).toBe(`v${i}`);
      });
    });

    it(`${lang} vocab localizes the hx-on: family Contact.app uses`, () => {
      loadVocabModule(lang);
      const attrs = vocabFor(lang)?.attrs ?? {};
      expect(Object.values(attrs)).toContain('hx-on');
    });
  }

  it('the en module registers an empty (identity) vocab', () => {
    loadVocabModule('en');
    expect(isLangRegistered('en')).toBe(true);
    expect(Object.keys(vocabFor('en')?.attrs ?? {})).toHaveLength(0);
  });
});
