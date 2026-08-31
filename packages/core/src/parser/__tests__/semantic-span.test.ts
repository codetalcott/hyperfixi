/**
 * A semantically-adopted command carries a REAL span
 *
 * `@lokascript/semantic`'s `buildAST` emits no positions at all — nested args
 * come back `undefined`, and the command node's `start: 0, end: 0, line: 1` is
 * `normalizeBuiltNode`'s placeholder. So every command the semantic path
 * adopted reported offset zero regardless of where it actually sat, and LSP
 * hover and diagnostic ranges read exactly these fields.
 *
 * The span is EXACT rather than estimated, and only because of the adoption
 * coverage gate: an adoption means the analyzer consumed `remainingInput` in
 * FULL, and that slice runs from this command's token to the end of the source.
 * So the command spans `[commandToken.start, lastConsumedToken.end]`.
 *
 * ## What is deliberately NOT fixed
 *
 * Nested ARGUMENT positions. `buildAST` never produced them, and the few that
 * do arrive (via the adapter's expression parser) are relative to each value's
 * own substring, not to the source — so there is no single offset to apply.
 * Carrying those needs the semantic parser to track spans. Measured residual:
 * 38 sites across 12 corpus sources, all nested. Filed, not faked.
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
