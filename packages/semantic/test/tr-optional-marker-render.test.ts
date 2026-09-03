/**
 * A marker that may be DROPPED colloquially is still rendered.
 *
 * `profile.markersOptional` says the language's case markers can be omitted in
 * casual speech, so the PARSE side must accept both forms. `buildRoleToken`
 * implements that by wrapping each marker literal in its own optional group.
 *
 * The renderer then dropped every one of them, because its rule was "an optional
 * group with no role value in it is a dangling marker" — written for
 * `[with {style}]` on a style-less `hide #output`, and true there. A group
 * wrapped around a marker ALONE is the other case: the role it marks is right
 * next to it, in the parent token list, and present.
 *
 * tr is the only language with `markersOptional`, and it lost every role marker
 * in every rendered command:
 *
 *   add .selected to #item   →  `#item .selected ekle`
 *   corpus (i18n)            →  `#item e .selected i ekle`
 *
 * The marker-less surface is not merely unidiomatic — it re-parses through
 * `add-tr-generated-simple`, a ONE-role pattern, so the destination is lost and
 * silently defaults to `me`.
 *
 * The distinction is carried on the token: `renderRequired` is set only for the
 * profile-wide `markersOptional` wrapper. A PER-ROLE `markerOptional`
 * (`go [to] /page` vs `go back`) is the opposite case — there the render side
 * genuinely omits the marker — and stays render-optional.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
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

describe('tr renders its case markers', () => {
  // Each expectation is the marker the i18n transformer writes into the corpus
  // for the same row, so the two renderers agree on the surface.
  const ROWS: Array<[string, string[]]> = [
    ['add .selected to #item', ['#item', 'e', '.selected', 'i', 'ekle']],
    ['remove .active from #panel', ['#panel', '.active', 'i']],
    ['toggle .open on #menu', ['#menu', '.open', 'i']],
  ];

  it.each(ROWS)('`%s` keeps its markers', (english, words) => {
    const rendered = translate(english, 'en', 'tr');
    for (const word of words) {
      expect(rendered.split(/\s+/), `tr dropped \`${word}\` from: ${rendered}`).toContain(word);
    }
  });

  it('round-trips the destination instead of defaulting it to `me`', () => {
    // Pre-change: `#item .selected ekle` matched `add-tr-generated-simple`, a
    // ONE-role pattern, so `#item` was consumed as part of the patient and the
    // destination came back as the implicit `me`.
    const rendered = translate('on click add .selected to #item', 'en', 'tr');
    const add = find(parse(rendered, 'tr'), 'add');
    expect(add, `tr: rendered add did not re-parse: ${rendered}`).not.toBeNull();
    expect(add!.roles.get('destination' as never)).toMatchObject({ value: '#item' });
    expect(add!.roles.get('patient' as never)).toMatchObject({ value: '.selected' });
  });
});

describe('a PER-ROLE markerOptional still renders without its marker', () => {
  // `goSchema.destination` marks `markerOptional` per language because canonical
  // hyperscript writes `go back`, not `go to back`. That group must stay
  // render-optional — only the profile-wide wrapper is `renderRequired`.
  it.each(['tr', 'es', 'ja'] as const)('%s renders `go back` without a to-marker', language => {
    const rendered = translate('go back', 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node?.action, `${language}: go back did not re-parse: ${rendered}`).toBe('go');
    expect(node!.roles.has('destination' as never)).toBe(true);
  });
});

describe('the dangling-marker rule still holds', () => {
  // The rule this change narrows: an optional group that DECLARES a role and did
  // not fill it must not emit its marker alone.
  it.each(['tr', 'es', 'de', 'ja'] as const)('%s renders a style-less hide bare', language => {
    const rendered = translate('hide #output', 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node?.action, `${language}: hide did not re-parse: ${rendered}`).toBe('hide');
    expect(node!.roles.has('style' as never), `${language} invented a style role`).toBe(false);
  });

  it.each(['tr', 'es', 'ja'] as const)('%s renders a source-less remove bare', language => {
    const rendered = translate('remove .active', 'en', language);
    const remove = find(parse(rendered, language), 'remove');
    expect(remove, `${language}: remove did not re-parse: ${rendered}`).not.toBeNull();
    expect(remove!.roles.get('patient' as never)).toMatchObject({ value: '.active' });
  });
});
