/**
 * A semantically-adopted command carries a REAL span — its own, and its args'
 *
 * `@lokascript/semantic`'s `buildAST` used to emit no positions at all — nested
 * args came back `undefined`, and the command node's `start: 0, end: 0, line: 1`
 * was `normalizeBuiltNode`'s placeholder. So every command the semantic path
 * adopted reported offset zero regardless of where it actually sat, and LSP
 * hover and diagnostic ranges read exactly these fields.
 *
 * The command's own span is EXACT rather than estimated, and only because of
 * the adoption coverage gate: an adoption means the analyzer consumed
 * `remainingInput` in FULL, and that slice runs from this command's token to the
 * end of the source. So the command spans
 * `[commandToken.start, lastConsumedToken.end]`.
 *
 * ## Nested argument spans
 *
 * ~~What is deliberately NOT fixed: nested ARGUMENT positions. `buildAST` never
 * produced them, and the few that do arrive (via the adapter's expression
 * parser) are relative to each value's own substring, not to the source — so
 * there is no single offset to apply. Carrying those needs the semantic parser
 * to track spans. Measured residual: 38 sites across 12 corpus sources, all
 * nested. Filed, not faked.~~
 *
 * Closed. The semantic parser now DOES track spans: every role records the
 * token run it was captured from (`SourceSpanned`), and there is exactly one
 * offset to apply after all — the slice origin, `commandToken.start`. The
 * "relative to each value's own substring" problem was real but local to
 * `convertExpression`, which rebases its sub-parse onto the role's own span
 * before returning. `Parser.rebaseSemanticSpans` does the rest, and derives
 * line/column (which `@lokascript/semantic` cannot know — it never sees the
 * whole document) from the rebased offsets.
 *
 * The residual is now 0 `position` sites in `tools/triage-parse-paths.ts`,
 * down from 44 across 10 sources.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript, config } from '../../api/hyperscript-api';

interface Span {
  start?: number;
  end?: number;
  line?: number;
  name?: string;
}

function firstCommand(source: string, traditional: boolean): Span | null {
  const result = hyperscript.compileSync(source, { traditional } as never) as {
    ok: boolean;
    ast?: Record<string, unknown>;
  };
  if (!result.ok || !result.ast) return null;
  const commands = result.ast.commands as Span[] | undefined;
  return commands?.[0] ?? (result.ast as Span) ?? null;
}

describe('semantically-adopted command spans', () => {
  it('the default config really does run semantic-first — otherwise this is vacuous', () => {
    expect(config.semantic).toBe(true);
  });

  // Each source is a command the semantic path ADOPTS (none is on
  // skipSemanticParsing, and none leaves input unconsumed), so the default
  // compile exercises the stamping and the traditional twin is the oracle.
  const ADOPTED = [
    'log "hello"',
    'on click log "hello"',
    'scroll to #top',
    'on click scroll to #top',
    'send evt to #target',
  ];

  it.each(ADOPTED)('%s — the default path reports the traditional span', source => {
    const semantic = firstCommand(source, false);
    const traditional = firstCommand(source, true);

    expect(semantic, source).not.toBeNull();
    expect(traditional, source).not.toBeNull();
    expect(semantic!.start).toBe(traditional!.start);
    expect(semantic!.end).toBe(traditional!.end);
    expect(semantic!.line).toBe(traditional!.line);
  });

  it('is not the placeholder — a non-zero offset is actually reported', () => {
    // The guard that matters: `start: 0` was the OLD value, so a test that only
    // compared a command at offset 0 would pass against the bug.
    const cmd = firstCommand('on click log "hello"', false);
    expect(cmd!.start).toBe(9);
    expect(cmd!.start).not.toBe(0);
  });

  it('ends at the last consumed token, not at the raw input length', () => {
    // Trailing whitespace: `originalInput.length` would report 10 here where
    // the traditional parser reports 7. Measured while building this.
    const semantic = firstCommand('log "x"   ', false);
    const traditional = firstCommand('log "x"   ', true);
    expect(semantic!.end).toBe(7);
    expect(semantic!.end).toBe(traditional!.end);
  });
});

describe('nested argument spans', () => {
  // Each source's first argument is a NESTED node — the thing the old header
  // above recorded as unfixable. The traditional parse is the oracle for the
  // offsets, and the SOURCE TEXT is the oracle for the oracle: a span is only
  // right if slicing the source with it yields the argument as written. Both
  // are asserted, because agreeing on a wrong offset is a way for two paths to
  // converge that this arc has already been bitten by.
  const ARGS: readonly (readonly [source: string, surface: string])[] = [
    ['clear myVar', 'myVar'],
    ['blur #search', '#search'],
    ['render myTemplate', 'myTemplate'],
    ['log "hello"', '"hello"'],
    ['call myFunction()', 'myFunction()'],
    ['on click log "shift"', '"shift"'],
  ];

  it.each(ARGS)('%s — args[0] spans %s on both paths', (source, surface) => {
    const arg = (traditional: boolean) => {
      const result = hyperscript.compileSync(source, { traditional } as never) as {
        ok: boolean;
        ast?: Record<string, unknown>;
      };
      const root =
        (result.ast?.['commands'] as Record<string, unknown>[] | undefined)?.[0] ?? result.ast;
      return (root?.['args'] as Span[] | undefined)?.[0];
    };
    const semantic = arg(false);
    const traditional = arg(true);

    expect(semantic, source).toBeDefined();
    // The span picks out the argument as the author wrote it…
    expect(source.slice(semantic!.start, semantic!.end)).toBe(surface);
    // …and the two paths agree on it.
    expect(semantic!.start, source).toBe(traditional!.start);
    expect(semantic!.end, source).toBe(traditional!.end);
    expect(semantic!.line, source).toBe(traditional!.line);
  });

  it('the offset is really applied — a nested span is not just the slice-local one', () => {
    // The mutation guard. `@lokascript/semantic` reports offsets into the slice
    // it was handed, which for `on click log "shift"` starts at 9. Dropping the
    // rebase leaves args[0] at 4 instead of 13, and every assertion above that
    // compares two paths would still pass if BOTH were slice-local — this one
    // would not.
    const result = hyperscript.compileSync('on click log "shift"', {} as never) as {
      ast?: Record<string, unknown>;
    };
    const commands = result.ast?.['commands'] as Record<string, unknown>[];
    const arg = (commands[0]?.['args'] as Span[])[0];
    expect(arg.start).toBe(13);
    expect(arg.start).not.toBe(4);
  });

  it('a value the parser MATERIALIZED carries no span at all', () => {
    // A bare `focus` fills its patient in from the schema default. The word
    // `me` appears nowhere in the source, so a span for it would point at text
    // the author never wrote — absent is the honest answer, and it has to
    // survive the rebase, which would otherwise happily stamp line/column onto
    // a materialized zero.
    const result = hyperscript.compileSync('focus', {} as never) as {
      ast?: Record<string, unknown>;
    };
    const roles = result.ast?.['semanticRoles'] as Record<string, unknown> | undefined;
    expect(roles?.['patient']).toMatchObject({ name: 'me' });
    expect(roles?.['patient']).not.toHaveProperty('start');
  });
});
