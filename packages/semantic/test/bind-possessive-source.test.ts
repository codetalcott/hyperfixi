/**
 * `bind <var> to <element>'s <property>` — the possessive SOURCE role.
 *
 * These tests deliberately do NOT assert "does it parse". It always parsed, at
 * confidence 1.0 — the bug was that seven languages captured only the property
 * WORD and silently dropped the owner selector, leaving `de #picker` unconsumed:
 *
 *     en : bind.source:property-path(#picker, value)     ✓
 *     es : bind.source:expression("valor")               ✗  `de #picker` dropped
 *
 * They assert on the captured role TYPE and on the OWNER surviving into it, plus
 * the absence of the `unconsumed-input` diagnostic.
 *
 * Two renderings exist across the 24 languages, and both must land on the same
 * `property-path`:
 *   - selector-first (en `#picker's value`, ja `#pickerの 値`) — handled by
 *     tryMatchPossessiveSelectorExpression, correct before this fix;
 *   - property-first (es `valor de #picker`, ar `قيمة لـ #picker`) — handled by
 *     tryMatchOfPossessiveExpression, which required a selector property head
 *     and so never fired on a bare word.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import type { CommandSemanticNode, PropertyPathValue, SelectorValue } from '../src/types';

/** Parse and return the `source` role, asserting the node is a bind command. */
function bindSource(code: string, language: string) {
  const node = parse(code, language) as CommandSemanticNode;
  expect(node.action).toBe('bind');
  return node.roles.get('source');
}

function unconsumedSpans(code: string, language: string): string[] {
  const node = parse(code, language);
  return (node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input').map(d => d.message);
}

/** `bind $color to #picker's value` — corpus row `bind-explicit-property`. */
const EXPLICIT_PROPERTY: Array<[language: string, code: string, property: string]> = [
  // Selector-first renderings — these already worked; they are regression locks.
  ['en', "bind $color to #picker's value", 'value'],
  ['ja', '$color を #pickerの 値 に バインド', '値'],
  ['ko', '$color 를 #picker의 값 에 바인드', '값'],
  ['zh', '绑定 $color 到 #picker的 值', '值'],
  // Property-first renderings — these dropped the owner before this fix.
  ['es', 'bind $color a valor de #picker', 'valor'],
  ['pt', 'bind $color para valor de #picker', 'valor'],
  ['fr', 'bind $color à valeur de #picker', 'valeur'],
  ['de', 'bind $color zu wert von #picker', 'wert'],
  ['id', 'bind $color ke nilai dari #picker', 'nilai'],
  ['sw', 'bind $color kwa thamani ya #picker', 'thamani'],
  ['ar', 'اربط $color إلى قيمة لـ #picker', 'قيمة'],
];

/** `bind $message to #status's textContent` — corpus row `bind-non-form-display`. */
const NON_FORM_DISPLAY: Array<[language: string, code: string]> = [
  ['es', 'bind $message a textContent de #status'],
  ['pt', 'bind $message para textContent de #status'],
  ['fr', 'bind $message à textContent de #status'],
  ['de', 'bind $message zu textContent von #status'],
  ['id', 'bind $message ke textContent dari #status'],
  ['sw', 'bind $message kwa textContent ya #status'],
  ['ar', 'اربط $message إلى textContent لـ #status'],
];

describe('bind: possessive source captures the owner (bind-explicit-property)', () => {
  it.each(EXPLICIT_PROPERTY)('%s captures property-path(#picker, %s)', (lang, code, property) => {
    const source = bindSource(code, lang) as PropertyPathValue | undefined;

    expect(source?.type).toBe('property-path');
    expect(source?.property).toBe(property);
    expect((source?.object as SelectorValue)?.value).toBe('#picker');
  });

  it.each(EXPLICIT_PROPERTY)('%s consumes its whole input', (lang, code) => {
    expect(unconsumedSpans(code, lang)).toEqual([]);
  });
});

describe('bind: possessive source captures the owner (bind-non-form-display)', () => {
  it.each(NON_FORM_DISPLAY)('%s captures property-path(#status, textContent)', (lang, code) => {
    const source = bindSource(code, lang) as PropertyPathValue | undefined;

    expect(source?.type).toBe('property-path');
    expect(source?.property).toBe('textContent');
    expect((source?.object as SelectorValue)?.value).toBe('#status');
  });

  it.each(NON_FORM_DISPLAY)('%s consumes its whole input', (lang, code) => {
    expect(unconsumedSpans(code, lang)).toEqual([]);
  });
});

describe('bind: a bare element source is NOT folded into a property-path', () => {
  // `bind-auto-detect` has no possessive. Opening `bind.source` to the
  // of-possessive matcher must not make a lone selector grow a phantom owner,
  // nor let the post-nominal matcher (same gate) read the next token as a
  // possessor in the `after-object` profiles (ar/id/sw).
  const AUTO_DETECT: Array<[language: string, code: string]> = [
    ['en', 'bind $greeting to #name-input'],
    ['es', 'bind $greeting a #name-input'],
    ['ar', 'اربط $greeting إلى #name-input'],
    ['id', 'bind $greeting ke #name-input'],
    ['sw', 'bind $greeting kwa #name-input'],
  ];

  it.each(AUTO_DETECT)('%s keeps a bare selector source', (lang, code) => {
    const source = bindSource(code, lang);

    expect(source?.type).toBe('selector');
    expect((source as SelectorValue | undefined)?.value).toBe('#name-input');
  });
});

describe('bind: a reference-shaped source head is never a property', () => {
  // `$total`/`:total` tokenize as bare identifiers, so a naive bare-word
  // property head would fold `$total de #x` into property-path(#x, $total).
  // isBareWordPropertyHead rejects sigil-led identifiers.
  it('does not fold a $-global into an of-possessive property', () => {
    const source = bindSource('bind $color a $total', 'es');

    expect(source?.type).not.toBe('property-path');
  });
});
