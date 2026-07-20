/**
 * pick-command.test.ts — arc 1 of the pick-text-range burndown.
 *
 * The schema-generated `pick {patient} [from {source}]` pattern modeled the wrong
 * command and silently truncated everything after the first word: the en
 * reference of the corpus row `on click pick characters 0 to 5 of #note` parsed
 * to `{patient:"characters"}` and rendered `pick characters`, which the canonical
 * hyperscript.org parser rejects (EOF) — the lone entry in
 * baselines/canonical-validity.json.
 *
 * Arc 1 adds the handcrafted `pick-en-variant` pattern + the pick-range
 * assembler + the pick AST mapper so the canonical `first|last|random|
 * item(s)|character(s) … of <root>` variants parse, round-trip, and build the
 * core PickCommand modifiers. Parsing non-null is NOT the assertion here — the
 * captured roles, the rendered surface, and the built AST are.
 *
 * (`match`/`matches` is deferred — see the leaf's header for the render-selection
 * collision reason. The `..` range separator is likewise deferred: it tokenizes
 * as two bare `.` tokens.)
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';
import { buildAST } from '../src/ast-builder';
import type { CommandSemanticNode } from '../src/types';

function roleText(node: CommandSemanticNode, role: string): string | undefined {
  const v = node.roles.get(role as never) as { type: string; value?: unknown; raw?: string } | undefined;
  if (!v) return undefined;
  if (v.type === 'expression') return v.raw;
  return v.value !== undefined ? String(v.value) : undefined;
}

describe('pick — canonical variant/range parsing (arc 1)', () => {
  it('captures method/patient/source for the corpus range row', () => {
    const node = parse('pick characters 0 to 5 of #note', 'en') as CommandSemanticNode;
    expect(node.action).toBe('pick');
    expect(roleText(node, 'method')).toBe('characters');
    expect(roleText(node, 'patient')).toBe('0 to 5');
    expect(node.roles.get('source' as never)?.value).toBe('#note');
    expect(node.roles.get('source' as never)?.type).toBe('selector');
  });

  it('folds the trailing range mode into the patient value', () => {
    const node = parse('pick characters 0 to 5 inclusive of #note', 'en') as CommandSemanticNode;
    expect(roleText(node, 'patient')).toBe('0 to 5 inclusive');
  });
});

describe('pick — English round-trip render', () => {
  const rows = [
    'on click pick characters 0 to 5 of #note', // the gate row
    'pick characters 0 to 5 of #note',
    'pick characters 0 to 5 inclusive of #note',
    'pick items 1 to 3 of arr',
    'pick first 3 of arr',
    'pick last 2 of arr',
    'pick random 2 of arr',
  ];
  for (const row of rows) {
    it(`round-trips: ${row}`, () => {
      const node = parse(row, 'en');
      expect(render(node, 'en')).toBe(row);
    });
  }
});

describe('pick — AST mapper bridges to the core PickCommand contract', () => {
  it('range row → variant/rangeStart/rangeEnd/rangeMode + source arg', () => {
    const { ast } = buildAST(parse('pick characters 0 to 5 of #note', 'en'));
    expect(ast.name).toBe('pick');
    expect(ast.args?.[0]).toMatchObject({ type: 'selector', value: '#note' });
    expect(ast.modifiers?.variant).toMatchObject({ value: 'range' });
    expect(ast.modifiers?.rangeStart).toMatchObject({ value: 0 });
    expect(ast.modifiers?.rangeEnd).toMatchObject({ value: 5 });
    expect(ast.modifiers?.rangeMode).toMatchObject({ value: 'default' });
  });

  it('inclusive range → rangeMode inclusive', () => {
    const { ast } = buildAST(parse('pick characters 0 to 5 inclusive of #note', 'en'));
    expect(ast.modifiers?.rangeMode).toMatchObject({ value: 'inclusive' });
  });

  it('first N → variant first + count', () => {
    const { ast } = buildAST(parse('pick first 3 of arr', 'en'));
    expect(ast.modifiers?.variant).toMatchObject({ value: 'first' });
    expect(ast.modifiers?.count).toMatchObject({ value: 3 });
    expect(ast.args?.[0]).toMatchObject({ name: 'arr' });
  });

  it('random N → variant random + count', () => {
    const { ast } = buildAST(parse('pick random 2 of arr', 'en'));
    expect(ast.modifiers?.variant).toMatchObject({ value: 'random' });
    expect(ast.modifiers?.count).toMatchObject({ value: 2 });
  });
});

describe('pick — range endpoint keywords start/end (arc 2 probe)', () => {
  // Arc 1's assembler accepts the `start`/`end` range keywords as endpoints
  // (tryConsumePickRangeOperand, by normalized form) but never had a test.
  // Probed 2026-07-20: all three fold and round-trip byte-identically in en.
  const rows = [
    'pick characters start to end of #note',
    'pick characters start to 5 of #note',
    'pick characters 0 to end of #note',
  ];
  for (const row of rows) {
    it(`round-trips: ${row}`, () => {
      const node = parse(row, 'en');
      expect(render(node, 'en')).toBe(row);
    });
  }

  it('start/end endpoints reach the AST as rangeStart/rangeEnd literals', () => {
    const { ast } = buildAST(parse('pick characters start to end of #note', 'en'));
    expect(ast.modifiers?.variant).toMatchObject({ value: 'range' });
    expect(ast.modifiers?.rangeStart).toMatchObject({ value: 'start' });
    expect(ast.modifiers?.rangeEnd).toMatchObject({ value: 'end' });
  });
});

describe('pick — legacy forms unaffected (regression guard)', () => {
  it('bare `pick colors` still builds a single-arg command with no variant', () => {
    const node = parse('pick colors', 'en') as CommandSemanticNode;
    expect(node.action).toBe('pick');
    const { ast } = buildAST(node);
    expect(ast.name).toBe('pick');
    expect(ast.args?.[0]).toMatchObject({ name: 'colors' });
    // No canonical-variant modifiers were fabricated for the legacy form.
    expect(ast.modifiers?.variant).toBeUndefined();
  });

  it('folds a foreign range separator to canonical English (arc 3: es `a`)', () => {
    // Arc 2 kept the foreign separators dormant (this test asserted the fold
    // declined); arc 3 armed them: the per-language separator table
    // (PICK_RANGE_SEPARATORS_BY_LANG) recognizes es `a` inside the es pick
    // variant pattern's patient slot, and the fold synthesizes canonical
    // ENGLISH — so the pick mapper's `to`-split and the en render work
    // unchanged for every language.
    const node = parse('escoger characters 0 a 5 de #note', 'es') as CommandSemanticNode;
    expect(node.action).toBe('pick');
    expect(roleText(node, 'patient')).toBe('0 to 5');
    expect(roleText(node, 'method')).toBe('characters');
  });
});

describe('pick — 24-language corpus row round-trip (arc 3)', () => {
  // The exact corpus surface per language (generated rows read from a fresh
  // patterns.db; the SOV six + qu are the sovPickRangeRule renders, co-evolved
  // with the verb-final patterns — change either side only in lockstep).
  // Every one must parse faithfully and render the canonical English row the
  // hyperscript.org parser accepts: this is the surface the R4 canonical-
  // validity gate consumes, the last 23 entries of the foreign allowlist.
  const ROWS: Array<[string, string]> = [
    ['ar', 'اختر حروف 0 إلى 5 من #note عند نقر'],
    ['bn', '#note র অক্ষর 0 থেকে 5 কে ক্লিক এ বাছুন'],
    ['de', 'bei klick auswählen Zeichen 0 zu 5 von #note'],
    ['es', 'en clic escoger caracteres 0 a 5 de #note'],
    ['fr', 'sur clic choisir caractères 0 à 5 de #note'],
    ['he', 'ב לחיצה בחר את תווים 0 על 5 of #note'],
    ['hi', '#note का अक्षर 0 से 5 को क्लिक पर चुनें'],
    ['id', 'pada klik pilih karakter 0 ke 5 dari #note'],
    ['it', 'su clic scegliere caratteri 0 in 5 di #note'],
    ['ja', '#note の 文字 0 から 5 を クリック で 選択'],
    ['ko', '#note 의 문자 0 부터 5 를 클릭 할 때 선택'],
    ['ms', 'apabila click pilih aksara 0 ke 5 daripada #note'],
    ['pl', 'gdy kliknięcie wybierz znaki 0 do 5 z #note'],
    ['pt', 'em clique escolher caracteres 0 para 5 de #note'],
    ['qu', '#note pa sanampa 0 kama 5 ta ñitiy pi akllay'],
    ['ru', 'при клик выбрать символы 0 в 5 из #note'],
    ['sw', 'kwenye bonyeza chagua herufi 0 kwa 5 ya #note'],
    ['th', 'เมื่อ คลิก เลือก อักขระ 0 ใน 5 ของ #note'],
    ['tl', 'pumili karakter 0 sa 5 ng #note kapag click'],
    ['tr', '#note nin karakterler 0 ile 5 i tıklama de seç'],
    ['uk', 'при клік вибрати символи 0 в 5 з #note'],
    ['vi', 'khi nhấp chọn ký tự 0 vào 5 của #note'],
    ['zh', '当 点击 时 选取 把 字符 0 到 5 的 #note'],
  ];

  it.each(ROWS)('%s row renders the canonical English pick range', (lang, src) => {
    const node = parse(src, lang);
    expect(node).not.toBeNull();
    expect(render(node!, 'en')).toBe('on click pick characters 0 to 5 of #note');
  });
});
