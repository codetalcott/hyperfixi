/**
 * The symbol table read from the engine's tree: what the patterns cannot
 * tell apart (a name without a sigil from a keyword) and where each name
 * lives (its handler, its `def`, its behavior).
 */

import { describe, it, expect } from 'vitest';
import * as engine from '@hyperfixi/engine';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { buildSymbolTable, type SymbolTable } from './symbol-table.js';
import { treeSites } from './tree-symbols.js';
import type { HyperscriptRegion } from './types.js';

engine.register(...engine.everything);
const parse = (code: string) => engine.parse(code);

const script = (code: string): HyperscriptRegion => ({
  code,
  startLine: 0,
  startChar: 0,
  endLine: 0,
  endChar: 0,
  type: 'script',
});
const attr = (code: string, line: number): HyperscriptRegion => ({
  code,
  startLine: line,
  startChar: 0,
  endLine: line,
  endChar: code.length,
  type: 'attribute',
});
const table = (...regions: HyperscriptRegion[]) => buildSymbolTable(regions, undefined, { parse });

/** `def` sites then `use` sites of the symbol at a position, as `line:character`. */
function sites(t: SymbolTable, line: number, character: number) {
  const entry = t.symbolAt(line, character);
  if (!entry) return null;
  const at = (l: { line: number; character: number }) => `${l.line}:${l.character}`;
  return { defs: entry.definitions.map(at).sort(), uses: entry.usages.map(at).sort() };
}

describe('names without a sigil', () => {
  it('a variable is defined where it is set and stays in its handler', () => {
    const t = table(
      attr('on click set total to 0 then increment total then put total into me', 0),
      attr('on click log total', 1)
    );
    expect(sites(t, 0, 13)).toEqual({ defs: ['0:13', '0:39'], uses: ['0:54'] });
    expect(t.symbolAt(1, 14)).toBeUndefined();
  });

  it('two handlers of one element have their own', () => {
    const t = table(attr('on click set n to 1 then log n end on keyup set n to 2', 0));
    expect(sites(t, 0, 13)).toEqual({ defs: ['0:13'], uses: ['0:29'] });
    expect(sites(t, 0, 48)).toEqual({ defs: ['0:48'], uses: [] });
  });

  it('a def parameter is defined in the parameter list', () => {
    const t = table(script('def greet(name, loud)\n  return name\nend'));
    expect(sites(t, 1, 9)).toEqual({ defs: ['0:10'], uses: ['1:9'] });
    expect(sites(t, 0, 17)).toEqual({ defs: ['0:16'], uses: [] });
  });

  it("a behavior's parameter is seen from each of its handlers", () => {
    const t = table(
      script(
        'behavior Removable(removeButton)\n  on click from removeButton\n    remove me\n  end\n  on keyup log removeButton end\nend'
      )
    );
    expect(sites(t, 1, 18)).toEqual({ defs: ['0:19'], uses: ['1:16', '4:15'] });
  });

  it("an install site's named argument is a use of that behavior's parameter", () => {
    const t = table(
      script(
        'behavior Removable(removeButton, other)\n  on click from removeButton log other end\nend'
      ),
      attr('install Removable(removeButton: #x, other: removeButton)', 3),
      attr('install Other(removeButton: #x)', 4)
    );
    expect(sites(t, 0, 20)).toEqual({ defs: ['0:19'], uses: ['1:16', '3:18'] });
    expect(sites(t, 3, 37)).toEqual({ defs: ['0:33'], uses: ['1:33', '3:36'] });
    expect(sites(t, 4, 15)).toEqual({ defs: [], uses: ['4:14'] });
  });

  it('a handler argument and loop variables are defined where they are named', () => {
    const t = table(
      attr('on click(button) log button', 0),
      attr('on click repeat for item in items index i log item, i end', 1)
    );
    expect(sites(t, 0, 21)).toEqual({ defs: ['0:9'], uses: ['0:21'] });
    expect(sites(t, 1, 46)).toEqual({ defs: ['1:20'], uses: ['1:46'] });
    expect(sites(t, 1, 52)).toEqual({ defs: ['1:40'], uses: ['1:52'] });
  });

  it('a name inside a template string is found where it is written', () => {
    const t = table(attr('on click set x to 1 then put `a ${x} b $x` into me', 0));
    expect(sites(t, 0, 13)).toEqual({ defs: ['0:13'], uses: ['0:34', '0:40'] });
  });

  it('a variable written with its scope word sits on the name, not the word', () => {
    const t = table(attr("on click set element x to 10 then log the element's x", 0));
    expect(sites(t, 0, 21)).toEqual({ defs: ['0:21'], uses: ['0:52'] });
    expect(t.symbolAt(0, 15)).toBeUndefined();
  });

  it('a name the runtime supplies is not a symbol', () => {
    const t = table(attr('on click log event then log me then log it then log window', 0));
    for (const character of [13, 28, 40, 52]) expect(t.symbolAt(0, character)).toBeUndefined();
  });
});

describe('behaviors, functions, events and ids from the tree', () => {
  it('links install and call sites across regions', () => {
    const t = table(
      script('behavior Modal\n  on open show me\nend\ndef utils.greet(a)\n  return a\nend'),
      attr('install Modal', 6),
      attr('on click call utils.greet(1) then greet(2)', 7)
    );
    expect(sites(t, 6, 9)).toEqual({ defs: ['0:9'], uses: ['6:8'] });
    expect(sites(t, 7, 16)).toEqual({ defs: ['3:4'], uses: ['7:14'] });
    // `greet(2)` calls no `def` in the file: a usage with no definition.
    expect(sites(t, 7, 35)).toEqual({ defs: [], uses: ['7:34'] });
  });

  it('a method call is not a function, and its receiver is still a variable', () => {
    const t = table(attr('on click set list to [] then call list.push(1)', 0));
    expect(sites(t, 0, 34)).toEqual({ defs: ['0:13'], uses: ['0:34'] });
    expect([...t.symbols.values()].map(e => e.name)).toEqual(['list']);
  });

  it('a sent event is defined by the handlers that listen for it', () => {
    const t = table(
      attr('on click send saved to #list then trigger saved', 0),
      attr('on saved or click log 1', 1)
    );
    expect(sites(t, 0, 16)).toEqual({ defs: ['1:3'], uses: ['0:14', '0:42'] });
    // `click` is sent by nobody here: not a symbol, so not renameable.
    expect(t.symbolAt(1, 13)).toBeUndefined();
    expect(t.symbolAt(0, 4)).toBeUndefined();
  });

  it('a #name is defined by the element with that id', () => {
    const t = buildSymbolTable([attr('on click put 1 into #out', 3)], undefined, {
      parse,
      ids: [
        { name: 'out', line: 1, character: 9 },
        { name: 'unused', line: 2, character: 9 },
      ],
    });
    expect(sites(t, 3, 22)).toEqual({ defs: ['1:9'], uses: ['3:21'] });
    expect(t.symbolAt(2, 10)).toBeUndefined();
    expect(t.symbolAt(3, 22)!.name).toBe('out');
  });

  it('a :x keeps its element or behavior, a $x is global', () => {
    const t = table(
      script('behavior A\n  on click set :x to 1 then set $g to :x\nend'),
      attr('on click log :x then log $g', 3)
    );
    expect(sites(t, 1, 15)).toEqual({ defs: ['1:15'], uses: ['1:38'] });
    expect(sites(t, 3, 13)).toEqual({ defs: [], uses: ['3:13'] });
    expect(sites(t, 3, 25)).toEqual({ defs: ['1:32'], uses: ['3:25'] });
  });
});

describe('a region the engine does not parse', () => {
  it('is read by the patterns, beside regions read from the tree', () => {
    const t = table(
      script('behavior Modal\n  on open show me\nend'),
      attr('install Modal then on click put ', 3)
    );
    expect(sites(t, 3, 9)).toEqual({ defs: ['0:9'], uses: ['3:8'] });
  });

  it('keeps ^ names, which the patterns read in every region', () => {
    const t = table(attr('on click set ^count to 1', 0), attr('on click log ^count', 1));
    expect(sites(t, 1, 14)).toEqual({ defs: ['0:13'], uses: ['1:13'] });
  });
});

// The names the tree does not position are found by searching the text, so
// the check is the text itself: on every script authors wrote (the
// command-shape cases), each site must sit on exactly its own name.
describe('across the command-shape sources', () => {
  const corpus = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          '../../testing-framework/src/multilingual/command-shapes.cases.json',
          import.meta.url
        )
      ),
      'utf8'
    )
  ) as { cases: Array<{ source: string }> };

  it('every site sits on its own name, and no two sites overlap', () => {
    const wrong: string[] = [];
    let parsed = 0;
    let total = 0;
    for (const { source } of corpus.cases) {
      let tree: unknown;
      try {
        tree = parse(source);
      } catch {
        continue;
      }
      parsed++;
      const found = treeSites(tree, source, 0) ?? [];
      total += found.length;
      const taken = new Map<number, string>();
      for (const site of found) {
        const text = source.slice(site.offset, site.offset + site.length);
        if (text !== site.name)
          wrong.push(`${site.kind} ${site.name} reads "${text}" in: ${source}`);
        for (let i = site.offset; i < site.offset + site.length; i++) {
          const other = taken.get(i);
          if (other !== undefined && other !== site.key) {
            wrong.push(`${site.kind} ${site.name} overlaps another symbol in: ${source}`);
            break;
          }
          taken.set(i, site.key);
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(parsed).toBeGreaterThan(1000);
    expect(total).toBeGreaterThan(1000);
  });
});
