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
import { parse, translate, eventNameTranslations, localizeEventName } from '../src';

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

    it('non-covered languages keep the English event name', () => {
      for (const lang of ['hi', 'ru', 'it'] as const) {
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

  describe('exhaustive reverse-map safety', () => {
    it('every native this localizer emits re-parses back to the same English event', () => {
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
            failures.push(`${lang}: ${ev}→${native} re-parsed as ${got ?? 'NONE'} ("${translated}")`);
          }
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  });
});
