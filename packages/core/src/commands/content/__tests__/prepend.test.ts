/**
 * Unit Tests for PrependCommand
 *
 * `prepend` is a hyperfixi extension (upstream _hyperscript offers only
 * `put <content> at the start of <target>`). It mirrors `append` with the
 * insertion end flipped, so these tests focus on the end-specific behavior plus
 * the shared guarantees that must hold at both ends.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrependCommand } from '../prepend';
import { hyperscript } from '../../../api/hyperscript-api';

describe('PrependCommand', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'host';
    document.body.appendChild(host);
  });

  // ========== 1. Metadata ==========

  describe('metadata', () => {
    const command = new PrependCommand();

    it('should have correct command name', () => {
      expect(command.name).toBe('prepend');
    });

    it('should have a description mentioning the start', () => {
      expect(command.metadata.description.toLowerCase()).toContain('start');
    });

    it('should declare data-mutation and dom-mutation side effects', () => {
      expect(command.metadata.sideEffects).toContain('data-mutation');
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });

    it('should reject missing content', async () => {
      await expect(
        new PrependCommand().parseInput({ args: [], modifiers: {} }, {} as never, {} as never)
      ).rejects.toThrow('prepend requires content');
    });
  });

  // ========== 2. Inserts at the START ==========

  describe('element targets', () => {
    it('should insert HTML before existing markup', async () => {
      host.innerHTML = '<p>A</p>';
      await hyperscript.eval('prepend "<span>B</span>" to #host', host);
      expect(host.innerHTML).toBe('<span>B</span><p>A</p>');
    });

    it('should preserve the identity and state of existing children', async () => {
      host.innerHTML = '<input id="field">';
      const field = document.getElementById('field') as HTMLInputElement;
      field.value = 'typed';

      await hyperscript.eval('prepend "<i>x</i>" to #host', host);

      expect(document.getElementById('field')).toBe(field);
      expect(field.value).toBe('typed');
    });

    it('should MOVE an element value to the front', async () => {
      host.innerHTML = '<p id="existing">A</p>';
      const child = document.createElement('span');
      child.id = 'moving';
      document.body.appendChild(child);

      await hyperscript.eval('prepend (first <span/>) to #host', host);

      expect(document.querySelectorAll('#moving')).toHaveLength(1);
      expect(host.firstElementChild).toBe(child);
    });

    it('should insert into EVERY element a multi-match selector resolves to', async () => {
      host.innerHTML = '<p class="i">1</p><p class="i">2</p>';
      await hyperscript.eval('prepend "!" to .i', host);
      expect(host.innerHTML).toBe('<p class="i">!1</p><p class="i">!2</p>');
    });

    it('should throw when the selector matches nothing', async () => {
      await expect(hyperscript.eval('prepend "x" to #nope', host)).rejects.toThrow(
        'No elements: "#nope"'
      );
    });
  });

  // ========== 3. Non-DOM targets combine at the start ==========

  describe('value targets', () => {
    it('should prefix a string variable', async () => {
      await hyperscript.eval('set x to "B" then prepend "A" to x then put x into #host', host);
      expect(host.textContent).toBe('AB');
    });

    it('should unshift onto an array variable', async () => {
      await hyperscript.eval(
        'set y to [2, 3] then prepend 1 to y then put y as String into #host',
        host
      );
      expect(host.textContent).toBe('1,2,3');
    });

    it('should add to a Set (unordered — same as append)', async () => {
      const command = new PrependCommand();
      const set = new Set([2, 3]);
      const context = { locals: new Map([['s', set]]), globals: new Map() } as never;

      await command.execute({ kind: 'variable', name: 's', content: 1 }, context);

      expect(set.has(1)).toBe(true);
      expect(set.size).toBe(3);
    });

    it('should prefix an attribute', async () => {
      host.setAttribute('data-log', 'B');
      await hyperscript.eval('prepend "A" to @data-log', host);
      expect(host.getAttribute('data-log')).toBe('AB');
    });

    it("should prefix an element's property", async () => {
      const input = document.createElement('input');
      input.id = 'field';
      input.value = 'B';
      document.body.appendChild(input);

      await hyperscript.eval(`prepend "A" to #field's value`, host);

      expect(input.value).toBe('AB');
    });

    it('should throw for a non-prependable evaluated value', async () => {
      const command = new PrependCommand();
      const context = { locals: new Map(), globals: new Map() } as never;

      await expect(
        command.execute({ kind: 'value', target: { a: 1 }, content: 'x' }, context)
      ).rejects.toThrow('Unable to prepend a value!');
    });
  });

  // ========== 4. Implicit target ==========

  describe('implicit target', () => {
    it('should prefix onto it', async () => {
      await hyperscript.eval('set it to "B" then prepend "A" then put it into #host', host);
      expect(host.textContent).toBe('AB');
    });
  });

  // ========== 5. Mirror check ==========

  describe('mirrors append', () => {
    it('should build a list in reverse of append given the same sequence', async () => {
      host.innerHTML = '<ul id="list"></ul>';
      await hyperscript.eval('prepend "<li>One</li>" to #list', host);
      await hyperscript.eval('prepend "<li>Two</li>" to #list', host);

      expect(document.getElementById('list')!.innerHTML).toBe('<li>Two</li><li>One</li>');
    });
  });
});
