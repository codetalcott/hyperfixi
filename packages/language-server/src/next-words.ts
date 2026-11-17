/**
 * What the engine's grammar takes next at a cursor, in the order worth
 * offering it.
 *
 * The engine throws at the first error and returns no tree, so a script that
 * is being typed cannot be asked "what fits here?" through its parse. It can
 * through its parser's questions: every keyword the grammar consumes goes
 * through `Parser.match` (or is looked at with `peek`), so the words those
 * calls ask for while the parser stands at the end of the text are the words
 * it would take there. Commands and features are dispatched from tables, not
 * `match`, so their keywords are candidates everywhere. Each candidate is
 * then tried: text + word is parsed, and the word is kept when the parser
 * matched it at the cursor and did not stop at it. The engine decides; no
 * list of what follows what is kept here.
 *
 * The grammar takes a great deal: a new command after almost any finished
 * one, and some sixty operators and units after almost any expression. So
 * the order is most of the value: a word the parser REQUIRES, then the words
 * of the command being written, then closers and commands by how often the
 * reference examples use them, then the operators any expression takes.
 * Where a command is what comes next (a feature's head, after `then`, `else`
 * or `otherwise`) the commands come first and what closes comes last; an
 * empty script opens with a feature. Past a parse error nothing is offered.
 *
 * Measured by `src/tools/completion-measure.ts`. The spike this came from:
 * hyperfixi PR #1682's plan, Phase 3.
 */

/** The parts of `@hyperfixi/engine` this reads. */
export interface CompletionEngine {
  parse(code: string): unknown;
  Parser: { prototype: unknown };
}

export interface NextWords {
  /** Every word the grammar takes at the end of `text`, best first. */
  words: string[];
  /** How many of `words`, from the front, the parser requires here. */
  requiredCount: number;
  /** How many of `words`, from the front, belong to the command being written. */
  ownCount: number;
  /** Does the grammar read a name here (a variable, a function, a value)? */
  takesName: boolean;
  /** The keyword just before the cursor, when nothing but space follows it. */
  lastWord: string | null;
  /**
   * How many of `words`, from the front, come before a name where one is read:
   * the required words and the command's own that are not how any expression
   * starts (`forever` after `repeat`, not `the` or `first`).
   */
  specificCount: number;
  /** Nothing is written yet (or only comments): a feature comes first, not a value. */
  atStart: boolean;
  /** The parser stopped before the cursor: nothing is known to fit, and `words` is empty. */
  pastError: boolean;
}

export interface Completer {
  nextWords(text: string): NextWords | null;
  /**
   * A parse of as much of `text` as parses: `text` itself, or `text` cut back
   * to an earlier keyword. The tree an unfinished script does not have.
   */
  treeBefore(text: string): { tree: unknown; code: string } | null;
}

interface Token {
  value: string;
  type: string;
  start: number;
  end?: number;
}
interface ParserLike {
  g: { commands: Record<string, unknown>; features: Record<string, unknown> };
  cur(): Token;
  match(value: string, type?: string): Token | undefined;
  peek(value: string, n?: number, type?: string): Token | undefined;
}

interface Reading {
  /** start offset → the word the grammar matched there. */
  matched: Map<number, string>;
  /** Words asked for at the end of the text, in the order asked. */
  tried: string[];
  ok: boolean;
  /** Where the parser stopped, when it threw. */
  stoppedAt: number | null;
  expected: string[];
  tree: unknown;
}

const WORD = /^[A-Za-z]/;
const CLOSERS = ['then', 'end', 'else', 'otherwise'];
/** After these a command was promised: one comes first, and what closes comes last. */
const PROMISES_COMMAND = new Set(['then', 'else', 'otherwise']);
/** A name no script uses, to ask whether the grammar reads a name here. */
const PLACEHOLDER = 'zqxjName';

export function createCompleter(engine: CompletionEngine, examples: string[] = []): Completer {
  const proto = engine.Parser.prototype as ParserLike;
  const original = { match: proto.match, peek: proto.peek };
  let grammar: ParserLike['g'] | null = null;

  function read(source: string, recordTried = false): Reading {
    const matched = new Map<number, string>();
    const tried: string[] = [];
    const note = (value: string) => {
      if (recordTried && !tried.includes(value)) tried.push(value);
    };
    proto.match = function (this: ParserLike, value, type) {
      grammar ??= this.g;
      const atEnd = this.cur().type === 'EOF';
      const token = original.match.call(this, value, type);
      if ((type ?? 'IDENTIFIER') === 'IDENTIFIER') {
        if (token) matched.set(token.start, token.value);
        else if (atEnd) note(value);
      }
      return token;
    };
    proto.peek = function (this: ParserLike, value, n = 0, type) {
      const token = original.peek.call(this, value, n, type);
      if (!token && n === 0 && (type ?? 'IDENTIFIER') === 'IDENTIFIER') {
        if (this.cur().type === 'EOF') note(value);
      }
      return token;
    };
    const reading: Reading = {
      matched,
      tried,
      ok: true,
      stoppedAt: null,
      expected: [],
      tree: null,
    };
    try {
      reading.tree = engine.parse(source);
    } catch (error) {
      const e = error as { token?: { start?: number }; expected?: string[] };
      reading.ok = false;
      reading.stoppedAt = e.token?.start ?? -1;
      reading.expected = e.expected ?? [];
    } finally {
      proto.match = original.match;
      proto.peek = original.peek;
    }
    return reading;
  }

  /** Does the grammar take `word` as a keyword right after `text`? */
  const accepts = (text: string, word: string): boolean => {
    const reading = read(text + word);
    return (
      reading.matched.get(text.length) === word &&
      (reading.ok || (reading.stoppedAt ?? -1) > text.length)
    );
  };

  read('on click toggle .a'); // any parse: the first `match` hands over the grammar
  const tables = grammar as ParserLike['g'] | null;
  const commands = Object.keys(tables?.commands ?? {}).filter(w => WORD.test(w));
  const features = Object.keys(tables?.features ?? {}).filter(w => WORD.test(w));
  const structural = new Set([...commands, ...features]);
  // The words tried after ANY finished expression: operators and units, which
  // are no particular command's. Asked of the parser, not listed.
  const generic = new Set(read('on click log x ', true).tried.filter(w => !structural.has(w)));
  // The words tried where ANY expression starts (`the`, `first`, `not`): no command's own.
  const starters = new Set(read('on click log ', true).tried);

  /**
   * Is the end of a parsed `tree` in a feature's head, before any command of
   * its body (`on click |`, `def f() |`, a behavior's last handler)?
   */
  function inHead(tree: unknown): boolean {
    type Feature = { body?: unknown[]; features?: Feature[] };
    let features = (tree as { program?: { features?: Feature[] } } | null)?.program?.features;
    let last: Feature | undefined;
    while (features?.length) {
      last = features[features.length - 1];
      features = last?.features;
    }
    return !!last && Array.isArray(last.body) && last.body.length === 0;
  }

  const frequency = new Map<string, number>();
  for (const example of examples) {
    const reading = read(example);
    if (!reading.ok) continue;
    for (const word of reading.matched.values()) {
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }
  // Array.sort is stable: words the examples never use keep the grammar's order.
  const byFrequency = (a: string, b: string) => (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0);

  /**
   * Where the last top-level feature of `text` starts, when everything before
   * it parses on its own: the rest of a long script cannot change what fits
   * at the cursor, and parsing it for every candidate is what costs.
   */
  function lastFeatureStart(text: string): number {
    const starts: number[] = [];
    for (const m of text.matchAll(/^[ \t]*([A-Za-z]+)/gm)) {
      if (features.includes(m[1]!) && (m.index ?? 0) > 0) starts.push(m.index ?? 0);
    }
    for (let i = starts.length - 1; i >= 0; i--) {
      if (read(text.slice(0, starts[i])).ok) return starts[i]!;
    }
    return 0;
  }

  return {
    nextWords(whole: string): NextWords | null {
      if (!tables) return null;
      const text = whole.slice(lastFeatureStart(whole));
      const first = read(text, true);
      // The parser stopped before the cursor: what follows an error is unknown,
      // and nothing is offered (a keyword list would offer what the grammar rejects).
      if (!first.ok && (first.stoppedAt ?? -1) < text.trimEnd().length) {
        return {
          words: [],
          requiredCount: 0,
          ownCount: 0,
          specificCount: 0,
          takesName: false,
          lastWord: null,
          atStart: false,
          pastError: true,
        };
      }

      const ok = (word: string) => accepts(text, word);
      const required = first.expected.filter(w => WORD.test(w) && ok(w));
      // `s` is the possessive `'s`, which nobody completes as a word.
      const tried = first.tried.filter(w => w !== 's');
      const ownAll = tried
        .filter(w => !structural.has(w) && !generic.has(w) && !CLOSERS.includes(w) && ok(w))
        .reverse();
      // A word of this command that no example ever uses (`queue`, `throttled`
      // after `on click`) is taken by the grammar but is not what comes next:
      // it goes after the commands. With no examples every word keeps its place.
      const known = frequency.size > 0;
      const own = known ? ownAll.filter(w => frequency.has(w)) : ownAll;
      const rare = known ? ownAll.filter(w => !frequency.has(w)) : [];
      const operators = tried.filter(w => generic.has(w) && ok(w)).sort(byFrequency);

      const named = read(text + PLACEHOLDER);
      const takesName = named.ok || (named.stoppedAt ?? -1) >= text.length + PLACEHOLDER.length;

      let lastWord: string | null = null;
      const lastStart = Math.max(-1, ...first.matched.keys());
      if (lastStart >= 0) {
        const word = first.matched.get(lastStart)!;
        if (text.slice(lastStart + word.length).trim() === '') lastWord = word;
      }

      const head = first.ok && inHead(first.tree);
      const following = [...CLOSERS, ...commands, ...features].filter(ok).sort(byFrequency);

      // The command's own words that are not how any expression starts come
      // before a name; `the` and `first` after it.
      const specific = own.filter(w => !starters.has(w));
      const plain = own.filter(w => starters.has(w));
      const requiredSet = new Set(required);

      const program = (first.tree as { program?: { features?: unknown[] } } | null)?.program;
      // The engine does not read an empty script: it stops at the end with no word matched.
      const atStart =
        first.matched.size === 0 &&
        (first.ok
          ? (program?.features?.length ?? 1) === 0
          : text.replace(/--.*$/gm, '').trim() === '');

      let words: string[];
      let ownCount: number;
      let specificCount = new Set([...required, ...specific]).size;
      if (atStart) {
        // An empty script: a feature first, then the commands a script may open with.
        const opening = [
          ...following.filter(w => features.includes(w)),
          ...following.filter(w => !features.includes(w)),
        ];
        words = [...new Set([...required, ...opening, ...own, ...rare, ...operators])];
        ownCount = specificCount = requiredSet.size;
      } else if (head || PROMISES_COMMAND.has(lastWord ?? '')) {
        // A command comes next: before the head's own optional words (`from`,
        // `debounced`), and what closes (`end`: an empty handler) last.
        const closing = following.filter(w => CLOSERS.includes(w));
        const opening = following.filter(w => !CLOSERS.includes(w));
        words = [...new Set([...required, ...opening, ...own, ...rare, ...closing, ...operators])];
        ownCount = specificCount = requiredSet.size;
      } else {
        const front = [...new Set([...required, ...specific, ...plain])];
        words = [...new Set([...front, ...following, ...rare, ...operators])];
        ownCount = front.length;
      }
      // Nothing to catch or to finish before a feature's first command: the
      // grammar reads `on click catch e`, and nobody means it.
      if (head) words = words.filter(w => w !== 'catch' && w !== 'finally');
      return {
        words,
        requiredCount: requiredSet.size,
        ownCount,
        specificCount,
        takesName,
        lastWord,
        atStart,
        pastError: false,
      };
    },

    treeBefore(text: string): { tree: unknown; code: string } | null {
      const whole = read(text);
      if (whole.ok) return { tree: whole.tree, code: text };
      const starts = [...whole.matched.keys()].filter(s => s > 0).sort((a, b) => b - a);
      for (const start of starts.slice(0, 12)) {
        const code = text.slice(0, start);
        const shorter = read(code);
        if (shorter.ok) return { tree: shorter.tree, code };
      }
      return null;
    },
  };
}
