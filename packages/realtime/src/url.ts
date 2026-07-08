/**
 * Bare-URL consumption for feature headers (`socket Chat ws://host:8080 …`,
 * `eventsource Stream from /events …`).
 *
 * The hyperfixi tokenizer has no URL token: `ws://localhost:8080` lexes as
 * seven ADJACENT tokens (`ws` `:` `/` `/` `localhost` `:` `8080`). The
 * keyword that follows a URL (`on` / `end`) is always separated by
 * whitespace, so a gap in token adjacency (`next.start !== prev.end`) is a
 * reliable terminator. The URL text is reconstructed from the raw source via
 * `getInputSlice`, which is immune to token-classification quirks.
 */

import type { FeatureParserCtx } from './types';

export function parseUrlExpression(p: FeatureParserCtx): string | null {
  if (p.isAtEnd() || p.check('end') || p.check('on')) return null;

  const first = p.peek();

  // Quoted URL — the tokenizer keeps the quotes in the token value.
  if (first.kind === 'string') {
    p.advance();
    return first.value.slice(1, -1);
  }

  let last = p.advance();
  while (!p.isAtEnd() && p.peek().start === last.end) {
    last = p.advance();
  }
  return p.getInputSlice(first.start, last.end);
}
