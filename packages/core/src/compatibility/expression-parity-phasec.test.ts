/**
 * Expression-parity Phase C — regression guards (source-level, run in CI's unit
 * job) mirroring the upstream cases fixed in the post-#236 parity follow-up.
 *
 * Phase 1: classRef CSS tokenization + escaping. Upstream `_hyperscript` stores
 * a bare class ref as the LITERAL class name (author backslashes stripped) and
 * re-escapes CSS-special chars (`escapeSelector`: `[:&()[\]\/]`) before
 * querySelectorAll. We match that for bare `.`-refs; pseudo-class selection
 * stays on query refs (`<button:hover/>`).
 *
 * These run under happy-dom; querySelectorAll escape handling is exercised in
 * the chromium parity harness (expressions.spec.ts) too.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tokenize, TokenKind } from '../parser/tokenizer';
import { evaluateExpressionFromSourceSync } from '../parser/runtime';
import { evalHyperScript } from './eval-hyperscript';
import { createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

describe('expression parity (Phase C) — Phase 1: classRef tokenization + escaping', () => {
  describe('tokenization captures the literal class name', () => {
    const cases: Array<[string, string]> = [
      ['.c1:foo:bar', '.c1:foo:bar'], // multiple colons (`:` is a literal class char)
      ['.-c1', '.-c1'], // leading minus
      ['.-c1\\/22', '.-c1/22'], // escaped slash → literal `/`
      [
        '.group-\\[:nth-of-type\\(3\\)_\\&\\]:block',
        '.group-[:nth-of-type(3)_&]:block', // tailwind: backslashes stripped to literal
      ],
    ];
    for (const [src, expected] of cases) {
      it(`tokenizes ${JSON.stringify(src)} → ${JSON.stringify(expected)}`, () => {
        const tokens = tokenize(src);
        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toMatchObject({ kind: TokenKind.SELECTOR, value: expected });
      });
    }
  });

  describe('DOM resolution matches the literal class', () => {
    let context: ExecutionContext;
    const made: Element[] = [];

    const mount = (className: string) => {
      const el = document.createElement('div');
      el.className = className;
      document.body.appendChild(el);
      made.push(el);
      return el;
    };

    beforeEach(() => {
      context = createMockHyperscriptContext();
    });
    afterEach(() => {
      while (made.length) made.pop()!.remove();
    });

    const resolves = (className: string, source: string) => {
      const el = mount(className);
      const result = evaluateExpressionFromSourceSync(source, context) as Element[];
      expect(Array.from(result)).toContain(el);
    };

    it('.c1:foo:bar matches class "c1:foo:bar"', () => resolves('c1:foo:bar', '.c1:foo:bar'));
    it('.-c1 matches class "-c1"', () => resolves('-c1', '.-c1'));
    it('.-c1\\/22 matches class "-c1/22"', () => resolves('-c1/22', '.-c1\\/22'));
    it('tailwind insanity matches the literal class', () =>
      resolves('group-[:nth-of-type(3)_&]:block', '.group-\\[:nth-of-type\\(3\\)_\\&\\]:block'));

    it('bare .btn:hover is a LITERAL class, not a pseudo (upstream-faithful)', () => {
      // Matches a class literally named `btn:hover`; pseudo selection is on
      // query refs (`<button:hover/>`). Do not regress to pseudo semantics here.
      resolves('btn:hover', '.btn:hover');
    });
  });
});

/**
 * Phase 2: a bare class/selector now works as an expression OPERAND after `of`,
 * `some`, `no` (`some .aClass`, `the display of .foo…`). Phase 3: `the X of Y's Z`
 * binds `'s` tighter than `of` (`the display of #foo's style` = the display of
 * (#foo's style)), and `the X of <collection>` maps the read over every member.
 */
describe('expression parity (Phase C) — Phase 2/3: selector operands + of-form possessive', () => {
  const made: Element[] = [];
  afterEach(() => {
    while (made.length) made.pop()!.remove();
  });
  const mount = (html: string) => {
    const tpl = document.createElement('div');
    tpl.innerHTML = html;
    const el = tpl.firstElementChild!;
    document.body.appendChild(el);
    made.push(el);
    return el;
  };

  it('some <bare selector> evaluates (false for an empty selector)', async () => {
    expect(await evalHyperScript('some .aClassThatDoesNotExist')).toBe(false);
  });

  it('some <bare selector> is true when the selector matches', async () => {
    mount("<div class='exists-marker'></div>");
    expect(await evalHyperScript('some .exists-marker')).toBe(true);
  });

  describe('the <prop> of <ref>’s <prop> binds possessive tighter than of', () => {
    beforeEach(() => mount("<div id='foo' class='foo' style='display: inline'></div>"));

    it("idref:   the display of #foo's style → 'inline'", async () => {
      expect(await evalHyperScript("the display of #foo's style")).toBe('inline');
    });
    it("classref: the display of .foo's style → ['inline'] (maps over collection)", async () => {
      expect(await evalHyperScript("the display of .foo's style")).toEqual(['inline']);
    });
    it("queryref: the display of <.foo/>'s style → ['inline']", async () => {
      expect(await evalHyperScript("the display of <.foo/>'s style")).toEqual(['inline']);
    });
    it('scalar `the X of Y` (no trailing possessive) is unchanged', async () => {
      expect(await evalHyperScript('the id of #foo')).toBe('foo');
    });
  });
});

/**
 * Phase 4: `.{expr}` / `#{expr}` template refs interpolate the inner EXPRESSION
 * (not just a bare variable) — `.{'c1'}` → `.c1`, `#{'d1'}` → `#d1`. Query-ref
 * `$`/`${}` interpolation (`<#$id/>`, `<[foo='${x}']/>`) still needs harness
 * locals-threading and stays a documented gap.
 */
describe('expression parity (Phase C) — Phase 4: .{expr} / #{expr} template refs', () => {
  const made: Element[] = [];
  afterEach(() => {
    while (made.length) made.pop()!.remove();
  });
  const mount = (html: string) => {
    const tpl = document.createElement('div');
    tpl.innerHTML = html;
    const el = tpl.firstElementChild!;
    document.body.appendChild(el);
    made.push(el);
    return el;
  };

  it("classRef literal template: .{'c1'} matches class c1", async () => {
    mount("<div class='c1'></div>");
    expect(Array.from((await evalHyperScript(".{'c1'}")) as ArrayLike<unknown>)).toHaveLength(1);
  });
  it("idRef literal template: #{'d1'} resolves the element", async () => {
    const el = mount("<div id='d1'></div>");
    expect(await evalHyperScript("#{'d1'}")).toBe(el);
  });
  it('classRef variable template: .{cls} reads the local', async () => {
    mount("<div class='c1'></div>");
    expect(
      Array.from((await evalHyperScript('.{cls}', { locals: { cls: 'c1' } })) as ArrayLike<unknown>)
    ).toHaveLength(1);
  });
});

/**
 * Phase 5: dot member-access maps over a classRef/queryRef collection, matching
 * the possessive form — `.cb.checked` === `.cb's checked` → [true, false].
 */
describe('expression parity (Phase C) — Phase 5: member access over a collection', () => {
  const made: Element[] = [];
  afterEach(() => {
    while (made.length) made.pop()!.remove();
  });
  beforeEach(() => {
    const wrap = document.createElement('div');
    wrap.innerHTML =
      "<input class='cb' type='checkbox' checked /><input class='cb' type='checkbox' />";
    for (const el of Array.from(wrap.children)) {
      document.body.appendChild(el);
      made.push(el);
    }
  });

  it('.cb.checked maps .checked over the collection', async () => {
    expect(await evalHyperScript('.cb.checked')).toEqual([true, false]);
  });
  it('dot form agrees with the possessive form', async () => {
    expect(await evalHyperScript('.cb.checked')).toEqual(await evalHyperScript(".cb's checked"));
  });
});
