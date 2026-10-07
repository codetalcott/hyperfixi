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
import { parse, canParse, render, translate } from '../src';
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
      CompoundSemanticNode | CommandSemanticNode;

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

// Upstream reads `bind <left> and|with|to <right>` as one feature, and either
// side is any writable expression (M1 phase 3). Only `to` parsed, with a
// variable on the left.
describe('bind connectives and sides', () => {
  const en = (code: string) => render(parse(code, 'en'), 'en');

  it.each([
    ['bind $theme and @data-theme', 'bind $theme to @data-theme'],
    ['bind $x with #a', 'bind $x to #a'],
    ['bind .dark and $darkMode', 'bind .dark to $darkMode'],
    ['bind .highlight to $highlighted', 'bind .highlight to $highlighted'],
    ["bind my value and #slider's value", "bind my value to #slider's value"],
    ["bind @data-title and #title-input's value", "bind @data-title to #title-input's value"],
    ['bind $opacity and *opacity', 'bind $opacity to *opacity'],
  ])('%s', (code, english) => {
    const node = parse(code, 'en') as CommandSemanticNode;
    expect(node.action).toBe('bind');
    expect(en(code)).toBe(english);
  });

  it('`and` never joins the bound side into a logical run', () => {
    const node = parse('bind $theme and @data-theme', 'en') as CommandSemanticNode;
    expect(node.roles.get('destination')?.value).toBe('$theme');
  });

  it.each(['es', 'ja', 'ar', 'ko', 'de', 'zh'])('round-trips in %s', language => {
    for (const code of ['bind .dark and $darkMode', "bind @data-title and #title-input's value"]) {
      expect(translate(translate(code, 'en', language), language, 'en')).toBe(en(code));
    }
  });
});

describe('a bind feature before another feature', () => {
  // A command feature is closed with `end` (upstream allows it) where the next
  // feature has no head word to split at: read back without one, `bind` and
  // `live` ran together as one command sequence in every language.
  const code = 'bind $username to me end\nlive set my @data-mirror to $username';

  it('is written with its end', () => {
    expect(render(parse(code, 'en'), 'en')).toBe(
      'bind $username to me\nend\nlive\n  set my @data-mirror to $username\nend'
    );
  });

  it.each(['es', 'ja', 'ar', 'ko', 'de', 'zh'])('round-trips in %s', language => {
    const english = render(parse(code, 'en'), 'en');
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(english);
  });

  it('needs none before a handler, whose head splits it', () => {
    expect(render(parse('set :foo to 42 on click put :foo into me', 'en'), 'en')).toBe(
      'set :foo to 42\non click put :foo into me\nend'
    );
  });
});
