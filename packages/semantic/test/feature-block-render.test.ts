/**
 * A block feature must render its BODY, not just its keyword.
 *
 * `socket ChatSocket ws://localhost:8080 / on message / put it into #chat / end`
 * rendered into every language as the bare keyword — es `socket`, ja `ソケット`,
 * de `arbeiter` — and nothing else. The name and every command inside were
 * dropped, which is why five corpus patterns reported ACTION loss in all 23
 * languages at once: `live-multiple-deps`, `live-derived-value`,
 * `eventsource-basic`, `worker-basic`, `socket-basic`.
 *
 * 23/23 is the signature of a structural gap rather than a grammar problem, and
 * it was exactly that. These constructs parse to `kind: 'feature'`, carrying
 * their statements in `body` and never in `roles`:
 *
 *   kind:'feature'  action:'socket'  roles:[]  name:'ChatSocket'  body:[handler]
 *
 * `SemanticRendererImpl.render` dispatched on `compound` / `behavior` / `def` /
 * `conditional` and then fell through to the pattern path — there was no
 * `feature` case at all. The pattern path renders a keyword and consults roles,
 * so with `roles: []` it had nothing else to emit.
 *
 * The fix mirrors `renderDef` / `renderBehavior`, including their handling of an
 * event-handler child: a handler opens a block of its own and must be closed
 * before the feature closes.
 *
 * Measured: +91 pairs, zero regressions.
 *
 * The handler CHILD of a `socket`/`eventsource` was a second, parse-side layer
 * of the same corpus rows, and it is covered below rather than in a residual
 * pin: see `feature-block-handler-heads.test.ts` and
 * `custom-event-name-handler.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';

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

const WORKER = 'worker Calculator\n  def add(a, b)\n    return a + b\n  end\nend';
const LIVE = 'live put `Count: ${$count}` into me end';
const SOCKET = 'socket ChatSocket ws://localhost:8080\n  on message\n    put it into #chat\n  end';

/** Collect every action in a parsed tree. */
function actions(node: unknown, acc = new Set<string>(), seen = new Set<unknown>()): Set<string> {
  if (!node || typeof node !== 'object' || seen.has(node)) return acc;
  seen.add(node);
  const n = node as Record<string, unknown>;
  if (typeof n.action === 'string') acc.add(n.action);
  for (const key of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers']) {
    const child = n[key];
    if (Array.isArray(child)) for (const c of child) actions(c, acc, seen);
    else if (child) actions(child, acc, seen);
  }
  return acc;
}

describe('the body reaches the rendered surface', () => {
  it.each(LANGUAGES)('%s renders the worker body, not just the keyword', language => {
    const rendered = translate(WORKER, 'en', language);
    expect(rendered, `${language} emitted a bare keyword: ${rendered}`).toContain('Calculator');
    expect(rendered.split('\n').length, `${language}: ${rendered}`).toBeGreaterThan(1);
  });

  it.each(LANGUAGES)('%s renders the live body', language => {
    const rendered = translate(LIVE, 'en', language);
    expect(rendered, `${language}: ${rendered}`).toContain('$count');
  });

  it.each(LANGUAGES)('%s renders the socket name', language => {
    expect(translate(SOCKET, 'en', language)).toContain('ChatSocket');
  });
});

describe('the body survives the round trip', () => {
  // qu excluded — see the residual pin below.
  it.each(LANGUAGES.filter(l => l !== 'qu'))('%s keeps worker + def + return', language => {
    const rendered = translate(WORKER, 'en', language);
    const got = actions(parse(rendered, language));
    for (const want of ['worker', 'def', 'return']) {
      expect(got.has(want), `${language} lost \`${want}\` from: ${rendered}`).toBe(true);
    }
  });

  // pl excluded — see the residual pin below.
  it.each(LANGUAGES.filter(l => l !== 'pl'))('%s keeps live + put', language => {
    const rendered = translate(LIVE, 'en', language);
    const got = actions(parse(rendered, language));
    expect(got.has('live'), `${language} lost \`live\`: ${rendered}`).toBe(true);
    expect(got.has('put'), `${language} lost \`put\`: ${rendered}`).toBe(true);
  });
});

describe('a feature closes its blocks in the right order', () => {
  // An event-handler child opens a block of its own, so the render needs TWO
  // `end`s — the handler's, then the feature's. One `end` would leave the
  // feature unterminated and the canonical parser rejects it.
  it.each(['es', 'de', 'fr', 'it', 'pt'] as const)('%s emits both ends for a socket', language => {
    const rendered = translate(SOCKET, 'en', language);
    const endKeyword = rendered.trim().split('\n').pop()!.trim();
    const endCount = rendered.split('\n').filter(l => l.trim() === endKeyword).length;
    expect(endCount, `${language} emitted ${endCount} \`${endKeyword}\`:\n${rendered}`).toBe(2);
  });

  it('a body-less feature still closes once', () => {
    // `live` declares no name, and `intercept` always parses with an empty body
    // (opaque by design) — neither should lose its `end`.
    const rendered = translate(LIVE, 'en', 'es');
    expect(rendered.trim().endsWith('fin')).toBe(true);
  });
});

describe('English is unchanged', () => {
  it('round-trips a worker', () => {
    const got = actions(parse(translate(WORKER, 'en', 'en'), 'en'));
    expect(got.has('worker')).toBe(true);
    expect(got.has('def')).toBe(true);
  });
});

describe('KNOWN RESIDUALS — render is correct, re-parse is not', () => {
  // qu RENDERS correctly — `llamk'aq Calculator / def add(a, b) / + ta kutichiy
  // / tukukuy / tukukuy` — and it is the target parser that drops a piece on
  // the way back, so it is a parse-side residual, not a gap in this fix. (pl's
  // `na-żywo / umieść … do ja / koniec` was the other member until the
  // hyphenated-keyword walk landed with the reactive-when arc — promoted below.)
  it('qu renders the worker body but loses `return` on re-parse', () => {
    const rendered = translate(WORKER, 'en', 'qu');
    expect(rendered, 'qu no longer renders the body — this pin is stale').toContain('kutichiy');
    expect(
      actions(parse(rendered, 'qu')).has('return'),
      `qu now round-trips \`return\` — remove this pin:\n${rendered}`
    ).toBe(false);
  });

  it('pl round-trips `live` — PROMOTED from a failing-when-fixed pin', () => {
    // The pin recorded the defect precisely: pl renders `na-żywo`, the profile
    // primary (also the surface behind the localized `hx-na-żywo` attribute, so
    // it cannot be swapped for the dictionary's `żywy`), and the word walk split
    // it at the hyphen into `na`(→destination) + `-` + `żywo` — a handler head.
    // The base tokenizer's multi-word walk now takes hyphen-joined profile
    // keywords whole (framework base-tokenizer `isHyphenatedWord`), so the
    // render reads back as `live`. Whole-corpus diff: zero rows moved.
    const rendered = translate(LIVE, 'en', 'pl');
    expect(rendered).toContain('na-żywo');
    expect(actions(parse(rendered, 'pl')).has('live')).toBe(true);
    expect(actions(parse(rendered, 'pl')).has('on')).toBe(false);
  });
});

describe("a socket's event-handler CHILD round-trips too", () => {
  // Promoted from a failing-when-fixed pin that named ja. The feature header and
  // `end` always rendered correctly; the handler inside did not re-parse, in ja
  // and (unpinned) in ar/tr/ko/bn/de/fr/hi/id/qu/zh. Two independent causes, both
  // in the parser rather than the renderer: `featureBodyStart` recognized only
  // `keywords.on` as a handler head, and the schema typed a handler's event as
  // `literal` only, so a CUSTOM event name — an identifier — bound nothing.
  it.each(LANGUAGES)('%s keeps socket + the handler body', language => {
    const rendered = translate(SOCKET, 'en', language);
    const got = actions(parse(rendered, language));
    expect(got.has('socket'), `${language} lost the feature itself: ${rendered}`).toBe(true);
    expect(got.has('put'), `${language} lost the handler body:\n${rendered}`).toBe(true);
  });
});
