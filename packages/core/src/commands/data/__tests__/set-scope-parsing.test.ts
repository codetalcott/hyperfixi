/**
 * Parser-level tests for the `set … on <target>` scope clause.
 *
 * The SetCommand runtime has long supported a multi-element scope via
 * `raw.modifiers.on` (see set.test.ts "attribute on a multi-element scope"),
 * but only the semantic parser emitted it. These tests cover the traditional
 * parser (= compileSync = the browser `_=` path) producing the same shape,
 * including the corpus patterns tabs-aria and announce-screen-reader.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parse } from '../../../parser/parser';
import { Runtime } from '../../../runtime/runtime';
import { createContext } from '../../../core/context';

interface Commandish {
  type: string;
  name?: string;
  modifiers?: Record<string, unknown>;
  commands?: Commandish[];
  statements?: Commandish[];
}

describe('set … on <target> (traditional parser)', () => {
  describe('parsing', () => {
    it('parses a trailing `on <selector>` into modifiers.on', () => {
      const result = parse('set @aria-selected to "false" on .tab');
      expect(result.success).toBe(true);
      const node = result.node as unknown as Commandish;
      const cmd = node.type === 'command' ? node : (node.commands ?? node.statements)?.[0];
      expect(cmd?.name).toBe('set');
      expect(cmd?.modifiers?.on).toBeDefined();
    });

    it('parses the tabs-aria corpus pattern as ONE handler with two scoped sets', () => {
      const result = parse(
        'on click set @aria-selected to "false" on .tab set @aria-selected to "true" on me'
      );
      expect(result.success).toBe(true);
      const handler = result.node as unknown as Commandish;
      expect(handler.type).toBe('eventHandler');
      expect(handler.commands).toHaveLength(2);
      expect(handler.commands![0].modifiers?.on).toBeDefined();
      expect(handler.commands![1].modifiers?.on).toBeDefined();
    });

    it('parses the announce-screen-reader corpus pattern', () => {
      const result = parse(
        'on success put event.detail.message into #sr-announce set @role to "alert" on #sr-announce'
      );
      expect(result.success).toBe(true);
      const handler = result.node as unknown as Commandish;
      expect(handler.type).toBe('eventHandler');
      expect(handler.commands).toHaveLength(2);
      expect(handler.commands![1].name).toBe('set');
      expect(handler.commands![1].modifiers?.on).toBeDefined();
    });

    it('still treats `on <event>` after a set as a NEW event handler', () => {
      const result = parse('on click set x to 1 on mouseover log "x"');
      expect(result.success).toBe(true);
      // Program of two eventHandlers — `on mouseover` must NOT be swallowed
      // as the set's scope clause.
      const program = result.node as unknown as Commandish;
      const statements = program.statements ?? [program];
      expect(statements).toHaveLength(2);
      expect(statements[0].type).toBe('eventHandler');
      expect(statements[1].type).toBe('eventHandler');
      const setCmd = statements[0].commands?.[0];
      expect(setCmd?.name).toBe('set');
      expect(setCmd?.modifiers?.on).toBeUndefined();
    });
  });

  describe('execution (full pipeline)', () => {
    let runtime: Runtime;
    let fixture: HTMLDivElement;

    beforeEach(() => {
      runtime = new Runtime();
      fixture = document.createElement('div');
      document.body.appendChild(fixture);
    });

    afterEach(() => {
      fixture.remove();
    });

    it('writes the attribute to every scope-matched element', async () => {
      const tab1 = document.createElement('div');
      const tab2 = document.createElement('div');
      tab1.className = 'tab';
      tab2.className = 'tab';
      const me = document.createElement('button');
      fixture.append(tab1, tab2, me);

      const result = parse('set @aria-selected to "false" on .tab');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, createContext(me));

      expect(tab1.getAttribute('aria-selected')).toBe('false');
      expect(tab2.getAttribute('aria-selected')).toBe('false');
      expect(me.getAttribute('aria-selected')).toBeNull();
    });

    it('runs the full tabs-aria click flow', async () => {
      const tab1 = document.createElement('div');
      const tab2 = document.createElement('button');
      tab1.className = 'tab';
      tab2.className = 'tab';
      tab1.setAttribute('aria-selected', 'true');
      fixture.append(tab1, tab2);

      const result = parse(
        'on click set @aria-selected to "false" on .tab set @aria-selected to "true" on me'
      );
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, createContext(tab2));

      tab2.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(tab1.getAttribute('aria-selected')).toBe('false');
      expect(tab2.getAttribute('aria-selected')).toBe('true');
    });
  });
});
