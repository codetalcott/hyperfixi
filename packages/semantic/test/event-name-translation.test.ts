/**
 * Lock — event names render in the target language and round-trip (Phase 1b).
 *
 * Before this, `translate('on click …', 'en', lang)` left the event name English
 * (`… click …`) even in Japanese — functionally correct but reads wrong. The
 * renderer now localizes the event role via `localizeEventName` (renderer.ts
 * `renderPatternToken`), emitting only round-trip-safe natives and passing
 * everything else (namespaced/unknown events, non-covered languages, denylisted
 * pairs) through as English — English always round-trips.
 *
 * See MULTILINGUAL_BEHAVIORS_PLAN.md §6 "Deferred (Phase 1b)".
 */

import { describe, it, expect } from 'vitest';
import { parse, translate, tokenize, eventNameTranslations, localizeEventName } from '../src';

const EXHAUSTIVE_TIMEOUT = 30_000;

/** The normalized (English) event name from a parsed event-handler node. */
function eventOf(node: unknown): string | undefined {
  const n = node as { kind?: string; roles?: Map<string, { value?: unknown }> };
  if (!n || n.kind !== 'event-handler' || !n.roles?.get) return undefined;
  const v = n.roles.get('event');
  return v && 'value' in v ? String(v.value) : undefined;
}

/** Multiset of leaf command actions in a parsed semantic node tree. */
function leafActions(node: unknown, acc: string[] = []): string[] {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const n of node) leafActions(n, acc);
    return acc;
  }
  const n = node as {
    kind?: string;
    action?: string;
    statements?: unknown;
    body?: unknown;
    thenBody?: unknown;
    elseBody?: unknown;
  };
  switch (n.kind) {
    case 'command':
      if (n.action) acc.push(n.action);
      break;
    case 'compound':
      leafActions(n.statements, acc);
      break;
    case 'conditional':
      acc.push('if');
      leafActions(n.thenBody ?? n.body, acc);
      leafActions(n.elseBody, acc);
      break;
    case 'event-handler':
      leafActions(n.body, acc);
      break;
  }
  return acc;
}

const COVERED = ['ja', 'ko', 'ar', 'es', 'de', 'zh'] as const;

describe('event-name translation (Phase 1b)', () => {
  describe('single event name — localized and round-trips', () => {
    for (const lang of COVERED) {
      it(`${lang}: "on click add .a to me" round-trips with event=click`, () => {
        const translated = translate('on click add .a to me', 'en', lang);
        const reparsed = parse(translated, lang);
        expect(leafActions(reparsed)).toEqual(['add']);
        expect(eventOf(reparsed)).toBe('click');
      });
    }

    it('actually emits the native name (es→clic, ar→النقر)', () => {
      expect(translate('on click add .a to me', 'en', 'es')).toContain('clic');
      expect(translate('on click add .a to me', 'en', 'ar')).toContain('النقر');
      // and not the English word, for a covered language
      expect(translate('on click add .a to me', 'en', 'es')).not.toContain('click');
    });
  });

  describe('passthrough cases (stay English, no regression)', () => {
    it('de: "on load …" keeps English `load` (the native `laden` is the fetch keyword)', () => {
      const translated = translate('on load add .a to me', 'en', 'de');
      expect(translated).toContain('load');
      expect(eventOf(parse(translated, 'de'))).toBe('load');
    });

    it('namespaced htmx:load is left verbatim', () => {
      for (const lang of COVERED) {
        expect(translate('on htmx:load add .a to me', 'en', lang)).toContain('htmx:load');
      }
    });

    it('unknown/custom event is left verbatim and round-trips', () => {
      // es/de re-parse a bare unknown event cleanly.
      for (const lang of ['es', 'de'] as const) {
        const translated = translate('on customEvent add .a to me', 'en', lang);
        expect(translated).toContain('customEvent');
        expect(leafActions(parse(translated, lang))).toEqual(['add']);
      }
    });

    it('a language with no table keeps the English event name', () => {
      // ms and tl: their lexicons hold the English words themselves.
      for (const lang of ['ms', 'tl'] as const) {
        expect(localizeEventName('click', lang)).toBe('click');
      }
    });
  });

  describe('compound trigger (`click or keydown`)', () => {
    // es/de/ar parse compound event triggers; localizing each sub-name is safe.
    for (const lang of ['es', 'de', 'ar'] as const) {
      it(`${lang}: compound round-trips its body`, () => {
        const translated = translate('on click or keydown add .a to me', 'en', lang);
        expect(leafActions(parse(translated, lang))).toEqual(['add']);
      });
    }
    // ja/zh/ko cannot re-parse compound triggers (the event slot is a single
    // token in their handler patterns) — a PRE-EXISTING limitation, not a
    // regression from this change. Documented; intentionally not asserted.
  });

  // Each translate() reads its output back (fail-loud): these loops run a few
  // thousand of them, ~1s locally and ~5s on a loaded CI runner.
  describe('exhaustive reverse-map safety', () => {
    it(
      'every native this localizer emits re-parses back to the same English event',
      () => {
        const failures: string[] = [];
        for (const lang of Object.keys(eventNameTranslations)) {
          const englishEvents = new Set(Object.values(eventNameTranslations[lang]));
          for (const ev of englishEvents) {
            const native = localizeEventName(ev, lang);
            if (native === ev) continue; // passthrough (unmapped/denylisted) — English round-trips
            const translated = translate(`on ${ev} add .a to me`, 'en', lang);
            let got: string | undefined;
            try {
              got = eventOf(parse(translated, lang));
            } catch {
              got = undefined; // unparseable native (not registered by the tokenizer)
            }
            if (got !== ev) {
              failures.push(
                `${lang}: ${ev}→${native} re-parsed as ${got ?? 'NONE'} ("${translated}")`
              );
            }
          }
        }
        expect(failures, failures.join('\n')).toEqual([]);
      },
      EXHAUSTIVE_TIMEOUT
    );

    // A name of several words has to be one token. Split, its first word read
    // as the event (ar `تغيير`, vi `đổi`: change, not resize), and whatever was
    // written after the name was lost: `on keyup from #b` read back
    // `on keyup` in ar (was OPEN_ITEMS P48). The same holds for a name the
    // table reads and the renderer never writes, spaced, joined with `_` or
    // unspaced: id `lepas tombol` read `on lepas`, zh `鼠标进入` read `进入` as
    // `into` (was OPEN_ITEMS P51). One word the table resolves may stay an
    // identifier.
    it(
      'every native it reads is one token',
      () => {
        const failures: string[] = [];
        for (const [lang, table] of Object.entries(eventNameTranslations)) {
          for (const [native, ev] of Object.entries(table)) {
            const tokens = tokenize(native, lang).tokens;
            const severalWords = /[\s_]/.test(native);
            if (tokens.length !== 1 || (severalWords && tokens[0].normalized !== ev)) {
              failures.push(`${lang}: "${native}" → ${tokens.map(t => t.value).join(' | ')}`);
            }
          }
        }
        expect(failures, failures.join('\n')).toEqual([]);
      },
      EXHAUSTIVE_TIMEOUT
    );

    it(
      'every native it emits keeps a handler source written after it',
      () => {
        const failures: string[] = [];
        for (const lang of Object.keys(eventNameTranslations)) {
          for (const ev of new Set(Object.values(eventNameTranslations[lang]))) {
            if (localizeEventName(ev, lang) === ev) continue;
            for (const source of ['#b', 'window', 'elsewhere']) {
              const src = `on ${ev} from ${source} log 1`;
              const translated = translate(src, 'en', lang);
              const back = translate(translated, lang, 'en');
              if (back !== src) failures.push(`${lang}: "${translated}" → "${back}"`);
            }
          }
        }
        expect(failures, failures.join('\n')).toEqual([]);
      },
      EXHAUSTIVE_TIMEOUT
    );

    it(
      'a native of several words keeps what a command writes after it',
      () => {
        const failures: string[] = [];
        for (const lang of Object.keys(eventNameTranslations)) {
          for (const ev of new Set(Object.values(eventNameTranslations[lang]))) {
            if (!/\s/.test(localizeEventName(ev, lang))) continue;
            for (const src of [
              `on click send ${ev} to #x then log 1`,
              `on click trigger ${ev} on #x then log 1`,
              `on click wait for ${ev} from #b then log 1`,
              `on click repeat until event ${ev} from #b add .a end`,
            ]) {
              const translated = translate(src, 'en', lang);
              const back = translate(translated, lang, 'en');
              if (back !== src) failures.push(`${lang}: "${translated}" → "${back}"`);
            }
          }
        }
        expect(failures, failures.join('\n')).toEqual([]);
      },
      EXHAUSTIVE_TIMEOUT
    );

    // A hand-written name of several words, in the render's place: ar
    // `على تمرير الماوس من #b سجل 1` read `on scroll` (was OPEN_ITEMS P51).
    it(
      'a native of several words it only reads keeps what follows it',
      () => {
        const failures: string[] = [];
        for (const [lang, table] of Object.entries(eventNameTranslations)) {
          for (const [native, ev] of Object.entries(table)) {
            const rendered = localizeEventName(ev, lang);
            if (!/[\s_]/.test(native) || native === rendered) continue;
            for (const src of [
              `on ${ev} log 1`,
              `on ${ev} from #b log 1`,
              `on click wait for ${ev} from #b then log 1`,
              `on click send ${ev} to #x then log 1`,
              `on click trigger ${ev} on #x then log 1`,
              `on click repeat until event ${ev} from #b add .a end`,
            ]) {
              const handWritten = translate(src, 'en', lang).split(rendered).join(native);
              const back = translate(handWritten, lang, 'en');
              if (back !== src) failures.push(`${lang}: "${handWritten}" → "${back}"`);
            }
          }
        }
        expect(failures, failures.join('\n')).toEqual([]);
      },
      EXHAUSTIVE_TIMEOUT
    );
  });
});
