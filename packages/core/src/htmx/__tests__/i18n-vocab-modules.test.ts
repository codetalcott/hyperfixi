/**
 * The generated vocab modules against core's embedded htmx layer: each one
 * registers with the orchestrator, and the orchestrator's canonical →
 * localized inversion (`nameOf`, `selectorFor`) answers with the authored
 * names. The modules and their generator live in `@lokascript/htmx-adapter`
 * (`packages/htmx-adapter/vocab/`, moved in Phase C3); what they emit, and
 * the drift gate, are tested there (`test/vocab-generator.test.ts`). This
 * file retires with `hyperfixi-hx.js`, the layer's last bundle.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetOrchestrator, isLangRegistered } from '../i18n-orchestrator.js';
import { getHooks, KEYS, resetHooks } from '../i18n-hooks.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const VOCAB_DIR = resolve(REPO_ROOT, 'packages/htmx-adapter/vocab');

const PRIORITY_LANGS = [
  // Original Phase 8 priority eight
  'en',
  'es',
  'fr',
  'ja',
  'zh',
  'ar',
  'ko',
  'de',
  // Tier 2 (added during Phase 8 expansion)
  'pt',
  'it',
  'ru',
  'uk',
  'pl',
  'tr',
  // Tier 3 (24-lang expansion)
  'hi',
  'bn',
  'vi',
  'id',
  'ms',
  'tl',
  'th',
  'he',
  'sw',
  'qu',
];

async function loadVocabModule(lang: string): Promise<void> {
  const path = resolve(VOCAB_DIR, `${lang}.js`);
  const source = await readFile(path, 'utf-8');
  // Each module is an IIFE — evaluating it triggers the register call.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(source)();
}

describe('generated htmx vocab modules', () => {
  beforeEach(() => {
    resetOrchestrator();
    resetHooks();
  });

  afterEach(() => {
    resetOrchestrator();
    resetHooks();
  });

  for (const lang of PRIORITY_LANGS) {
    it(`${lang}.js loads and registers via window.__hyperfixi_i18n`, async () => {
      await loadVocabModule(lang);
      expect(isLangRegistered(lang)).toBe(true);
    });
  }

  // Attribute names that are NOT hyperscript keywords come from the
  // hand-authored table in the adapter's scripts/htmx-attr-vocab.mjs.
  // Resolved through the installed hooks, not by grepping the source, so the
  // orchestrator's canonical → localized inversion is part of what is pinned.
  describe('authored attribute names (htmx-attr-vocab.mjs)', () => {
    const AUTHORED: Record<string, Record<string, string>> = {
      ja: {
        post: 'hx-投稿',
        delete: 'hx-削除',
        confirm: 'hx-確認',
        boost: 'hx-ブースト',
        'push-url': 'hx-プッシュ-url',
      },
      es: {
        post: 'hx-publicar',
        delete: 'hx-eliminar',
        confirm: 'hx-confirmar',
        boost: 'hx-impulsar',
        'push-url': 'hx-empujar-url',
      },
      pt: {
        post: 'hx-publicar',
        delete: 'hx-excluir',
        confirm: 'hx-confirmar',
        boost: 'hx-impulsionar',
        'push-url': 'hx-empurrar-url',
      },
      ko: {
        post: 'hx-게시',
        delete: 'hx-삭제',
        confirm: 'hx-확인',
        boost: 'hx-부스트',
        'push-url': 'hx-푸시-url',
      },
      tr: {
        post: 'hx-gönder',
        delete: 'hx-sil',
        confirm: 'hx-onayla',
        boost: 'hx-hızlandır',
        'push-url': 'hx-itele-url',
      },
      de: {
        post: 'hx-posten',
        delete: 'hx-löschen',
        confirm: 'hx-bestätigen',
        boost: 'hx-beschleunigen',
        'push-url': 'hx-verlauf-url',
      },
      fr: {
        post: 'hx-publier',
        delete: 'hx-supprimer',
        confirm: 'hx-confirmer',
        boost: 'hx-booster',
        'push-url': 'hx-pousser-url',
      },
      zh: {
        post: 'hx-发布',
        delete: 'hx-删除',
        confirm: 'hx-确认',
        boost: 'hx-增强',
        'push-url': 'hx-推送-url',
      },
    };

    // Where the table LEADS the profile: [primary, shipped name kept as alias].
    const LEADS: Record<string, Record<string, [string, string]>> = {
      ja: { trigger: ['hx-トリガー', 'hx-引き金'], swap: ['hx-置換', 'hx-交換'] },
      es: {
        trigger: ['hx-disparador', 'hx-disparar'],
        swap: ['hx-intercambio', 'hx-intercambiar'],
      },
      pt: { trigger: ['hx-gatilho', 'hx-disparar'], swap: ['hx-troca', 'hx-trocar'] },
      ko: { swap: ['hx-교체', 'hx-교환'] },
      tr: { trigger: ['hx-tetikleyici', 'hx-tetikle'], swap: ['hx-değiştirme', 'hx-takas'] },
      // de `target` is not listed: the profile's `Ziel` shipped capitalized,
      // and setAttribute/markup lowercase it to `hx-ziel` — the new primary.
      // The adapter suite pins that `hx-Ziel` in markup now resolves.
      de: { trigger: ['hx-auslöser', 'hx-auslösen'], swap: ['hx-ersetzung', 'hx-austauschen'] },
      fr: {
        trigger: ['hx-déclencheur', 'hx-déclencher'],
        swap: ['hx-remplacement', 'hx-échanger'],
      },
      zh: { swap: ['hx-替换', 'hx-交换'] },
    };

    for (const [lang, keys] of Object.entries(LEADS)) {
      it(`${lang} teaches the audited primary and still reads the shipped name`, async () => {
        await loadVocabModule(lang);
        const host = document.createElement('div');
        host.setAttribute('lang', lang);
        for (const [key, [primary, shipped]] of Object.entries(keys)) {
          const bare = host.appendChild(document.createElement('button'));
          expect(getHooks().nameOf(bare, 'hx', key)).toBe(primary);
          const old = host.appendChild(document.createElement('button'));
          old.setAttribute(shipped, 'x');
          expect(getHooks().nameOf(old, 'hx', key)).toBe(shipped);
        }
      });
    }

    for (const [lang, expected] of Object.entries(AUTHORED)) {
      it(`${lang} resolves each authored name per element language`, async () => {
        await loadVocabModule(lang);
        const host = document.createElement('div');
        host.setAttribute('lang', lang);
        const elt = document.createElement('button');
        host.appendChild(elt);
        for (const [key, name] of Object.entries(expected)) {
          expect(getHooks().nameOf(elt, 'hx', key)).toBe(name);
          expect(getHooks().selectorFor('hx', key)).toContain(`[${name}]`);
        }
        // Profile-derived names are untouched by the table.
        const GET: Record<string, string> = {
          ja: 'hx-取得',
          es: 'hx-obtener',
          pt: 'hx-obter',
          ko: 'hx-얻다',
          tr: 'hx-al',
          de: 'hx-holen',
          fr: 'hx-obtenir',
          zh: 'hx-获取',
        };
        expect(getHooks().nameOf(elt, 'hx', 'get')).toBe(GET[lang]);
      });
    }

    it('adapter-only keys stay out of the embedded layer KEYS', () => {
      // Core's htmx-compat layer does not implement them; listing them would
      // advertise support through the exported HTMX_ATTRS.
      for (const key of ['indicator', 'include', 'select', 'swap-oob', 'sync']) {
        expect(KEYS.hx).not.toContain(key);
      }
    });
  });
});
