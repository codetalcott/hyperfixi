/**
 * Unit Tests for AppendCommand
 *
 * `append` follows upstream _hyperscript semantics: Array→push, Set→add,
 * Element→insertAdjacent* (preserving existing DOM), assignable target→
 * read-modify-write, otherwise throw. A missing `to` targets the implicit
 * `result` (aliased by `it`).
 *
 * These tests exercise the command end-to-end through the real parser and
 * runtime wherever behavior depends on how the target was WRITTEN (selector vs
 * attribute vs possessive), because the whole point of the parse ladder is that
 * it inspects AST shape before evaluating.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppendCommand } from '../append';
import { hyperscript } from '../../../api/hyperscript-api';

describe('AppendCommand', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'host';
    document.body.appendChild(host);
  });

  // ========== 1. Metadata ==========

  describe('metadata', () => {
    const command = new AppendCommand();

    it('should have correct command name', () => {
      expect(command.name).toBe('append');
    });

    it('should have a description mentioning the end', () => {
      expect(command.metadata.description.toLowerCase()).toContain('end');
    });

    it('should have syntax and examples', () => {
      expect(command.metadata.syntax.length).toBeGreaterThan(0);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should declare data-mutation and dom-mutation side effects', () => {
      expect(command.metadata.sideEffects).toContain('data-mutation');
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });

    it('should reject missing content', async () => {
      await expect(
        new AppendCommand().parseInput({ args: [], modifiers: {} }, {} as never, {} as never)
      ).rejects.toThrow('append requires content');
    });
  });

  // ========== 2. Element targets preserve existing DOM ==========

  describe('element targets', () => {
    it('should append HTML at the end without disturbing existing markup', async () => {
      host.innerHTML = '<p>A</p>';
      await hyperscript.eval('append "<span>B</span>" to #host', host);
      expect(host.innerHTML).toBe('<p>A</p><span>B</span>');
    });

    it('should preserve the identity of existing child nodes', async () => {
      host.innerHTML = '<p id="keep">A</p>';
      const keep = document.getElementById('keep');
      await hyperscript.eval('append "<span>B</span>" to #host', host);
      expect(document.getElementById('keep')).toBe(keep);
    });

    it('should preserve live state of existing children (input value)', async () => {
      host.innerHTML = '<input id="field">';
      (document.getElementById('field') as HTMLInputElement).value = 'typed';
      await hyperscript.eval('append "<i>x</i>" to #host', host);
      expect((document.getElementById('field') as HTMLInputElement).value).toBe('typed');
    });

    it('should preserve event listeners on existing children', async () => {
      const btn = document.createElement('button');
      btn.id = 'btn';
      let hits = 0;
      btn.addEventListener('click', () => hits++);
      host.appendChild(btn);

      await hyperscript.eval('append "<i>x</i>" to #host', host);
      (document.getElementById('btn') as HTMLElement).click();

      expect(hits).toBe(1);
    });

    it('should MOVE an element value rather than copying it', async () => {
      const child = document.createElement('span');
      child.id = 'moving';
      child.textContent = 'C';
      document.body.appendChild(child);

      await hyperscript.eval('append (first <span/>) to #host', host);

      expect(document.querySelectorAll('#moving')).toHaveLength(1);
      expect(host.firstElementChild).toBe(child);
    });

    it('should insert into EVERY element a multi-match selector resolves to', async () => {
      host.innerHTML = '<p class="i">1</p><p class="i">2</p>';
      await hyperscript.eval('append "!" to .i', host);
      expect(host.innerHTML).toBe('<p class="i">1!</p><p class="i">2!</p>');
    });

    it('should throw when the selector matches nothing', async () => {
      await expect(hyperscript.eval('append "x" to #nope', host)).rejects.toThrow(
        'No elements: "#nope"'
      );
    });

    it('should append to me', async () => {
      host.innerHTML = 'Before';
      await hyperscript.eval('append "After" to me', host);
      expect(host.innerHTML).toBe('BeforeAfter');
    });
  });

  // ========== 3. Attribute and property targets ==========

  describe('assignable targets', () => {
    it('should append to an attribute', async () => {
      host.setAttribute('data-log', 'A');
      await hyperscript.eval('append "B" to @data-log', host);
      expect(host.getAttribute('data-log')).toBe('AB');
    });

    it('should create the attribute when absent', async () => {
      await hyperscript.eval('append "B" to @data-log', host);
      expect(host.getAttribute('data-log')).toBe('B');
    });

    it("should append to an element's property", async () => {
      const input = document.createElement('input');
      input.id = 'field';
      input.value = 'A';
      document.body.appendChild(input);

      await hyperscript.eval(`append "B" to #field's value`, host);

      expect(input.value).toBe('AB');
    });

    it('should append to a possessive property on me', async () => {
      host.textContent = 'A';
      await hyperscript.eval('append "B" to my textContent', host);
      expect(host.textContent).toBe('AB');
    });

    it('should not create a stray variable for an attribute target', async () => {
      host.setAttribute('data-log', 'A');
      await hyperscript.eval('append "B" to @data-log', host);
      // The pre-fix defect evaluated `@data-log` to "A" and created a local named "A".
      expect(host.getAttribute('data-log')).toBe('AB');
    });
  });

  // ========== 4. Variable targets ==========

  describe('variable targets', () => {
    it('should concatenate to an existing string variable', async () => {
      await hyperscript.eval('set x to "A" then append "B" to x then put x into #host', host);
      expect(host.textContent).toBe('AB');
    });

    it('should push to an existing array variable', async () => {
      await hyperscript.eval(
        'set y to [1, 2] then append 3 to y then put y as String into #host',
        host
      );
      expect(host.textContent).toBe('1,2,3');
    });

    it('should add to an existing Set variable', async () => {
      const command = new AppendCommand();
      const set = new Set([1, 2]);
      const context = { locals: new Map([['s', set]]), globals: new Map() } as never;

      const out = await command.execute({ kind: 'variable', name: 's', content: 3 }, context);

      expect(set.has(3)).toBe(true);
      expect(set.size).toBe(3);
      expect(out.targetType).toBe('set');
    });

    it('should create the variable when undefined (upstream parity)', async () => {
      await hyperscript.eval('append "NewValue" to fresh then put fresh into #host', host);
      expect(host.textContent).toBe('NewValue');
    });

    it('should append to an element-scoped variable', async () => {
      await hyperscript.eval(
        'set :greeting to "Hello" then append " World" to :greeting then put :greeting into #host',
        host
      );
      expect(host.textContent).toBe('Hello World');
    });

    it('should insert into an element held in a variable', async () => {
      host.innerHTML = '<section id="sec">A</section>';
      await hyperscript.eval('set el to #sec then append "B" to el', host);
      expect(document.getElementById('sec')!.innerHTML).toBe('AB');
    });
  });

  // ========== 5. Implicit target (result / it) ==========

  describe('implicit target', () => {
    it('should accumulate onto it', async () => {
      await hyperscript.eval('set it to "A" then append "B" then put it into #host', host);
      expect(host.textContent).toBe('AB');
    });

    it('should not stringify a null it (no "null" prefix)', async () => {
      const command = new AppendCommand();
      const context = { it: null, result: undefined, locals: new Map() } as never;

      const out = await command.execute({ kind: 'implicit', content: 'B' }, context);

      expect(out.value).toBe('B');
    });

    it('should push when the implicit target is an array', async () => {
      const command = new AppendCommand();
      const context = { it: undefined, result: [1, 2], locals: new Map() } as never;

      const out = await command.execute({ kind: 'implicit', content: 3 }, context);

      expect(out.value).toEqual([1, 2, 3]);
      expect(out.targetType).toBe('array');
    });
  });

  // ========== 6. Unappendable targets throw (upstream parity) ==========

  describe('unappendable targets', () => {
    it('should throw for a non-appendable evaluated value', async () => {
      const command = new AppendCommand();
      const context = { locals: new Map(), globals: new Map() } as never;

      await expect(
        command.execute({ kind: 'value', target: { a: 1 }, content: 'x' }, context)
      ).rejects.toThrow('Unable to append a value!');
    });
  });

  // ========== 7. Runtime integration ==========

  describe('runtime integration', () => {
    it('should set `it` to the value, not the command wrapper', async () => {
      await hyperscript.eval('set x to "A" then append "B" to x then put it into #host', host);
      expect(host.textContent).toBe('AB');
    });

    it('should chain appends in an event handler', async () => {
      host.innerHTML = '<ul id="list"></ul>';
      const btn = document.createElement('button');
      btn.setAttribute('_', 'on click append "<li>Item</li>" to #list');
      document.body.appendChild(btn);

      await hyperscript.eval('append "<li>One</li>" to #list', host);
      await hyperscript.eval('append "<li>Two</li>" to #list', host);

      expect(document.getElementById('list')!.innerHTML).toBe('<li>One</li><li>Two</li>');
    });
  });
});
