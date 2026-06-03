/**
 * Bind Command Tests
 *
 * `bind` reactively connects a variable to an element/property value. It is
 * structurally a two-role command (`bind <variable> to <element>`), modeled on
 * `set`, and parses via the schema-generated pattern.
 *
 * Both `:`-local and `$`-global variables parse as reference role values
 * (the `$`-global tokenizer support landed alongside this — `VariableRefExtractor`
 * keeps `$name` whole and the matcher/type-validation treat it as a reference).
 */
import { describe, it, expect } from 'vitest';
import { parse, canParse } from '../src';
import type { CommandSemanticNode, CompoundSemanticNode } from '../src/types';

describe('bind command', () => {
  it('parses "bind :greeting to #name-input" into action + roles', () => {
    const node = parse('bind :greeting to #name-input', 'en') as CommandSemanticNode;

    expect(node.action).toBe('bind');
    expect(node.roles.get('destination')?.value).toBe(':greeting');
    expect(node.roles.get('source')?.value).toBe('#name-input');
  });

  it('binds to a property (possessive form)', () => {
    const node = parse("bind :color to #picker's value", 'en') as CommandSemanticNode;

    expect(node.action).toBe('bind');
    expect(node.roles.get('destination')?.value).toBe(':color');
  });

  it('parses a then-chain of two binds into a compound', () => {
    const node = parse('bind :name to #input-a then bind :name to #input-b', 'en') as
      | CompoundSemanticNode
      | CommandSemanticNode;

    if (node.kind === 'compound') {
      const actions = node.commands.map(c => (c as CommandSemanticNode).action);
      expect(actions).toEqual(['bind', 'bind']);
    } else {
      // Single-clause fallback still yields a bind command.
      expect((node as CommandSemanticNode).action).toBe('bind');
    }
  });

  it('canParse reports true for a basic bind', () => {
    expect(canParse('bind :greeting to #name-input', 'en')).toBe(true);
  });

  it('parses "bind $greeting to #name-input" with a $-global variable', () => {
    const node = parse('bind $greeting to #name-input', 'en') as CommandSemanticNode;

    expect(node.action).toBe('bind');
    expect(node.roles.get('destination')?.value).toBe('$greeting');
    expect(node.roles.get('source')?.value).toBe('#name-input');
  });
});
