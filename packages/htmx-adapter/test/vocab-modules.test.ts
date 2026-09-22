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
  // the semantic profile and core's scripts/htmx-attr-vocab.mjs between them.
  // Every name here is the PRIMARY — the form the companion teaches. Parsed from markup, not setAttribute, so the
  // HTML parser's handling of each name is part of what is pinned.
  const CONTACT_APP: Record<string, Record<string, string>> = {
    ja: {
      'hx-取得': 'hx-get',
      'hx-投稿': 'hx-post',
      'hx-削除': 'hx-delete',
      'hx-ターゲット': 'hx-target',
      'hx-置換': 'hx-swap',
      'hx-トリガー': 'hx-trigger',
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
      'hx-intercambio': 'hx-swap',
      'hx-disparador': 'hx-trigger',
      'hx-confirmar': 'hx-confirm',
      'hx-impulsar': 'hx-boost',
      'hx-empujar-url': 'hx-push-url',
      'hx-indicador': 'hx-indicator',
      'hx-incluir': 'hx-include',
    },
    pt: {
      'hx-obter': 'hx-get',
      'hx-publicar': 'hx-post',
      'hx-excluir': 'hx-delete',
      'hx-alvo': 'hx-target',
      'hx-troca': 'hx-swap',
      'hx-gatilho': 'hx-trigger',
      'hx-confirmar': 'hx-confirm',
      'hx-impulsionar': 'hx-boost',
      'hx-empurrar-url': 'hx-push-url',
      'hx-indicador': 'hx-indicator',
      'hx-incluir': 'hx-include',
    },
    ko: {
      'hx-얻다': 'hx-get',
      'hx-게시': 'hx-post',
      'hx-삭제': 'hx-delete',
      'hx-대상': 'hx-target',
      'hx-교체': 'hx-swap',
      'hx-트리거': 'hx-trigger',
      'hx-확인': 'hx-confirm',
      'hx-부스트': 'hx-boost',
      'hx-푸시-url': 'hx-push-url',
      'hx-인디케이터': 'hx-indicator',
      'hx-포함': 'hx-include',
    },
  };

  // Names that shipped before an audited primary replaced them. Pages (and
  // the book companion's checkpoints) are authored with these; they must
  // canonicalize exactly as before.
  const SHIPPED_ALIASES: Record<string, Record<string, string>> = {
    ja: { 'hx-引き金': 'hx-trigger', 'hx-交換': 'hx-swap', 'sse-交換': 'sse-swap' },
    es: { 'hx-disparar': 'hx-trigger', 'hx-intercambiar': 'hx-swap' },
    pt: { 'hx-disparar': 'hx-trigger', 'hx-trocar': 'hx-swap', 'hx-eliminar': 'hx-delete' },
    ko: { 'hx-교환': 'hx-swap', 'hx-타겟': 'hx-target' },
    tr: { 'hx-tetikle': 'hx-trigger', 'hx-takas': 'hx-swap' },
    // `hx-Ziel` was never reachable from markup (HTML lowercases attribute
    // names); it resolves now because the lowercase primary exists.
    de: { 'hx-auslösen': 'hx-trigger', 'hx-austauschen': 'hx-swap', 'hx-Ziel': 'hx-target' },
    fr: { 'hx-déclencher': 'hx-trigger', 'hx-échanger': 'hx-swap' },
    zh: { 'hx-交换': 'hx-swap' },
    hi: { 'hx-बदलें_स्थान': 'hx-swap' },
    qu: { 'hx-ñawpaqman': 'hx-target' },
  };

  for (const [lang, aliases] of Object.entries(SHIPPED_ALIASES)) {
    it(`${lang} still canonicalizes the names that shipped before`, () => {
      loadVocabModule(lang);
      for (const [name, canonical] of Object.entries(aliases)) {
        document.body.innerHTML = `<section lang="${lang}"><button ${name}="v"></button></section>`;
        canonicalizeTree(document.body);
        expect(document.querySelector('button')!.getAttribute(canonical), name).toBe('v');
      }
    });
  }

  it('ja still translates the retired event names the companion checkpoint uses', () => {
    loadVocabModule('ja');
    document.body.innerHTML = `<section lang="ja">
      <input hx-取得="/x" hx-引き金="キー解放 delay:200ms changed" />
      <input hx-取得="/x" hx-トリガー="キーアップ delay:200ms changed" />
    </section>`;
    canonicalizeTree(document.body);
    for (const input of Array.from(document.querySelectorAll('input'))) {
      expect(input.getAttribute('hx-trigger')).toBe('keyup delay:200ms changed');
    }
  });

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

  // Beyond Contact.app, the book's code listings use four more attributes
  // (inventoried across all 18 published chapters, 2026-09-22). Same
  // markup-parsed pin as CONTACT_APP: these are the PRIMARY forms.
  const BOOK_LISTINGS: Record<string, Record<string, string>> = {
    ja: {
      'hx-値': 'hx-vals',
      'hx-選択': 'hx-select',
      'hx-置換-oob': 'hx-swap-oob',
      'hx-同期': 'hx-sync',
    },
    es: {
      'hx-valores': 'hx-vals',
      'hx-selección': 'hx-select',
      'hx-intercambio-oob': 'hx-swap-oob',
      'hx-sincronización': 'hx-sync',
    },
    pt: {
      'hx-valores': 'hx-vals',
      'hx-seleção': 'hx-select',
      'hx-troca-oob': 'hx-swap-oob',
      'hx-sincronização': 'hx-sync',
    },
    ko: {
      'hx-값': 'hx-vals',
      'hx-선택': 'hx-select',
      'hx-교체-oob': 'hx-swap-oob',
      'hx-동기화': 'hx-sync',
    },
    // Second wave: the Contact.app twelve minus hx-on, plus the four — primaries only.
    tr: {
      'hx-al': 'hx-get', 'hx-gönder': 'hx-post', 'hx-sil': 'hx-delete', 'hx-hedef': 'hx-target',
      'hx-değiştirme': 'hx-swap', 'hx-tetikleyici': 'hx-trigger', 'hx-onayla': 'hx-confirm',
      'hx-hızlandır': 'hx-boost', 'hx-itele-url': 'hx-push-url', 'hx-gösterge': 'hx-indicator',
      'hx-içer': 'hx-include', 'hx-değerler': 'hx-vals', 'hx-seçim': 'hx-select',
      'hx-değiştirme-oob': 'hx-swap-oob', 'hx-eşitle': 'hx-sync',
    },
    de: {
      'hx-holen': 'hx-get', 'hx-posten': 'hx-post', 'hx-löschen': 'hx-delete', 'hx-ziel': 'hx-target',
      'hx-ersetzung': 'hx-swap', 'hx-auslöser': 'hx-trigger', 'hx-bestätigen': 'hx-confirm',
      'hx-beschleunigen': 'hx-boost', 'hx-verlauf-url': 'hx-push-url', 'hx-indikator': 'hx-indicator',
      'hx-einbeziehen': 'hx-include', 'hx-werte': 'hx-vals', 'hx-auswahl': 'hx-select',
      'hx-ersetzung-oob': 'hx-swap-oob', 'hx-synchronisieren': 'hx-sync',
    },
    fr: {
      'hx-obtenir': 'hx-get', 'hx-publier': 'hx-post', 'hx-supprimer': 'hx-delete', 'hx-cible': 'hx-target',
      'hx-remplacement': 'hx-swap', 'hx-déclencheur': 'hx-trigger', 'hx-confirmer': 'hx-confirm',
      'hx-booster': 'hx-boost', 'hx-pousser-url': 'hx-push-url', 'hx-indicateur': 'hx-indicator',
      'hx-inclure': 'hx-include', 'hx-valeurs': 'hx-vals', 'hx-sélection': 'hx-select',
      'hx-remplacement-oob': 'hx-swap-oob', 'hx-synchronisation': 'hx-sync',
    },
    zh: {
      'hx-获取': 'hx-get', 'hx-发布': 'hx-post', 'hx-删除': 'hx-delete', 'hx-目标': 'hx-target',
      'hx-替换': 'hx-swap', 'hx-触发': 'hx-trigger', 'hx-确认': 'hx-confirm',
      'hx-增强': 'hx-boost', 'hx-推送-url': 'hx-push-url', 'hx-指示器': 'hx-indicator',
      'hx-包含': 'hx-include', 'hx-值': 'hx-vals', 'hx-选择': 'hx-select',
      'hx-替换-oob': 'hx-swap-oob', 'hx-同步': 'hx-sync',
    },
  };

  for (const [lang, expected] of Object.entries(BOOK_LISTINGS)) {
    it(`${lang} vocab canonicalizes every attribute the book's listings use`, () => {
      loadVocabModule(lang);
      const names = Object.keys(expected);
      const markup = names.map((n, i) => `${n}="v${i}"`).join(' ');
      document.body.innerHTML = `<section lang="${lang}"><div ${markup}></div></section>`;
      canonicalizeTree(document.body);
      const div = document.querySelector('div')!;
      names.forEach((n, i) => {
        expect(div.getAttribute(expected[n]), `${n} → ${expected[n]}`).toBe(`v${i}`);
      });
    });
  }

  // The search box in the book (and Contact.app) fires the DOM `search`
  // event; no i18n dictionary names it, so the vocab table authors it.
  const SEARCH_TRIGGER: Record<string, [string, string]> = {
    ja: ['hx-トリガー', '検索, キーアップ delay:200ms changed'],
    es: ['hx-disparador', 'buscar, teclaarriba delay:200ms changed'],
    pt: ['hx-gatilho', 'buscar, teclaCima delay:200ms changed'],
    ko: ['hx-트리거', '검색, 키업 delay:200ms changed'],
    tr: ['hx-tetikleyici', 'arama, tuşbırakma delay:200ms changed'],
    de: ['hx-auslöser', 'suchen, tasteoben delay:200ms changed'],
    fr: ['hx-déclencheur', 'rechercher, toucherelâchée delay:200ms changed'],
    zh: ['hx-触发', '搜索, 松键 delay:200ms changed'],
  };

  for (const [lang, [attr, value]] of Object.entries(SEARCH_TRIGGER)) {
    it(`${lang} translates the \`search\` trigger head`, () => {
      loadVocabModule(lang);
      document.body.innerHTML = `<section lang="${lang}"><input ${attr}="${value}" /></section>`;
      canonicalizeTree(document.body);
      expect(document.querySelector('input')!.getAttribute('hx-trigger')).toBe(
        'search, keyup delay:200ms changed'
      );
    });
  }

  it('the en module registers an empty (identity) vocab', () => {
    loadVocabModule('en');
    expect(isLangRegistered('en')).toBe(true);
    expect(Object.keys(vocabFor('en')?.attrs ?? {})).toHaveLength(0);
  });
});
