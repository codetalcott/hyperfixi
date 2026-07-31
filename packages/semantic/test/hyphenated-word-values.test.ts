/**
 * A hyphenated word is ONE value, not a subtraction.
 *
 * Every tokenizer here splits on `-`, so `non-modal` arrives as three tokens
 * (`non`, `-`, `modal`) and the value matcher's operator run folded it into the
 * expression `non - modal` — a binaryExpression, which `OpenCommand`'s
 * `normalized === 'non-modal'` string compare can never match. The role was
 * unreachable before the `open` position swap, so the corruption was latent;
 * making the role bind without this fix would have turned a silent default into
 * a WRONG value.
 *
 * Subtraction is told apart by SOURCE ADJACENCY plus operand shape — the same
 * pair of vouchers `joinExpressionTokens`' `.`- and `!`-glue rules use. These
 * tests pin both directions: hyphenated words fold, arithmetic does not.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import { buildAST } from '../src/ast-builder/index';
import type { CommandSemanticNode } from '../src/types';

function roleOf(source: string, role: string): unknown {
  const node = parse(source, 'en') as CommandSemanticNode | null;
  expect(node, `'${source}' did not parse`).not.toBeNull();
  return node!.roles.get(role as never);
}

describe('hyphenated words fold into a single literal', () => {
  it('`open #dlg as non-modal` captures the variant verbatim', () => {
    expect(roleOf('open #dlg as non-modal', 'style')).toMatchObject({
      type: 'literal',
      value: 'non-modal',
    });
  });

  it('survives into the AST as a literal OpenCommand can string-compare', () => {
    const node = parse('open #dlg as non-modal', 'en') as CommandSemanticNode;
    const ast = buildAST(node).ast as unknown as Record<string, any>;

    // `OpenCommand.parseDialogMode` evaluates `modifiers.as` and compares the
    // lowercased string to 'non-modal'. A binaryExpression cannot match.
    expect(ast.modifiers?.as).toMatchObject({ type: 'literal', value: 'non-modal' });
    expect(ast.modifiers?.as?.type).not.toBe('binaryExpression');
  });

  it('folds runs of three (`data-list-item`)', () => {
    expect(roleOf('set x to data-list-item', 'patient')).toMatchObject({
      value: 'data-list-item',
    });
  });

  it('leaves the un-hyphenated variant alone', () => {
    // A single token never reaches the fold — it stays the plain expression
    // capture it has always been, and OpenCommand's compare works on it.
    expect(roleOf('open #dlg as modal', 'style')).toMatchObject({
      type: 'expression',
      raw: 'modal',
    });
  });
});

describe('arithmetic is not folded', () => {
  it('a SPACED subtraction stays an expression', () => {
    // `count - 1`: the operator is not source-adjacent to either operand.
    const v = roleOf('set x to count - 1', 'patient') as { type?: string; raw?: string };
    expect(v.type).toBe('expression');
    expect(v.raw).toContain('-');
  });

  it('an adjacent subtraction with a NUMERIC operand stays an expression', () => {
    // `count-1`: adjacent, but `1` is not a bare word.
    const v = roleOf('set x to count-1', 'patient') as { type?: string };
    expect(v.type).toBe('expression');
  });

  it('a spaced addition is unaffected', () => {
    const v = roleOf('set x to a + b', 'patient') as { type?: string; raw?: string };
    expect(v.type).toBe('expression');
    expect(v.raw).toContain('+');
  });
});

describe('the `open` variant round-trips through every language', () => {
  /**
   * `translate(en → L)` then `parse(L)`: the evidence the ratchet cannot give,
   * since no corpus row exercises `open`.
   *
   * Before the position swap the variant was dropped in ALL 23 — `translate`
   * rendered a bare `open #dlg` — so this table is new capability, not a
   * regression guard alone. It IS a regression guard for one row: ja needed a
   * dedicated `として` marker, because its profile style marker `で` doubles as
   * the event marker and `modal で #dlg を 開く` parses as an event handler.
   */
  const LANGS = [
    'es', 'de', 'fr', 'it', 'pt', 'ru', 'uk', 'pl', 'id', 'ms', 'sw', 'th',
    'vi', 'zh', 'he', 'ar', 'ja', 'ko', 'hi', 'bn', 'tr', 'qu', 'tl',
  ] as const;

  it.each(LANGS)('%s keeps both the target and the variant', lang => {
    for (const variant of ['non-modal', 'modal']) {
      const rendered = translate(`open #dlg as ${variant}`, 'en', lang);
      const node = parse(rendered, lang) as CommandSemanticNode | null;

      expect(node, `${lang}: "${rendered}" did not parse`).not.toBeNull();
      expect(node!.action, `${lang}: "${rendered}"`).toBe('open');

      const style = node!.roles.get('style' as never) as { value?: string; raw?: string };
      expect(style, `${lang}: "${rendered}" lost the variant`).toBeDefined();
      expect(String(style.value ?? style.raw)).toBe(variant);

      const patient = node!.roles.get('patient' as never) as { value?: string };
      expect(patient?.value, `${lang}: "${rendered}" lost the target`).toBe('#dlg');
    }
  });
});
