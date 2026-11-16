/**
 * The IDE scorecard: what an author expects of identifiers and completion,
 * asked of the BUILT server on one HTML page and a second open file.
 *
 * Each probe is one request with one expected answer. `KNOWN_FAILURES` lists
 * the probes the server does not answer yet, and it only shrinks: a probe
 * that starts failing fails the suite, and so does a listed probe that
 * passes (remove it from the list in the change that fixed it).
 *
 * The README's feature table is held to this file: a row there claims no
 * more than the probes that pass.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LSPTestClient } from './lsp-test-client.js';

const PAGE = [
  '<script type="text/hyperscript">', // 0
  'behavior Removable(removeButton)', // 1
  '  on click from removeButton', // 2
  '    set count to 1', // 3
  '    set :x to count + 1', // 4
  '    log :x', // 5
  '    remove me', // 6
  '  end', // 7
  'end', // 8
  'def greet(name)', // 9
  '  return "hi " + name', // 10
  'end', // 11
  'behavior Countable', // 12
  '  on click set :x to 0 then log :x', // 13
  'end', // 14
  '</script>', // 15
  '<div id="out" class="panel"></div>', // 16
  '<button _="install Removable(removeButton: #out)">A</button>', // 17
  `<button _="on click set :x to 5 then call greet('a') then log :x then put $total into #out">B</button>`, // 18
  '<button _="on click set total to 0 then increment total then put total into #out">C</button>', // 19
  '<button _="install Shared">D</button>', // 20
  '<button _="on click ">E</button>', // 21
  '<button _="on click install ">F</button>', // 22
  '<button _="on click call ">G</button>', // 23
  '<button _="on click set :y to 1 then put ">H</button>', // 24
  '<button _="on click add .hidden to #">I</button>', // 25
  '<button _="on click tog">J</button>', // 26
  '<button _="on click add .">K</button>', // 27
  '<button _="on click call nope() then install Nope">L</button>', // 28
];
const OTHER = [
  '<script type="text/hyperscript">',
  'behavior Shared',
  '  on click log 1',
  '  end',
  'end',
  '</script>',
];
const pageUri = 'file:///scorecard/page.html';
const otherUri = 'file:///scorecard/other.html';

interface Pos {
  line: number;
  character: number;
}
interface Loc {
  uri: string;
  range: { start: Pos };
}

/** A position inside the `nth` occurrence of `needle` on `line`. */
function at(line: number, needle: string, nth = 1): Pos {
  let idx = -1;
  for (let i = 0; i < nth; i++) idx = PAGE[line]!.indexOf(needle, idx + 1);
  if (idx < 0) throw new Error(`scorecard page: no "${needle}" (${nth}) on line ${line}`);
  return { line, character: idx + 1 };
}
/** The end of the `_` attribute on `line`: where the author is typing. */
const typing = (line: number): Pos => ({ line, character: PAGE[line]!.indexOf('">') });

const client = new LSPTestClient();
let pageDiagnostics: Array<{ range: { start: Pos } }> = [];

async function locations(method: string, position: Pos): Promise<string[]> {
  const response = await client.sendRequest(method, {
    textDocument: { uri: pageUri },
    position,
    context: { includeDeclaration: true },
  });
  const result = response.result as Loc | Loc[] | null | undefined;
  const list = result == null ? [] : Array.isArray(result) ? result : [result];
  return list
    .map(
      l => `${l.uri === pageUri ? '' : 'other:'}${l.range.start.line}:${l.range.start.character}`
    )
    .sort();
}
const definition = (position: Pos) => locations('textDocument/definition', position);
const references = (position: Pos) => locations('textDocument/references', position);

async function renameLines(position: Pos): Promise<number[]> {
  const response = await client.sendRequest('textDocument/rename', {
    textDocument: { uri: pageUri },
    position,
    newName: ':renamed',
  });
  const changes =
    (response.result as { changes?: Record<string, Array<{ range: { start: Pos } }>> } | null)
      ?.changes ?? {};
  return (changes[pageUri] ?? []).map(e => e.range.start.line).sort((a, b) => a - b);
}

async function completions(position: Pos): Promise<string[]> {
  const response = await client.sendRequest('textDocument/completion', {
    textDocument: { uri: pageUri },
    position,
  });
  const result = response.result as
    Array<{ label: string }> | { items: Array<{ label: string }> } | null;
  const items = Array.isArray(result) ? result : (result?.items ?? []);
  return items.map(i => i.label);
}
const offers = async (position: Pos, ...labels: string[]) => {
  const got = await completions(position);
  return labels.every(l => got.includes(l));
};
const same = (got: unknown, want: unknown) => JSON.stringify(got) === JSON.stringify(want);

const PROBES: Record<string, () => Promise<boolean>> = {
  // --- identifiers: behaviors and functions ---
  'definition: install site -> behavior': async () =>
    same(await definition(at(17, 'Removable')), ['1:9']),
  'definition: call site -> def': async () => same(await definition(at(18, 'greet')), ['9:4']),
  'references: function, definition and call': async () =>
    same(await references(at(18, 'greet')), ['18:42', '9:4']),
  'definition: behavior in another open file': async () =>
    same(await definition(at(20, 'Shared')), ['other:1:9']),

  // --- identifiers: parameters and locals ---
  'definition: behavior parameter': async () =>
    same(await definition(at(2, 'removeButton')), ['1:19']),
  'definition: def parameter': async () => same(await definition(at(10, 'name')), ['9:10']),
  'definition: sigil-less local': async () => same(await definition(at(4, 'count')), ['3:8']),
  'references: sigil-less local, within its handler': async () =>
    same(await references(at(19, 'total', 2)), ['19:25', '19:50', '19:65']),

  // --- identifiers: element scope (`:x` belongs to one element or one behavior) ---
  'references: :x stays in its element': async () =>
    same(await references(at(18, ':x')), ['18:24', '18:62']),
  'rename: :x stays in its element': async () => same(await renameLines(at(18, ':x')), [18, 18]),
  'references: :x stays in its behavior': async () =>
    same(await references(at(13, ':x')), ['13:15', '13:32']),

  // --- identifiers: the page ---
  'definition: #id -> the element': async () => {
    const got = await definition(at(18, '#out'));
    return got.length === 1 && got[0]!.startsWith('16:');
  },

  // --- completion ---
  'completion: commands after an event': async () => offers(typing(21), 'toggle', 'add', 'put'),
  'completion: a partial command': async () => offers(typing(26), 'toggle'),
  'completion: behaviors after install': async () => offers(typing(22), 'Removable', 'Shared'),
  'completion: functions after call': async () => offers(typing(23), 'greet'),
  'completion: variables and pronouns in an expression': async () =>
    offers(typing(24), ':y', 'me', 'it'),
  'completion: the page ids after #': async () => {
    const got = await completions(typing(25));
    return got.includes('#out') || got.includes('out');
  },
  'completion: the page classes after .': async () => {
    const got = await completions(typing(27));
    return got.includes('.panel') || got.includes('panel');
  },

  // --- diagnostics ---
  'diagnostic: unknown behavior or function': async () =>
    pageDiagnostics.some(d => d.range.start.line === 28),
};

/** Probes the server does not answer yet. Shrink-only. */
const KNOWN_FAILURES = new Set([
  'definition: behavior in another open file',
  'definition: behavior parameter',
  'definition: def parameter',
  'definition: sigil-less local',
  'references: sigil-less local, within its handler',
  'references: :x stays in its element',
  'rename: :x stays in its element',
  'references: :x stays in its behavior',
  'definition: #id -> the element',
  'completion: a partial command',
  'completion: behaviors after install',
  'completion: functions after call',
  'completion: variables and pronouns in an expression',
  'completion: the page ids after #',
  'completion: the page classes after .',
  'diagnostic: unknown behavior or function',
]);

describe('IDE scorecard', () => {
  beforeAll(async () => {
    await client.start();
    await client.initialize();
    await client.open(otherUri, OTHER.join('\n'), 'html');
    pageDiagnostics = await client.open(pageUri, PAGE.join('\n'), 'html');
  });
  afterAll(async () => {
    await client.stop();
  });

  it('lists only probes that exist', () => {
    expect([...KNOWN_FAILURES].filter(name => !(name in PROBES))).toEqual([]);
  });

  for (const [name, probe] of Object.entries(PROBES)) {
    const known = KNOWN_FAILURES.has(name);
    it(known ? `${name} (known failure)` : name, async () => {
      const passed = await probe();
      if (known) {
        expect(passed, `"${name}" passes now: remove it from KNOWN_FAILURES`).toBe(false);
      } else {
        expect(passed).toBe(true);
      }
    });
  }
});
