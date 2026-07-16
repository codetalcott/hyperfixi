/**
 * Expression-internal lexicon — possessive property-name normalization (Phase 1
 * of the foreign→English canonical-validity burndown).
 *
 * A possessive property authored in a non-English language (`mi valor`, `私の 値`,
 * `لي قيمة`) was captured with the foreign property surface verbatim, so the
 * foreign→English render leaked it (`put my valor into #preview`, invalid) and the
 * AST-execution path read a non-existent `.valor` DOM property. The property head
 * now normalizes to its English DOM name at parse time.
 */

import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';
import { translatePropertyName } from '../src/parser/utils/expression-lexicon';

type Node = { roles?: unknown };
function roleValue(node: Node, role: string): { type?: string; property?: string } {
  const roles =
    node.roles instanceof Map
      ? Object.fromEntries(node.roles as Map<string, unknown>)
      : (node.roles as Record<string, unknown>);
  return (roles?.[role] ?? {}) as never;
}

describe('translatePropertyName (reverse property lexicon)', () => {
  it('maps a foreign property surface to its English DOM name', () => {
    expect(translatePropertyName('es', 'valor')).toBe('value');
    expect(translatePropertyName('ja', '値')).toBe('value');
    expect(translatePropertyName('ar', 'قيمة')).toBe('value');
    expect(translatePropertyName('de', 'wert')).toBe('value');
    expect(translatePropertyName('vi', 'giá trị')).toBe('value'); // multi-word surface
  });

  it('is case-insensitive on the surface', () => {
    expect(translatePropertyName('de', 'Wert')).toBe('value');
  });

  it('passes an unlisted / already-English surface through unchanged', () => {
    expect(translatePropertyName('es', 'innerHTML')).toBe('innerHTML');
    expect(translatePropertyName('es', 'value')).toBe('value');
    expect(translatePropertyName('en', 'value')).toBe('value');
    expect(translatePropertyName('he', 'value')).toBe('value'); // he keeps `value`
    expect(translatePropertyName('zz', 'anything')).toBe('anything'); // unknown language
  });
});

describe('possessive property head normalizes to English at parse time', () => {
  // input-mirror: `on input put my value into #preview` — possessor-first `my X`,
  // captured inside an event-handler body, so assert on the canonical render.
  const inputMirror: Array<[string, string]> = [
    ['es', 'en entrada poner mi valor a #preview'],
    ['ja', '私の 値 を #preview に 置く 入力 で'],
    ['ar', 'ضع لي قيمة إلى #preview عند إدخال'],
    ['vi', 'khi nhập đặt của tôi giá trị vào #preview'],
    ['zh', '当 输入 时 放置 把 我的 值 到 #preview'],
  ];
  for (const [lang, code] of inputMirror) {
    it(`${lang}: renders "put my value" (no leaked property surface)`, () => {
      expect(render(parse(code, lang), 'en')).toContain('put my value into #preview');
    });
  }

  // bind-explicit-property: `bind $color to #picker's value` — of-possessive and
  // selector-possessive both normalize the property.
  const bindProp: Array<[string, string]> = [
    ['ja', '$color を #pickerの 値 に バインド'],
    ['es', 'bind $color a valor de #picker'],
    ['ar', 'اربط $color إلى قيمة لـ #picker'],
  ];
  for (const [lang, code] of bindProp) {
    it(`${lang}: bind source captures property-path #picker.value`, () => {
      const source = roleValue(parse(code, lang) as Node, 'source');
      expect(source.type).toBe('property-path');
      expect(source.property).toBe('value');
    });
  }

  it('renders canonical English (no leaked foreign property surface)', () => {
    expect(render(parse('私の 値 を #preview に 置く 入力 で', 'ja'), 'en')).toContain(
      'my value'
    );
    expect(render(parse('اربط $color إلى قيمة لـ #picker', 'ar'), 'en')).toContain(
      "#picker's value"
    );
  });
});
