/**
 * `wait for <event>` must survive the trip into every language.
 *
 * `waitSchema` declares exactly ONE role — `duration`, described as "Duration
 * or event to wait for" — and the parser re-types a known event name out of
 * that slot into `event` (`normalizeCommandRoles`, gated on
 * `WAITABLE_EVENT_WORDS`) so `waitMapper` can emit the runtime's
 * `modifiers.for` event wait rather than a timer.
 *
 * Only the English head `wait-en-for-event` declares an `event` slot. So in the
 * other 23 languages the generated `wait {duration}` pattern had nothing to put
 * in its single slot and the event was dropped in silence: `wait for
 * transitionend` rendered as a bare `esperar` / `待つ` / `ждать`, a surface that
 * does not even re-parse as a wait. That cost 92 (pattern, language) pairs —
 * `wait-for-event` in all 23 languages plus most of `behavior-draggable`,
 * `behavior-sortable` and `behavior-resizable`, whose waits were swallowing the
 * commands that followed them.
 *
 * The renderer now routes `event` back through the duration slot, which is the
 * exact inverse of the parse-side relabel — and that symmetry is why the round
 * trip closes rather than merely emitting a token.
 *
 * The round-trip assertions below are the point of this file. The corpus gate
 * (`testing-framework/src/multilingual/render-fidelity.test.ts`) covers the same
 * ground statistically, but it scores whole patterns against an allowlist; these
 * pin the construct itself, in every language, so a regression names the
 * language instead of moving a percentage.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

/** The 23 non-English languages the corpus gate renders into. */
const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

function roundTrip(english: string, language: string): CommandSemanticNode | null {
  const rendered = translate(english, 'en', language);
  return parse(rendered, language) as CommandSemanticNode | null;
}

describe('wait for <event> renders into every language', () => {
  it.each(LANGUAGES)('%s keeps the event name in the rendered surface', language => {
    const rendered = translate('wait for transitionend', 'en', language);
    expect(rendered, `${language} dropped the event from the surface`).toContain('transitionend');
  });

  it.each(LANGUAGES)('%s round-trips back to wait.event, not a bare verb', language => {
    const node = roundTrip('wait for transitionend', language);
    expect(node, `${language}: the rendered wait did not re-parse`).not.toBeNull();
    expect(node!.action).toBe('wait');
    expect(node!.roles.get('event' as never)).toMatchObject({
      type: 'literal',
      value: 'transitionend',
    });
  });

  it.each(LANGUAGES)('%s does not leave the event in the duration slot', language => {
    // A wait whose event landed in `duration` would build a TIMER at runtime —
    // silently wrong in a way the surface does not reveal.
    const node = roundTrip('wait for transitionend', language);
    expect(node!.roles.has('duration' as never)).toBe(false);
  });
});

describe('a LOCALIZED event name round-trips too', () => {
  // `renderEventName` localizes names that have a round-trip-safe native form
  // (`load` -> es `carga`, ja `ロード`), unlike `transitionend`, which has none
  // and passes through. The relabel that recovers the role keys off the ENGLISH
  // word set, so this only closes because `eventNameTranslations` normalizes the
  // native form back to `load` first. Pinning it here because the two halves
  // live in different modules and nothing else asserts they agree.
  it('es renders `load` natively and recovers it', () => {
    const rendered = translate('wait for load', 'en', 'es');
    expect(rendered).toContain('carga');
    const node = parse(rendered, 'es') as CommandSemanticNode;
    expect(node.roles.get('event' as never)).toMatchObject({ type: 'literal', value: 'load' });
  });

  it('ja renders `load` natively and recovers it', () => {
    const rendered = translate('wait for load', 'en', 'ja');
    expect(rendered).toContain('ロード');
    const node = parse(rendered, 'ja') as CommandSemanticNode;
    expect(node.roles.get('event' as never)).toMatchObject({ type: 'literal', value: 'load' });
  });
});

describe('the duration slot is not hijacked', () => {
  // The guard on the render branch is `no duration value AND an event role`.
  // These pin both directions of that condition, so a future widening that
  // renders events into timer waits (or vice versa) fails here.
  it.each(LANGUAGES)('%s still renders a TIME wait as a duration', language => {
    const node = roundTrip('wait 2s', language);
    expect(node, `${language}: the rendered timer wait did not re-parse`).not.toBeNull();
    expect(node!.action).toBe('wait');
    expect(node!.roles.has('duration' as never)).toBe(true);
    expect(node!.roles.has('event' as never)).toBe(false);
  });

  it('English is unchanged — its own `wait for {event}` head still wins', () => {
    // en has a pattern with a real `event` slot, so the fallback must never be
    // reached there; if it were, the `for` marker would vanish.
    expect(translate('wait for transitionend', 'en', 'en')).toBe('wait for transitionend');
  });
});

describe('a following command is no longer swallowed', () => {
  // The dropped event was not merely absent: the wait render was consuming the
  // tokens after it, which is why three `behavior-*` corpus rows cleared as
  // fallout from this one fix rather than needing work of their own.
  it.each(['es', 'ru', 'ja'] as const)('%s keeps the command after the wait', language => {
    const rendered = translate('wait for transitionend then remove me', 'en', language);
    const node = parse(rendered, language);
    expect(node, `${language}: chained wait did not re-parse`).not.toBeNull();
    const actions = JSON.stringify(node);
    expect(actions).toContain('wait');
    expect(actions).toContain('remove');
  });
});
