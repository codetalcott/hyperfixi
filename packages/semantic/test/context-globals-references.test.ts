/**
 * DOM context globals (`document`, `window`, `detail`) as reference-typed values.
 *
 * These tests deliberately do NOT assert "does it parse". The `repeat` always
 * parsed — the bug was that `document` was absent from `DEFAULT_REFERENCES`, so a
 * foreign surface (ja document-word, es documento, ru dokument-word) lexed as a
 * keyword, failed `isValidReference`, degraded to a `literal`, and — rejected by
 * the `repeat.source` slot's `expectedTypes` — either dropped the role or leaked
 * the raw surface verbatim into the rendered English:
 *
 *     en : repeat.source:reference("document")    -> "from document"    ok
 *     ja : repeat.source dropped / leaked         -> "from <ja word>"   bug
 *     es : repeat.source:expression("documento")  -> "from documento"   bug (parses clean, wrong element)
 *
 * The es case is the load-bearing one: `documento` is a valid identifier, so the
 * canonical parser ACCEPTS it and the foreign-validity gate stays green while the
 * behavior silently listens on an undefined element. No R0-R3 signal and no gate
 * sees this — only this assertion does. So the Latin-script row is not optional.
 *
 * Inputs are verbatim lines from the authored `behavior-draggable` corpus rows
 * (never hand-written foreign source — see the probe-recipe footgun).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';
import { isValidReference } from '../src/types';
import type { CommandSemanticNode, ReferenceValue } from '../src/types';

/** True if any character is outside 7-bit ASCII — i.e. a foreign surface leaked. */
const hasNonAscii = (s: string): boolean => [...s].some(c => c.charCodeAt(0) > 127);

/** Parse and return the `source` role, asserting the node is a repeat command. */
function repeatSource(code: string, language: string) {
  const node = parse(code, language) as CommandSemanticNode;
  expect(node.action).toBe('repeat');
  return node.roles.get('source');
}

function unconsumedSpans(code: string, language: string): string[] {
  const node = parse(code, language);
  return (node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input').map(d => d.message);
}

describe('context globals are valid references', () => {
  // Guards the DEFAULT_REFERENCES widening and the ReferenceValue union. If either
  // is reverted, document/window/detail stop round-tripping and these flip false.
  it.each(['document', 'window', 'detail', 'body'])('%s is a valid reference', name => {
    expect(isValidReference(name)).toBe(true);
  });
});

describe('document captured as a reference in repeat-from-document', () => {
  // Verbatim `behavior-draggable` corpus lines (ja/es/ru).
  const rows: Array<[string, string]> = [
    ['ja', 'まで イベント pointerup を 繰り返し ドキュメント から'],
    ['es', 'repetir hasta evento pointerup de documento'],
    ['ru', 'повторить до событие pointerup из документ'],
  ];

  it.each(rows)('%s: source is reference("document")', (language, code) => {
    const source = repeatSource(code, language);
    expect(source?.type).toBe('reference');
    expect((source as ReferenceValue).value).toBe('document');
  });

  it.each(rows)('%s: renders canonical "from document" with no leak', (language, code) => {
    const node = parse(code, language);
    const rendered = render(node, 'en');
    expect(rendered).toContain('from document');
    // The whole point: no foreign surface survives into the English render.
    expect(hasNonAscii(rendered)).toBe(false);
  });

  it.each(rows)('%s: no unconsumed input (the literal-rejected-by-slot failure mode)', (language, code) => {
    expect(unconsumedSpans(code, language)).toEqual([]);
  });
});
