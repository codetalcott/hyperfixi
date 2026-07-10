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
import type {
  CommandSemanticNode,
  CompoundSemanticNode,
  PropertyPathValue,
  SelectorValue,
} from '../src/types';

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
    // Assert the SOURCE too: only checking the destination is what let the
    // owner-dropping bug hide in the seven property-first languages. Per-language
    // coverage lives in bind-possessive-source.test.ts.
    const source = node.roles.get('source') as PropertyPathValue | undefined;
    expect(source?.type).toBe('property-path');
    expect(source?.property).toBe('value');
    expect((source?.object as SelectorValue | undefined)?.value).toBe('#picker');
  });

  it('parses a then-chain of two binds into a compound', () => {
    // Was written to tolerate a single-command fallback, and read `.commands`
    // (a CompoundSemanticNode exposes `.statements`) — so it passed vacuously
    // while the parser dropped the second bind, and would have thrown the
    // moment it stopped. Assert the sequence unconditionally.
    const node = parse('bind :name to #input-a then bind :name to #input-b', 'en') as
      | CompoundSemanticNode
      | CommandSemanticNode;

    expect(node.kind).toBe('compound');
    const actions = (node as CompoundSemanticNode).statements.map(
      c => (c as CommandSemanticNode).action
    );
    expect(actions).toEqual(['bind', 'bind']);
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
