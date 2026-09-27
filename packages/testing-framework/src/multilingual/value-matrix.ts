/**
 * Value matrix — a generated, executed test of every value shape
 * ----------------------------------------------------------------
 * Fifty PRs fixed values that lost their tail or their whole command: a
 * possessive operand, an `of` path, a parenthesized group, a translated `and`.
 * Each was found by a battery written by hand, and each fix was locked in only
 * by its own test table. Nothing counted what was still broken, because nothing
 * enumerated the space.
 *
 * This does. A CELL is one value expression in one position:
 *
 *   - OPERANDS: nine kinds (literal, variable, selector, possessive, `of`,
 *     dotted, call, array, parens), each with instances of the value types it
 *     produces;
 *   - OPERATORS: arithmetic, comparison, equality, logic, membership, and the
 *     prefix and postfix forms (`not`, `-`, `no`, `is empty`, `exists`, `as`);
 *   - POSITIONS: a `put` value, a `set` value, an `if` condition, a `repeat
 *     while` condition, and an `increment … by` amount.
 *
 * The generator crosses them as a covering design, not a full product: every
 * operand alone; every operator with literal and variable operands on each
 * side; every other operand kind with a representative operator of each class
 * it fits, on each side; and a few multi-operator expressions.
 *
 * ## Lanes
 * Each cell runs its English source on the real `hyperscript.org` engine: that
 * result is the ORACLE. Then, on the same fixture:
 *
 *   - `en`     hyperfixi's English path (core's parser and runtime);
 *   - `en-rt`  semantic's English parse rendered back to English, on upstream:
 *              where it fails, every translation inherits the loss;
 *   - `<L>`    each of 23 languages on hyperfixi's direct path —
 *              `render(parse_en(src), L)`, compiled with `{ language: L }`;
 *   - `<L>/up` the same translation through `@lokascript/hyperscript-adapter`
 *              (`preprocess`, back to English) on upstream: the multilingual
 *              product for original _hyperscript users.
 *
 * A (cell, lane) pair FAILS when its result differs from the oracle's.
 *
 * ## The ratchet
 * `baselines/value-matrix.json` lists every failing pair, per cell. The gate
 * fails on a failing pair it does not list AND on a listed pair that now
 * passes, so the list only ever shrinks and every fix is locked in by the gate
 * that counted it. Regenerate with `tools/regen-value-matrix-baseline.ts`,
 * which refuses to add pairs unless told to.
 *
 * ## Execution model
 * One jsdom window for the whole run; each lane resets `<body>` and the
 * globals, installs the handler on a fresh button, clicks it, and reads
 * `#out`. Variables are window globals (see GLOBALS), so no source needs a
 * `set` prefix. Upstream runs synchronously; hyperfixi's handler settles
 * within one macrotask.
 *
 * A translation that loses a loop's condition can loop forever. Core caps a
 * loop at 10,000 iterations; upstream has no cap and blocks the thread, so
 * every upstream run gets an evaluation budget (see EVAL_BUDGET).
 *
 * Node-only: imports the real `hyperscript.org` build off disk and needs the
 * node vitest environment (see the shipped-examples gate for why).
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { installGlobals } from './shipped-examples-execution';

// ---------------------------------------------------------------------------
// The generator
// ---------------------------------------------------------------------------

/** The value an expression produces. `nstr` is a numeric string, as `textContent` reads: it fills a number's slot too. */
export type ValueType = 'num' | 'nstr' | 'str' | 'bool' | 'arr' | 'obj' | 'null' | 'el' | 'els';

export type OperandKind =
  | 'literal'
  | 'variable'
  | 'selector'
  | 'possessive'
  | 'of'
  | 'dotted'
  | 'call'
  | 'array'
  | 'parens';

export type Position = 'put' | 'set' | 'if' | 'while' | 'increment';

export const POSITIONS: readonly Position[] = ['put', 'set', 'if', 'while', 'increment'];

export interface Operand {
  kind: OperandKind;
  type: ValueType;
  text: string;
}

export interface MatrixCell {
  /** `<position>|<expression>` — stable, and readable in the baseline. */
  id: string;
  position: Position;
  expression: string;
  /** The English handler. */
  source: string;
  group: 'operand' | 'operator' | 'operand-operator' | 'compound';
  /** The operand kind under test, when the cell tests one. */
  operand?: OperandKind;
  /** The operator under test, when any. */
  operator?: string;
}

/**
 * The fixture every lane runs on. `#out` starts as `∅`, which no oracle
 * result is: a lane that never reaches its `put` reads `∅`.
 */
export const FIXTURE =
  '<div id="out">∅</div>' +
  '<p id="a" class="x" title="t1">6</p>' +
  '<div id="w"><p class="w">w</p><p class="w">v</p></div>' +
  '<button id="b">b</button>';

/** Window globals, rebuilt before every run so no lane sees another's writes. */
export const GLOBALS: Readonly<Record<string, () => unknown>> = {
  n: () => 6,
  s: () => 'ab',
  flag: () => true,
  arr: () => [1, 2],
  obj: () => ({ v: 6, w: { v: 2 } }),
};

export const OPERANDS: readonly Operand[] = [
  { kind: 'literal', type: 'num', text: '2' },
  { kind: 'literal', type: 'str', text: '"q"' },
  { kind: 'literal', type: 'bool', text: 'true' },
  { kind: 'literal', type: 'null', text: 'null' },
  { kind: 'variable', type: 'num', text: 'n' },
  { kind: 'variable', type: 'str', text: 's' },
  { kind: 'variable', type: 'bool', text: 'flag' },
  { kind: 'variable', type: 'arr', text: 'arr' },
  { kind: 'variable', type: 'obj', text: 'obj' },
  { kind: 'selector', type: 'el', text: '#a' },
  { kind: 'selector', type: 'els', text: '.w' },
  { kind: 'possessive', type: 'nstr', text: "#a's textContent" },
  { kind: 'possessive', type: 'str', text: 'my id' },
  { kind: 'possessive', type: 'num', text: "obj's v" },
  { kind: 'possessive', type: 'num', text: "arr's length" },
  { kind: 'possessive', type: 'num', text: "#a's textContent's length" },
  { kind: 'of', type: 'nstr', text: 'textContent of #a' },
  { kind: 'of', type: 'nstr', text: 'the textContent of #a' },
  { kind: 'of', type: 'num', text: 'v of obj' },
  { kind: 'of', type: 'num', text: 'length of arr' },
  { kind: 'of', type: 'str', text: '@title of #a' },
  { kind: 'of', type: 'num', text: 'v of w of obj' },
  { kind: 'of', type: 'arr', text: 'textContent of .w' },
  { kind: 'dotted', type: 'nstr', text: '#a.textContent' },
  { kind: 'dotted', type: 'str', text: 'me.id' },
  { kind: 'dotted', type: 'num', text: 'obj.v' },
  { kind: 'dotted', type: 'num', text: 'arr.length' },
  { kind: 'dotted', type: 'num', text: 'obj.w.v' },
  { kind: 'call', type: 'num', text: 'Math.max(n, 1)' },
  { kind: 'call', type: 'nstr', text: 'String(n)' },
  { kind: 'call', type: 'str', text: 's.toUpperCase()' },
  { kind: 'call', type: 'bool', text: 'Array.isArray(arr)' },
  { kind: 'array', type: 'arr', text: '[1, 2]' },
  { kind: 'array', type: 'arr', text: '[n, 2]' },
  { kind: 'parens', type: 'num', text: '(n + 1)' },
  { kind: 'parens', type: 'str', text: '(s + "c")' },
  { kind: 'parens', type: 'bool', text: '(n > 1)' },
];

/** An operator slot, and the value types that fill it. */
type Slot = 'num' | 'str' | 'text' | 'bool' | 'arr' | 'empty' | 'el' | 'one' | 'els' | 'none';

const FITS: Record<Slot, readonly ValueType[]> = {
  num: ['num', 'nstr'],
  str: ['str', 'nstr'],
  text: ['str'],
  bool: ['bool'],
  arr: ['arr'],
  empty: ['str', 'nstr', 'arr', 'obj', 'null'],
  el: ['el', 'els'],
  one: ['el'],
  els: ['els'],
  none: [],
};

interface Signature {
  left: Slot;
  right: Slot;
  /** The operands that fill the other slot while one side is under test. */
  leftAnchor: string;
  rightAnchor: string;
  result: ValueType;
}

interface BinaryOperator {
  op: string;
  signatures: Signature[];
  /** Representative of its class: crossed with every operand kind, not only literals and variables. */
  representative?: boolean;
}

interface UnaryOperator {
  op: string;
  fix: 'prefix' | 'postfix';
  slot: Slot;
  anchor: string;
  result: ValueType;
  representative?: boolean;
}

const sig = (
  left: Slot,
  right: Slot,
  leftAnchor: string,
  rightAnchor: string,
  result: ValueType
): Signature => ({ left, right, leftAnchor, rightAnchor, result });

export const BINARY_OPERATORS: readonly BinaryOperator[] = [
  {
    op: '+',
    representative: true,
    signatures: [sig('num', 'num', '2', '2', 'num'), sig('text', 'text', '"q"', '"q"', 'str')],
  },
  { op: '-', signatures: [sig('num', 'num', '20', '2', 'num')] },
  { op: '*', signatures: [sig('num', 'num', '2', '2', 'num')] },
  { op: '/', signatures: [sig('num', 'num', '12', '2', 'num')] },
  { op: 'mod', signatures: [sig('num', 'num', '13', '4', 'num')] },
  { op: '<', representative: true, signatures: [sig('num', 'num', '1', '4', 'bool')] },
  { op: '>', signatures: [sig('num', 'num', '1', '4', 'bool')] },
  { op: '<=', signatures: [sig('num', 'num', '1', '4', 'bool')] },
  { op: '>=', signatures: [sig('num', 'num', '1', '4', 'bool')] },
  {
    op: 'is',
    representative: true,
    signatures: [sig('num', 'num', '6', '6', 'bool'), sig('text', 'text', '"ab"', '"ab"', 'bool')],
  },
  {
    op: 'is not',
    signatures: [sig('num', 'num', '6', '6', 'bool'), sig('text', 'text', '"ab"', '"ab"', 'bool')],
  },
  { op: '==', signatures: [sig('num', 'num', '6', '6', 'bool')] },
  { op: '!=', signatures: [sig('num', 'num', '6', '6', 'bool')] },
  { op: 'is greater than', signatures: [sig('num', 'num', '1', '4', 'bool')] },
  { op: 'is less than', signatures: [sig('num', 'num', '1', '4', 'bool')] },
  { op: 'and', representative: true, signatures: [sig('bool', 'bool', 'true', 'true', 'bool')] },
  { op: 'or', signatures: [sig('bool', 'bool', 'false', 'false', 'bool')] },
  {
    op: 'contains',
    representative: true,
    signatures: [
      sig('str', 'str', '"xab6"', '"a"', 'bool'),
      sig('arr', 'num', '[1, 2, 6]', '2', 'bool'),
    ],
  },
  {
    op: 'is in',
    representative: true,
    signatures: [sig('num', 'arr', '2', '[1, 2, 6]', 'bool')],
  },
  { op: 'matches', representative: true, signatures: [sig('one', 'none', '#a', '.x', 'bool')] },
];

export const UNARY_OPERATORS: readonly UnaryOperator[] = [
  { op: 'not', fix: 'prefix', slot: 'bool', anchor: 'false', result: 'bool', representative: true },
  { op: '-', fix: 'prefix', slot: 'num', anchor: '2', result: 'num', representative: true },
  { op: 'no', fix: 'prefix', slot: 'els', anchor: '.w', result: 'bool', representative: true },
  {
    op: 'is empty',
    fix: 'postfix',
    slot: 'empty',
    anchor: '""',
    result: 'bool',
    representative: true,
  },
  { op: 'is not empty', fix: 'postfix', slot: 'empty', anchor: '""', result: 'bool' },
  { op: 'exists', fix: 'postfix', slot: 'el', anchor: '#a', result: 'bool', representative: true },
  { op: 'as Int', fix: 'postfix', slot: 'num', anchor: '"7"', result: 'num', representative: true },
  { op: 'as String', fix: 'postfix', slot: 'num', anchor: '7', result: 'str' },
];

/**
 * Multi-operator expressions: precedence, chaining, and mixed operand kinds.
 * Upstream requires parentheses between different math operators.
 */
export const COMPOUND_EXPRESSIONS: ReadonlyArray<{ text: string; result: ValueType }> = [
  { text: 'n + (2 * 3)', result: 'num' },
  { text: '(n * 2) + 3', result: 'num' },
  { text: '(n + 2) * 3', result: 'num' },
  { text: 'n - 2 - 1', result: 'num' },
  { text: 'n + 1 < 10', result: 'bool' },
  { text: 'n > 1 and n < 10', result: 'bool' },
  { text: 'n < 1 or n > 5', result: 'bool' },
  { text: 'not flag or n is 6', result: 'bool' },
  { text: 'flag and not (n is 6)', result: 'bool' },
  { text: "#a's textContent as Int + 1", result: 'num' },
  { text: 'length of arr + n', result: 'num' },
  { text: 'obj.v * obj.w.v', result: 'num' },
  { text: 's + " " + my id', result: 'str' },
];

const TEMPLATES: Record<Position, (expression: string) => string> = {
  put: e => `on click put ${e} into #out`,
  set: e => `on click set x to ${e} then put x into #out`,
  if: e => `on click if ${e} then put "Y" into #out else put "N" into #out end`,
  while: e => `on click set i to 0 then repeat while i < ${e} increment i end then put i into #out`,
  increment: e => `on click set i to 1 then increment i by ${e} then put i into #out`,
};

/**
 * The positions an expression fills: any value is put or set; a condition
 * takes a boolean, or an operand alone (its truthiness); a loop bound and an
 * increment take a number.
 */
function positionsFor(type: ValueType, bare: boolean): Position[] {
  const out: Position[] = ['put', 'set'];
  if (type === 'bool' || bare) out.push('if');
  if (type === 'num' || type === 'nstr') out.push('while', 'increment');
  return out;
}

const fits = (operand: Operand, slot: Slot): boolean => FITS[slot].includes(operand.type);
const isSimple = (operand: Operand): boolean =>
  operand.kind === 'literal' || operand.kind === 'variable';

/** Every cell, in a stable order. */
export function generateCells(): MatrixCell[] {
  const cells = new Map<string, MatrixCell>();
  const add = (
    expression: string,
    result: ValueType,
    meta: Pick<MatrixCell, 'group'> & Partial<Pick<MatrixCell, 'operand' | 'operator'>>
  ): void => {
    for (const position of positionsFor(result, meta.group === 'operand')) {
      const id = `${position}|${expression}`;
      if (cells.has(id)) continue;
      cells.set(id, { id, position, expression, source: TEMPLATES[position](expression), ...meta });
    }
  };

  for (const o of OPERANDS) add(o.text, o.type, { group: 'operand', operand: o.kind });

  for (const b of BINARY_OPERATORS) {
    for (const s of b.signatures) {
      add(`${s.leftAnchor} ${b.op} ${s.rightAnchor}`, s.result, {
        group: 'operator',
        operator: b.op,
      });
      for (const o of OPERANDS) {
        if (!isSimple(o) && !b.representative) continue;
        const group = isSimple(o) ? 'operator' : 'operand-operator';
        const meta = { group, operand: o.kind, operator: b.op } as const;
        if (fits(o, s.left)) add(`${o.text} ${b.op} ${s.rightAnchor}`, s.result, meta);
        if (fits(o, s.right)) add(`${s.leftAnchor} ${b.op} ${o.text}`, s.result, meta);
      }
    }
  }

  for (const u of UNARY_OPERATORS) {
    const form = (text: string): string =>
      u.fix === 'postfix' ? `${text} ${u.op}` : u.op === '-' ? `-${text}` : `${u.op} ${text}`;
    add(form(u.anchor), u.result, { group: 'operator', operator: u.op });
    for (const o of OPERANDS) {
      if (!isSimple(o) && !u.representative) continue;
      if (!fits(o, u.slot)) continue;
      // Upstream reads no article after a unary minus.
      if (u.op === '-' && o.text.startsWith('the ')) continue;
      add(form(o.text), u.result, {
        group: isSimple(o) ? 'operator' : 'operand-operator',
        operand: o.kind,
        operator: u.op,
      });
    }
  }

  for (const c of COMPOUND_EXPRESSIONS) add(c.text, c.result, { group: 'compound' });

  return [...cells.values()];
}

// ---------------------------------------------------------------------------
// Lanes and engines
// ---------------------------------------------------------------------------

export const FOREIGN_LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

/** Every lane, in report order. */
export const LANES: readonly string[] = [
  'en',
  'en-rt',
  ...FOREIGN_LANGUAGES.flatMap(language => [language, `${language}/up`]),
];

/**
 * Upstream evaluations allowed per run. A cell uses well under a hundred; a
 * loop whose condition a translation lost uses them all and stops, where it
 * would otherwise block the thread for good.
 */
const EVAL_BUDGET = 20_000;

/** The upstream surface this uses (`hyperscript.org`'s ESM default export). */
interface UpstreamEngine {
  parse(source: string): { errors?: Array<{ message: string }> } | undefined;
  processNode(element: Element): void;
  internals: {
    runtime: { unifiedEval(parseElement: unknown, context: unknown): unknown };
  };
}

/** One (cell, lane) outcome: what the lane put in `#out`, or why it could not run. */
export type LaneResult = string;

export interface CellResult {
  id: string;
  /** The oracle: upstream's result for the English source. */
  want: string;
  /** Why the oracle is unusable, when it is (the generator should never produce one). */
  invalid?: string;
  lanes: Record<string, LaneResult>;
}

export interface MatrixEngines {
  runCell(cell: MatrixCell): Promise<CellResult>;
  /** Restore the console and the process's rejection listeners. */
  close(): Promise<void>;
}

/**
 * Load both engines, once, on a single jsdom window, and return a cell runner.
 *
 * Until `close()`, the console is silenced and unhandled rejections are
 * trapped: thousands of lanes fail by design, both engines report a failure
 * on the console, and hyperfixi's handler is an async listener, so an error
 * in it rejects a promise nobody holds. The process's own rejection
 * listeners (vitest's, under test) are set aside for the run and restored.
 */
export async function initMatrixEngines(): Promise<MatrixEngines> {
  // Errors either engine reports. jsdom's default virtual console forwards an
  // exception thrown in a listener (an upstream handler's) to console.error.
  let reportedErrors = 0;
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });
  installGlobals(dom);

  const saved = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  const quiet = (): void => {};
  console.log = quiet;
  console.warn = quiet;
  console.info = quiet;
  console.error = () => {
    reportedErrors++;
  };
  const rejectionListeners = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  const trap = (): void => {
    reportedErrors++;
  };
  process.on('unhandledRejection', trap);

  const { hyperscript } = await import('@hyperfixi/core');
  const { parseSemantic, render } = await import('@lokascript/semantic');
  const { preprocess } = await import('@lokascript/hyperscript-adapter');
  const require = createRequire(import.meta.url);
  const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
  const upstream: UpstreamEngine = (await import(pathToFileURL(esm).href)).default;

  // The evaluation budget: every upstream evaluation goes through unifiedEval.
  const runtime = upstream.internals.runtime;
  const unifiedEval = runtime.unifiedEval.bind(runtime);
  let evaluations = 0;
  runtime.unifiedEval = (parseElement, context) => {
    if (++evaluations > EVAL_BUDGET) throw new Error('value matrix: evaluation budget spent');
    return unifiedEval(parseElement, context);
  };

  const window = dom.window;
  const document = window.document;
  type Ast = Parameters<typeof hyperscript.execute>[0];

  /**
   * A fresh body and fresh globals; returns the button. A global goes on both
   * the jsdom window and node's globalThis — one object in a browser, two
   * here, and the engines' lookups reach one or the other.
   */
  const reset = (): HTMLElement => {
    document.body.innerHTML = FIXTURE;
    for (const [name, make] of Object.entries(GLOBALS)) {
      const value = make();
      Reflect.set(window, name, value);
      Reflect.set(globalThis, name, value);
    }
    return document.getElementById('b') as HTMLElement;
  };
  const click = (button: HTMLElement): void => {
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  };
  const read = (): string => document.getElementById('out')?.textContent ?? '✗no #out';

  /** Run English on upstream. */
  const onUpstream = (source: string): string => {
    const errors = upstream.parse(source)?.errors ?? [];
    if (errors.length) return `✗parse: ${errors[0]?.message.split('\n')[0] ?? ''}`;
    const button = reset();
    button.setAttribute('_', source);
    evaluations = 0;
    const before = reportedErrors;
    upstream.processNode(button);
    click(button);
    if (evaluations > EVAL_BUDGET) return '✗budget';
    const got = read();
    return reportedErrors > before && got === '∅' ? '✗threw' : got;
  };

  /** Install a compiled handler on hyperfixi, click, and settle. */
  const onHyperfixi = async (ast: Ast): Promise<string> => {
    const button = reset();
    await hyperscript.execute(ast, hyperscript.createContext(button));
    click(button);
    await new Promise(resolve => setTimeout(resolve, 0));
    return read();
  };

  const guard = async (run: () => Promise<string> | string): Promise<string> => {
    try {
      return await run();
    } catch (e) {
      return `✗threw: ${(e as Error).message?.split('\n')[0] ?? String(e)}`;
    }
  };

  return {
    async runCell(cell) {
      const want = onUpstream(cell.source);
      const result: CellResult = { id: cell.id, want, lanes: {} };
      if (want.startsWith('✗') || want === '∅') {
        result.invalid = want;
        return result;
      }
      const lanes = result.lanes;

      lanes.en = await guard(async () => {
        const compiled = hyperscript.compileSync(cell.source);
        if (!compiled.ok || !compiled.ast) return '✗compile';
        return onHyperfixi(compiled.ast);
      });

      const english = parseSemantic(cell.source, 'en').node;
      lanes['en-rt'] = await guard(() =>
        english ? onUpstream(render(english, 'en')) : '✗untranslatable'
      );

      for (const language of FOREIGN_LANGUAGES) {
        let code: string | null = null;
        try {
          code = english ? render(english, language) : null;
        } catch {
          code = null;
        }
        if (code === null) {
          lanes[language] = '✗untranslatable';
          lanes[`${language}/up`] = '✗untranslatable';
          continue;
        }
        const translated = code;
        lanes[language] = await guard(async () => {
          const compiled = await hyperscript.compile(translated, { language });
          if (!compiled.ok || !compiled.ast) return '✗compile';
          return onHyperfixi(compiled.ast);
        });
        lanes[`${language}/up`] = await guard(() => onUpstream(preprocess(translated, language)));
      }
      return result;
    },
    async close() {
      // A rejection from the last lane is reported after its macrotask.
      await new Promise(resolve => setTimeout(resolve, 0));
      process.off('unhandledRejection', trap);
      for (const listener of rejectionListeners) process.on('unhandledRejection', listener);
      Object.assign(console, saved);
    },
  };
}

/** Run the given cells, in order. */
export async function runValueMatrix(cells: readonly MatrixCell[]): Promise<CellResult[]> {
  const engines = await initMatrixEngines();
  try {
    const results: CellResult[] = [];
    for (const cell of cells) results.push(await engines.runCell(cell));
    return results;
  } finally {
    await engines.close();
  }
}

// ---------------------------------------------------------------------------
// The baseline
// ---------------------------------------------------------------------------

export interface BaselineEntry {
  /**
   * The failing lanes, space-separated, in LANES order, with two shorthands:
   * `*direct` for all 23 languages on hyperfixi, `*up` for all 23 on upstream.
   */
  lanes: string;
  /** Where the loss sits, for reading the burn-down (see familyOf); not asserted. */
  family: string;
}

export interface ValueMatrixBaseline {
  description: string;
  /** Cells and (cell, lane) pairs the run covered, and how many failed. */
  cells: number;
  pairs: number;
  failing: number;
  entries: Record<string, BaselineEntry>;
}

const DIRECT_LANES: readonly string[] = FOREIGN_LANGUAGES;
const ADAPTER_LANES: readonly string[] = FOREIGN_LANGUAGES.map(language => `${language}/up`);

/** Lanes (in LANES order) as a baseline string, with a shorthand for each full group. */
export function compressLanes(lanes: readonly string[]): string {
  const set = new Set(lanes);
  const out: string[] = [];
  const direct = DIRECT_LANES.every(l => set.has(l));
  const adapter = ADAPTER_LANES.every(l => set.has(l));
  for (const lane of LANES) {
    if (!set.has(lane)) continue;
    if (direct && DIRECT_LANES.includes(lane)) continue;
    if (adapter && ADAPTER_LANES.includes(lane)) continue;
    out.push(lane);
  }
  if (direct) out.push('*direct');
  if (adapter) out.push('*up');
  return out.join(' ');
}

/** The lanes a baseline string names. */
export function expandLanes(text: string): string[] {
  const out: string[] = [];
  for (const token of text.split(' ').filter(Boolean)) {
    if (token === '*direct') out.push(...DIRECT_LANES);
    else if (token === '*up') out.push(...ADAPTER_LANES);
    else out.push(token);
  }
  return out;
}

/** The failing lanes of one result, in LANES order. */
export function failingLanes(result: CellResult): string[] {
  return LANES.filter(lane => lane in result.lanes && result.lanes[lane] !== result.want);
}

/**
 * Where a cell's failure sits, from which lanes fail:
 *
 *   - `core`         core's English run differs from upstream's;
 *   - `semantic-en`  semantic's English parse loses it (`en-rt`), so every
 *                    translation inherits the loss;
 *   - `translation`  some foreign lanes, on both engines;
 *   - `direct-path`  hyperfixi's foreign lanes only;
 *   - `adapter`      upstream's foreign lanes only.
 *
 * Several can hold at once; they are joined in that order.
 */
export function familyOf(lanes: readonly string[]): string {
  const set = new Set(lanes);
  const parts: string[] = [];
  if (set.has('en')) parts.push('core');
  if (set.has('en-rt')) parts.push('semantic-en');
  else {
    const direct = FOREIGN_LANGUAGES.filter(l => set.has(l));
    const adapter = FOREIGN_LANGUAGES.filter(l => set.has(`${l}/up`));
    const both = direct.filter(l => adapter.includes(l));
    if (both.length) parts.push('translation');
    if (direct.length > both.length && !set.has('en')) parts.push('direct-path');
    if (adapter.length > both.length) parts.push('adapter');
  }
  return parts.join('+') || 'none';
}

/** The baseline a run implies. */
export function baselineFrom(
  results: readonly CellResult[],
  description: string
): ValueMatrixBaseline {
  const entries: Record<string, BaselineEntry> = {};
  let pairs = 0;
  let failing = 0;
  for (const r of results) {
    pairs += Object.keys(r.lanes).length;
    const lanes = failingLanes(r);
    failing += lanes.length;
    if (lanes.length) entries[r.id] = { lanes: compressLanes(lanes), family: familyOf(lanes) };
  }
  return { description, cells: results.length, pairs, failing, entries };
}

export interface BaselineDiff {
  /** Failing pairs the baseline does not list: regressions. */
  added: Array<{ id: string; lane: string; want: string; got: string }>;
  /** Listed pairs that pass now: fixed, and must be pruned. */
  fixed: Array<{ id: string; lane: string }>;
}

/**
 * Compare results with the baseline, over the cells that ran: an entry for a
 * cell outside `results` is not judged (a shard compares only its own cells).
 */
export function diffBaseline(
  results: readonly CellResult[],
  baseline: Pick<ValueMatrixBaseline, 'entries'>
): BaselineDiff {
  const diff: BaselineDiff = { added: [], fixed: [] };
  for (const r of results) {
    const listed = new Set(expandLanes(baseline.entries[r.id]?.lanes ?? ''));
    const failing = new Set(failingLanes(r));
    for (const lane of failing) {
      if (!listed.has(lane)) {
        diff.added.push({ id: r.id, lane, want: r.want, got: r.lanes[lane] ?? '' });
      }
    }
    for (const lane of listed) if (!failing.has(lane)) diff.fixed.push({ id: r.id, lane });
  }
  return diff;
}

/** Entries for cells the generator no longer produces. */
export function orphanedEntries(
  baseline: Pick<ValueMatrixBaseline, 'entries'>,
  cells: readonly MatrixCell[]
): string[] {
  const ids = new Set(cells.map(c => c.id));
  return Object.keys(baseline.entries).filter(id => !ids.has(id));
}
