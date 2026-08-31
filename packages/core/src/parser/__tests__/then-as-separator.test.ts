/**
 * Regression tests: `then` as a COMMAND SEPARATOR inside a block body.
 *
 * Upstream hyperscript has one recursive `parseCommandList` that consumes a
 * joining `then` after every command, so `then` separates commands in EVERY
 * body. hyperfixi had five independent body loops and three of them dropped it:
 * `parseIfCommand`'s two branch loops, `Parser.parseCommandBlock` (def / init /
 * catch / finally), and `parseTellCommand`.
 *
 * The `if` case was the dangerous one. The loop broke at the body's `then`,
 * `consume('end')` failed non-throwingly (so `ok` stayed true), and the
 * enclosing sequence loop — which DOES consume `then` — picked up the rest of
 * the body as SIBLINGS of the `if`. The conditional body therefore ran
 * UNCONDITIONALLY, silently. It shipped in examples/dialogs/native-dialog.html.
 *
 * So these assertions are STRUCTURAL on purpose. Asserting `success === true`
 * would have passed against the bug — `success` was already true. Every case
 * checks where the commands actually landed.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

function parseNode(input: string) {
  const result = parse(input);
  expect(
    result.success,
    `Expected parse to succeed for:\n${input}\nError: ${result.error?.message}`
  ).toBe(true);
  expect(result.node).toBeDefined();
  return result.node as any;
}

/** Recovered (non-fatal) diagnostics — the channel `ok: true` hides. */
const recoveredErrors = (result: any): string[] =>
  (result.errors ?? []).map((e: { message: string }) => e.message);

/**
 * Parse and additionally require a CLEAN result — no recovered errors.
 *
 * `success`/`ok` were both true against the bug, so they prove nothing here.
 * `errors`/`recovered` (the flag added in #784) are the channel that does.
 */
function parseClean(input: string) {
  const result = parse(input);
  expect(recoveredErrors(result), `Expected NO recovered errors for:\n${input}`).toEqual([]);
  expect(result.recovered).toBeFalsy();
  return parseNode(input);
}

/** `if`/`unless` node → the commands of its then-branch. */
const thenBranch = (ifNode: any): any[] => ifNode.args?.[1]?.commands ?? [];
/** `if`/`unless` node → the commands of its else-branch. */
const elseBranch = (ifNode: any): any[] => ifNode.args?.[2]?.commands ?? [];

const names = (commands: any[]): string[] => commands.map(c => c.name ?? c.type);

describe('`then` as a command separator in if/unless bodies', () => {
  it('keeps both commands in the block (implicit multi-line if)', () => {
    // The handoff's minimal repro. Before the fix: block was EMPTY, `get` was
    // deleted outright, and `log` became a sibling of the `if`.
    const node = parseClean("if 1 is 1\n  get #u then log 'a'\nend");

    expect(node.name).toBe('if');
    expect(names(thenBranch(node))).toEqual(['get', 'log']);
  });

  it('keeps both commands in the block when the if carries its own `then`', () => {
    // Distinct mechanism: here the header-`then` lookahead is correct, so this
    // shape is broken purely by the branch loop dropping the separator. A fix
    // that only repaired the lookahead would leave this one broken.
    const node = parseClean("if 1 is 1 then\n  get #u then log 'a'\nend");

    expect(names(thenBranch(node))).toEqual(['get', 'log']);
  });

  it('keeps both commands in the ELSE block', () => {
    const node = parseClean("if 1 is 2\n  log 'x'\nelse\n  get #u then log 'y'\nend");

    expect(names(thenBranch(node))).toEqual(['log']);
    expect(names(elseBranch(node))).toEqual(['get', 'log']);
  });

  it('handles `then` in both branches of an `else if` chain', () => {
    const node = parseClean(
      "if 1 is 2\n  log 'a' then log 'b'\nelse if 1 is 1\n  log 'c' then log 'd'\nend"
    );

    expect(names(thenBranch(node))).toEqual(['log', 'log']);

    // `else if` is modelled as a nested `if` occupying the else block.
    const nested = elseBranch(node);
    expect(names(nested)).toEqual(['if']);
    expect(names(thenBranch(nested[0]))).toEqual(['log', 'log']);
  });

  it('handles `then` inside an if nested in an if body', () => {
    const node = parseClean(
      "if 1 is 1\n  if 2 is 2\n    get #u then log 'inner'\n  end\n  log 'outer'\nend"
    );

    const outer = thenBranch(node);
    expect(names(outer)).toEqual(['if', 'log']);
    expect(names(thenBranch(outer[0]))).toEqual(['get', 'log']);
  });

  it('mixes `then`-joined and newline-separated commands in one body', () => {
    const node = parseClean("if 1 is 1\n  get #u then log 'a'\n  log 'b'\nend");

    expect(names(thenBranch(node))).toEqual(['get', 'log', 'log']);
  });

  it('applies to `unless`, which shares parseIfCommand', () => {
    const node = parseClean("unless 1 is 2\n  get #u then log 'a'\nend");

    expect(node.name).toBe('unless');
    expect(names(thenBranch(node))).toEqual(['get', 'log']);
  });

  it('does not hoist the body out of the conditional inside an event handler', () => {
    // The severity case: with a FALSE condition, a hoisted body would run
    // unconditionally. Assert the handler has exactly [if, log 'after'] and that
    // 'BODY RAN' lives inside the if.
    const node = parseClean(
      "on click\n  if 1 is 2\n    get #u then log 'BODY RAN'\n  end\n  log 'after'"
    );

    expect(names(node.commands)).toEqual(['if', 'log']);
    expect(node.commands[1].args[0].value).toBe('after');
    expect(names(thenBranch(node.commands[0]))).toEqual(['get', 'log']);
  });

  it('parses the shipped native-dialog handler cleanly', () => {
    // examples/dialogs/native-dialog.html:315-328 — the source that surfaced this.
    const node = parseClean(
      'on close from #form-dialog\n' +
        '  get #form-dialog\n' +
        '  set returnValue to it.returnValue\n' +
        "  if returnValue is 'confirmed'\n" +
        '    get #username then set username to it.value\n' +
        '    get #role then set role to it.value\n' +
        '    get #result-text\n' +
        '    show #form-result\n' +
        '  else\n' +
        '    get #result-text\n' +
        '    show #form-result\n' +
        '  end'
    );

    expect(names(node.commands)).toEqual(['get', 'set', 'if']);
    const ifNode = node.commands[2];
    expect(names(thenBranch(ifNode))).toEqual(['get', 'set', 'get', 'set', 'get', 'show']);
    expect(names(elseBranch(ifNode))).toEqual(['get', 'show']);
  });

  // ─── Guards: the fix must not over-consume ────────────────────────

  it('still lets `end` close the block before a trailing `then`', () => {
    // The over-consumption guard. `remove .loading` belongs to the HANDLER, not
    // the if body — the body loop must stop at `end` and let the handler loop
    // take the `then`.
    const node = parseClean('on click if x > 0 then add .positive end then remove .loading');

    expect(names(node.commands)).toEqual(['if', 'remove']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
  });

  it('requires `end` only when something FOLLOWS the block, as upstream does', () => {
    // THE DECISION THIS ROW DEFERRED, now made and visible.
    //
    // It used to assert the opposite — "Deliberate strictness: upstream
    // tolerates an unterminated `if/then` at the end of a handler and we do
    // not. That is a separate decision." It is decided: we tolerate it too.
    //
    // Upstream's rule is one line, `if (parser.hasMore() && !nestedIfStmt)
    // parser.requireToken("end")`, and the vendored 0.9.93 engine ACCEPTS both
    // sources below. Requiring `end` unconditionally cost NINE of this repo's
    // own `metadata.examples` a diagnostic on a parse that was already exactly
    // right — `if x > 5 then add .active` among them — which is what blocked
    // `documented-examples.test.ts` from asserting on `errors` at all.
    const atEnd = parse("if 1 is 1 then log 'a' then log 'b'");
    expect(recoveredErrors(atEnd)).toEqual([]);
    // ...and the body is still assembled correctly, which is what this file is about.
    expect(names(thenBranch(atEnd.node as any))).toEqual(['log', 'log']);

    // The other half of the rule, and the reason this is not simply "stop
    // reporting": with a following feature the block IS unterminated, and both
    // engines say so (upstream: "Expected 'end' but found 'on'").
    const followed = parse('on click if x then add .a\non mouseover log 1');
    expect(recoveredErrors(followed)).toContain("Expected 'end' after if block");
  });

  it('leaves the `then`-on-the-next-line header form working', () => {
    // The `if`'s own `then` may sit on the line after the condition. The
    // header-`then` consumption checks the token rather than trusting the
    // lookahead flag, which is what keeps this shape working.
    const node = parseClean('if count > 10\n  then add .warning\n  else remove .warning\nend');

    expect(names(thenBranch(node))).toEqual(['add']);
    expect(names(elseBranch(node))).toEqual(['remove']);
  });

  it('skips `--` comments between body commands', () => {
    // Same outlier, different token: every sibling body loop skips comments
    // (parser.ts:3277, and the junk-skip at :1117) and this one did not, so a
    // comment broke the block with the same bogus "Expected 'end'". This is what
    // remained of examples/fetch-and-async/infinite-scroll.html once `then` was
    // fixed — its `end`s were balanced all along.
    const node = parseClean('if 1 is 1\n  add .a to #x\n  -- a comment\n  add .b to #x\nend');

    expect(names(thenBranch(node))).toEqual(['add', 'add']);
  });

  it('skips a trailing `--` comment at the end of a body', () => {
    const node = parseClean('if 1 is 1\n  add .a to #x\n  -- trailing comment\nend');

    expect(names(thenBranch(node))).toEqual(['add']);
  });

  it('skips `--` comments in an else body', () => {
    const node = parseClean('if 1 is 2\n  add .a to #x\nelse\n  -- why\n  add .b to #x\nend');

    expect(names(elseBranch(node))).toEqual(['add']);
  });

  it('already supported `,` as a body separator (regression guard)', () => {
    // `,` is absorbed by the argument loop before the block loop sees it, so this
    // was never broken. Pinned so a future change to the separator handling
    // cannot regress it.
    const node = parseClean("if 1 is 1\n  log 'a', log 'b'\nend");

    expect(names(thenBranch(node))).toEqual(['log', 'log']);
  });

  it('KNOWN GAP: `and` is not a command separator anywhere', () => {
    // Not this defect, and not fixed here. The pratt parser absorbs `and` as a
    // binary operator long before any body loop sees it — the same at top level
    // (`on click add .a and remove .b` → `add(.a and remove)`) as in a body. The
    // residual "Expected 'end'" below belongs to that separate expression-parser
    // gap; it is pinned so its eventual fix is a deliberate, visible change.
    const result = parse('if 1 is 1\n  add .a and remove .b\nend');

    expect(names(thenBranch(result.node as any))).toEqual(['add']);
    expect(recoveredErrors(result)).toContain("Expected 'end' after if block");
  });
});

/**
 * The MIRROR IMAGE of the defect above, found while fixing it and independent of
 * it — no `then` appears anywhere in these sources.
 *
 * `parseIfCommand`'s implicit-multi-line lookahead is supposed to decide the form
 * from the FIRST command's line only: same line as the `if` → single-line,
 * different line → multi-line. It answered that correctly and then kept walking,
 * because the branch has no `break` (deliberately — it is still hunting a
 * same-line `else`/`end`, which the guards at the bottom pin). It reached the
 * NEXT line's command, set the multi-line flag, and the "FIRST command" rule was
 * defeated by the second command.
 *
 * The result: `if 1 is 1 log 'a'` followed by `log 'b'` swallowed `log 'b'` into
 * the if-block, so a command that must always run stopped running whenever the
 * condition was false. Where the `then` defect hoisted a conditional body OUT so
 * it ran unconditionally, this pulls an unconditional command IN.
 *
 * Same `ok: true` + recovered-"Expected 'end'" shape, so these assertions are
 * structural for the same reason: `success` proves nothing, it was already true.
 * The behavioural half is in `src/api/if-body-then-execution.test.ts`.
 *
 * Every source below is accepted by upstream `hyperscript.org`.
 * See docs-internal/HANDOFF-implicit-multiline-if.md.
 */
describe('a single-line if does not swallow the following line', () => {
  it('leaves the next line a SIBLING of the if (minimal repro)', () => {
    const node = parseClean("if 1 is 1 log 'a'\nlog 'b'");

    expect(names(node.commands)).toEqual(['if', 'log']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['log']);
    expect(node.commands[0].args[1].commands[0].args[0].value).toBe('a');
    expect(node.commands[1].args[0].value).toBe('b');
  });

  it('keeps the sibling out of the block when the condition is FALSE', () => {
    // The severity case at parse level: `add .b` swallowed into a false branch
    // silently stops running. The DOM proof is in if-body-then-execution.test.ts.
    const node = parseClean('if 1 is 2 add .a to #t\nadd .b to #t');

    expect(names(node.commands)).toEqual(['if', 'add']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
    expect(node.commands[1].args[0].value).toBe('.b');
  });

  it('scales — three trailing lines all stay siblings', () => {
    // It was not one line: the scan swallowed everything up to the next boundary.
    const node = parseClean("if 1 is 1 log 'a'\nlog 'b'\nlog 'c'");

    expect(names(node.commands)).toEqual(['if', 'log', 'log']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['log']);
  });

  it('leaves the next line a sibling inside an event handler', () => {
    const node = parseClean('on click\n  if 1 is 2 add .a to #t\n  add .b to #t');

    expect(names(node.commands)).toEqual(['if', 'add']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
  });

  it('keeps consecutive single-line ifs independent', () => {
    // The second `if` was swallowed into the first one's block, which nested two
    // independent conditions.
    const node = parseClean(
      'on click\n  if 1 is 2 add .a to #t\n  if 1 is 1 add .b to #t\n  add .c to #t'
    );

    expect(names(node.commands)).toEqual(['if', 'if', 'add']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
    expect(names(thenBranch(node.commands[1]))).toEqual(['add']);
  });

  it('applies to `unless`, which shares parseIfCommand', () => {
    const node = parseClean("unless 1 is 1 log 'a'\nlog 'b'");

    expect(names(node.commands)).toEqual(['unless', 'log']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['log']);
  });

  it('keeps a single-line if nested in a multi-line body from eating its sibling', () => {
    // `log 'outer'` belongs to the OUTER body, not to the inner single-line if.
    const node = parseClean("if 1 is 1\n  if 2 is 2 log 'inner'\n  log 'outer'\nend");

    const outer = thenBranch(node);
    expect(names(outer)).toEqual(['if', 'log']);
    expect(names(thenBranch(outer[0]))).toEqual(['log']);
    expect(outer[1].args[0].value).toBe('outer');
  });

  // ─── Guards: the missing `break` is deliberate, and must stay missing ──────

  it('still treats a SAME-LINE `else`/`end` as multi-line', () => {
    // This is why the branch has no `break`: the scan must run past the same-line
    // first command to find this `else`. A fix that simply added the `break`
    // would collapse this into a single-line `if` and drop the else entirely.
    const node = parseClean('if x > 3 set y to 1 else set y to 2 end');

    expect(names(thenBranch(node))).toEqual(['set']);
    expect(names(elseBranch(node))).toEqual(['set']);
  });

  it('still finds the same-line `else`/`end` when another line follows', () => {
    // The two rules meeting: same-line else/end wins, and the next line is still
    // a sibling. Both halves have to hold at once.
    const node = parseClean("on click if x > 3 set y to 1 else set y to 2 end\n  log 'after'");

    expect(names(node.commands)).toEqual(['if', 'log']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['set']);
    expect(names(elseBranch(node.commands[0]))).toEqual(['set']);
    expect(node.commands[1].args[0].value).toBe('after');
  });

  it('leaves the genuine implicit multi-line form alone', () => {
    // The other side of the FIRST-command rule: first command on a DIFFERENT
    // line is multi-line, and both commands belong to the block.
    const node = parseClean("if 1 is 1\n  log 'a'\n  log 'b'\nend");

    expect(names(thenBranch(node))).toEqual(['log', 'log']);
  });

  it('lets an OUTER block claim the `end` on the next line', () => {
    // The case the scan's different-line rule exists for, cited at that site: in
    // a behavior, `if no x set x to 1` is single-line and the following `end`
    // closes the enclosing `init`, not the `if`.
    const node = parseClean('behavior B\n  init\n    if no x set x to 1\n  end\nend');

    expect(names(node.initBlock.commands)).toEqual(['if']);
    expect(names(thenBranch(node.initBlock.commands[0]))).toEqual(['set']);
  });
});

/**
 * The residual of the two defects above, where they meet.
 *
 * Fixing the implicit-multi-line scan left one way for a single-line `if` to
 * still swallow its following line: the SEPARATE `hasThen` lookahead. That scan
 * crosses newlines, so a `then` used as a command separator on a LATER line set
 * `hasThen`, the `if` was classified multi-line, and the whole following line was
 * pulled into the block — the same silent "unconditional command stops running"
 * failure, reached by a different route.
 *
 * #785 considered bounding that scan to `commandToken.line` and rejected it,
 * partly because the implicit-multi-line scan was broken anyway. It is now fixed,
 * but the LINE bound is still wrong on its own terms: a header `then` is allowed
 * to sit on the line after the condition (`leaves the `then`-on-the-next-line
 * header form working`, above), so a line bound would misclassify that form.
 *
 * The bound that works is the COMMAND-CHAIN rule: a `then` binds the `if` only
 * while the scan has not crossed onto a line that STARTS a new command. Commands
 * on the `if`'s own line are the single-line body — their joining `then`s bind
 * (upstream keeps then-joined commands in the body). A command starting a LATER
 * line begins a sibling, so a `then` beyond it is that sibling's separator.
 *
 * A plain FIRST-command bound was tried first and over-corrected: it also broke
 * at command-WORDS inside the condition (`if log is 3 then …`,
 * `if x is set then …`) and evicted same-line then-joined bodies (`if c add .a
 * then add .b` — upstream: BOTH conditional), regressing five upstream-valid
 * shapes that the guards below now pin. See
 * docs-internal/HANDOFF-command-word-in-if-condition.md.
 */
describe('a body `then` on a later line does not make a single-line if multi-line', () => {
  it('leaves the following `then`-joined line a SIBLING of the if', () => {
    const node = parseClean("if 1 is 1 log 'a'\nset x to 1 then log 'b'");

    expect(names(node.commands)).toEqual(['if', 'set', 'log']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['log']);
  });

  it('keeps the `then`-joined line out of a FALSE branch', () => {
    // The severity shape: both `add`s were swallowed into a false branch, so
    // neither ran. The DOM proof is in if-body-then-execution.test.ts.
    const node = parseClean('if 1 is 2 add .a to #t\nadd .b to #t then add .c to #t');

    expect(names(node.commands)).toEqual(['if', 'add', 'add']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
    expect(node.commands[1].args[0].value).toBe('.b');
    expect(node.commands[2].args[0].value).toBe('.c');
  });

  // ─── Guards: the chain rule, not a first-command break ────────────────────

  it('still treats a same-line header `then` as multi-line', () => {
    // The bound must not fire before the header `then` is seen.
    const node = parseClean("if 1 is 1 then log 'a' end");

    expect(names(thenBranch(node))).toEqual(['log']);
  });

  it('still finds a header `then` past a command-like word in the condition', () => {
    // `set` is a command name, so a first-command bound could stop the scan
    // inside the CONDITION and lose the header `then` that follows it. The
    // condition is consumed as an expression before the body begins, so it must
    // not — pinned because this is the bound's sharpest edge.
    const node = parseClean("if x is set then log 'a' end");

    expect(names(thenBranch(node))).toEqual(['log']);
  });

  it('keeps a SAME-LINE then-joined body inside the if', () => {
    // Upstream keeps then-joined commands in the body: BOTH adds are
    // conditional here. The first-command bound broke the scan at `add .a` and
    // evicted `add .b` as an unconditional sibling — the exact silent class this
    // file exists to kill, on a same-line shape.
    const result = parse('on click if 1 is 2 add .a to #t then add .b to #t');

    expect(names((result.node as any).commands)).toEqual(['if']);
    expect(names(thenBranch((result.node as any).commands[0]))).toEqual(['add', 'add']);
    // No diagnostic: the block runs to the end of the input, which is exactly
    // where upstream stops requiring `end`. This asserted the opposite until
    // that rule landed — see the `end`-only-when-followed row above.
    expect(recoveredErrors(result)).toEqual([]);
  });

  it('still finds a header `then` on the next line past a command-word operand', () => {
    // C2 of the regression set: `set` is an operand of `is`, and the header
    // `then` sits on the following line. The chain rule must not count an
    // operand as a command, or the scan stops at the newline and the header
    // `then` is lost.
    const node = parseClean("if x is set\n  then log 'a'\nend");

    expect(names(thenBranch(node))).toEqual(['log']);
  });

  it('still finds a header `then` when the body is on the next line', () => {
    // C of the regression set: nothing after the header `then` on the if line.
    const node = parseClean("if x is set then\n  log 'a'\nend");

    expect(names(thenBranch(node))).toEqual(['log']);
  });
});

/**
 * A command-NAME word in an `if`/`unless` condition.
 *
 * `parseIfCommand` used to decide structure by asking "is this token spelled
 * like a command?" at three sites (the two form-detection scans and the
 * single-line condition loop). That question cannot tell a command from an
 * identifier that shares its spelling, so a condition STARTING with `log`,
 * `set`, `add`, … broke: the condition loop's guard was false at token zero,
 * zero condition tokens were parsed, and the parse died with "Expected
 * condition after if/unless" — loudly at top level, SILENTLY inside a handler,
 * where recovery dropped the `if` node and promoted the body to an
 * unconditional sibling.
 *
 * Two structural facts replace the name test:
 *   1. the condition is never empty, so the first token after `if` is never the
 *      body (the condition loop's first parse is unguarded);
 *   2. a token right after an operator is an operand (`if x is set …`).
 *
 * Every source here is accepted by upstream `hyperscript.org`. See
 * docs-internal/HANDOFF-command-word-in-if-condition.md.
 */
describe('a command-name word in the condition does not break the if', () => {
  it('parses a condition that STARTS with a command word (single-line)', () => {
    // The headline case: was a FATAL "Expected condition after if/unless".
    const node = parseClean('if log is 3 add .a to #t');

    expect(node.name).toBe('if');
    expect(node.args[0].type).toBe('binaryExpression');
    expect(names(thenBranch(node))).toEqual(['add']);
  });

  it('keeps the if ALIVE inside an event handler', () => {
    // The silent case: recovery used to drop the `if` entirely — the handler
    // became [log, add], with the body promoted to an unconditional sibling and
    // ok still true. The DOM proof is in if-body-then-execution.test.ts.
    const node = parseClean('on click if log is 3 add .a to #t');

    expect(names(node.commands)).toEqual(['if']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
  });

  it('applies to `unless`, which shares parseIfCommand', () => {
    const node = parseClean('unless log is 3 add .a to #t');

    expect(node.name).toBe('unless');
    expect(names(thenBranch(node))).toEqual(['add']);
  });

  it('parses the implicit multi-line form (A of the regression set)', () => {
    const node = parseClean('if log is 3\n  add .a to #t\nend');

    expect(names(thenBranch(node))).toEqual(['add']);
  });

  it('parses the `then` + next-line body form (B of the regression set)', () => {
    const node = parseClean('if log is 3 then\n  add .a to #t\nend');

    expect(names(thenBranch(node))).toEqual(['add']);
  });

  it('parses a command-word OPERAND with an implicit next-line body', () => {
    // No `then` anywhere: only the operand rule keeps `set` out of the
    // form-detection here.
    const node = parseClean("if x is set\n  log 'a'\nend");

    expect(names(thenBranch(node))).toEqual(['log']);
  });

  it('handles the same command word as condition AND body', () => {
    const node = parseClean('if add is 3 add .a to #t');

    expect(node.args[0].type).toBe('binaryExpression');
    expect(names(thenBranch(node))).toEqual(['add']);
  });

  it('keeps the following line a sibling when the condition starts with a command word', () => {
    // Composition with the swallow fix above: both rules must hold at once.
    const node = parseClean('if log is 3 add .a to #t\nadd .b to #t');

    expect(names(node.commands)).toEqual(['if', 'add']);
    expect(names(thenBranch(node.commands[0]))).toEqual(['add']);
    expect(node.commands[1].args[0].value).toBe('.b');
  });
});

describe('`then` as a command separator in def/init/catch/finally bodies', () => {
  // These were a HARD failure before the fix ("Unexpected token: then"), not a
  // silent hoist: parseCommandBlock broke at the `then` and the caller then
  // failed on the missing `end`.

  it('keeps both commands in a def body', () => {
    const node = parseClean("def f()\n  get #u then log 'a'\nend");

    expect(node.type).toBe('def');
    expect(names(node.body)).toEqual(['get', 'log']);
  });

  it('keeps both commands in a top-level init block', () => {
    const node = parseClean("init\n  get #u then log 'a'\nend");

    expect(names(node.commands ?? node.body)).toEqual(['get', 'log']);
  });

  it('keeps both commands in catch and finally blocks', () => {
    const node = parseClean(
      "on click\n  log 'body'\ncatch e\n  get #u then log 'caught'\nfinally\n  get #v then log 'done'\nend"
    );

    expect(names(node.errorHandler)).toEqual(['get', 'log']);
    expect(names(node.finallyHandler)).toEqual(['get', 'log']);
  });
});

describe('`then` as a command separator in tell bodies', () => {
  it('keeps a `then`-joined command inside the tell body', () => {
    // Upstream's TellCommand.parse takes a `commandList` for its body, and every
    // commandList consumes a joining `then`. Before the fix `log 'b'` escaped and
    // ran once instead of once per target.
    const node = parseClean("on click tell #x add .a then log 'b'");

    expect(names(node.commands)).toEqual(['tell']);
    const tellArgs = node.commands[0].args;
    // args[0] is the target; the rest are the body commands.
    expect(names(tellArgs.slice(1))).toEqual(['add', 'log']);
  });

  it('KNOWN GAP: `and` between tell commands is swallowed — but is now REPORTED', () => {
    // `parseTellCommand` has always matched `and` as a separator, but it is dead
    // code for the same reason as the `if` case above: the pratt parser absorbs
    // `and` into the preceding command's arguments before the body loop runs, so
    // the second `add` becomes an identifier operand. Still a known gap.
    //
    // What CHANGED: the loss is no longer silent. This test used `parseClean`
    // and therefore asserted the parser reported nothing while documenting, in
    // its own comment, that a command was lost — the gap and the assertion
    // contradicted each other. The parser now records the discarded `.b`, so
    // the diagnostic is pinned here instead. When the gap itself is fixed, this
    // expectation drops to `[]` and the `slice(1)` below becomes ['add','add'].
    const input = 'on click tell #x add .a and add .b';
    const result = parse(input);
    expect(recoveredErrors(result)).toEqual(["Discarded input the parser could not place: '.b'"]);

    const node = parseNode(input);
    const tellArgs = node.commands[0].args;
    expect(names(tellArgs.slice(1))).toEqual(['add']);
    expect(tellArgs[1].args[0].type).toBe('binaryExpression');
  });
});
