/**
 * Smoke-test the generated vocab modules. Phase 8c of
 * htmx-v4-reactive-streaming.md.
 *
 * The generator at `packages/core/scripts/gen-htmx-vocab.mjs` emits one
 * self-registering ES script per priority language. These tests confirm
 * the artifacts are valid JS, call `window.__hyperfixi_i18n.register`
 * with the expected language code, and contain at least the localized
 * forms for the keywords filled in 8c-prep.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetOrchestrator, isLangRegistered } from '../i18n-orchestrator.js';
import { getHooks, KEYS, resetHooks } from '../i18n-hooks.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const VOCAB_DIR = resolve(REPO_ROOT, 'packages/core/vocab/htmx');

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

/**
 * Per-language expected localized forms for the Phase 8 attribute keywords.
 * Updated whenever the vocab regenerates — see scripts/gen-htmx-vocab.mjs.
 * Tests below use this to assert each generated module emits the right
 * canonical-to-localized mapping. Omit a key if the language uses the
 * English form (the vocab generator dedups identity mappings).
 */
const EXPECTED_PHASE8: Record<
  string,
  { live?: string; sseConnect?: string; wsConnect?: string; wsSend?: string }
> = {
  es: {
    live: 'hx-en-vivo',
    sseConnect: 'sse-conectar',
    wsConnect: 'ws-conectar',
    wsSend: 'ws-enviar',
  },
  fr: {
    live: 'hx-en-direct',
    sseConnect: 'sse-connecter',
    wsConnect: 'ws-connecter',
    wsSend: 'ws-envoyer',
  },
  ja: { live: 'hx-ライブ', sseConnect: 'sse-接続', wsConnect: 'ws-接続', wsSend: 'ws-送る' },
  zh: { live: 'hx-实时', sseConnect: 'sse-连接', wsConnect: 'ws-连接', wsSend: 'ws-发送' },
  ar: { live: 'hx-مباشر', sseConnect: 'sse-اتصل', wsConnect: 'ws-اتصل', wsSend: 'ws-أرسل' },
  ko: { live: 'hx-실시간', sseConnect: 'sse-연결', wsConnect: 'ws-연결', wsSend: 'ws-보내다' },
  de: {
    live: 'hx-direkt',
    sseConnect: 'sse-verbinden',
    wsConnect: 'ws-verbinden',
    wsSend: 'ws-senden',
  },
  pt: {
    live: 'hx-ao-vivo',
    sseConnect: 'sse-conectar',
    wsConnect: 'ws-conectar',
    wsSend: 'ws-enviar',
  },
  it: {
    live: 'hx-in-diretta',
    sseConnect: 'sse-connettere',
    wsConnect: 'ws-connettere',
    wsSend: 'ws-inviare',
  },
  ru: {
    live: 'hx-в-прямом-эфире',
    sseConnect: 'sse-подключить',
    wsConnect: 'ws-подключить',
    wsSend: 'ws-отправить',
  },
  uk: {
    live: 'hx-наживо',
    sseConnect: 'sse-підключити',
    wsConnect: 'ws-підключити',
    wsSend: 'ws-надіслати',
  },
  pl: { live: 'hx-na-żywo', sseConnect: 'sse-połącz', wsConnect: 'ws-połącz', wsSend: 'ws-wyślij' },
  tr: { live: 'hx-canlı', sseConnect: 'sse-bağlan', wsConnect: 'ws-bağlan', wsSend: 'ws-gönder' },
  hi: { live: 'hx-लाइव', sseConnect: 'sse-कनेक्ट', wsConnect: 'ws-कनेक्ट', wsSend: 'ws-भेजें' },
  bn: { live: 'hx-লাইভ', sseConnect: 'sse-কানেক্ট', wsConnect: 'ws-কানেক্ট', wsSend: 'ws-পাঠান' },
  vi: {
    live: 'hx-trực-tiếp',
    sseConnect: 'sse-kết-nối',
    wsConnect: 'ws-kết-nối',
    wsSend: 'ws-gửi',
  },
  id: {
    live: 'hx-langsung',
    sseConnect: 'sse-sambungkan',
    wsConnect: 'ws-sambungkan',
    wsSend: 'ws-kirim',
  },
  ms: {
    live: 'hx-langsung',
    sseConnect: 'sse-sambung',
    wsConnect: 'ws-sambung',
    wsSend: 'ws-hantar',
  },
  tl: { sseConnect: 'sse-ikonekta', wsConnect: 'ws-ikonekta', wsSend: 'ws-ipadala' }, // tl uses bare `live`, `socket`
  th: { live: 'hx-ไลฟ์', sseConnect: 'sse-เชื่อมต่อ', wsConnect: 'ws-เชื่อมต่อ', wsSend: 'ws-ส่ง' },
  he: { live: 'hx-חי', sseConnect: 'sse-התחבר', wsConnect: 'ws-התחבר', wsSend: 'ws-שלח' },
  sw: {
    live: 'hx-moja-kwa-moja',
    sseConnect: 'sse-unganisha',
    wsConnect: 'ws-unganisha',
    wsSend: 'ws-tuma',
  },
  qu: {
    live: 'hx-kawsachkaq',
    sseConnect: 'sse-tinkiy',
    wsConnect: 'ws-tinkiy',
    wsSend: 'ws-kachay',
  },
};

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

  describe('Spanish localized attrs', () => {
    beforeEach(async () => {
      await loadVocabModule('es');
    });

    it('maps the Phase-8c-prep keywords to canonical English', async () => {
      const path = resolve(VOCAB_DIR, 'es.js');
      const source = await readFile(path, 'utf-8');
      // Spot-check the four 8c-prep-added keywords (connect, live, etc.)
      // and the always-present target/swap/send.
      expect(source).toContain('"hx-objetivo": "hx-target"');
      expect(source).toContain('"hx-en-vivo": "hx-live"');
      expect(source).toContain('"sse-conectar": "sse-connect"');
      expect(source).toContain('"ws-conectar": "ws-connect"');
      expect(source).toContain('"ws-enviar": "ws-send"');
    });

    it('includes the events block from the i18n dictionary', async () => {
      const path = resolve(VOCAB_DIR, 'es.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"clic": "click"');
      expect(source).toContain('"cambiar": "change"');
    });
  });

  describe('Japanese vocab', () => {
    it('maps localized SSE/WS attrs', async () => {
      const path = resolve(VOCAB_DIR, 'ja.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"sse-接続": "sse-connect"');
      expect(source).toContain('"hx-ライブ": "hx-live"');
    });
  });

  // Attribute names that are NOT hyperscript keywords come from the
  // hand-authored table in scripts/htmx-attr-vocab.mjs (the profile's words
  // for them are taken — ja 削除 / es eliminar are the `remove` command).
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
        };
        expect(getHooks().nameOf(elt, 'hx', 'get')).toBe(GET[lang]);
      });

      it(`${lang} emits the adapter-only keys (indicator, include)`, async () => {
        const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
        expect(source).toMatch(/"hx-[^"]+": "hx-indicator"/);
        expect(source).toMatch(/"hx-[^"]+": "hx-include"/);
      });
    }

    // The book's code listings (all 18 published chapters, inventoried
    // 2026-09-22) use four attributes beyond Contact.app's twelve. ja/es carry
    // them so no listing falls back to English. `hx-ext` is deliberately
    // absent: htmx 4 removed it, so a localized name would have nowhere to run.
    const BOOK: Record<string, Record<string, string>> = {
      ja: { vals: 'hx-値', select: 'hx-選択', 'swap-oob': 'hx-置換-oob', sync: 'hx-同期' },
      es: {
        vals: 'hx-valores',
        select: 'hx-selección',
        'swap-oob': 'hx-intercambio-oob',
        sync: 'hx-sincronización',
      },
      pt: {
        vals: 'hx-valores',
        select: 'hx-seleção',
        'swap-oob': 'hx-troca-oob',
        sync: 'hx-sincronização',
      },
      ko: { vals: 'hx-값', select: 'hx-선택', 'swap-oob': 'hx-교체-oob', sync: 'hx-동기화' },
    };

    for (const [lang, expected] of Object.entries(BOOK)) {
      it(`${lang} emits a primary for every attribute the book's listings use`, async () => {
        const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
        for (const [key, name] of Object.entries(expected)) {
          // First name listed for the canonical = the primary.
          const first = source.match(new RegExp(`"(hx-[^"]+)": "hx-${key}"`));
          expect(first?.[1], `${lang} hx-${key}`).toBe(name);
        }
      });
    }

    it('an adapter-only key takes no profile fallback', async () => {
      // 22 profiles carry a `select` keyword that means mark/highlight text
      // (de `markieren`, tr `vurgula`). It is not hx-select, and an emitted
      // name is permanent, so only the table may name an adapter-only key.
      for (const lang of ['de', 'tr', 'fr', 'zh']) {
        const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
        expect(source, `${lang} leaks the profile's select word`).not.toMatch(/"hx-select"/);
      }
      // Languages that DO author hx-select still get no profile alias behind it.
      const PROFILE_SELECT: Record<string, string> = {
        ja: 'hx-選ぶ',
        es: 'hx-seleccionar',
        pt: 'hx-selecionar',
        ko: 'hx-고르기',
      };
      for (const [lang, word] of Object.entries(PROFILE_SELECT)) {
        const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
        expect(source, `${lang} appends the profile's select word`).not.toContain(`"${word}"`);
      }
    });

    // Trigger heads are one token of an hx-trigger value. `search` is the one
    // DOM event the book and Contact.app fire that no i18n dictionary names,
    // so it is authored in the table's `events` block (a dictionary entry
    // would also need the semantic profile's lexicon — lexicon-parity.test).
    const AUTHORED_EVENTS: Record<string, string> = {
      ja: '検索',
      es: 'buscar',
      pt: 'buscar',
      ko: '검색',
    };

    for (const [lang, name] of Object.entries(AUTHORED_EVENTS)) {
      it(`${lang} emits the authored \`search\` trigger head`, async () => {
        const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
        expect(source).toContain(`"${name}": "search"`);
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

  // The committed modules once sat months behind the generator's inputs —
  // dictionary event words in every language, two profile words — with
  // nothing to say so, and a plain regeneration would have deleted 165
  // shipped names. This is the gate: it runs the real generator against the
  // built semantic + i18n dists and fails on any difference.
  describe('drift', () => {
    it('the committed modules are what the generator emits today', () => {
      const script = resolve(REPO_ROOT, 'packages/core/scripts/gen-htmx-vocab.mjs');
      const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf-8' });
      expect(result.status, result.stderr || result.stdout).toBe(0);
    });

    it('no language maps one localized name to two canonicals, and none is multi-word', async () => {
      for (const lang of PRIORITY_LANGS) {
        const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
        const names = [...source.matchAll(/^\s+"([^"]+)": "[^"]+",?$/gm)].map(m => m[1]);
        const [attrs, events] = [
          names.filter(n => /^(hx|sse|ws)-/.test(n)),
          names.filter(n => !/^(hx|sse|ws)-/.test(n)),
        ];
        expect(new Set(attrs).size, `${lang} attrs repeat a name`).toBe(attrs.length);
        expect(new Set(events).size, `${lang} events repeat a name`).toBe(events.length);
        // One token of an hx-trigger value / an attribute-name suffix.
        expect(
          names.filter(n => /\s/.test(n)),
          `${lang} multi-word names`
        ).toEqual([]);
      }
    });
  });

  describe('German vocab', () => {
    it('emits a localized hx-live (not the English loanword)', async () => {
      const path = resolve(VOCAB_DIR, 'de.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"hx-direkt": "hx-live"');
      expect(source).toContain('"sse-verbinden": "sse-connect"');
      expect(source).toContain('"ws-senden": "ws-send"');
    });
  });

  describe('Portuguese vocab', () => {
    it('maps the Phase 8 keywords (added after initial 8-lang rollout)', async () => {
      const path = resolve(VOCAB_DIR, 'pt.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"hx-ao-vivo": "hx-live"');
      expect(source).toContain('"sse-conectar": "sse-connect"');
      expect(source).toContain('"ws-conectar": "ws-connect"');
      expect(source).toContain('"ws-enviar": "ws-send"');
    });
  });

  // ──── Data-driven Phase 8 coverage across all priority languages ────
  //
  // For each language with an EXPECTED_PHASE8 fixture, assert the vocab
  // module emits the canonical-form mapping for whichever Phase 8 keys
  // the fixture declares. Optional fields (some langs use bare English
  // forms — e.g. Tagalog `live`) are skipped when undefined.
  describe('data-driven Phase 8 attribute coverage', () => {
    for (const [lang, expected] of Object.entries(EXPECTED_PHASE8)) {
      it(`${lang}.js contains the expected Phase 8 localized attrs`, async () => {
        const path = resolve(VOCAB_DIR, `${lang}.js`);
        const source = await readFile(path, 'utf-8');
        if (expected.live) expect(source).toContain(`"${expected.live}": "hx-live"`);
        if (expected.sseConnect)
          expect(source).toContain(`"${expected.sseConnect}": "sse-connect"`);
        if (expected.wsConnect) expect(source).toContain(`"${expected.wsConnect}": "ws-connect"`);
        if (expected.wsSend) expect(source).toContain(`"${expected.wsSend}": "ws-send"`);
      });
    }
  });

  describe('English emits an empty (but valid) registration', () => {
    it('en.js calls register but has no attrs/events to localize', async () => {
      const path = resolve(VOCAB_DIR, 'en.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain("register('en'");
      expect(source).toContain('attrs: {}');
      expect(source).toContain('events: {}');
    });
  });

  describe('orchestrator-aware load-order guard', () => {
    it('logs a warning if the orchestrator is missing', async () => {
      const path = resolve(VOCAB_DIR, 'es.js');
      const source = await readFile(path, 'utf-8');
      const w = window as unknown as { __hyperfixi_i18n?: unknown };
      const original = w.__hyperfixi_i18n;
      delete w.__hyperfixi_i18n;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function(source)();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('loaded before the htmx-compat orchestrator')
        );
      } finally {
        consoleSpy.mockRestore();
        w.__hyperfixi_i18n = original;
      }
    });
  });
});

// Inline import for vi.spyOn usage above; keeps the test file self-contained.
import { vi } from 'vitest';
