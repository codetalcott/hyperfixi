/**
 * Element-collection coverage for the collection algebra.
 *
 * `where` / `sorted by` / `mapped to` were shipped with NodeList/HTMLCollection
 * handling in `toIterableArray`, but every existing test exercises strings.
 * These tests pin the element path: sorting/filtering live DOM references by
 * attribute values — the substrate for enhancing server-rendered tables in
 * place (no client data array, the DOM is the data).
 *
 * Also pinned, deliberately, as traps for future emitters:
 *   - attribute reads are strings, so a numeric sort REQUIRES `as Number`
 *   - a bare `@attr` inside a collection op reads `context.me`, not `it` —
 *     per-element attribute keys must be written `its @attr`
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../../parser/parser';
import { evaluateAST } from '../../parser/runtime';
import { createMockHyperscriptContext } from '../../test-setup';
import { hyperscript } from '../../api/hyperscript-api';

/** Parse `return <code>` and evaluate the expression with `me` bound. */
async function evalExpr(code: string, me: HTMLElement): Promise<unknown> {
  const result = parse(`return ${code}`);
  if (!result.success) {
    throw new Error(`parse failed: ${code} — ${result.error}`);
  }
  const ast = result.node as any;
  const firstCmd = ast.body?.[0] ?? ast;
  const arg = firstCmd.args?.[0] ?? firstCmd;
  return evaluateAST(arg, createMockHyperscriptContext(me));
}

/** The five fixture rows by id, in document order. */
const DOC_ORDER = ['r-mouse', 'r-cable', 'r-board', 'r-drill', 'r-server'];

function row(id: string): HTMLTableRowElement {
  return document.getElementById(id) as HTMLTableRowElement;
}

function tbody(): HTMLElement {
  return document.getElementById('rows') as HTMLElement;
}

function ids(value: unknown): string[] {
  return (value as HTMLElement[]).map(el => el.id);
}

beforeEach(() => {
  document.body.innerHTML = `
    <table id="products">
      <tbody id="rows">
        <tr id="r-mouse"  data-price="9"   data-stock="12" data-category="accessories"><td>Mouse</td><td><input class="qty" value="2"></td></tr>
        <tr id="r-cable"  data-price="21"  data-stock="0"  data-category="accessories"><td>Cable</td><td><input class="qty" value="0"></td></tr>
        <tr id="r-board"  data-price="30"  data-stock="5"  data-category="tools"><td>Board</td><td><input class="qty" value="1"></td></tr>
        <tr id="r-drill"  data-price="45"  data-stock="0"  data-category="tools"><td>Drill</td><td><input class="qty" value="0"></td></tr>
        <tr id="r-server" data-price="100" data-stock="3"  data-category="hardware"><td>Server</td><td><input class="qty" value="7"></td></tr>
      </tbody>
    </table>`;
});

describe('Element collections — sorted by / where / mapped to over live DOM refs', () => {
  describe('<tag/> in me produces a live element array', () => {
    it('yields the actual row elements in document order', async () => {
      const result = await evalExpr('<tr/> in me', tbody());
      expect(Array.isArray(result)).toBe(true);
      expect(ids(result)).toEqual(DOC_ORDER);
      // Identity, not clones: the array holds the same nodes the document does.
      (result as HTMLElement[]).forEach((el, i) => {
        expect(el).toBe(row(DOC_ORDER[i]));
      });
    });
  });

  describe('sorted by — attribute keys', () => {
    it('sorts rows numerically with `its @attr as Number`', async () => {
      const result = await evalExpr('<tr/> in me sorted by its @data-price as Number', tbody());
      expect(ids(result)).toEqual(['r-mouse', 'r-cable', 'r-board', 'r-drill', 'r-server']);
      expect((result as HTMLElement[])[0]).toBe(row('r-mouse'));
    });

    it('`desc` reverses the numeric order', async () => {
      const result = await evalExpr(
        '<tr/> in me sorted by its @data-price as Number desc',
        tbody()
      );
      expect(ids(result)).toEqual(['r-server', 'r-drill', 'r-board', 'r-cable', 'r-mouse']);
    });

    it('TRAP (pinned): without `as Number` the sort is lexical — "100" precedes "9"', async () => {
      const result = await evalExpr('<tr/> in me sorted by its @data-price', tbody());
      // getAttribute returns strings; "100" < "21" < "30" < "45" < "9" lexically.
      expect(ids(result)).toEqual(['r-server', 'r-cable', 'r-board', 'r-drill', 'r-mouse']);
    });

    it('TRAP (pinned): a bare `@attr` key reads context.me, not the element — order is unchanged', async () => {
      // `@data-price` without `its` is an attributeAccessNode hardcoded to
      // context.me (the tbody, which has no data-price): every key is null,
      // the sort is stable, and the document order comes back untouched.
      const result = await evalExpr('<tr/> in me sorted by @data-price', tbody());
      expect(ids(result)).toEqual(DOC_ORDER);
    });

    it('sorts by textContent for string keys', async () => {
      const result = await evalExpr('<tr/> in me sorted by its textContent', tbody());
      // Board, Cable, Drill, Mouse, Server — alphabetical by row text.
      expect(ids(result)).toEqual(['r-board', 'r-cable', 'r-drill', 'r-mouse', 'r-server']);
    });
  });

  describe('where — per-element predicates', () => {
    it('filters rows by numeric attribute predicate, returning the same refs', async () => {
      const result = await evalExpr('<tr/> in me where its @data-stock as Number > 0', tbody());
      expect(ids(result)).toEqual(['r-mouse', 'r-board', 'r-server']);
      expect((result as HTMLElement[])[0]).toBe(row('r-mouse'));
      expect((result as HTMLElement[])[1]).toBe(row('r-board'));
      expect((result as HTMLElement[])[2]).toBe(row('r-server'));
    });

    it('filters rows by string attribute equality', async () => {
      const result = await evalExpr('<tr/> in me where its @data-category is "tools"', tbody());
      expect(ids(result)).toEqual(['r-board', 'r-drill']);
    });

    it('TRAP (pinned): an unparenthesized compound predicate escapes the where clause', async () => {
      // `and` binds at bp 20, below the where-predicate parse level (29), so
      // `X where P and Q` parses as `(X where P) and Q` — a boolean, not a
      // filtered collection. Compound predicates must be parenthesized:
      // `X where (P and Q)`.
      const escaped = await evalExpr(
        '<tr/> in me where its @data-stock as Number > 0 and true',
        tbody()
      );
      expect(Array.isArray(escaped)).toBe(false);

      const fixed = await evalExpr(
        '<tr/> in me where (its @data-stock as Number > 0 and true)',
        tbody()
      );
      expect(ids(fixed)).toEqual(['r-mouse', 'r-board', 'r-server']);
    });

    it('composes: where + sorted by in one expression', async () => {
      const result = await evalExpr(
        '(<tr/> in me where its @data-stock as Number > 0) sorted by its @data-price as Number desc',
        tbody()
      );
      expect(ids(result)).toEqual(['r-server', 'r-board', 'r-mouse']);
    });
  });

  describe('mapped to — projection over elements', () => {
    it('projects attribute values off each element', async () => {
      const result = await evalExpr('<tr/> in me mapped to its @data-category', tbody());
      expect(result).toEqual(['accessories', 'accessories', 'tools', 'tools', 'hardware']);
    });
  });

  describe('pick — windowing over sorted element arrays', () => {
    it('pick items N to M of a sorted element collection (pagination window, traditional parser)', async () => {
      const context = hyperscript.createContext(tbody());
      await hyperscript.eval(
        'pick items 1 to 3 of (<tr/> in me sorted by its @data-price as Number)',
        context,
        { traditional: true }
      );
      // pick lands its selection in the `it`/`result` slot.
      // Rows 1..2 (end-exclusive upstream semantics) of the numeric ordering.
      expect(ids((context as any).result ?? (context as any).it)).toEqual(['r-cable', 'r-board']);
    });

    it('KNOWN GAP (pinned): the semantic-first path mangles a parenthesized pick source', async () => {
      // The semantic parser owns pick's range grammar (patterns + the
      // pick-range assembler), and its tokenizer classifies `(` as an
      // identifier — so through the default semantic-first path the source
      // expression collapses to `identifier "("` and PickCommand rejects it.
      // When the semantic pick assembler learns parenthesized sources, this
      // test goes red: delete it and drop `traditional: true` above.
      const context = hyperscript.createContext(tbody());
      await expect(
        hyperscript.eval(
          'pick items 1 to 3 of (<tr/> in me sorted by its @data-price as Number)',
          context
        )
      ).rejects.toThrow(/array or string/);
    });
  });

  describe('example-page contract strings (examples/tables-and-data/filterable-table.html)', () => {
    // These are the exact handler BODIES the gallery example ships (the
    // `on input or change` header is the attribute processor's job). If one
    // of these breaks, the example page is broken too.
    it('the combined filter handler: hide all, unhide rows matching every active condition', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<input id="search" value="o"><input id="stock-only" type="checkbox">`
      );
      const context = hyperscript.createContext(document.getElementById('products') as HTMLElement);
      await hyperscript.eval(
        `add @hidden to <tbody tr/> in #products
         then remove @hidden from <tbody tr/> in #products
           where (its textContent.toLowerCase() contains #search's value.toLowerCase()
             and (#stock-only's checked is false or its @data-stock as Number > 0))`,
        context
      );
      const hidden = DOC_ORDER.filter(id => row(id).hasAttribute('hidden'));
      const visible = DOC_ORDER.filter(id => !row(id).hasAttribute('hidden'));
      // Rows whose text contains "o": Mouse, Board — plus any others with "o".
      for (const id of visible) {
        expect(row(id).textContent!.toLowerCase()).toContain('o');
      }
      for (const id of hidden) {
        expect(row(id).textContent!.toLowerCase()).not.toContain('o');
      }
      // With the stock-only box checked, zero-stock rows hide even when matching.
      (document.getElementById('stock-only') as HTMLInputElement).checked = true;
      (document.getElementById('search') as HTMLInputElement).value = '';
      await hyperscript.eval(
        `add @hidden to <tbody tr/> in #products
         then remove @hidden from <tbody tr/> in #products
           where (its textContent.toLowerCase() contains #search's value.toLowerCase()
             and (#stock-only's checked is false or its @data-stock as Number > 0))`,
        context
      );
      expect(row('r-cable').hasAttribute('hidden')).toBe(true);
      expect(row('r-drill').hasAttribute('hidden')).toBe(true);
      expect(row('r-mouse').hasAttribute('hidden')).toBe(false);
      expect(row('r-board').hasAttribute('hidden')).toBe(false);
      expect(row('r-server').hasAttribute('hidden')).toBe(false);
    });

    it('the reset handler: clear controls, unhide every row', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<input id="search" value="drill"><input id="stock-only" type="checkbox" checked>`
      );
      for (const id of DOC_ORDER) row(id).setAttribute('hidden', '');
      const context = hyperscript.createContext(document.getElementById('products') as HTMLElement);
      await hyperscript.eval(
        `set #search's value to ''
         then set #stock-only's checked to false
         then remove @hidden from <tbody tr/> in #products`,
        context
      );
      expect((document.getElementById('search') as HTMLInputElement).value).toBe('');
      expect((document.getElementById('stock-only') as HTMLInputElement).checked).toBe(false);
      for (const id of DOC_ORDER) {
        expect(row(id).hasAttribute('hidden')).toBe(false);
      }
    });
  });

  describe('command surface — put element-array write-back (the sort emission)', () => {
    it('put <tr/> in me sorted by … at end of me reorders the live rows in place', async () => {
      // Mark state that must survive: a focused-adjacent input value.
      const qty = row('r-server').querySelector('input') as HTMLInputElement;
      qty.value = 'survives';
      const before = DOC_ORDER.map(row);

      const context = hyperscript.createContext(tbody());
      await hyperscript.eval(
        'put <tr/> in me sorted by its @data-price as Number desc at end of me',
        context
      );

      // Reordered in place: same tbody, same five nodes, new order.
      const after = Array.from(tbody().querySelectorAll('tr'));
      expect(after.map(el => el.id)).toEqual([
        'r-server',
        'r-drill',
        'r-board',
        'r-cable',
        'r-mouse',
      ]);
      for (const el of after) expect(before).toContain(el); // identity preserved
      expect((row('r-server').querySelector('input') as HTMLInputElement).value).toBe('survives');
    });

    it('put a filtered subset at start of me moves just those rows to the top, in order', async () => {
      const context = hyperscript.createContext(tbody());
      await hyperscript.eval(
        'put <tr/> in me where its @data-category is "tools" at start of me',
        context
      );
      const after = Array.from(tbody().querySelectorAll('tr')).map(el => el.id);
      expect(after).toEqual(['r-board', 'r-drill', 'r-mouse', 'r-cable', 'r-server']);
    });
  });

  describe('example-page contract strings (examples/tables-and-data/sortable-table.html)', () => {
    it('the th click handler: toggle direction, set aria-sort, reorder inside a view transition', async () => {
      // Rebuild the fixture with a thead in one parse — happy-dom's fragment
      // parser drops a <thead> handed to insertAdjacentHTML on a <table>.
      document.body.innerHTML = `
        <table id="products">
          <thead><tr><th id="th-price" data-dir="asc">Price</th></tr></thead>
          <tbody id="rows">
            <tr id="r-mouse"  data-price="9"><td>Mouse</td></tr>
            <tr id="r-cable"  data-price="21"><td>Cable</td></tr>
            <tr id="r-board"  data-price="30"><td>Board</td></tr>
            <tr id="r-drill"  data-price="45"><td>Drill</td></tr>
            <tr id="r-server" data-price="100"><td>Server</td></tr>
          </tbody>
        </table>`;
      const th = document.getElementById('th-price') as HTMLElement;
      const context = hyperscript.createContext(th);
      const handler = `remove @aria-sort from <th/> in #products
       if my @data-dir is 'asc'
         set my @data-dir to 'desc'
         set @aria-sort to 'descending' on me
         start view transition
           put <tr/> in #rows sorted by its @data-price as Number desc at end of #rows
         end
       else
         set my @data-dir to 'asc'
         set @aria-sort to 'ascending' on me
         start view transition
           put <tr/> in #rows sorted by its @data-price as Number at end of #rows
         end
       end`;

      await hyperscript.eval(handler, context);
      expect(Array.from(tbody().querySelectorAll('tr')).map(el => el.id)).toEqual([
        'r-server',
        'r-drill',
        'r-board',
        'r-cable',
        'r-mouse',
      ]);
      expect(th.getAttribute('data-dir')).toBe('desc');
      expect(th.getAttribute('aria-sort')).toBe('descending');

      // Second click toggles back to ascending.
      await hyperscript.eval(handler, context);
      expect(Array.from(tbody().querySelectorAll('tr')).map(el => el.id)).toEqual([
        'r-mouse',
        'r-cable',
        'r-board',
        'r-drill',
        'r-server',
      ]);
      expect(th.getAttribute('aria-sort')).toBe('ascending');
    });
  });

  describe('command surface — @hidden filtering (the filter/reset emissions)', () => {
    it('add @hidden to <tr/> in me where … targets exactly the matching rows', async () => {
      const context = hyperscript.createContext(tbody());
      await hyperscript.eval(
        'add @hidden to <tr/> in me where its @data-stock as Number is 0',
        context
      );
      expect(row('r-cable').hasAttribute('hidden')).toBe(true);
      expect(row('r-drill').hasAttribute('hidden')).toBe(true);
      for (const id of ['r-mouse', 'r-board', 'r-server']) {
        expect(row(id).hasAttribute('hidden')).toBe(false);
      }
    });

    it('remove @hidden from <tr/> in me unhides every row (the reset emission)', async () => {
      for (const id of DOC_ORDER) row(id).setAttribute('hidden', '');
      const context = hyperscript.createContext(tbody());
      await hyperscript.eval('remove @hidden from <tr/> in me', context);
      for (const id of DOC_ORDER) {
        expect(row(id).hasAttribute('hidden')).toBe(false);
      }
    });
  });
});
