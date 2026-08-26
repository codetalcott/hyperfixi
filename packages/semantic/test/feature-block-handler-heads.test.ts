/**
 * A feature block finds its handler body whatever word the handler opens with.
 *
 * `eventsource`/`socket` blocks carry `on <event>` handlers, and
 * `featureBodyStart` locates the body by scanning the head for an
 * `<on-form> <event>` pair — `keywords.on` being the only source of on-forms.
 *
 * That is not where the RENDERER gets its head word. `findBestPattern` picks the
 * language's own event-handler pattern, and in four languages that pattern is
 * headed by the temporal conjunction rather than by `keywords.on`:
 *
 *   de  keywords.on = bei      renderer emits `wenn`      (event-de-wenn)
 *   fr  keywords.on = sur      renderer emits `quand`     (event-fr-quand)
 *   id  keywords.on = pada     renderer emits `ketika`    (event-id-ketika)
 *   qu  keywords.on = chaypim  renderer emits `maykama`   (event-qu-maykama)
 *
 * All four tokenize with `normalized: 'when'`. zh is a fifth shape: its renderer
 * emits the correlative `一 … 就` (`event-zh-immediate`), whose head is a bare
 * identifier — listed in the profile's `eventHandler.temporalMarkers` rather
 * than in `keywords.on`, because `一` is also the numeral one. hi is a sixth: it
 * is postpositional (`message पर`), so the forward scan cannot see the pair at
 * all.
 *
 * An unrecognized head is NOT a parse error — the body comes back EMPTY and the
 * block parses as a bare `eventsource`/`socket` with no handler, silently. All
 * twelve (pattern, language) pairs below were failing that way on the
 * en→foreign render-fidelity gate.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { SemanticNode } from '../src/types';

const EVENTSOURCE = [
  'eventsource ChatStream from /events',
  '  on message',
  '    put it into #messages',
  '  end',
  'end',
].join('\n');

const SOCKET = [
  'socket ChatSocket ws://localhost:8080',
  '  on message',
  '    put it into #chat',
  '  end',
].join('\n');

/** Every action anywhere in the tree. */
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

/** The languages whose rendered handler head the scan did not recognize. */
const RECOVERED = ['bn', 'de', 'fr', 'hi', 'id', 'ko', 'qu', 'zh'] as const;

/** Languages that already worked — the guard that this change is additive. */
const ALREADY_WORKING = ['es', 'he', 'it', 'ms', 'pl', 'pt', 'ru', 'sw', 'th', 'tl', 'uk', 'vi'] as const;

describe('an eventsource block keeps its handler in every language', () => {
  it.each([...RECOVERED, ...ALREADY_WORKING])('%s parses the handler and its body', language => {
    const rendered = translate(EVENTSOURCE, 'en', language);
    const found = actions(parse(rendered, language));
    expect(found.has('eventsource'), `${language} lost the block itself`).toBe(true);
    // Pre-change for the six: `{eventsource}` alone — the body was dropped whole.
    expect(found.has('on'), `${language} lost the handler:\n${rendered}`).toBe(true);
    expect(found.has('put'), `${language} lost the handler body:\n${rendered}`).toBe(true);
  });
});

describe('a socket block keeps its handler in every language', () => {
  it.each([...RECOVERED, ...ALREADY_WORKING])('%s parses the handler and its body', language => {
    const rendered = translate(SOCKET, 'en', language);
    const found = actions(parse(rendered, language));
    expect(found.has('socket'), `${language} lost the block itself`).toBe(true);
    expect(found.has('on'), `${language} lost the handler:\n${rendered}`).toBe(true);
    expect(found.has('put'), `${language} lost the handler body:\n${rendered}`).toBe(true);
  });
});

describe('the head forms come from the profile, not from a hardcoded list', () => {
  // Each of these is the exact head word the renderer emits, asserted so a
  // profile edit that moves it shows up here rather than as a silent -12 on the
  // corpus gate.
  const HEADS: Array<[string, string]> = [
    ['de', 'wenn'],
    ['fr', 'quand'],
    ['id', 'ketika'],
    ['qu', 'maykama'],
    ['zh', '一'],
  ];

  // The homonym that made the forward scan pick a false head: the same surface
  // marks the handler AND, later in the clause, the put's destination. Pinned so
  // a profile edit that separates them shows up here.
  it.each([
    ['bn', 'তে', 'এ'],
    ['ko', '에', '에'],
  ] as const)('%s reuses its on-marker later in the same clause', (language, head, reused) => {
    const rendered = translate(EVENTSOURCE, 'en', language);
    expect(rendered).toContain(head);
    expect(rendered.split(reused).length - 1).toBeGreaterThanOrEqual(2);
  });

  it.each(HEADS)('%s renders its handler head as `%s`', (language, head) => {
    const rendered = translate(EVENTSOURCE, 'en', language);
    expect(rendered).toContain(head);
  });

  it('hi renders its head POSTpositionally, which the forward scan cannot see', () => {
    // `message पर` — the pair is `<event> <on-form>`, the mirror of the SVO
    // order the original scan assumed. This is why a second, reversed scan
    // exists rather than a wider form set alone.
    const rendered = translate(EVENTSOURCE, 'en', 'hi');
    expect(rendered).toMatch(/message\s+पर/u);
  });
});

describe('a handler-LESS feature block is unchanged', () => {
  // The scan's fallthrough (`return limit`) is what makes `socket Name url end`
  // legal with an empty body. Both new scans must leave that alone.
  it('en socket with no handler still parses as an empty-bodied block', () => {
    const found = actions(parse('socket ChatSocket ws://localhost:8080\nend', 'en'));
    expect(found.has('socket')).toBe(true);
    expect(found.has('on')).toBe(false);
  });

  it('en eventsource with no handler still parses as an empty-bodied block', () => {
    const found = actions(parse('eventsource ChatStream from /events\nend', 'en'));
    expect(found.has('eventsource')).toBe(true);
    expect(found.has('on')).toBe(false);
  });
});
