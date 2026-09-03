/**
 * `fetch … as json` must survive into the six verb-final languages.
 *
 * The six SOV languages did not render the response type AT ALL —
 * `fetch /api/user as json` came out as bn `"/api/user" আনুন`, ja
 * `"/api/user" フェッチ`, and likewise ko/qu/tr/hi. There was nothing for a
 * marker to fix, because there was no slot: `sovFetch` omitted `responseType`
 * deliberately, and said so —
 *
 *   "responseType (`as json`) is intentionally omitted: its SOV surface marker
 *    varies per language (ja none, ko 로, tr olarak, hi के रूप में) and is not in
 *    the R1 drop cluster — the trailing tokens are left unconsumed."
 *
 * That reasoning was sound and has since aged: "not in the R1 drop cluster" was
 * true of the corpus ratchet, but the en→foreign render gate did not exist when
 * it was written, and by THAT gate it was 40 pairs. It also explains why the
 * `responseType.markerOverride` entries for ko (`로서`) and tr (`olarak`) were
 * once "tried and reverted — they changed the rendered surface without fixing
 * anything": the markers were right, but a marker cannot bind without a slot.
 *
 * TWO FACTS DECIDED THE SHAPE, and neither is visible in the profiles — both
 * came from querying what the i18n transformer actually emits, which is the
 * surface the parser must accept:
 *   1. In all six the response type follows the VERB, so it is a TRAILING group,
 *      not another slot in the pre-verb sequence.
 *   2. bn and ja emit NO marker at all. (ja's `として` markerOverride is not what
 *      the transformer produces here — which is the other half of why the
 *      markerOverride route never worked.)
 *
 * Unlike the `wait.event` fix, this was NOT render-only: the parse side dropped
 * the role too, even when handed the exact corpus surface. One edit to the
 * shared builder fixes both directions, because the same pattern serves both.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

/** The six languages routed through `sovFetch`. */
const SOV = ['bn', 'hi', 'ja', 'ko', 'qu', 'tr'] as const;

/** What the i18n transformer emits for `fetch /api/user as json`, per language. */
const CORPUS_SURFACE: Record<string, string> = {
  bn: '/api/user কে আনুন json',
  hi: '/api/user को लाएं json के रूप में',
  ja: '/api/user を フェッチ json',
  ko: '/api/user 를 가져오기 json 로',
  qu: '/api/user ta apamuy json hina',
  tr: '/api/user i getir json olarak',
};

describe('the response type reaches the rendered surface', () => {
  it.each(SOV)('%s renders `json`', language => {
    const rendered = translate('fetch /api/user as json', 'en', language);
    expect(rendered, `${language} dropped the response type`).toContain('json');
  });
});

describe('the response type survives the round trip', () => {
  it.each(SOV)('%s re-parses its own render with responseType', language => {
    const rendered = translate('fetch /api/user as json', 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node, `${language}: rendered fetch did not re-parse`).not.toBeNull();
    expect(node!.action).toBe('fetch');
    expect(
      node!.roles.has('responseType' as never),
      `${language}: responseType lost on re-parse of ${rendered}`
    ).toBe(true);
    expect(node!.roles.has('source' as never), `${language} lost the URL`).toBe(true);
  });
});

describe('the i18n corpus surface parses too', () => {
  // The renderer's output and the transformer's output are NOT identical — hi
  // renders `लाएं json` while the corpus has `लाएं json के रूप में` — so both
  // have to be accepted. This is the assertion that would fail if the slot were
  // tuned to the renderer's own output and nothing else.
  it.each(SOV)('%s parses what the transformer emits', language => {
    const node = parse(CORPUS_SURFACE[language], language) as CommandSemanticNode | null;
    expect(node, `${language}: corpus surface did not parse`).not.toBeNull();
    expect(node!.action).toBe('fetch');
    expect(
      node!.roles.has('responseType' as never),
      `${language}: responseType lost parsing ${CORPUS_SURFACE[language]}`
    ).toBe(true);
  });
});

describe('a fetch with no response type is unchanged', () => {
  // The trailing group is optional. bn and ja carry it with NO marker literal,
  // which is the shape most at risk of over-capturing whatever follows the verb
  // — so this pins that a bare fetch gains nothing.
  it.each(SOV)('%s renders and re-parses a bare fetch cleanly', language => {
    const rendered = translate('fetch /api/data', 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node, `${language}: bare fetch did not re-parse`).not.toBeNull();
    expect(node!.action).toBe('fetch');
    expect(node!.roles.has('source' as never)).toBe(true);
    expect(
      node!.roles.has('responseType' as never),
      `${language} invented a responseType`
    ).toBe(false);
  });

  it.each(SOV)('%s does not swallow a following command', language => {
    // The marker-less trailing slot sits at the end of a verb-final pattern, so
    // the token after the verb in a then-chain is exactly what it could wrongly
    // capture. Both commands must survive.
    const rendered = translate('fetch /api/data then log it', 'en', language);
    const serialized = JSON.stringify(parse(rendered, language));
    expect(serialized, `${language}: ${rendered}`).toContain('fetch');
    expect(serialized, `${language}: ${rendered}`).toContain('log');
  });
});

describe('hi keeps its role at the cost of its postposition (known trade)', () => {
  // A multi-token literal does not match in this trailing position — `के रूप में`,
  // `रूप में` and `के रूप` were each measured and all three leave the group
  // unmatched, so the role never binds. hi therefore takes a BARE slot: it
  // parses both surfaces, and renders the shorter one.
  //
  // Pinned as a deliberate trade rather than left implicit, so that if
  // multi-token literals start matching here, this fails and asks for the
  // postposition to be restored.
  it('renders the short form', () => {
    expect(translate('fetch /api/user as json', 'en', 'hi')).toContain('लाएं json');
    expect(translate('fetch /api/user as json', 'en', 'hi')).not.toContain('के रूप में');
  });

  it('still parses the fuller transformer surface', () => {
    const node = parse(CORPUS_SURFACE.hi, 'hi') as CommandSemanticNode;
    expect(node.roles.has('responseType' as never)).toBe(true);
  });
});

describe('ko tells its two identical markers apart by position', () => {
  // `로` is BOTH ko's style marker and its as-marker. The style group precedes
  // the verb and this one trails it, so position is the only thing separating
  // them — worth pinning, because a future reordering would silently merge them.
  it('binds a trailing `로` as responseType, not style', () => {
    const node = parse('/api/user 를 가져오기 json 로', 'ko') as CommandSemanticNode;
    expect(node.roles.has('responseType' as never)).toBe(true);
    expect(node.roles.has('style' as never)).toBe(false);
  });
});
