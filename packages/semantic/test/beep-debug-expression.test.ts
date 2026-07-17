/**
 * `beep!` debug-expression foreign→English round-trip (foreign→English validity
 * burndown, Phase 6).
 *
 * `beep! <expr>` is authored inside a `set` value with the literal ASCII `beep!`
 * prefix. In the SOV languages the clause fails every generated `set` pattern (the
 * value slot can't consume a `beep!`-headed run) and falls through to the SOV
 * verb-anchoring path, whose value builder (`tokensToSemanticValue`) used to glue
 * the tokens with the empty string AND skip translation — so `beep! 私の 値`
 * rendered `beep!私の値` (unspaced, untranslated), which the canonical parser
 * rejects on the first non-ASCII byte. It now routes the multi-token fall-through
 * through `joinExpressionTokens`: the possessive anchor fires (`私の 値` → `my
 * value`) and the source-adjacent `!` glues to `beep` (`beep!`, not the
 * canonical-rejected `beep !`). No gate signal sees a glued-literal role value, so
 * these assertions are the guard.
 *
 * Sources are the verbatim authored corpus rows (beep-debug-expression).
 */

import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';

const CORPUS: Array<[string, string]> = [
  ['ja', '$x を beep! 私の 値 に 設定 クリック で'],
  ['ko', '$x 를 beep! 내 값 에 설정 클릭 할 때'],
  ['tr', '$x i beep! benim değer e ayarla tıklama de'],
  ['bn', '$x কে beep! আমার মান তে সেট ক্লিক এ'],
  ['hi', '$x को beep! मेरा मान में सेट क्लिक पर'],
];

const hasNonAscii = (s: string): boolean => /[^\x00-\x7F]/.test(s);

describe('beep! debug-expression renders canonical English (no glue, no leak)', () => {
  it.each(CORPUS)('%s: renders `beep! my value` with no foreign leak', (lang, src) => {
    const rendered = render(parse(src, lang), 'en');
    expect(rendered).toContain('beep! my value');
    expect(rendered).not.toContain('beep!私'); // the old glued-literal shape
    expect(hasNonAscii(rendered)).toBe(false);
  });
});
