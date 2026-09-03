/**
 * The `unless` guard captures its WHOLE condition.
 *
 * `unless` is deliberately never folded into a conditional node — a conditional
 * is always action `if`, so folding would relabel the action and desync the
 * cross-language action-set comparison. That left it on the flat
 * `unless {condition}` command pattern, whose role capture takes ONE value and
 * stops, so the ENGLISH REFERENCE truncated its own guard:
 *
 *   unless I match .disabled toggle .selected
 *     -> unless { condition: expression "I" }     <- `match .disabled` gone
 *
 * That is a correctness bug in English before it is a fidelity one: the guard
 * the runtime evaluates is not the guard the author wrote, and `I` alone is
 * truthy where `I match .disabled` may be false. It also poisoned every
 * multilingual signal, because all 24 languages are scored against this
 * reference — a translation could "match" by reproducing the truncation.
 *
 * `tryParseUnlessGuard` reuses the conditional block's condition splitter
 * (operator-aware, copula-guarded) and then FLATTENS the result back to the
 * `[unless(condition), …body]` shape, so the action set is unchanged and only
 * the condition value gains the rest of the expression.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function flatten(node: SemanticNode | null): CommandSemanticNode[] {
  const out: CommandSemanticNode[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const rec = n as Record<string, unknown>;
    if (typeof rec.action === 'string') out.push(n as CommandSemanticNode);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[f];
      if (Array.isArray(kids)) kids.forEach(walk);
    }
  };
  walk(node);
  return out;
}
const find = (n: SemanticNode | null, action: string) =>
  flatten(n).find(c => c.action === action) ?? null;
const cond = (n: CommandSemanticNode | null) =>
  n?.roles.get('condition' as never) as { type?: string; raw?: string } | undefined;

describe('the en unless guard keeps its whole condition', () => {
  it.each([
    ['unless I match .disabled toggle .selected', 'I match .disabled'],
    ['unless #x.value is empty toggle .a', '#x.value is empty'],
  ])('standalone: %s', (source, expected) => {
    const node = parse(source, 'en');
    const guard = find(node, 'unless');
    expect(guard, `no unless node for: ${source}`).not.toBeNull();
    expect(cond(guard)?.raw).toBe(expected);
  });

  it('standalone also keeps the guarded command — it used to vanish', () => {
    // The flat pattern consumed `unless` + one value and stopped, so the whole
    // body was dropped from a standalone guard.
    const node = parse('unless I match .disabled toggle .selected', 'en');
    const toggle = find(node, 'toggle');
    expect(toggle).not.toBeNull();
    expect((toggle!.roles.get('patient' as never) as { value?: unknown })?.value).toBe('.selected');
  });

  it('in-handler: the guard and its body stay siblings, action set unchanged', () => {
    const node = parse('on click unless I match .disabled toggle .selected', 'en');
    const actions = flatten(node).map(c => c.action);
    expect(actions).toContain('on');
    expect(actions).toContain('unless');
    expect(actions).toContain('toggle');
    // NOT folded into a conditional — that would relabel the action to `if`.
    expect(actions).not.toContain('if');
    expect(cond(find(node, 'unless'))?.raw).toBe('I match .disabled');
  });

  it('a plain `if` still folds to a conditional (unless-only change)', () => {
    const node = parse('on blur if my value is empty add .error to me end', 'en');
    const conditional = flatten(node).find(c => (c as { kind?: string }).kind === 'conditional');
    expect(conditional).toBeDefined();
    expect(cond(conditional as CommandSemanticNode)?.raw).toBe('my value is empty');
  });
});
