/**
 * Descriptor-vs-runtime contract tests (Arc F follow-up).
 *
 * The `ast-shape-consistency` gate asks whether a descriptor's modifier KEYS
 * agree with the schema's English markers. That is a necessary check and not a
 * sufficient one: a descriptor can name perfectly consistent keys and still
 * hand the runtime command an AST it cannot read, because the marker data says
 * nothing about which slot — arg or modifier — the command consumes.
 *
 * These tests close that gap for the commands where the two disagreed, by
 * asserting the built AST against what the core command's `parseInput`
 * actually reads. The contract each one pins is quoted from the runtime.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import { buildAST } from '../src/ast-builder/index';
import type { CommandSemanticNode } from '../src/types';

/** Parse English source and return the built command node (unwrapping warnings). */
function astOf(source: string): Record<string, any> {
  const node = parse(source, 'en') as CommandSemanticNode | null;
  expect(node, `'${source}' did not parse`).not.toBeNull();
  const built = buildAST(node!) as unknown as Record<string, any>;
  return (built.ast ?? built) as Record<string, any>;
}

describe('default — the target variable must survive into args[0]', () => {
  // packages/core/src/commands/data/default.ts parseInput:
  //   target = evaluate(raw.args[0])
  //   value  = evaluate(raw.modifiers.to)  (falling back to raw.args[1])
  // The semantic parse binds destination=':x', patient=0 — so a descriptor
  // reading patient→args and source→`to` drops the variable entirely.

  it('builds `default :x to 0` as args:[:x] + modifiers.to = 0', () => {
    const ast = astOf('default :x to 0');

    expect(ast.name).toBe('default');
    expect(ast.args).toHaveLength(1);
    // This used to pin `{ type: 'contextReference', name: ':x' }`, which was the
    // shape `convertReference` produced for EVERY reference — and it was wrong
    // for a sigil-scoped variable: `ContextType` never contained `:x`, and
    // core's `evaluateContextReference` has no case for it, so it evaluated to
    // `undefined`. Measured end-to-end on the default parse path, before and
    // after:
    //
    //   set :x to 7 then default :x to 0 then log :x   before: undefined  after: 7
    //   default :x to 0 then log :x                    before: undefined  after: 0
    //
    // So `default` was neither preserving an existing value nor applying its
    // default. The node is now the same scoped identifier the TRADITIONAL
    // parser emits, which is what makes both paths agree.
    expect(ast.args[0]).toMatchObject({ type: 'identifier', name: 'x', scope: 'element' });
    expect(ast.modifiers?.to).toMatchObject({ type: 'literal', value: 0 });
  });

  it('builds the corpus form `default my @data-count to "0"` the same way', () => {
    const ast = astOf('default my @data-count to "0"');

    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'propertyAccess', property: '@data-count' });
    expect(ast.modifiers?.to).toMatchObject({ type: 'literal', value: '0' });
  });

  it('never leaves the value as the only positional arg', () => {
    // The pre-fix shape was exactly `{ name: 'default', args: [0] }`. Assert
    // the failure mode directly so a regression names itself.
    const ast = astOf('default :x to 0');
    expect(ast.args[0]).not.toMatchObject({ type: 'literal', value: 0 });
  });
});

describe('scroll — the destination must be an ARG, not a modifier', () => {
  // packages/core/src/commands/navigation/scroll-to.ts parseInput reads ONLY
  // `raw.args` and throws 'scroll command requires a target' when it is empty;
  // `resolveTarget`/`parsePosition` then walk that same arg list. A destination
  // delivered as a modifier is invisible to the command on every path.

  it('builds `scroll to #header` with the target in args', () => {
    const ast = astOf('scroll to #header');

    expect(ast.name).toBe('scroll');
    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'selector', value: '#header' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('builds the corpus form `scroll to last <.message/> in #chat` with the target in args', () => {
    const ast = astOf('scroll to last <.message/> in #chat');

    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'binaryExpression', operator: 'in' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('leaves no `on` modifier for ScrollCommand to ignore', () => {
    const ast = astOf('scroll to #header');
    expect(ast.modifiers?.on).toBeUndefined();
  });
});

describe('swap — the AST contract is keyword-positional args, plus one flag modifier', () => {
  // packages/core/src/commands/dom/swap.ts parseInput takes `const args =
  // raw.args` and reads exactly ONE modifier — `viewTransition`, tested for
  // PRESENCE, seeded from swapSchema's `manner` role (`using view transition`).
  // Everything else is positional. It scans the arg list for keyword tokens
  // (`with`, `of`, `delete`, `using`, `into`, `over`) and, failing all of those,
  // falls back to
  //   targetNode  = args[args.length - 2]
  //   contentNode = args[args.length - 1]
  //   strategy    = STRATEGY_KEYWORDS[argKeywords[0]]  (when args[0] names one)
  // So `method`, `destination`, `patient` must arrive as positional args in
  // exactly that order. Every modifier the old descriptor emitted was dead end
  // to end — which is why `swap #a with #b` and `swap delete #t` both threw.

  it('builds `swap #a with #b` as args:[#a, #b] with no modifiers', () => {
    const ast = astOf('swap #a with #b');

    expect(ast.name).toBe('swap');
    // The fallback branch reads args[len-2] as target and args[len-1] as content.
    expect(ast.args).toHaveLength(2);
    expect(ast.args[0]).toMatchObject({ type: 'selector', value: '#a' });
    expect(ast.args[1]).toMatchObject({ type: 'selector', value: '#b' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('builds `swap #target with it` the same way', () => {
    const ast = astOf('swap #target with it');

    expect(ast.args).toHaveLength(2);
    expect(ast.args[0]).toMatchObject({ type: 'selector', value: '#target' });
    expect(ast.args[1]).toMatchObject({ type: 'contextReference', name: 'it' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('keeps the strategy for `swap delete #t` — args[0] is what selects it', () => {
    const ast = astOf('swap delete #t');

    // `deleteIndex = argKeywords.findIndex(k => k === 'delete')` must be 0, and
    // the target is read from `args[deleteIndex + 1]`.
    expect(ast.args).toHaveLength(2);
    expect(ast.args[0]).toMatchObject({ type: 'literal', value: 'delete' });
    expect(ast.args[1]).toMatchObject({ type: 'selector', value: '#t' });
    expect(ast.modifiers).toBeUndefined();
  });

  it('never emits an `on` modifier — SwapCommand cannot see one', () => {
    for (const src of ['swap #a with #b', 'swap delete #t']) {
      expect(astOf(src).modifiers?.on, src).toBeUndefined();
    }
  });

  it('leaves the target out of args for NO swap surface that binds it', () => {
    // The old shape put `patient` first and the destination in `modifiers.on`,
    // so `swap #a with #b` reached the runtime as a single-arg node and
    // `swap delete #t` as a zero-arg one — both throw before doing any work.
    expect(astOf('swap delete #t').args.length).toBeGreaterThan(1);
  });

  it('emits `viewTransition` for the tail form, and leaves args untouched', () => {
    // The one modifier the contract does carry. Args must stay exactly what the
    // tail-less form produces — the three tail keywords are consumed by the
    // pattern's optional group, not appended as positional args (which would
    // shift `args[len-2]`/`args[len-1]` and break target/content selection).
    const plain = astOf('swap #a with #b');
    const withTail = astOf('swap #a with #b using view transition');

    expect(withTail.modifiers?.viewTransition, 'presence is the whole request').toBeDefined();
    expect(withTail.args).toEqual(plain.args);
  });
});

describe('swap — the strategy forms carry their content', () => {
  // The descriptor was already right for these; the en PATTERNS were not.
  // Measured at 22059a6e, `swap into #t with it` and its siblings bound
  // `method` + `destination` only — `swap {method} {destination}` (priority
  // 110) matched the prefix and the `with` content was never captured, so the
  // runtime got a two-arg node and swapped in nothing. `swap innerHTML of #t
  // with "X"` was worse: it bound `destination` to the literal word 'of'.
  //
  // With all three roles bound, the AST lands on SwapCommand's fallback branch
  // exactly as the block above describes: strategy from args[0], target from
  // args[len-2], content from args[len-1].

  const STRATEGY_FORMS: Array<[string, string, string, unknown]> = [
    ['swap into #t with it', 'into', '#t', { type: 'contextReference', name: 'it' }],
    ['swap over #modal with c', 'over', '#modal', { type: 'identifier', name: 'c' }],
    ['swap beforebegin #t with it', 'beforebegin', '#t', { type: 'contextReference', name: 'it' }],
    ['swap innerHTML of #t with "X"', 'innerHTML', '#t', { type: 'literal', value: 'X' }],
    ['swap outerHTML of #t with "Y"', 'outerHTML', '#t', { type: 'literal', value: 'Y' }],
  ];

  it.each(STRATEGY_FORMS)('%s → [strategy, target, content]', (src, method, target, content) => {
    const ast = astOf(src);

    expect(ast.name).toBe('swap');
    expect(ast.args, `${src} must bind all three roles`).toHaveLength(3);
    // args[0] is what `STRATEGY_KEYWORDS[argKeywords[0]]` reads. `getNodeKeyword`
    // accepts a literal's value or an identifier's name, lowercased — which is
    // why `over` arriving as an identifier still selects `outerHTML`.
    const first = ast.args[0] as { value?: string; name?: string };
    expect(String(first.value ?? first.name).toLowerCase()).toBe(method.toLowerCase());
    expect(ast.args[1]).toMatchObject({ type: 'selector', value: target });
    expect(ast.args[2]).toMatchObject(content as Record<string, unknown>);
    expect(ast.modifiers).toBeUndefined();
  });

  it('never binds the `of` marker itself as the destination', () => {
    // The precise pre-fix failure: `swap {method} {destination}` took
    // `innerHTML`→method and the bare word `of`→destination, then dropped
    // both the real target and the content.
    const ast = astOf('swap innerHTML of #t with "X"');
    expect(ast.args[1]).not.toMatchObject({ value: 'of' });
  });

  it('leaves the method-less and content-less forms on their own patterns', () => {
    // The new patterns need four slots after the verb, so the three-slot
    // element swap (120) and the two-slot bare strategy (110) are untouched.
    expect(astOf('swap #a with #b').args).toHaveLength(2);
    expect(astOf('swap delete #item').args).toHaveLength(2);
    expect(astOf('swap innerHTML #target').args).toHaveLength(2);
  });
});

describe('open — the element is an ARG, the variant an `as` modifier', () => {
  // packages/core/src/commands/dom/open.ts:
  //   parseInput  → resolveTargetsFromArgs(raw.args …)
  //   parseDialogMode → evaluate(modifiers.as), compared as a lowercased
  //                     string to 'non-modal' / 'nonmodal' / 'modal'
  // So the target must be positional and the variant must arrive under `as`,
  // as a value that evaluates to a STRING.
  //
  // Before this change `openSchema` gave `style` svoPosition 1, generating
  // `open [as {style}] [{patient}]` — only the un-English `open as modal #dlg`
  // bound the role, and `open #dlg as non-modal` (OpenCommand's own documented
  // example) parsed to `patient` alone with the variant silently dropped.

  it('builds `open #dlg as non-modal` as args:[#dlg] + modifiers.as', () => {
    const ast = astOf('open #dlg as non-modal');

    expect(ast.name).toBe('open');
    expect(ast.args).toHaveLength(1);
    expect(ast.args[0]).toMatchObject({ type: 'selector', value: '#dlg' });
    expect(ast.modifiers?.as).toMatchObject({ type: 'literal', value: 'non-modal' });
  });

  it('builds `open #dlg as modal` the same way', () => {
    const ast = astOf('open #dlg as modal');
    expect(ast.args[0]).toMatchObject({ type: 'selector', value: '#dlg' });
    expect(ast.modifiers?.as).toBeDefined();
  });

  it('leaves `open #dlg` with no variant, so the runtime defaults to modal', () => {
    const ast = astOf('open #dlg');
    expect(ast.args).toHaveLength(1);
    expect(ast.modifiers?.as).toBeUndefined();
  });

  it('never leaves the variant out of the node for the documented surface', () => {
    // The pre-fix shape was exactly `{ name: 'open', args: [#dlg] }` — the
    // variant dropped, so a non-modal open silently opened a modal.
    expect(astOf('open #dlg as non-modal').modifiers?.as).toBeDefined();
  });
});

describe('swap — every language binds the operands the same way round', () => {
  // `swap #a with #b` gives #a the content of #b: the FIRST operand is the
  // target, the second the content. `SwapCommand` reads them positionally
  // (target = args[len-2], content = args[len-1]), so the two roles decide
  // WHICH ELEMENT IS OVERWRITTEN — they are not interchangeable.
  //
  // The SOV/VSO event-handler generators bound the fronted (accusative) element
  // to `patient` and the trailing with-marked one to `destination`, i.e. the
  // reverse of en, in ar/bn/hi/ja/ko/qu/tl/tr. That was R3 family 6's
  // "runtime-symmetric" WONTFIX — a premise that was vacuously true only while
  // the descriptor made swap throw for every language, English included.
  // Once #845 made it execute, those eight swapped BACKWARDS.
  //
  // The fix goes to the eight rather than renaming en's roles: `destination`
  // and `patient` keep meaning what swapSchema's own role descriptions say.

  const STORED: Array<[string, string]> = [
    ['ja', '#a を クリック で 交換 #b で'],
    ['ko', '#a 를 클릭 할 때 교환 #b 로'],
    ['ar', 'استبدل #a عند نقر بـ#b'],
    ['hi', '#a को क्लिक पर विनिमय #b से'],
    ['bn', '#a কে ক্লিক এ বদল #b দিয়ে'],
    ['tr', '#a i tıklama de takas #b ile'],
    ['qu', "#a ta ñitiy pi t'inkuy #b wan"],
    ['tl', 'palitan_pwesto #a kapag click nang #b'],
    ['en', 'on click swap #a with #b'],
    ['es', 'en clic intercambiar #a con #b'],
    ['de', 'bei klick tauschen #a mit #b'],
    ['zh', '当 点击 时 交换 把 #a 用 #b'],
  ];

  function findSwap(node: unknown): { roles: Map<string, { value?: string }> } | null {
    const n = node as Record<string, any> | null;
    if (!n || typeof n !== 'object') return null;
    if (n.kind === 'command' && n.action === 'swap') return n as never;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      if (Array.isArray(n[key])) {
        for (const child of n[key]) {
          const found = findSwap(child);
          if (found) return found;
        }
      }
    }
    return null;
  }

  it.each(STORED)('%s binds destination=#a, patient=#b', (lang, source) => {
    // The stored `swap-content` translations, verbatim from patterns.db — the
    // exact strings the multilingual gate scores.
    const swap = findSwap(parse(source, lang));
    expect(swap, `${lang}: no swap node in "${source}"`).not.toBeNull();

    expect(swap!.roles.get('destination')?.value, `${lang}: target`).toBe('#a');
    expect(swap!.roles.get('patient')?.value, `${lang}: content`).toBe('#b');
  });
});
