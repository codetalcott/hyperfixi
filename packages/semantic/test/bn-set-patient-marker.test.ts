/**
 * bn `set` renders the patient marker the schema declares.
 *
 * `setSchema.patient.markerOverride.bn` is `তে`, and that is what the i18n
 * transformer writes into every bn `set` corpus row
 * (`#output.innerText কে "Hello World" তে সেট ক্লিক এ`). The handcrafted
 * `set-bn-full` — which is also the template semantic's renderer picks for bn
 * `set` — emitted `এ` instead, with `তে` demoted to a parse-only alternative.
 *
 * A marker the schema does not know is not merely cosmetic here, because `এ` is
 * ALSO bn's event-marker alternative (`event-handler-bn-sov` is `{event} তে
 * {action}`, alternatives `[এ]`). The chain:
 *
 *   1. the generated `set-event-bn-sov-2role` (priority 155) expects `তে` and so
 *      never matched its own renderer's output;
 *   2. the generic `event-handler-bn-sov` (priority 100) won instead and split
 *      the clause at the `এ` INSIDE the set — reading `#count.innerText কে "5"`
 *      as the event name;
 *   3. the body was then extracted position-wise, producing a `set` with
 *      `patient = 'কে "5"'` and `destination = 'করুন'` and no pattern id at all.
 *
 * Every bn `set` inside an event handler was wrong this way — 16 (pattern,
 * language) pairs on the en→foreign render-fidelity gate, and bn was the only
 * language of the 23 that failed the construct.
 *
 * `এ` stays as a parse-only alternative, so surfaces written before this change
 * still read.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function find(node: SemanticNode | null, action: string): CommandSemanticNode | null {
  if (!node) return null;
  let found: CommandSemanticNode | null = null;
  const walk = (n: SemanticNode): void => {
    if (!found && (n as CommandSemanticNode).action === action) found = n as CommandSemanticNode;
    const rec = n as unknown as Record<string, unknown>;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode));
    }
  };
  walk(node);
  return found;
}

function role(
  node: CommandSemanticNode | null,
  name: string
): { type?: string; value?: unknown } | undefined {
  return node?.roles.get(name as never) as { type?: string; value?: unknown } | undefined;
}

describe('the rendered bn set marks its value with the schema marker', () => {
  it('renders `তে`, the marker setSchema declares and the corpus uses', () => {
    const rendered = translate('set #count.innerText to "5"', 'en', 'bn');
    expect(rendered).toContain('তে');
    expect(rendered).not.toContain(' এ ');
  });

  it('the same surface still parses as a bare command', () => {
    const rendered = translate('set #count.innerText to "5"', 'en', 'bn');
    const set = parse(rendered, 'bn') as CommandSemanticNode | null;
    expect(set?.action).toBe('set');
    expect(role(set, 'patient')).toMatchObject({ value: '5' });
  });
});

describe('bn set survives an event handler', () => {
  // The pre-change values are quoted in each assertion: this whole block was
  // red, in every shape of destination.
  const ROWS: Array<[string, string, string | number]> = [
    ['a selector property', 'on click set #count.innerText to "5"', '5'],
    ['a possessive property', 'on click set my.parentElement.style.display to "none"', 'none'],
    ['a style property', 'on click set my *opacity to 0.5', 0.5],
  ];

  it.each(ROWS)('%s keeps its value on the patient role', (_label, english, expected) => {
    const rendered = translate(english, 'en', 'bn');
    const set = find(parse(rendered, 'bn'), 'set');
    expect(set, `bn: the rendered set handler did not re-parse: ${rendered}`).not.toBeNull();
    // Pre-change: `literal:'কে "5"'` — the clause split at the wrong marker, so
    // the patient carried the destination's marker and the quoted value together.
    expect(role(set, 'patient')).toMatchObject({ value: expected });
  });

  it.each(ROWS)('%s matches a real pattern, not the position fallback', (_label, english) => {
    // The signature of the defect: a `set` node with NO patternId, because the
    // generic `{event} তে {action}` handler extracted its body by token position.
    const rendered = translate(english, 'en', 'bn');
    const set = find(parse(rendered, 'bn'), 'set');
    expect(set!.metadata?.patternId, `bn fell back to position extraction: ${rendered}`).toBeTruthy();
  });

  it('binds the destination to the property, not to the trailing auxiliary', () => {
    // Pre-change: `destination: literal="করুন"` — the polite imperative verb
    // ending, read as the thing being set.
    const rendered = translate('on click set #count.innerText to "5"', 'en', 'bn');
    const set = find(parse(rendered, 'bn'), 'set');
    expect(role(set, 'destination')?.type).toBe('property-path');
  });
});

describe('the old marker is still accepted', () => {
  // `এ` was the rendered form until this change, so anything written against it
  // — a corpus row, a user's page, a doc example — must keep parsing.
  it('a bare set written with `এ` still parses', () => {
    const set = parseSemantic('#count.innerText কে "5" এ সেট করুন', 'bn')?.node as
      | CommandSemanticNode
      | undefined;
    expect(set?.action).toBe('set');
    expect(role(set ?? null, 'patient')).toMatchObject({ value: '5' });
  });
});
