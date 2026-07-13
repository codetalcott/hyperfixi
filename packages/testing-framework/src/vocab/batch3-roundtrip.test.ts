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
import { parseSemantic } from '@lokascript/semantic';
import { GrammarTransformer } from '@lokascript/i18n';

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

function renderAndParse(en: string, lang: string): { render: string; triples: string[] } {
  const render = new GrammarTransformer('en', lang).transform(en);
  const result = parseSemantic(render, lang);
  return { render, triples: result.node ? triples(result.node) : [] };
}

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

describe('Batch 3 — reset class (broken/wrong-event listener)', () => {
  it.each([
    ['it', 'reimpostare'],
    ['ko', '재설정'],
    ['pl', 'zresetuj'],
    ['pt', 'redefinir'],
    ['ru', 'сбросить'],
    ['uk', 'скинути'],
    ['qu', 'musuqchay'],
  ])('%s: on-reset render captures on.event="reset" (canonical)', (langCode, word) => {
    const { render, triples: t } = renderAndParse('on reset log "done"', langCode);
    expect(render).toContain(word);
    expect(t).toContain('on.event=reset');
  });
});

describe('Batch 3 — submit class (dict word was the send verb)', () => {
  it.each([
    ['es', 'envío'],
    ['pl', 'wysłaniu'],
    ['tr', 'gönderme'],
    ['vi', 'nộp'],
    ['qu', 'apaykachay'],
  ])(
    '%s: corpus-shaped on-submit render captures on.event="submit", not "send"',
    (langCode, word) => {
      const { render, triples: t } = renderAndParse(
        'on submit add @disabled to <button/> in me put "Submitting..." into <button/> in me',
        langCode
      );
      expect(render).toContain(word);
      expect(t).toContain('on.event=submit');
      expect(t).not.toContain('on.event=send');
    }
  );
});

describe('Batch 3 — qu change (dict word was the toggle verb)', () => {
  it('qu: on-change render captures on.event="change", not "toggle"', () => {
    const { render, triples: t } = renderAndParse('on change log "x"', 'qu');
    expect(render).toContain('kambiay');
    expect(t).toContain('on.event=change');
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
