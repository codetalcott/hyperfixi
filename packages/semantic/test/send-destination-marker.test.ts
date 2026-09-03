/**
 * `send X to Y`'s destination marker is a SURFACE form, not i18n's attachment
 * convention.
 *
 * `sendSchema.destination.markerOverride` carried `tr: '-e'` and `qu: '-man'`.
 * The leading hyphen is `@lokascript/i18n`'s INTERNAL marker for agglutinative
 * attachment — the transformer joins `#count` + `-ta` into `#countta` — and it
 * never appears in a surface. What the transformer actually writes into the
 * corpus is spaced and bare:
 *
 *   tr  refresh i tıklama de gönder #widget e
 *   qu  refresh ta #widget man ñitiy pi kachay
 *
 * So the hyphenated form matched nothing on the parse side, and the semantic
 * renderer emitted a stray `-e` / `-man` token that no pattern could bind:
 * `tıklama i üzerinde #widget -e refresh i gönder`. `send.destination` was lost
 * in tr and qu on every row that has one.
 *
 * Found by querying `pattern_translations` rather than reading the schema — the
 * marker looked plausible in isolation and is wrong only against what the
 * transformer emits. An audit of every `markerOverride` / `renderOverride` /
 * `markerVariants` entry across all 70 schemas found no other hyphenated value.
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

const AGGLUTINATIVE = ['tr', 'qu'] as const;

describe('the rendered send carries no attachment hyphen', () => {
  it.each(AGGLUTINATIVE)('%s renders the marker bare', language => {
    // Pre-change: `#widget -e` / `#widget -man`.
    const rendered = translate('on click send refresh to #widget', 'en', language);
    expect(rendered, `${language} rendered an attachment hyphen: ${rendered}`).not.toMatch(
      /\s-\S/u
    );
    expect(rendered).toContain('#widget');
  });

  it.each(AGGLUTINATIVE)('%s round-trips send.destination', language => {
    const rendered = translate('on click send refresh to #widget', 'en', language);
    const send = find(parse(rendered, language), 'send');
    expect(send, `${language}: rendered send did not re-parse: ${rendered}`).not.toBeNull();
    expect(
      send!.roles.get('destination' as never),
      `${language} lost the destination`
    ).toMatchObject({ value: '#widget' });
  });

  it.each(AGGLUTINATIVE)('%s keeps the event alongside the destination', language => {
    const rendered = translate('on click send refresh to #widget', 'en', language);
    const send = find(parse(rendered, language), 'send');
    expect(send!.roles.get('event' as never)).toMatchObject({ value: 'refresh' });
  });
});

describe('the marker matches what the i18n transformer emits', () => {
  // The corpus surfaces, verbatim, so the two renderers cannot drift apart
  // again without this failing.
  it.each([
    ['tr', 'e'],
    ['qu', 'man'],
  ] as const)('%s marks the destination with `%s`', (language, marker) => {
    const rendered = translate('on click send refresh to #widget', 'en', language);
    expect(rendered.split(/\s+/), `${language}: ${rendered}`).toContain(marker);
  });
});

describe('the other languages are unchanged', () => {
  it.each(['es', 'ja', 'de', 'ko', 'zh', 'id', 'sw'] as const)(
    '%s still round-trips send.destination',
    language => {
      const rendered = translate('on click send refresh to #widget', 'en', language);
      const send = find(parse(rendered, language), 'send');
      expect(send, `${language}: rendered send did not re-parse: ${rendered}`).not.toBeNull();
      expect(send!.roles.get('destination' as never)).toMatchObject({ value: '#widget' });
    }
  );
});
