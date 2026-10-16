/**
 * The matcher's skeleton with a reader that knows no hyperscript: every role
 * slot takes one token. What the skeleton does on its own — literals, group
 * rollback, the speculative skip, spans, ranking — and that every value comes
 * from the reader (domains rethink Phase 4.2).
 */
import { describe, expect, it } from 'vitest';
import { MatchSkeleton } from '../src/parser/match-skeleton';
import type { MatchView, RoleSlot, ValueReader } from '../src/parser/value-reader';
import type { ConfidenceModel } from '../src/parser/confidence-model';
import { TokenStreamImpl } from '../src/tokenizers';
import type {
  LanguagePattern,
  LanguageToken,
  PatternMatchResult,
  PatternToken,
  SemanticRole,
  SemanticValue,
  TokenStream,
} from '../src/types';

class OneTokenReader implements ValueReader {
  readonly began: string[] = [];
  readonly owed: string[][] = [];

  constructor(private readonly view: MatchView) {}

  beginPattern(pattern: LanguagePattern): void {
    this.began.push(pattern.id);
  }

  readRole(
    tokens: TokenStream,
    slot: RoleSlot,
    captured: Map<SemanticRole, SemanticValue>
  ): boolean {
    this.owed.push(
      this.view.patternRest().flatMap(pt => (pt.type === 'literal' ? [pt.value] : []))
    );
    const token = tokens.peek();
    if (!token) return slot.optional ?? false;
    captured.set(slot.role, { type: 'literal', value: token.value });
    tokens.advance();
    return true;
  }

  maySkipSlot(patternToken: PatternToken, token: LanguageToken | null): boolean {
    return patternToken.type === 'role' && !!patternToken.optional && token?.value === 'now';
  }

  atClauseEnd(tokens: TokenStream): boolean {
    return tokens.isAtEnd();
  }

  resultFields(): Partial<PatternMatchResult> {
    return { eventSource: { type: 'literal', value: 'from-reader' } };
  }
}

const flat: ConfidenceModel = { calculate: () => 1 };

function matcher(confidence: ConfidenceModel = flat): {
  skeleton: MatchSkeleton;
  reader: () => OneTokenReader;
} {
  let reader: OneTokenReader | undefined;
  const skeleton = new MatchSkeleton(view => (reader = new OneTokenReader(view)), confidence);
  return { skeleton, reader: () => reader! };
}

function stream(text: string): TokenStream {
  let offset = 0;
  const tokens = text.split(' ').map(value => {
    const token: LanguageToken = {
      value,
      kind: 'identifier',
      position: { start: offset, end: offset + value.length },
    };
    offset += value.length + 1;
    return token;
  });
  return new TokenStreamImpl(tokens, 'xx');
}

const lit = (value: string): PatternToken => ({ type: 'literal', value });
const role = (name: string, optional = false): PatternToken => ({
  type: 'role',
  role: name as SemanticRole,
  ...(optional ? { optional } : {}),
});
const group = (...tokens: PatternToken[]): PatternToken => ({
  type: 'group',
  optional: true,
  tokens,
});

function pattern(id: string, tokens: PatternToken[], priority = 100): LanguagePattern {
  return {
    id,
    language: 'xx',
    command: 'go' as LanguagePattern['command'],
    priority,
    template: { format: id, tokens },
    extraction: {},
  };
}

const values = (result: PatternMatchResult | null) =>
  Object.fromEntries(
    [...(result?.captured ?? [])].map(([r, v]) => [r, (v as { value?: unknown }).value])
  );

describe('MatchSkeleton', () => {
  it('matches literals itself and reads every role slot through the reader', () => {
    const { skeleton, reader } = matcher();
    const result = skeleton.matchPattern(
      stream('go home now'),
      pattern('p', [lit('go'), role('destination'), lit('now')])
    );
    expect(values(result)).toEqual({ destination: 'home' });
    expect(result?.consumedTokens).toBe(3);
    expect(result?.roleStarts?.get('destination' as SemanticRole)).toBe(1);
    expect(reader().began).toEqual(['p']);
    // The view shows the reader what the pattern still owes after the slot.
    expect(reader().owed).toEqual([['now']]);
  });

  it("adds the reader's result fields", () => {
    const { skeleton } = matcher();
    const result = skeleton.matchPattern(stream('go home'), pattern('p', [lit('go'), role('x')]));
    expect(result?.eventSource).toEqual({ type: 'literal', value: 'from-reader' });
  });

  it('rolls a failed group back, restoring a value it overwrote', () => {
    const { skeleton } = matcher();
    // The group reads `b` into destination, then fails on its marker.
    const result = skeleton.matchPattern(
      stream('a b c'),
      pattern('p', [role('destination'), group(role('destination'), lit('に'))])
    );
    expect(values(result)).toEqual({ destination: 'a' });
    expect(result?.consumedTokens).toBe(1);
  });

  it('skips an optional slot when the reader allows it and the rest reaches a clause end', () => {
    const { skeleton } = matcher();
    const result = skeleton.matchPattern(
      stream('go now'),
      pattern('p', [lit('go'), role('patient', true), lit('now')])
    );
    expect(values(result)).toEqual({});
    expect(result?.consumedTokens).toBe(2);
  });

  it('ranks matches by priority, then confidence', () => {
    const byId: ConfidenceModel = { calculate: ctx => (ctx.pattern.id === 'high' ? 0.9 : 0.5) };
    const { skeleton } = matcher(byId);
    const tokens = [lit('go'), role('x')];
    const best = skeleton.matchBest(stream('go home'), [
      pattern('low', tokens),
      pattern('high', tokens),
      pattern('priority', tokens, 50),
    ]);
    expect(best?.pattern.id).toBe('high');
  });
});
