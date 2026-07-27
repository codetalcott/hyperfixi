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

  it('still requires `end`, and reports its absence', () => {
    // Deliberate strictness: upstream tolerates an unterminated `if/then` at the
    // end of a handler and we do not. That is a separate decision — this fix must
    // not quietly loosen it just because the diagnostic was the visible symptom.
    const result = parse("if 1 is 1 then log 'a' then log 'b'");

    expect(recoveredErrors(result)).toContain("Expected 'end' after if block");
    // ...and the body is still assembled correctly despite the error.
    expect(names(thenBranch(result.node as any))).toEqual(['log', 'log']);
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

  it('KNOWN GAP: `and` between tell commands is swallowed by the expression parser', () => {
    // `parseTellCommand` has always matched `and` as a separator, but it is dead
    // code for the same reason as the `if` case above: the pratt parser absorbs
    // `and` into the preceding command's arguments before the body loop runs, so
    // the second `add` becomes an identifier operand. Pinned as a known gap.
    const node = parseClean('on click tell #x add .a and add .b');

    const tellArgs = node.commands[0].args;
    expect(names(tellArgs.slice(1))).toEqual(['add']);
    expect(tellArgs[1].args[0].type).toBe('binaryExpression');
  });
});
