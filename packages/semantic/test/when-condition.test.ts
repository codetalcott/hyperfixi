/**
 * `add/remove/hide/show … when <condition>` in every language (M2, N9).
 *
 * Upstream reads `add .x to .item when it matches .y` per element: the ones that
 * pass get the class, the rest lose it (hide/show alike). Semantic's schemas had
 * no role for it, so since M1 every translation kept the clause in English (es
 * `agregar .x a .item when it matches .y`) and a bare command was refused, even
 * in English. Four pieces, each pinned here:
 *
 * 1. A `condition` role on the four commands, marked with each language's own
 *    word for `when` (its profile's `keywords.when`): es `cuando ello coincide
 *    .y`, first in a verb-final language (ja `それ 一致する .y とき .item に .x
 *    を 追加`).
 * 2. A condition operator is never a possessive's property: where the pronoun
 *    `it` also heads a possessive (qu `chay`, ms `ia`), `chay tupan .y` (it
 *    matches .y) read as `it`'s property `tupan`.
 * 3. A hand-crafted add/remove/hide/show pattern reads the condition too: it
 *    outranks the generated one, and de read `zeigen ich mit opacity` and left
 *    `wenn es passt .y` unread.
 * 4. An absent condition costs a parse no confidence (valueShape `'clause'`):
 *    the slot is behind its marker, so its absence is no evidence.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, parseWithConfidence, translate } from '../src/index';
import { getSchema } from '../src/generators/command-schemas';
import { getProfile } from '../src/registry';
import type { CommandSemanticNode } from '../src/types';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');
const COMMANDS = ['add', 'remove', 'hide', 'show'] as const;

/** en → L → en, or the error's first line. */
function roundTrip(source: string, language: string): string {
  try {
    return translate(translate(source, 'en', language), language, 'en');
  } catch (e) {
    return `REFUSED ${(e as Error).message.split('\n')[0]}`;
  }
}

function command(source: string, language = 'en'): CommandSemanticNode {
  const node = parse(source, language) as CommandSemanticNode & { body?: CommandSemanticNode[] };
  const found = node?.body ? node.body[0] : node;
  expect(found?.kind, `'${source}' (${language}) parsed no command`).toBe('command');
  return found as CommandSemanticNode;
}

const conditionOf = (node: CommandSemanticNode): string | undefined => {
  const v = node.roles.get('condition' as never) as { raw?: string; value?: unknown } | undefined;
  return v === undefined ? undefined : String(v.raw ?? v.value);
};

describe('the schemas', () => {
  it.each(COMMANDS)('%s has an optional condition', action => {
    const role = getSchema(action)!.roles.find(r => r.role === 'condition');
    expect(role?.required).toBe(false);
  });

  // The marker is the language's word for `when`, not a new one: a change to
  // the profile's word has to change this role's too.
  it.each(getSupportedLanguages())('%s marks it with its own word for `when`', language => {
    const when = getProfile(language).keywords.when;
    for (const action of COMMANDS) {
      const role = getSchema(action)!.roles.find(r => r.role === 'condition')!;
      expect(role.markerOverride?.[language], action).toBe(when?.primary);
      expect([...(role.markerVariants?.[language] ?? [])], action).toEqual(when?.alternatives ?? []);
    }
  });
});

describe('a command without a condition loses no confidence for the slot', () => {
  // The slot is behind its marker (valueShape 'clause'): counted against every
  // parse, it took a quarter off each add/remove/hide/show without one.
  it.each([
    ['add .x to .item', 'en'],
    ['remove .x from .item', 'en'],
    ['agregar .x a .item', 'es'],
    ['.item に .x を 追加', 'ja'],
  ])('%s (%s)', (source, language) => {
    expect(parseWithConfidence(source, language).confidence).toBe(1);
  });
});

describe('English reads the condition', () => {
  it.each([
    ['add .x to .item when it matches .y', 'it matches .y'],
    ['remove .x from .item when it matches .y', 'it matches .y'],
    ['hide when I match .y', 'I match .y'],
    ['show .item when its innerText contains "foo"', 'its innerText contains "foo"'],
    ['show me with opacity when it matches .y', 'it matches .y'],
    ['add .foo to #d2 when asyncCheck()', 'asyncCheck()'],
  ])('%s', (source, condition) => {
    const node = command(source);
    expect(conditionOf(node)).toBe(condition);
    expect(node.verbatimClause).toBeUndefined();
    expect(translate(source, 'en', 'en')).toBe(source.replace('hide when', 'hide me when'));
  });
});

describe('the condition reads first in a verb-final language, in its own words', () => {
  it.each([
    ['ja', 'それ 一致する .y とき .item に .x を 追加'],
    ['ko', '그것 일치 .y 때 .item 에 .x 을 추가'],
    ['es', 'agregar .x a .item cuando ello coincide .y'],
    ['ar', 'أضف .x إلى .item عندما هو يطابق .y'],
  ])('%s', (language, rendered) => {
    expect(translate('add .x to .item when it matches .y', 'en', language)).toBe(rendered);
  });

  // ja `ときに`, tr `durumunda`, he `כש`: the profile's other spellings.
  it.each([
    ['ja', 'それ 一致する .y ときに .item に .x を 追加'],
    ['tr', 'o eşleşir .y durumunda .item e .x i ekle'],
  ])('%s reads a variant of the marker', (language, source) => {
    expect(conditionOf(command(source, language))).toBe('it matches .y');
  });
});

describe('it matches is not a possessive', () => {
  // qu `chay` and ms `ia` are `it` and also head a possessive (`chay
  // .textContent`); the operator after them was read as the property.
  it.each([
    ['qu', 'chay tupan .y maykama .item man .x ta yapay'],
    ['ms', 'tambah .x ke .item bila ia sepadan .y'],
  ])('%s', (language, source) => {
    const node = command(source, language);
    expect(node.roles.get('condition' as never)).toMatchObject({ type: 'expression' });
    expect(conditionOf(node)).toBe('it matches .y');
  });
});

describe('a hand-crafted pattern reads the condition', () => {
  // de, fr and it read `show me with opacity` with a hand-crafted pattern.
  it.each([
    ['de', 'zeigen ich mit opacity wenn es passt .y'],
    ['fr', 'montrer moi avec opacity quand ça correspond .y'],
    ['it', 'mostrare io con opacity quando esso corrisponde .y'],
  ])('%s', (language, source) => {
    const node = command(source, language);
    expect(node.metadata?.patternId).not.toMatch(/generated/);
    expect(conditionOf(node)).toBe('it matches .y');
  });
});

describe.each([
  'add .x to .item when it matches .y',
  'add @x to .item when it matches .y',
  'remove .x from .item when it matches .y',
  'remove .x when it matches .y',
  'hide .item when it matches .y',
  'show .item when its innerText contains "foo"',
  'show me with opacity when it matches .y',
  'hide .item with opacity when it matches .y',
  'on click add .foo to #d2 when asyncCheck()',
  'on click add .x to .item when it matches .y then log 1',
  'on click hide .item when it matches .y then show #z',
])('%s', source => {
  it.each(FOREIGN)('round-trips through %s', language => {
    expect(roundTrip(source, language)).toBe(translate(source, 'en', 'en'));
  });
});
