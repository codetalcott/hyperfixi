/**
 * The declared grammar parses what the two loops it replaced parsed — and two
 * things they got wrong
 *
 * Arc 3 step 4. `command-routes.test.ts` pins that every command HAS a route;
 * this pins what the generic route produces. The AST-equivalence corpus is the
 * broad gate (every documented example, byte-compared against the baseline);
 * these are the rows that changed on purpose, each with the reason, plus the
 * shapes worth stating in prose.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { assertNodeOfKind } from '../../ast/guards';

function command(source: string) {
  const result = hyperscript.compileSync(source);
  expect(result.ok, source).toBe(true);
  const ast = result.ast as { type?: string; commands?: unknown[] };
  const node = ast.type === 'eventHandler' ? ast.commands![0] : ast;
  return assertNodeOfKind(node, 'command');
}

describe('the two defects the tail loop had', () => {
  it('a zero-argument command at the end of a handler body no longer swallows the NEXT HANDLER', () => {
    // The tail loop did not stop at `on`, and `parsePrimary` on `on` returns
    // an event handler — so `focus` took the whole second handler as its one
    // argument, and the program had one handler where the author wrote two.
    const result = hyperscript.compileSync('on click focus\non keyup log 1');
    expect(result.ok).toBe(true);
    const program = assertNodeOfKind(result.ast, 'Program');
    expect(program.statements).toHaveLength(2);
    const focus = assertNodeOfKind(
      assertNodeOfKind(program.statements[0], 'eventHandler').commands[0],
      'command'
    );
    expect(focus.name).toBe('focus');
    expect(focus.args).toEqual([]);
  });

  it('`call fetch("/x")` is one `call` of a function, not an empty `call` followed by a `fetch` COMMAND', () => {
    // `fetch` is a command word, so the old boundary stopped there; the
    // remainder then parsed as a second command, and `call fetch(...)` RAN A
    // FETCH. A command word followed by `(` is a call expression (upstream
    // accepts the source; `_hyperscript.parse` parses it as one call command).
    const result = hyperscript.compileSync('on click call fetch("/x")');
    expect(result.ok).toBe(true);
    const handler = assertNodeOfKind(result.ast, 'eventHandler');
    expect(handler.commands).toHaveLength(1);
    const call = assertNodeOfKind(handler.commands[0], 'command');
    expect(call.name).toBe('call');
    expect(call.args).toHaveLength(1);
    const callee = assertNodeOfKind(call.args[0], 'callExpression');
    expect(assertNodeOfKind(callee.callee, 'identifier').name).toBe('fetch');
  });
});

describe('marker slots go to `modifiers`, as the multi-word parser always did', () => {
  it('`settle for 3000` — the documented form the tail loop dropped — captures the timeout', () => {
    const settle = command('settle for 3000');
    expect(settle.args).toEqual([]);
    expect(assertNodeOfKind(settle.modifiers?.for, 'literal').value).toBe(3000);
  });

  it('`settle #el for 500ms` keeps the target positional and the timeout in `for`', () => {
    const settle = command('settle #el for 500ms');
    expect(assertNodeOfKind(settle.args[0], 'selector').value).toBe('#el');
    expect(settle.modifiers?.for).toBeDefined();
  });

  it('`default x to "y"` — `to` is a slot, not an identifier in `args` (DefaultCommand reads either)', () => {
    const dflt = command('default x to "y"');
    expect(dflt.args).toHaveLength(1);
    expect(assertNodeOfKind(dflt.args[0], 'identifier').name).toBe('x');
    expect(assertNodeOfKind(dflt.modifiers?.to, 'literal').value).toBe('y');
  });

  it('`append "x" to #out` is unchanged from the multi-word parser', () => {
    const append = command('append "x" to #out');
    expect(assertNodeOfKind(append.args[0], 'literal').value).toBe('x');
    expect(assertNodeOfKind(append.modifiers?.to, 'selector').value).toBe('#out');
  });

  it('`make a URL from "/a", "/b"` — the one comma-list marker — is still one arrayLiteral', () => {
    const make = command('make a URL from "/a", "/b"');
    expect(assertNodeOfKind(make.modifiers?.from, 'arrayLiteral').elements).toHaveLength(2);
  });
});

describe('positional lists and terminators', () => {
  it('`log a, b` is two arguments; `log a b` is one, with `b` left for the statement loop — as before', () => {
    expect(command('log a, b').args).toHaveLength(2);
    // Upstream rejects `log a b`; the documented-examples gate records the
    // silent drop as a docs defect. Turning it into an error is the follow-up
    // filed in PARSER_NEXT_STEPS.md, not this step.
    expect(command('log a b').args).toHaveLength(1);
  });

  it('`beep! me.id, me.className` keeps its two arguments under the folded name', () => {
    const beep = command('beep! me.id, me.className');
    expect(beep.name).toBe('beep!');
    expect(beep.args).toHaveLength(2);
  });

  it('arguments stop at `then`', () => {
    const result = hyperscript.compileSync('on click log 1 then log 2');
    expect(result.ok).toBe(true);
    expect(assertNodeOfKind(result.ast, 'eventHandler').commands).toHaveLength(2);
  });
});

describe("a plugin command keeps the old loop's flat shape", () => {
  it('`zork with "x"` — continuation words stay IN args as identifiers, and the value after one is not left behind', async () => {
    // `@hyperfixi/speech` registers `answer` at runtime and its parseInput
    // reads `[with, "x"]` — the shape the tail loop produced for every command
    // it did not know. The default grammar row reproduces exactly that; both
    // halves of the rule matter (continue when the NEXT word is one, and when
    // the word just parsed was one).
    const { getParserExtensionRegistry } = await import('../extensions');
    getParserExtensionRegistry().registerCommand('zork');
    const zork = command('zork with "x"');
    expect(zork.args.map(a => a.type)).toEqual(['identifier', 'literal']);
    expect(assertNodeOfKind(zork.args[0], 'identifier').name).toBe('with');
    const zork2 = command('zork "a" to "b"');
    expect(zork2.args.map(a => a.type)).toEqual(['literal', 'identifier', 'literal']);
  });
});
