/**
 * Event-handler modifiers survive translation.
 *
 * `on X from <source>` was parsed into `eventModifiers.from` in every language
 * and then never rendered: `translate()` dropped the source in all 23 target
 * languages with no diagnostic (the tokens were consumed, so the coverage meter
 * never fired), and the fidelity scorers walk `roles` only, so none of the
 * eleven ratchet signals could see it. The retired i18n transformer rendered
 * it; the committed patterns.db still shows `ウィンドウ から` for `window-resize`
 * while a live render did not (measured 2026-09-23, hyperfixi 827dca41). The
 * book's abort button (`on htmx:beforeRequest from #contacts-btn …`) listens
 * on the wrong element in every language for the same reason.
 *
 * Each row here is a full en → L → en round trip that must come back with the
 * modifier intact, plus a direct parse assertion in L so a lossy render that
 * happens to re-parse into the right English by accident cannot pass.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src';
import { scoreNodes, collectRoleSignature, collectRoleValueSignature } from '../src/fidelity';
import type { EventHandlerSemanticNode, SemanticNode } from '../src/types';

const LANGS = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

interface Row {
  en: string;
  /** Expected eventModifiers.from value (selector or reference name). */
  from: string;
  /** The body command and the roles it must NOT have grown. */
  body: { action: string; mustNotHave?: string[]; mustHave?: Record<string, string> };
}

const ROWS: Row[] = [
  {
    en: 'on click from #btn add .x to me',
    from: '#btn',
    body: { action: 'add', mustNotHave: ['source'] },
  },
  {
    // The book's abort button (Hypermedia Systems ch. 8): the body has its OWN
    // `from`, so the handler source must not be confused with it.
    en: 'on htmx:beforeRequest from #contacts-btn remove @disabled from me',
    from: '#contacts-btn',
    body: { action: 'remove', mustHave: { source: 'me' } },
  },
  {
    // Corpus row two-way-binding.
    en: 'on input from #firstName set #greeting.innerText to "Hello, " + my value',
    from: '#firstName',
    body: { action: 'set' },
  },
  {
    // A reference source (corpus rows window-keydown / window-resize).
    en: 'on keydown[altKey] from window focus me',
    from: 'window',
    body: { action: 'focus' },
  },
];

function handler(src: string, lang: string): EventHandlerSemanticNode {
  const node = parse(src, lang);
  expect(node, `${lang}: ${src}`).not.toBeNull();
  expect(node!.kind, `${lang}: ${src}`).toBe('event-handler');
  return node as EventHandlerSemanticNode;
}

function fromOf(node: EventHandlerSemanticNode): string | undefined {
  const f = node.eventModifiers?.from as { value?: unknown; raw?: unknown } | undefined;
  return (f?.value ?? f?.raw) as string | undefined;
}

describe('event source survives en → L → en', () => {
  for (const row of ROWS) {
    describe(row.en, () => {
      it('en parses the source into eventModifiers.from', () => {
        const n = handler(row.en, 'en');
        expect(fromOf(n)).toBe(row.from);
      });

      for (const lang of LANGS) {
        it(`${lang}: render carries the source, re-parses it, and comes back to English`, () => {
          const rendered = translate(row.en, 'en', lang);
          // A selector is language-invariant and must appear verbatim; a
          // reference (`window`) renders as the language's own word.
          if (/^[#.<@]/.test(row.from)) {
            expect(rendered, 'rendered surface names the source').toContain(row.from);
          }

          const n = handler(rendered, lang);
          expect(fromOf(n), `eventModifiers.from in ${lang}: ${rendered}`).toBe(row.from);

          const body = n.body[0] as SemanticNode;
          expect(body.action, `body action in ${lang}: ${rendered}`).toBe(row.body.action);
          for (const role of row.body.mustNotHave ?? []) {
            expect(body.roles.has(role as never), `${lang}: body grew a ${role} role: ${rendered}`).toBe(false);
          }
          for (const [role, value] of Object.entries(row.body.mustHave ?? {})) {
            const v = body.roles.get(role as never) as { value?: unknown } | undefined;
            expect(v?.value, `${lang}: body.${role}: ${rendered}`).toBe(value);
          }

          expect(translate(rendered, lang, 'en')).toBe(row.en);
        });
      }
    });
  }
});

describe('temporal modifiers survive en → L → en', () => {
  const rows = [
    'on resize from window debounced at 200ms call adjustLayout()',
    'on click throttled at 1s log me',
  ];
  for (const en of rows) {
    for (const lang of LANGS) {
      it(`${lang}: ${en}`, () => {
        const rendered = translate(en, 'en', lang);
        const n = handler(rendered, lang);
        const ref = handler(en, 'en');
        expect(n.eventModifiers?.debounce).toBe(ref.eventModifiers?.debounce);
        expect(n.eventModifiers?.throttle).toBe(ref.eventModifiers?.throttle);
        expect(fromOf(n)).toBe(fromOf(ref));
        expect(translate(rendered, lang, 'en')).toBe(en);
      });
    }
  }
});

describe('fidelity scorers see event modifiers', () => {
  it('a dropped source is a missing role AND a missing invariant value', () => {
    const ref = parse('on input from #firstName set #greeting.innerText to "x"', 'en');
    const cand = parse('on input set #greeting.innerText to "x"', 'en');
    expect(collectRoleSignature(ref)).toContain('on.from:selector');
    expect(collectRoleValueSignature(ref)).toContain('on.from=#firstName');
    const report = scoreNodes(ref, cand);
    expect(report.faithful).toBe(false);
    expect(report.missingRoles).toContain('on.from:selector');
    expect(report.missingValues).toContain('on.from=#firstName');
  });

  it('a dropped debounce is a missing role and value', () => {
    const ref = parse('on resize from window debounced at 200ms call adjustLayout()', 'en');
    const cand = parse('on resize from window call adjustLayout()', 'en');
    const report = scoreNodes(ref, cand);
    expect(report.faithful).toBe(false);
    expect(report.missingRoles).toContain('on.debounce:number');
    expect(report.missingValues).toContain('on.debounce=200');
  });

  it('identical handlers with modifiers score faithful', () => {
    const a = parse('on resize from window debounced at 200ms call adjustLayout()', 'en');
    const b = parse('on resize from window debounced at 200ms call adjustLayout()', 'en');
    expect(scoreNodes(a, b).faithful).toBe(true);
  });
});
