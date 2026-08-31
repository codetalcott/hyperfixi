/**
 * The semantic adoption coverage gate, and the resync it made exact
 *
 * Regression gate for the silent-truncation class (PARSER_NEXT_STEPS.md,
 * 2026-08-30) — the sequel to `semantic-resync-and.test.ts`, whose one-word fix
 * (#1013) did not close the class:
 *
 *     hyperscript.compileSync('on click log "a" is not "b"')
 *       -> ok: true, body `log "a"`      // the comparison SILENTLY GONE
 *
 * ## The two cooperating defects, both fixed here
 *
 * 1. **Adoption trusted a prefix-parse.** The analyzer scores role coverage,
 *    never input coverage, so a pattern matching a PREFIX of the arguments
 *    reported confidence 1.0 and was adopted whole; the unmatched tail was
 *    discarded. The semantic parser flags exactly this case with an
 *    `unconsumed-input` warning diagnostic — `createSemanticAdapter` now
 *    rejects those parses (the coverage gate), and the traditional parser
 *    takes the command instead.
 * 2. **The resync split spans the analyzer HAD consumed.**
 *    `skipToCommandBoundary()` stopped at any command word, so
 *    `call element.focus()` — fully consumed, faithfully parsed — was cut at
 *    `focus` and the tail re-parsed as a phantom second command. Under the
 *    coverage gate an adoption means the analyzer consumed the remainder in
 *    full, so the resync is now exactly "the rest of the token stream" and the
 *    keyword scan is deleted.
 *
 * ## What these tests must keep true
 *
 * Same discipline as `semantic-resync-and.test.ts`: every row compiles through
 * `hyperscript.compileSync` with the DEFAULT config — the defect only existed
 * on the shipped path — and is paired with its `{ traditional: true }` twin,
 * asserting the two paths AGREE structurally. Agreement is the property.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript, config } from '../../api/hyperscript-api';

type Cmd = { type?: string; name?: string; args?: Array<{ type?: string; value?: unknown }> };

/** Commands in a compiled handler's body (or the root command for bare input). */
function commands(ast: unknown): Cmd[] {
  const node = ast as { type?: string; commands?: Cmd[]; name?: string };
  if (node?.commands) return node.commands.filter(c => c?.type === 'command');
  return node?.type === 'command' ? [node as Cmd] : [];
}

describe('semantic adoption coverage gate (default config)', () => {
  it('the default config really does run semantic-first — otherwise this file is vacuous', () => {
    expect(config.semantic).toBe(true);
  });

  describe('defect 1 — a prefix-parse is rejected, not adopted', () => {
    // Each source's arguments extend past what the analyzer's pattern models.
    // Before the gate, the default path silently compiled only the prefix.
    const truncationRows: Array<[string, (cmd: Cmd) => void]> = [
      [
        'on click log "a" is not "b"',
        cmd => expect(cmd.args?.[0]?.type, 'the comparison must survive').toBe('binaryExpression'),
      ],
      [
        'on click log 5 is between 1 and 10',
        cmd => expect(cmd.args?.[0]?.type, 'the range test must survive').toBe('betweenExpression'),
      ],
      [
        'on click log 1 + 2 * 3 and true or false',
        cmd => {
          // Root must be the OUTERMOST operator — a root of `+` means the
          // logical tail was dropped.
          expect(cmd.args?.[0]?.type).toBe('binaryExpression');
          expect((cmd.args?.[0] as { operator?: string }).operator).toBe('or');
        },
      ],
    ];

    for (const [source, assertShape] of truncationRows) {
      it(`${source} — default agrees with traditional and keeps the full expression`, () => {
        const dflt = hyperscript.compileSync(source);
        const trad = hyperscript.compileSync(source, { traditional: true } as never);
        expect(dflt.ok).toBe(true);
        expect(trad.ok).toBe(true);

        const dCmds = commands(dflt.ast);
        const tCmds = commands(trad.ast);
        expect(dCmds.length).toBe(tCmds.length);
        assertShape(dCmds[0]);
        assertShape(tCmds[0]);
      });
    }

    it('beep! myValue — the argument and the `!` both survive', () => {
      const dflt = hyperscript.compileSync('beep! myValue');
      expect(dflt.ok).toBe(true);
      const [cmd] = commands(dflt.ast);
      expect(cmd.name).toBe('beep!');
      expect(cmd.args?.length).toBe(1);
    });
  });

  describe('defect 2 — a fully-consumed adoption resyncs past the whole span', () => {
    it('call element.focus() — one command, never a phantom `focus` second command', () => {
      // The old keyword scan stopped at `focus` (a command name inside a member
      // expression), re-parsed `focus()` as a fresh command, and — once the
      // coverage gate rejected that fragment — the whole compile FAILED with
      // "Expected closing parenthesis".
      const dflt = hyperscript.compileSync('call element.focus()');
      expect(dflt.ok).toBe(true);
      const cmds = commands(dflt.ast);
      expect(cmds.length).toBe(1);
      expect(cmds[0].name).toBe('call');
    });

    it('handler-final `end` is never swallowed by an adoption', () => {
      // `log "x" end` reaches the analyzer WITH the trailing `end`; that tail
      // is unconsumed input, so the gate rejects and traditional parses the
      // body. If an adoption ever ate the `end`, the handler would not close.
      const dflt = hyperscript.compileSync('on click log "x" end');
      expect(dflt.ok).toBe(true);
      expect(commands(dflt.ast).map(c => c.name)).toEqual(['log']);
    });
  });

  describe('the honest-failure boundary', () => {
    it('render … with (…) fails LOUDLY on both paths, not silently on one', () => {
      // Step 5 counted these as semantic-only wins. Measured at the role level
      // the "win" was a truncation too (`style: "("`, named args dropped), so
      // the gate turns it into the same honest failure traditional gives.
      // If either path LEARNS this form, this row flips visibly — that is a
      // parser gap being closed (PARSER_NEXT_STEPS.md), not a regression.
      const dflt = hyperscript.compileSync('render myTemplate with (name: "Alice")');
      const trad = hyperscript.compileSync('render myTemplate with (name: "Alice")', {
        traditional: true,
      } as never);
      expect(dflt.ok).toBe(false);
      expect(trad.ok).toBe(false);
    });
  });
});
