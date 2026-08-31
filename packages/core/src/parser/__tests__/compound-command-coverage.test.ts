/**
 * Every COMPOUND_COMMANDS member parses its own documented syntax.
 *
 * Membership in `COMPOUND_COMMANDS` routes a command to
 * `parseCompoundCommand` — but that function is a switch whose `default:`
 * silently falls back to `parseRegularCommand`, and NOTHING guarded the
 * correspondence between the set and the switch. A member with no case gets
 * the generic argument loop, which stops at the first boundary token; for a
 * command whose syntax contains one, that is a live defect rather than a
 * graceful fallback:
 *
 *   take    (#859)  `take .active from .tab for me`  → the unconsumed `for`
 *                   was re-read as a for-LOOP head
 *   process (here)  `process partials in it`          → stopped at `in`,
 *                   dropping the content; and `… using view transition`
 *                   stopped at the `transition` COMMAND token, which was then
 *                   re-parsed as a fresh `transition` command
 *
 * Two members had that shape before anyone checked, so this file checks all of
 * them, every time. It is deliberately BEHAVIOURAL rather than a set-coverage
 * assertion over the switch's own case labels: the realistic mutation (delete
 * a case) has to fail the gate, and a check derived from the switch cannot see
 * that. `swap` proves the point — it HAS a case and still failed to consume the
 * tail its own commandMeta declares.
 *
 * Probes come from each command's documented syntax/examples. Adding a member
 * to COMPOUND_COMMANDS without adding a probe fails the ratchet below, and so
 * does removing one.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { COMPOUND_COMMANDS } from '../parser-constants';

/** command name → sources that must each parse to exactly that one command. */
const PROBES: Record<string, string[]> = {
  add: ['add .active to #probe'],
  go: ['go to #probe'],
  halt: ['halt the event'],
  hide: ['hide me', 'hide #modal', 'hide <button/>'],
  js: ['js return 5 end'],
  measure: ['measure #probe'],
  morph: ['morph #probe with "x"'],
  pick: ['pick first 3 from myList'],
  process: [
    'process partials in it',
    'process partials in fetchedHtml',
    'process partials in it using view transition',
  ],
  push: ['push url "/page/2"', 'push url "/search" with title "Search Results"'],
  put: ['put "Hello" into #probe'],
  remove: ['remove .active from #probe'],
  replace: ['replace url "/search?q=test"', 'replace url "/page" with title "Updated Page"'],
  send: ['send dataEvent to #probe'],
  set: ['set myVar to "value"'],
  show: ['show me', 'show #modal', 'show <button/>'],
  start: ['start view transition add .highlight to #probe end'],
  swap: [
    'swap #target with it',
    'swap innerHTML of #target with it',
    'swap over #modal with fetchedContent',
    'swap delete #notification',
    'swap #target with it using view transition',
  ],
  take: ['take .active from .tab for me', 'take @data-value from #src'],
  tell: ['tell #probe add .t'],
  toggle: ['toggle .active on .item'],
  trigger: ['trigger customEvent on #probe'],
};

const BOTH_PATHS = [
  ['auto', undefined],
  ['traditional', { traditional: true }],
] as const;

/** Top-level statements of a compile result, however the AST is wrapped. */
function topLevel(result: unknown): Array<{ type?: string; name?: string }> {
  const ast = (result as { ast?: Record<string, unknown> }).ast;
  if (!ast) return [];
  return (Array.isArray(ast.body) ? ast.body : [ast]) as Array<{ type?: string; name?: string }>;
}

describe('COMPOUND_COMMANDS ↔ parseCompoundCommand coverage', () => {
  it('has a probe for every member, and no probe for a non-member', () => {
    expect(Object.keys(PROBES).sort()).toEqual([...COMPOUND_COMMANDS].sort());
  });

  describe.each(BOTH_PATHS)('%s path', (_label, opts) => {
    for (const [command, sources] of Object.entries(PROBES)) {
      it(`${command} parses its documented syntax`, () => {
        for (const src of sources) {
          const result = hyperscript.compileSync(src, opts as never);
          expect(result.errors ?? [], `${src}: ${JSON.stringify(result.errors)}`).toHaveLength(0);
          expect(result.ok, src).toBe(true);

          // An unconsumed tail does not vanish — it is re-parsed as a further
          // top-level command, so a clean parse must be exactly one node.
          const nodes = topLevel(result);
          expect(
            nodes.length,
            `${src}: expected 1 top-level command, got ${nodes
              .map(n => n.name ?? n.type)
              .join(' + ')}`
          ).toBe(1);
          expect(nodes[0]?.name?.toLowerCase(), src).toBe(command);

          // A dropped ARGUMENT is invisible to the assertions above: the parse
          // still yields exactly one correctly-named command, just an empty
          // one. That is precisely how `hide <button/>` / `show <button/>`
          // silently discarded their target — `parseRegularCommand` gated on
          // `checkSelector()`, which does not cover query references, so the
          // arg loop broke on its first argument.
          //
          // So a probe whose source says more than the bare command keyword
          // must carry SOME payload. Payload is args OR modifiers OR a target,
          // because the compound parsers legitimately route to all three
          // (`put X into Y` fills modifiers; `toggle … on …` fills a target).
          const node = nodes[0] as Record<string, unknown>;
          if (src.trim().toLowerCase() !== command) {
            const args = (node.args as unknown[] | undefined) ?? [];
            const modifiers = (node.modifiers as Record<string, unknown> | undefined) ?? {};
            const hasPayload =
              args.length > 0 || Object.keys(modifiers).length > 0 || node.target !== undefined;
            expect(hasPayload, `${src}: parsed to a payload-less ${command}`).toBe(true);
          }
        }
      });
    }
  });
});

describe('the second dispatch entry point', () => {
  // `parseCompoundCommand` is reached from parseCommandCore AND from
  // `createCommandFromIdentifier`, which parses a command nested in another
  // command's body. The pre-dispatch interceptions in parseCommandCore (`add`
  // among them) do NOT run on that path, so a member whose behaviour depends
  // on one would break here and nowhere else. These run the command for real:
  // a parse that merely succeeds proves nothing.
  const PARTIAL = "<hx-partial target='#out'><p>NEW</p></hx-partial>";

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div><div id="probe"></div><div id="out">OLD</div>';
  });

  const host = () => document.getElementById('host') as HTMLElement;

  it.each([['add (intercepted before dispatch on the main path only)', 'tell #probe add .active']])(
    '%s',
    async (_label, src) => {
      await hyperscript.eval(src, host());
      expect(document.getElementById('probe')?.classList.contains('active')).toBe(true);
    }
  );

  it.each([
    ['process', `set h to "${PARTIAL}" then tell #probe process partials in h`],
    [
      'process with the view-transition tail',
      `set h to "${PARTIAL}" then tell #probe process partials in h using view transition`,
    ],
  ])('%s runs when nested', async (_label, src) => {
    await hyperscript.eval(src, host());
    expect(document.getElementById('out')?.innerHTML).toContain('NEW');
  });
});

describe('the `using view transition` tail reaches the runtime', () => {
  // Both commands declare the tail in their own commandMeta and both runtimes
  // already read it off the flat args — only the parsers never consumed it.
  const TAIL = ['using', 'view', 'transition'];

  it.each([
    ['process', 'process partials in it using view transition'],
    ['swap', 'swap #target with it using view transition'],
  ])('%s keeps all three tail keywords in its args', (_name, src) => {
    for (const [, opts] of BOTH_PATHS) {
      const result = hyperscript.compileSync(src, opts as never);
      const node = topLevel(result)[0] as { args?: Array<{ name?: string; value?: unknown }> };
      const names = (node.args ?? []).map(a => String(a?.name ?? a?.value).toLowerCase());
      expect(names.slice(-3), `${src}: args were [${names.join(', ')}]`).toEqual(TAIL);
    }
  });
});
