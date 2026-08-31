/**
 * Implicit schema defaults stay on `semanticRoles`, out of `args`/`modifiers`.
 *
 * 22 schema roles across 21 commands declare a `default` (20 of them `me`, plus
 * `by: 1` on increment/decrement). The pattern matcher materializes them tagged
 * `implicit: true`; the AST builder withholds THOSE from the syntax surface
 * (`args`/`modifiers`) and keeps them on the semantics surface
 * (`semanticRoles`).
 *
 * Why the split rather than injecting into `args`: the runtime already applies
 * every one of these defaults at execution (measured — all rows below behave
 * identically with the value absent), so injecting would maintain the same
 * default table in two live places AND oblige every other AST producer (the
 * traditional parser, the hybrid template parser, lite, AOT) to inject it too,
 * or consumers could not rely on it anyway. Meanwhile `args` would claim
 * `focus me` was typed when `focus` was.
 *
 * This is also what makes the two English parse paths agree: the convergence
 * triage's `implicit-me` family went 7 -> 0.
 */

import { describe, it, expect } from 'vitest';
import { parseSemantic, buildAST } from '../src/index';

type Ast = {
  args?: unknown[];
  modifiers?: Record<string, unknown>;
  semanticRoles?: Record<string, unknown>;
};

function astFor(code: string, lang = 'en'): Ast {
  const parsed = parseSemantic(code, lang);
  expect(parsed.node, `no parse for: ${code}`).toBeTruthy();
  const built = buildAST(parsed.node!) as { ast?: Ast };
  expect(built.ast, `no AST for: ${code}`).toBeTruthy();
  return built.ast!;
}

describe('implicit schema defaults', () => {
  describe('are withheld from the syntax surface (args / modifiers)', () => {
    // The six bare no-target commands: the whole `implicit-me` family from the
    // parse-path convergence triage.
    it.each(['blur', 'close', 'focus', 'open', 'reset', 'settle'])(
      'bare `%s` carries NO positional arg',
      code => {
        expect(astFor(code).args ?? []).toEqual([]);
      }
    );

    it('`toggle .active` gets no `on` modifier from the destination default', () => {
      const ast = astFor('toggle .active');
      expect(ast.args).toHaveLength(1);
      expect(ast.modifiers?.on).toBeUndefined();
    });

    it('`increment :x` gets no `by` modifier from the quantity default', () => {
      // The one non-`me` default in the schemas (`by: 1`), so it proves the rule
      // is about the `implicit` TAG and not about the literal value `me`.
      expect(astFor('increment :x').modifiers?.by).toBeUndefined();
    });

    it('`transition opacity to 0.5` gets no `on` modifier', () => {
      const ast = astFor('transition opacity to 0.5');
      expect(ast.modifiers?.to).toBeDefined();
      expect(ast.modifiers?.on).toBeUndefined();
    });

    it('applies in every language, not just English', () => {
      // The tag is set by the matcher, which is language-agnostic — but the
      // corpus renders all 24 languages through this same builder, so a
      // regression here would corrupt every one of them at once.
      for (const [code, lang] of [
        ['토글 .active', 'ko'],
        ['بدّل .active', 'ar'],
        ['#a を トグル', 'ja'],
      ] as const) {
        const ast = astFor(code, lang);
        expect(ast.modifiers?.on, `${lang}: ${code}`).toBeUndefined();
      }
    });
  });

  describe('are KEPT on the semantics surface (semanticRoles)', () => {
    // The half that makes this a relocation rather than a deletion. A consumer
    // that wants a bare `focus`'s resolved target reads it here.
    it.each(['blur', 'close', 'focus', 'open', 'reset', 'settle'])(
      'bare `%s` still resolves its target on semanticRoles.patient',
      code => {
        expect(astFor(code).semanticRoles?.patient).toMatchObject({
          type: 'contextReference',
          contextType: 'me',
        });
      }
    );

    it('`toggle .active` keeps the resolved destination', () => {
      expect(astFor('toggle .active').semanticRoles?.destination).toMatchObject({
        type: 'contextReference',
        contextType: 'me',
      });
    });

    it('`increment :x` keeps the resolved quantity', () => {
      expect(astFor('increment :x').semanticRoles?.quantity).toMatchObject({ value: 1 });
    });
  });

  describe('leave an AUTHORED value alone', () => {
    // The distinction the whole change rests on: same value, same role, but
    // written by the author, so it is syntax and belongs in `args`.
    it('`focus me` keeps its positional arg', () => {
      const ast = astFor('focus me');
      expect(ast.args).toHaveLength(1);
      expect(ast.args?.[0]).toMatchObject({ type: 'contextReference', contextType: 'me' });
    });

    it('`toggle .active on #panel` keeps its `on` modifier', () => {
      expect(astFor('toggle .active on #panel').modifiers?.on).toMatchObject({
        type: 'selector',
        value: '#panel',
      });
    });

    it('`increment :x by 5` keeps its `by` modifier', () => {
      expect(astFor('increment :x by 5').modifiers?.by).toMatchObject({ value: 5 });
    });

    it('an authored `me` is indistinguishable from a bare command ON semanticRoles', () => {
      // Both resolve to the same target — which is exactly why `args` has to be
      // the surface that separates them.
      expect(astFor('focus').semanticRoles?.patient).toEqual(
        astFor('focus me').semanticRoles?.patient
      );
      expect(astFor('focus').args ?? []).not.toEqual(astFor('focus me').args);
    });
  });
});
