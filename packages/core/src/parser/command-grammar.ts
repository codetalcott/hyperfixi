/**
 * The declared grammar of every command that has no dedicated parser
 *
 * Arc 3 step 4 of `docs-internal/ENGINE_MIGRATION_PLAN.md`; the decision and
 * its measurements are in `docs-internal/HANDOFF-engine-arc3.md`. Until step 4,
 * 23 commands fell through to a generic argument loop at the tail of
 * `parseCommandCore`, and 4 more (`append`, `prepend`, `make`, `throw`) went
 * through `MULTI_WORD_PATTERNS` and `parseMultiWordCommand`. Two loops, two
 * boundary rules, and a grammar that existed only as the reads each
 * command's `parseInput` happened to make. This table is that grammar,
 * written down once, and `parseDeclaredCommand` is the one parser that
 * consumes it.
 *
 * ## Why core-local, and not `@lokascript/semantic`'s schemas
 *
 * The plan's step 4 offered two sources: (a) a spec per command here, or (b)
 * the front-end's per-command schemas via `@lokascript/intent`. Measured
 * before choosing: the schemas describe the same commands from the other side
 * (`svoPosition` 108 sites, `markerOverride` 47, `argSkipTokens` 8), but in a
 * role vocabulary (`patient`, `destination`) the engine has no reason to know,
 * and across the boundary Arc 1 exists to draw — `check-semantic-boundary`
 * would count the import, and should. So (a), written in the engine's own
 * vocabulary — positional slots and marker words — with the parity between the
 * two kept by a test rather than by sharing a definition (the same trade
 * `check:mapper-parity` already makes for the mappers).
 *
 * ## What a row says
 *
 * - `positional`: how the arguments BEFORE any marker word are parsed.
 *   `'expression'` is the tail loop's rule — full expressions, comma-separated
 *   — and is what the 23 get. `'primary'` is the multi-word rule the four
 *   carried: `parsePrimary` per argument so that a marker word is never
 *   swallowed into an expression (`fetch URL as json` must not become one
 *   `as` expression). `'none'` means the command takes no arguments at all.
 * - `markers`: the words that open a keyword slot. Each captures ONE expression
 *   into `modifiers[<word>]`; a word in `commaList` collects a comma-separated
 *   list into one `arrayLiteral`, mirroring upstream's explicit
 *   `do { … } while (matchOpToken(","))` — only `make`'s `from` has it.
 * - `syntax`: the human summary. Not read by the parser; it is here so the
 *   grammar and its documentation cannot drift apart in two files.
 *
 * ## What every row shares (the boundary rule)
 *
 * Arguments stop at a command terminator (`then`, `and`, `else`, `end`, and
 * `on`), at a marker word of THIS row, or at a command word — except a command
 * word immediately followed by `(`, which is a function call in expression
 * position (`call fetch("/x")`), not the next command. The tail loop lacked two
 * of those: it did not stop at `on` (so a zero-argument command at the end of
 * a handler body swallowed the NEXT HANDLER as its argument — `on click focus\n
 * on keyup log 1` compiled to one handler), and it had no `(` exception (so
 * `call fetch("/x")` split into an empty `call` and a `fetch` COMMAND that
 * then ran). Both are measured in `declared-commands.test.ts`.
 *
 * Leftover tokens that are none of those are left where they are, exactly as
 * the tail loop left them: `log x y z` parses `log x` and the statement loop
 * deals with `y z`. Upstream rejects that source (the documented-examples gate
 * records it as a docs defect), and turning the silent drop into an error is
 * a behaviour change this step deliberately does not make — it is noted in
 * the plan as the follow-up.
 */

export type PositionalRule = 'none' | 'expression' | 'primary';

export interface CommandGrammar {
  readonly positional: PositionalRule;
  /** Marker words that open a keyword slot, in the order the syntax lists them. */
  readonly markers: readonly string[];
  /** Markers whose value is a comma-separated list, collected into one `arrayLiteral`. */
  readonly commaList?: readonly string[];
  /**
   * Words that CONTINUE the positional list instead of opening a slot: the
   * word itself is pushed into `args` as an identifier and parsing goes on.
   * This is the old tail loop's `continuationKeywords` behaviour, kept for the
   * one row that still needs it — a plugin's command, whose `parseInput` was
   * written against that flat shape (`answer with "x"` → `[with, "x"]`).
   */
  readonly continuation?: readonly string[];
  readonly syntax: string;
}

/**
 * Commands parsed by a DEDICATED parser — a keyword branch in
 * `parseCommandCore`, or a row in `COMPOUND_COMMAND_PARSERS`. They have no row
 * here, and `command-routes.test.ts` asserts that this set and the grammar's
 * keys partition `COMMAND_NAMES` exactly: every command has one route, and
 * no command has two. Adding a command means choosing.
 *
 * Typed as plain strings on purpose. Keying this on the manifest's
 * `CommandName` would make `parser/` import `commands/`, the upward edge the
 * layering ratchet exists to refuse (`parser -> commands` is allowlisted at
 * exactly the three sites Arc 3 is meant to remove, not grow). The routes test
 * checks the names against the manifest from the test side; step 2 inverts the
 * direction properly, when a command module registers its own grammar row.
 */
export const DEDICATED_PARSER_COMMANDS: ReadonlySet<string> = new Set<string>([
  // keyword branches in parseCommandCore
  'fetch',
  'repeat',
  'if',
  'unless',
  'wait',
  'install',
  'transition',
  'add',
  'increment',
  'decrement',
  // COMPOUND_COMMAND_PARSERS rows → parseCompoundCommand (the set that used
  // to route these by membership was retired in Arc 3 step 5: a command is
  // dedicated iff it has a row, and the row is its parser)
  'put',
  'trigger',
  'send',
  'remove',
  'take',
  'toggle',
  'set',
  'show',
  'hide',
  'halt',
  'measure',
  'js',
  'go',
  'scroll',
  'tell',
  'pick',
  'start',
  'swap',
  'morph',
  'push',
  'replace',
  'process',
]);

const NONE: CommandGrammar = { positional: 'none', markers: [], syntax: '' };
const ONE_EXPR = (syntax: string): CommandGrammar => ({
  positional: 'expression',
  markers: [],
  syntax,
});
const BEEP = ONE_EXPR('beep! [<expression>, …]');

/**
 * One row per command that reaches the generic parser. Rows are keyed by the
 * name the dispatcher sees AFTER its own rewrites — `beep!` is the name of the
 * command once the parser has folded the `!` in.
 */
export const COMMAND_GRAMMAR: Readonly<Record<string, CommandGrammar>> = {
  // --- the four that were MULTI_WORD_PATTERNS, verbatim -------------------
  // `expression`, not the `primary` the multi-word parser used: `to` is not
  // an operator, so a full expression is safe here, and `parsePrimary` never
  // took the `.name` of `append item.name to #results` — that shipped doc
  // example parsed as `[item, .name]`, silently, and appended the wrong things.
  append: { positional: 'expression', markers: ['to'], syntax: 'append <value> [to <target>]' },
  prepend: { positional: 'expression', markers: ['to'], syntax: 'prepend <value> [to <target>]' },
  make: {
    positional: 'primary',
    markers: ['a', 'an', 'from', 'called'],
    // `make a URL from "/path/", "https://…"` — MakeCommand's own documented
    // example, a constructor with two arguments. Without this the modifier
    // loop took only `"/path/"` and left `, "https://…"`.
    commaList: ['from'],
    syntax: 'make (a|an) <type> [from <args>] [called <name>]',
  },
  throw: { positional: 'primary', markers: [], syntax: 'throw <error>' },

  // --- the 23 that fell through to the tail loop --------------------------
  async: ONE_EXPR('async <command>'),
  'beep!': BEEP,
  beep: BEEP,
  blur: ONE_EXPR('blur [<target>]'),
  break: NONE,
  breakpoint: NONE,
  call: ONE_EXPR('call <expression>'),
  clear: ONE_EXPR('clear <target>'),
  close: ONE_EXPR('close [<target>]'),
  continue: NONE,
  copy: { positional: 'expression', markers: ['to'], syntax: 'copy <source> [to clipboard]' },
  default: {
    positional: 'expression',
    markers: ['to'],
    syntax: 'default <target> to <value>',
  },
  empty: ONE_EXPR('empty [<target>]'),
  exit: NONE,
  focus: ONE_EXPR('focus [<target>]'),
  get: ONE_EXPR('get <expression>'),
  log: ONE_EXPR('log <expression>[, <expression>…]'),
  open: ONE_EXPR('open [<dialog>] [as modal|non-modal]'),
  'pseudo-command': ONE_EXPR('<method>(…) [on|from|…] <target>'),
  render: {
    positional: 'expression',
    markers: ['with'],
    syntax: 'render <template> [with <variables>]',
  },
  reset: ONE_EXPR('reset [<form>]'),
  return: ONE_EXPR('return [<value>]'),
  select: ONE_EXPR('select [<target>]'),
  settle: {
    positional: 'expression',
    markers: ['for'],
    syntax: 'settle [<target>] [for <timeout>]',
  },
};

/**
 * The row for a command word the manifest does not know — one a plugin
 * registered at runtime. Positional expressions and no marker slots: what the
 * old tail loop gave every command, kept for the ones it still has to serve.
 */
export const PLUGIN_COMMAND_GRAMMAR: CommandGrammar = {
  positional: 'expression',
  markers: [],
  continuation: ['into', 'from', 'to', 'with', 'by', 'at', 'before', 'after', 'over'],
  syntax: '<plugin command> [<expression>, …]',
};

/** The grammar row for a command name, or `null` for a dedicated-parser command. */
export function grammarOf(commandName: string): CommandGrammar | null {
  return COMMAND_GRAMMAR[commandName.toLowerCase()] ?? null;
}
