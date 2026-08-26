/**
 * A handler whose event is a CUSTOM name parses in every language.
 *
 * `onSchema.event` is typed `expectedTypes: ['literal']`, which covers the ~60
 * event names the dictionaries localize (`click` → ja `クリック`, a keyword
 * token). A custom name has no translation, passes through as English, and
 * tokenizes as an `identifier` — so the slot rejected it, and
 * `on message put it into #messages` bound nothing at all in the four languages
 * whose handler head comes from this generator rather than from a handcrafted
 * pattern: ar, ja, ko, tr. Every other language has a handcrafted head
 * (`event-de-wenn`, `event-qu-maykama`, `event-zh-immediate`, …) with no
 * declared type on its event slot, which is why the defect was invisible in 19
 * of 23.
 *
 * Widening the MAIN generated pattern in place was measured and rejected: ko
 * renders `transition opacity to 0` as `opacity 을 에 0`, carrying the same
 * `<x> <event-marker> <on-marker>` signature the SOV program-splitter keys on,
 * and three corpus rows flipped. The widened slot lives in a separate,
 * LOWER-priority variant (`on-{L}-generated-expr-event`, schema field
 * `widenTypeVariants`) so it is inert wherever a real command pattern can claim
 * the span — and the splitter itself now rejects a split that leaves a handler
 * with no commands, which is what a mis-split always produces.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic, translate } from '../src/index';
import type { SemanticNode } from '../src/types';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

function actions(node: SemanticNode | null, acc = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return acc;
  const rec = node as unknown as Record<string, unknown>;
  if (typeof rec.action === 'string') acc.add(rec.action);
  for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
    const kids = rec[key];
    if (Array.isArray(kids)) kids.forEach(k => actions(k as SemanticNode, acc));
  }
  return acc;
}

/** ar/ja/tr could not parse the line at all. */
const WAS_BROKEN = ['ar', 'ja', 'tr'] as const;

/**
 * ko is deliberately excluded from the widened variant, so it still types a
 * custom event `literal` — see the `excludeLanguages` block below.
 */
const NOT_WIDENED = ['ko'] as const;

describe('a custom event name round-trips', () => {
  it.each(LANGUAGES)('%s keeps the handler and its body', language => {
    const rendered = translate('on message put it into #messages', 'en', language);
    const got = actions(parse(rendered, language));
    // Pre-change in ar/ja/ko/tr: the whole line failed to parse at all.
    expect(got.has('on'), `${language} lost the handler:\n${rendered}`).toBe(true);
    expect(got.has('put'), `${language} lost the handler body:\n${rendered}`).toBe(true);
  });

  it.each(WAS_BROKEN)('%s carries the event NAME through, not a placeholder', language => {
    const rendered = translate('on message put it into #messages', 'en', language);
    expect(rendered).toContain('message');
    const node = parse(rendered, language) as { roles?: Map<string, { value?: unknown }> } | null;
    const event = node?.roles?.get('event') as { value?: unknown; raw?: string } | undefined;
    expect(String(event?.raw ?? event?.value)).toBe('message');
  });
});

describe('a custom event name is typed as the English reference types it', () => {
  // `on message …` parses to `event: expression` in en. ko reached this file's
  // first two assertions on the pre-change tree but typed the event `literal`,
  // which the corpus gate scores as a lost `on.event:expression`.
  it.each(LANGUAGES.filter(l => !(NOT_WIDENED as readonly string[]).includes(l)))(
    '%s types a custom event name as an expression',
    language => {
      const rendered = translate('on message put it into #messages', 'en', language);
      const node = parse(rendered, language) as { roles?: Map<string, { type?: string }> } | null;
      expect(node?.roles?.get('event')?.type, `${language} mistyped the event:\n${rendered}`).toBe(
        'expression'
      );
    }
  );
});

describe('a LOCALIZED event name is unchanged', () => {
  // The main pattern still owns these; the widened variant must not take them,
  // or the event would come back typed `expression` where the reference says
  // `literal`.
  it.each(LANGUAGES)('%s still parses `on click` through the literal slot', language => {
    const rendered = translate('on click toggle .active', 'en', language);
    const node = parse(rendered, language) as { roles?: Map<string, { type?: string }> } | null;
    const event = node?.roles?.get('event');
    expect(event?.type, `${language} re-typed a localized event name`).toBe('literal');
  });
});

describe('ko is excluded from the widened variant, and why', () => {
  // ko's on-marker `에` is ALSO its destination marker, and its event-role marker
  // `을` is also its patient marker. `<x> 을 에 <value>` is therefore both a
  // handler head and the exact shape ko renders `transition opacity to 0` in.
  // With the variant, that bare transition read as a handler named `opacity` —
  // a regression NO gate would have caught, because every corpus transition row
  // is inside a handler and the widened variant loses that race to the fused
  // pattern. No other language has both collisions: ja's on-marker is `で` while
  // its transition marks the goal with `に`.
  const KO_BARE_TRANSITION = 'opacity 을 에 0 300ms 트랜지션';

  it('ko reads its rendered bare transition as a transition', () => {
    const node = parse(KO_BARE_TRANSITION, 'ko') as
      | { action?: string; roles?: Map<string, unknown> }
      | null;
    expect(node?.action, 'ko read a bare transition as something else').toBe('transition');
    for (const role of ['patient', 'goal', 'duration']) {
      expect(node!.roles?.has(role), `ko lost transition.${role}`).toBe(true);
    }
  });

  it('that surface is what the renderer emits', () => {
    expect(translate('transition opacity to 0 over 300ms', 'en', 'ko')).toBe(KO_BARE_TRANSITION);
  });

  it('ko still parses a custom-event handler, through the main pattern', () => {
    const rendered = translate('on message put it into #messages', 'en', 'ko');
    const got = actions(parse(rendered, 'ko'));
    expect(got.has('on'), `ko lost the handler:\n${rendered}`).toBe(true);
    expect(got.has('put'), `ko lost the handler body:\n${rendered}`).toBe(true);
  });
});

describe('a program split that leaves an EMPTY handler is rejected', () => {
  // The splitter used to keep such a split at confidence 0.2. A handler with no
  // commands is the tell of a mis-split, and the single-statement path parses the
  // line correctly, so a low-confidence compound is strictly worse.
  it('a real two-handler ko chain still splits', () => {
    const node = parseSemantic('클릭 을 에 .active 을 토글 키업 을 에 .x 을 토글', 'ko')?.node;
    expect(node?.kind).toBe('compound');
    expect((node as { statements?: unknown[] })?.statements?.length).toBe(2);
  });
});
