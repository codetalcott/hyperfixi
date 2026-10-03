/**
 * A handler whose `from` source is a parenthesized expression keeps it in every language.
 *
 * `on click from (triggerEl or me) remove me` is how a behavior defaults a `from` target
 * (`from` is resolved at install, before `init`, so the default has to be inline; the bare
 * `from triggerEl or me` reads the `or me` as something else on both engines). The
 * @hyperfixi/behaviors sources Removable and Draggable carry it, and both are corpus rows.
 *
 * It parsed in 21 languages and not in th or zh (2026-10-03): their handler heads come
 * from handcrafted patterns, and the one with a source slot either sat below the plain head
 * (th, 95 < 100: the plain head matched and left `จาก (…)` unconsumed in the body) or did not
 * exist for the head word the renderer emits (zh `一 {event} 从 {source} 就`). The fused
 * `<command>-event` patterns had covered an unparenthesized source in both, which is why the
 * corpus had never shown it.
 */

import { describe, it, expect } from 'vitest';
import { parseSemantic, translate } from '../src/index';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SOURCE = 'on click from (triggerEl or me) remove me';

describe('a handler whose from-source is a parenthesized expression', () => {
  it('en: the source is the handler\'s from modifier', () => {
    const en = parseSemantic(SOURCE, 'en');
    const from = (en.node as { eventModifiers?: { from?: { raw?: string } } } | null)
      ?.eventModifiers?.from;
    expect(from?.raw).toBe('(triggerEl or me)');
  });

  for (const lang of LANGUAGES) {
    it(`${lang}: the translation reads back with its source and its body`, () => {
      const foreign = translate(SOURCE, 'en', lang);
      const back = parseSemantic(foreign, lang);
      expect(back.node, foreign).not.toBeNull();
      const from = (back.node as { eventModifiers?: { from?: { raw?: string } } })
        .eventModifiers?.from;
      expect(from?.raw, foreign).toBe('(triggerEl or me)');
      expect(translate(foreign, lang, 'en')).toBe(SOURCE);
    });
  }
});
