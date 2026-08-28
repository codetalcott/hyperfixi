/**
 * ko renders its handler head as `할 때`, which is what a CUSTOM event needs.
 *
 * ko's generated trigger patterns are `[{source} 에서] {event} 을 에` — the
 * event-role marker `을` (also the patient marker) plus the on-marker `에` (also
 * the destination marker) — and that two-marker form is what the renderer
 * emitted, though `할 때` is what the profile declares
 * (`eventHandler.eventMarker.primary`) and what the i18n corpus writes.
 *
 * The two-marker form parses a KNOWN event and nothing else. Its `{event}` slot
 * is `literal`-only because ko is the one language `onSchema.widenTypeVariants`
 * excludes, and that exclusion is right for the surface it protects: with the
 * widening, ko's own rendering of `transition opacity to 0`
 * (`opacity 을 에 0 300ms 트랜지션`) reads as a handler named `opacity`. So a
 * custom event had no pattern at all — `hello 을 에 …` did not re-parse in any
 * form, which is what kept `on-custom-event-receive` and
 * `announce-screen-reader` on the i18n renderer.
 *
 * `할 때` has neither collision: it is not a role marker in ko. So the
 * handcrafted trigger can take `expression` for the event without re-opening
 * the case the exclusion protects against, and the generated pair stays for
 * input tolerance.
 *
 * The second half is in the block parser. `eventHandlerHeadForms` is a set of
 * whole strings matched one token at a time, so a two-word phrase only ever
 * matches on its LAST word — the scan lands on `때` and the single-token
 * postpositional rule then claims `할`, the phrase's own first word, as the
 * event. That silently emptied the body of every ko `socket`/`eventsource`.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import { parseSemantic, render } from '../src/index';
import type { SemanticNode } from '../src/types';

function renderEn(node: SemanticNode | null): string | null {
  return node ? render(node, 'en') : null;
}

function roundTrip(source: string): string | null {
  const reference = parseSemantic(source, 'en')?.node ?? null;
  if (!reference) return null;
  return renderEn(parseSemantic(render(reference, 'ko'), 'ko')?.node ?? null);
}

describe('ko emits `할 때`, not the two-marker `을 에`', () => {
  it.each([
    'on click put "x" into me',
    "on hello put 'Got it!' into me",
    'on success put "x" into me',
  ])('%s', source => {
    const rendered = translate(source, 'en', 'ko');
    expect(rendered, `ko still renders the two-marker head: ${rendered}`).not.toContain('을 에');
    expect(rendered).toContain('할 때');
  });

  it.each([
    // A CUSTOM event: the whole point. Neither of these re-parsed at all before.
    "on hello put 'Got it!' into me",
    'on success put "x" into me',
    // A KNOWN event, which the two-marker form did handle — the guard that this
    // is additive.
    'on click put "x" into me',
  ])('%s round-trips', source => {
    expect(roundTrip(source)).toBe(renderEn(parseSemantic(source, 'en')!.node!));
  });

  it('still READS the generated two-marker form', () => {
    // The generated patterns stay registered for input tolerance; only what we
    // emit changed.
    const node = parse('클릭 을 에 "x" 을 나 에 넣다', 'ko');
    expect(node, 'the two-marker head must stay accepted').not.toBeNull();
    expect(renderEn(node)).toBe('on click put "x" into me');
  });

  it('does not turn ko\'s `transition` render into a handler', () => {
    // The collision `onSchema.widenTypeVariants.excludeLanguages: ["ko"]`
    // protects: `opacity 을 에 0 300ms 트랜지션` must stay a transition command.
    const rendered = translate('transition opacity to 0 over 300ms', 'en', 'ko');
    const node = parse(rendered, 'ko') as { action?: string } | null;
    expect(node?.action, `${rendered} re-parsed as something else`).toBe('transition');
  });
});

describe('a ko feature block finds its handler behind the two-word head', () => {
  const EVENTSOURCE = [
    'eventsource ChatStream from /events',
    '  on message',
    '    put it into #messages',
    '  end',
    'end',
  ].join('\n');

  function actions(node: SemanticNode | null, acc = new Set<string>()): Set<string> {
    if (!node) return acc;
    const rec = node as unknown as Record<string, unknown>;
    if (typeof rec.action === 'string') acc.add(rec.action);
    if (rec.kind === 'event-handler') acc.add('on');
    for (const key of ['body', 'statements', 'children', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => actions(k as SemanticNode, acc));
    }
    return acc;
  }

  it('renders the head as a two-word phrase', () => {
    expect(translate(EVENTSOURCE, 'en', 'ko')).toContain('할 때');
  });

  it('keeps the handler and its body', () => {
    // Without `multiWordHeadFormLength` the scan claims `할` as the event and
    // the body comes back EMPTY — not an error, a silent drop.
    const found = actions(parse(translate(EVENTSOURCE, 'en', 'ko'), 'ko'));
    expect(found.has('eventsource')).toBe(true);
    expect(found.has('on')).toBe(true);
    expect(found.has('put')).toBe(true);
  });
});
