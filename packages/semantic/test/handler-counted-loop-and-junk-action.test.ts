/**
 * A fused event handler must not lose its body's HEAD.
 *
 * Two ways it did, both in `buildEventHandler`'s action-captured path:
 *
 * 1. **The head-only re-parse insisted on exactly one command.** A fused event
 *    pattern has no slot for a counted loop's count word — `repeat-event-es-vso`
 *    is `al {event} repetir {loopType} en {destination?}`, so `repetir 3 times`
 *    binds `loopType:literal=3` and leaves `times` unconsumed. The parser
 *    already re-parses `[verb..clause boundary]` and swaps in the canonical
 *    HEAD-ONLY `repeat-{L}-times` result for exactly this reason — but it
 *    required the re-parse to yield ONE command, and a head-only re-parse
 *    yields the head PLUS the loop body sitting in the same clause
 *    (`[repeat, add]`). So the swap was vetoed in all 13 languages that render
 *    the row. The extra commands ARE the body, so they are spliced in after the
 *    head rather than dropped with the clause.
 *
 * 2. **Any literal was accepted as the action.** The generic
 *    `event-handler-bn-sov` (`{event} তে {action}`) captures whatever follows
 *    the event marker, and in a verb-final language that is the body's leading
 *    ARGUMENT. When the argument is a literal — a quoted URL, an HTML string,
 *    a bare number — the flat path built a command node named after it
 *    (`action: "3"`, `action: "/api/submit"`), which is not a command at all,
 *    and the real verb was lost. Requiring the literal to name a declared
 *    command sends these down the rewind path instead, where the body is parsed
 *    from the slot's own start.
 *
 * Non-literal captures were already handled (see fused-handler-body-rewind);
 * this is the same rewind reached by the other half of the same guard.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

/** The 13 corpus languages whose `repeat 3 times` render lost its count. */
const COUNTED_LOOP_LANGUAGES = [
  'bn', 'es', 'id', 'it', 'ms', 'pl', 'pt', 'ru', 'sw', 'th', 'tl', 'uk', 'vi',
] as const;

function findAll(node: SemanticNode | null, action: string): CommandSemanticNode[] {
  const out: CommandSemanticNode[] = [];
  const walk = (n: SemanticNode | null | undefined): void => {
    if (!n || typeof n !== 'object') return;
    if ((n as CommandSemanticNode).action === action) out.push(n as CommandSemanticNode);
    const rec = n as unknown as Record<string, unknown>;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode));
    }
  };
  walk(node);
  return out;
}

function role(node: CommandSemanticNode | undefined, name: string) {
  return node?.roles.get(name as never) as
    | { type?: string; value?: unknown; implicit?: boolean }
    | undefined;
}

describe('a counted loop keeps its count inside a handler', () => {
  it.each(COUNTED_LOOP_LANGUAGES)('%s keeps quantity=3 and the loop body', language => {
    const rendered = translate('on click repeat 3 times add "<p>Line</p>" to me', 'en', language);
    const parsed = parse(rendered, language);
    expect(parsed, `${language}: handler did not parse: ${rendered}`).not.toBeNull();

    const [loop] = findAll(parsed, 'repeat');
    expect(loop, `${language}: no repeat in the body of: ${rendered}`).toBeDefined();
    // Pre-fix the fused capture bound the NUMBER under loopType and dropped the
    // count word, so `quantity` was absent entirely.
    expect(role(loop, 'quantity')?.value, `${language} lost the loop count`).toBe(3);
    expect(role(loop, 'loopType')?.value, `${language} mistyped the loop variant`).toBe('times');

    // Swapping the head in must not cost the body it shares a clause with.
    const [added] = findAll(parsed, 'add');
    expect(added, `${language} dropped the loop body`).toBeDefined();
    expect(role(added, 'patient')?.value).toBe('<p>Line</p>');
  });
});

describe('a body-leading literal is not mistaken for the action (bn)', () => {
  // bn is verb-final AND leaves these verbs untranslated, so the generic
  // handler's `{action}` slot lands on the first body token every time.
  const cases: ReadonlyArray<readonly [string, string, string, unknown]> = [
    [
      'a quoted URL',
      'on submit fetch /api/form with method:"POST" body:form',
      'fetch',
      '/api/form',
    ],
    ['an HTML string', 'on click put "<p>New</p>" after me', 'put', '<p>New</p>'],
  ];

  it.each(cases)('%s stays an argument', (_label, english, action, expected) => {
    const rendered = translate(english, 'en', 'bn');
    const parsed = parse(rendered, 'bn');
    expect(parsed, `bn: did not parse: ${rendered}`).not.toBeNull();

    const [cmd] = findAll(parsed, action);
    expect(cmd, `bn: no ${action} recovered from: ${rendered}`).toBeDefined();

    // The distinguishing half: pre-fix a command node named after the literal
    // was built in its place. No such action exists.
    const junk = findAll(parsed, String(expected));
    expect(junk, `bn built a command named after the literal`).toHaveLength(0);
  });

  it('a bare number does not become a command named "3"', () => {
    const rendered = translate('on click repeat 3 times add "<p>Line</p>" to me', 'en', 'bn');
    const parsed = parse(rendered, 'bn');
    expect(findAll(parsed, '3'), 'bn built a command named "3"').toHaveLength(0);
    expect(findAll(parsed, 'repeat'), 'bn lost the repeat').not.toHaveLength(0);
  });
});
