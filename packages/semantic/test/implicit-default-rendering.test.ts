/**
 * Implicit-default tagging + the qu source-fronted event variant (#874's
 * deferred third cause, both halves).
 *
 * Renderer half: the matcher materializes schema/extraction `default`s into
 * the captured roles (`add .active` parses with destination=me), so the
 * renderer suppressed EVERY destination/source `me` — including authored ones.
 * `add .active to me` and `add .active` rendered identically, which is the
 * ambiguity #874 named as the blocker for qu's compound rows. Injected
 * defaults now carry `implicit: true` and only those are suppressed: authored
 * phrases survive round-trips, bare surfaces stay bare.
 *
 * Parser half: qu's canonical order fronts the source phrase
 * (`.active ta .tab-button manta ñitiy pi hapiy noqa`), a shape no pattern
 * covered — the `-sov-source-fronted` variant matches it. Its captured
 * `source` belongs to the BODY command, so it must NOT thread into
 * eventModifiers.from (delegation): the threading gate is endsWith('source'),
 * and the fused variant's mid-id `source` must not satisfy it. That exact
 * mistake (includes() matching `-sov-source-fronted`) delegated qu's tabs
 * handlers to `.tab` and reddened R2 tabs-basic/tabs-content at tolerance 0.
 */

import { describe, it, expect } from 'vitest';
import { parseSemantic, translate } from '../src/index';
import { buildAST } from '../src/ast-builder/index';


/**
 * The COMMANDS of a handler body, looking through the `compound` wrapper.
 *
 * A multi-command handler body has always been a then-compound in English
 * (`parseBodyWithClauses` wraps >1 clause), and as of 2026-08-27 the FUSED
 * foreign path agrees — see `buildEventHandler`'s fold. So a body that used to
 * read `[make, put]` in a language whose fused pattern wins now reads
 * `[compound{make, put}]`, exactly as the English reference always did.
 * These assertions are about WHICH commands and roles survive, not about that
 * wrapper, so they look through it.
 */
function handlerCommands<T>(body: T[] | undefined): T[] {
  const list = body ?? [];
  if (list.length === 1) {
    const only = list[0] as unknown as { kind?: string; statements?: T[] };
    if (only?.kind === 'compound' && Array.isArray(only.statements)) return only.statements;
  }
  return list;
}

describe('authored vs implicit me — render round-trips are fixed points', () => {
  it.each([
    ['add .active', 'add .active'],
    ['add .active to me', 'add .active to me'],
    ['remove me', 'remove me'],
    ['remove .open from me', 'remove .open from me'],
    ['toggle .active', 'toggle .active'],
    ['toggle .active on me', 'toggle .active on me'],
  ])('en→en %s → %s', (input, expected) => {
    expect(translate(input, 'en', 'en')).toBe(expected);
  });

  it('the matcher tags a default-filled destination implicit; an authored one not', () => {
    const bare = parseSemantic('add .active', 'en');
    const authored = parseSemantic('add .active to me', 'en');
    const bareDest = bare.node?.roles.get('destination');
    const authoredDest = authored.node?.roles.get('destination');
    expect(bareDest?.value).toBe('me');
    expect(bareDest?.implicit).toBe(true);
    expect(authoredDest?.value).toBe('me');
    expect(authoredDest?.implicit).toBeUndefined();
  });

  it('qu: authored `noqa man` (to me) survives the English render', () => {
    // Before the tagging, this rendered `add .active` — indistinguishable from
    // the bare surface, ambiguous once compound bodies lose their connectives.
    expect(translate('.active ta noqa man yapay', 'qu', 'en')).toBe('add .active to me');
  });
});

describe('qu source-fronted fused variant — body source is not delegation', () => {
  const TABS_BASIC = '.active ta .tab manta ñitiy pi qichuy chayqa .active ta noqa man yapay';

  it('matches the fused compound row with both body commands intact', () => {
    const p = parseSemantic(TABS_BASIC, 'qu');
    expect(p.confidence).toBe(1);
    const handler = p.node as unknown as {
      body?: Array<{ action: string; roles: Map<string, { value?: unknown }> }>;
      eventModifiers?: { from?: unknown };
    };
    const commands = handlerCommands(handler.body);
    expect(commands.map(c => c.action)).toEqual(['remove', 'add']);
    // The remove's from-phrase stays ON the remove…
    expect(commands[0].roles.get('source')?.value).toBe('.tab');
    // …and never becomes the handler's delegation filter. endsWith('source')
    // is the load-bearing check: includes() re-reddens this line.
    expect(handler.eventModifiers?.from).toBeUndefined();
  });

  it('builds an eventHandler AST with no delegation target', () => {
    const p = parseSemantic(TABS_BASIC, 'qu');
    const built = buildAST(p.node!);
    const ast = built.ast as {
      selector?: string;
      target?: string;
      commands?: Array<{ type?: string; commands?: unknown[] }>;
    };
    expect(ast.selector).toBeUndefined();
    expect(ast.target).toBeUndefined();
    // The two body commands now arrive inside the CommandSequence that a
    // then-chain has always produced in English (see handlerCommands above).
    expect(ast.commands).toHaveLength(1);
    expect(ast.commands?.[0].type).toBe('CommandSequence');
    expect(ast.commands?.[0].commands).toHaveLength(2);
  });

  it('handler-head source patterns still thread delegation (negative control)', () => {
    // `on click from .menu …` — a REAL delegation phrase must keep threading
    // through the endsWith('source') gate.
    const p = parseSemantic('on click from .menu toggle .open', 'en');
    const handler = p.node as unknown as { eventModifiers?: { from?: { value?: unknown } } };
    expect(handler.eventModifiers?.from?.value).toBe('.menu');
  });
});
