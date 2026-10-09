/**
 * `go back` in the language's own words (M2, vocabulary sheet B3): the
 * language's `go` and its word for `back` (grammar-words.ts), es `ir atrás`, ja
 * `バック 移動`, without the destination marker (`ir a atrás` is "go to
 * backwards"). English's `back` after the marker is still read by go's
 * generated patterns, as before; where a handler's body reads the language's
 * word through them, normalizeCommandRoles (semantic-parser.ts) makes it `back`.
 *
 * The destination is an expression, as English types `go back`, so the
 * pattern pins it as one (`valueIsExpression`): the renderer writes this
 * pattern for that value and for no other.
 */
import type { LanguagePattern, PatternToken } from '../types';

/** The language's `go` verb and the tokens of its `back`. */
export interface NativeGoBack {
  readonly go: string;
  readonly goAlternatives: readonly string[];
  readonly back: readonly string[];
  readonly verbFinal: boolean;
}

export function getGoBackPatterns(language: string, native: NativeGoBack): LanguagePattern[] {
  const verb: PatternToken = {
    type: 'literal',
    value: native.go,
    alternatives: [...native.goAlternatives, 'go'],
  };
  const pattern = (id: string, back: PatternToken[], priority: number): LanguagePattern => ({
    id,
    language,
    command: 'go',
    priority,
    template: {
      format: native.verbFinal ? 'back go' : 'go back',
      tokens: native.verbFinal ? [...back, verb] : [verb, ...back],
    },
    extraction: {
      destination: { value: 'back', valueIsExpression: true },
    },
  });
  // Above go's generated patterns (100).
  return [
    pattern(
      `go-${language}-back`,
      native.back.map(value => ({ type: 'literal', value })),
      105
    ),
  ];
}
