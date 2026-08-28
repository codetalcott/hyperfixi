/**
 * Batch 3 red→green proofs — one representative render→parse round-trip per
 * V1 dict-fix class (docs-internal/MULTILINGUAL_NEXT_STEPS.md § "V1 probe
 * conclusion (Batch 3)"). Each of these was a live render→parse break before
 * the Batch 3 dictionary fixes:
 *
 * - select class: the dict word doubled as the pick keyword — the bare select
 *   render parsed null (de `auswählen #note`).
 * - wrong-verb class: the dict word was another command's verb — the render
 *   parsed as THAT action (bn clone → copy, id close → hide, sw copy → clone,
 *   vi prepend → add, qu change-event → toggle).
 * - reset class: the dict event word captured on.event as an expression (a
 *   broken listener) or a wrong event; the profile verb round-trips.
 * - submit class: the dict event word doubled as the send verb — corpus
 *   on-submit rows captured event "send" (es/pl/tr/vi live).
 * - blur class (it): the noun form dropped blur.patient in command position.
 * - empty class (ko/qu profile-alternatives): the dict adjective renders the
 *   empty COMMAND but only the profile verb parsed. (ja is waived: bare 空
 *   phantoms the hot `is empty` rows if registered.)
 *
 * Assertions are on captured ACTION and role VALUES, never "it parses".
 */

import { describe, expect, it } from 'vitest';
import { parseSemantic, translate } from '@lokascript/semantic';

/** Verbatim (action, role, value) triples from a parse tree. */
function triples(node: unknown, acc: string[] = [], depth = 0): string[] {
  if (depth > 64 || node === null || typeof node !== 'object') return acc;
  const rec = node as Record<string, unknown>;
  if (typeof rec.action === 'string') {
    const roles = rec.roles;
    const entries: Array<[unknown, unknown]> =
      roles instanceof Map
        ? [...roles.entries()]
        : roles && typeof roles === 'object'
          ? Object.entries(roles)
          : [];
    for (const [role, v] of entries) {
      if (v === null || v === undefined) continue;
      const val = (v as { value?: unknown }).value ?? (v as { raw?: unknown }).raw;
      acc.push(`${rec.action}.${String(role)}=${String(val)}`);
    }
  }
  for (const f of ['body', 'commands', 'children', 'thenBranch', 'elseBranch']) {
    const c = rec[f];
    if (Array.isArray(c)) for (const x of c) triples(x, acc, depth + 1);
    else if (c && typeof c === 'object') triples(c, acc, depth + 1);
  }
  return acc;
}

/**
 * Renders with @lokascript/semantic, not @lokascript/i18n's `GrammarTransformer`
 * (retired 2026-08-28). The assertions are unchanged and still pass: what they
 * pin is the VOCABULARY, and `lexicon-parity.test.ts` gates semantic's lexicons
 * against i18n's dictionaries, so the two renderers agree on exactly these words
 * — verified on this file's cases before the swap (de `markieren`, ar `ظلل`,
 * bn `#row কে ক্লোন`, id `tutupkan #modal`, vi `thêm vào đầu "x" vào #list`:
 * byte-identical from both).
 */
function renderAndParse(en: string, lang: string): { render: string; triples: string[] } {
  const render = translate(en, 'en', lang);
  const result = parseSemantic(render, lang);
  return { render, triples: result.node ? triples(result.node) : [] };
}

/**
 * The three EVENT-NAME classes that used to live here — reset, submit and
 * qu change — are gone with the renderer that made them observable.
 *
 * They asserted that i18n's DICTIONARY event word appears in the rendered
 * surface (it `reimpostare`, ko `재설정`, pl `zresetuj`, ru `сбросить`,
 * qu `musuqchay`, …). @lokascript/semantic deliberately does NOT localize an
 * event name: `localizeEventName` keeps a curated denylist of events that must
 * stay English to round-trip, so it renders `on reset`, `on submit`, `on change`
 * verbatim. Migrated as-is, those tests would have asserted only that an English
 * event name comes back as itself — true, and about nothing.
 *
 * The dictionary words themselves still ship (they feed the keyword providers on
 * the PARSE side) and are still gated, by the V1-V4 vocab consistency check
 * (`testing-framework/src/vocab/cli.ts validate`) and `lexicon-parity.test.ts`.
 * What is no longer covered is their appearance in a RENDER, because nothing
 * renders from them any more.
 */

describe('Batch 3 — select class (dict word was the pick keyword)', () => {
  it('de: `select #note` renders markieren and parses back as select', () => {
    const { render, triples: t } = renderAndParse('select #note', 'de');
    expect(render).toContain('markieren');
    expect(t).toContain('select.patient=#note');
  });

  it('ar: `select #note` renders ظلل and parses back as select', () => {
    const { render, triples: t } = renderAndParse('select #note', 'ar');
    expect(render).toContain('ظلل');
    expect(t).toContain('select.patient=#note');
  });
});

describe('Batch 3 — wrong-verb class (dict word was another command)', () => {
  it('bn: `clone #card` no longer parses as copy', () => {
    const { render, triples: t } = renderAndParse('clone #card', 'bn');
    expect(render).toContain('ক্লোন');
    expect(t).toContain('clone.patient=#card');
  });

  it('id: `close #modal` no longer parses as hide', () => {
    const { render, triples: t } = renderAndParse('close #modal', 'id');
    expect(render).toContain('tutupkan');
    expect(t).toContain('close.patient=#modal');
  });

  it('sw: `copy #text` no longer parses as clone', () => {
    const { render, triples: t } = renderAndParse('copy #text', 'sw');
    expect(render).toContain('nakala');
    expect(t).toContain('copy.patient=#text');
  });

  it('vi: `prepend "x" to #list` no longer parses as add', () => {
    const { render, triples: t } = renderAndParse('prepend "x" to #list', 'vi');
    expect(render).toContain('thêm vào đầu');
    expect(t.some(x => x.startsWith('prepend.'))).toBe(true);
  });
});

describe('Batch 3 — it blur (noun form dropped the command patient)', () => {
  it('it: blur command render captures blur.patient', () => {
    const { render, triples: t } = renderAndParse('on keydown[key=="Escape"] blur me', 'it');
    expect(render).toContain('sfuocare');
    expect(t).toContain('blur.patient=me');
  });

  it('it: blur event position still captures on.event="blur"', () => {
    const { triples: t } = renderAndParse('on blur log "x"', 'it');
    expect(t).toContain('on.event=blur');
  });
});

describe('Batch 3 — empty class (ko/qu profile alternatives)', () => {
  it('ko: the dict adjective now parses the empty command', () => {
    const t = triples(parseSemantic('#list 를 비어있는', 'ko').node);
    expect(t).toContain('empty.patient=#list');
  });

  it('qu: apostrophe-less chusaq now parses the empty command', () => {
    const t = triples(parseSemantic('#list ta chusaq', 'qu').node);
    expect(t).toContain('empty.patient=#list');
  });

  it('ko/qu: the hot `is empty` expression rows keep parsing without a phantom empty action', () => {
    for (const [text, langCode] of [
      [
        '블러 할 때 만약 내 값 이다 비어있는 .error 를 추가 나 에 아니면 .error 를 제거 나 에서 끝',
        'ko',
      ],
      [
        'paqariy pi sichus noqaq chanin kanqa chusaq .error ta noqa man yapay manachus .error ta noqa manta qichuy tukuy',
        'qu',
      ],
    ] as const) {
      const t = triples(parseSemantic(text, langCode).node);
      expect(t.some(x => x.startsWith('empty.'))).toBe(false);
    }
  });
});
