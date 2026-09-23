/**
 * `of`-possessive paths and pseudo-commands survive translation.
 *
 * Two of the four hyperscript bodies in *Hypermedia Systems* came back from
 * every language with their only command gutted (measured 2026-09-23):
 *
 * - ch. 9 counter, `increment the textContent of the previous <output/>` →
 *   `increment textContent`. The of-possessive matcher was gated to `set`'s
 *   destination, took only a selector owner, and the fused `<cmd>-event-*`
 *   patterns carry untyped slots that never reached it.
 * - ch. 10, `on load click() me` → `on load`. No semantic model for a
 *   pseudo-command existed; the clause was dropped.
 *
 * Each row is a full en → L → en round trip that must come back to the English
 * reference (the renderer's own normalization), plus a parse assertion in L so a
 * lossy render that happens to re-parse into the right English cannot pass.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src';
import type { EventHandlerSemanticNode, SemanticNode, SemanticValue } from '../src/types';

const LANGS = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

function bodyCommand(src: string, lang: string): SemanticNode {
  const node = parse(src, lang) as EventHandlerSemanticNode | null;
  expect(node, `${lang}: ${src}`).not.toBeNull();
  expect(node!.kind, `${lang}: ${src}`).toBe('event-handler');
  expect(node!.body, `${lang}: ${src}`).toHaveLength(1);
  return node!.body[0] as SemanticNode;
}

/** `pp(<owner>.<property>)`, the owner as its selector/reference/raw text. */
function pathOf(v: SemanticValue | undefined): string | undefined {
  if (!v || v.type !== 'property-path') return undefined;
  const o = v.object as { value?: unknown; raw?: unknown };
  return `${String(o.value ?? o.raw)}|${v.property}`;
}

interface OfRow {
  en: string;
  reference: string;
  action: string;
  role: 'patient' | 'destination';
  path: string;
  quantity?: number;
}

const OF_ROWS: OfRow[] = [
  {
    // The book's counter, verbatim. The engine rejects the `'s` spelling of a
    // positional owner (`previous <output/>'s textContent`), so en renders `of`.
    en: 'on click increment the textContent of the previous <output/>',
    reference: 'on click increment the textContent of previous <output/>',
    action: 'increment',
    role: 'patient',
    path: 'previous <output/>|textContent',
  },
  {
    en: 'on click increment the textContent of #out',
    reference: "on click increment #out's textContent",
    action: 'increment',
    role: 'patient',
    path: '#out|textContent',
  },
  {
    // The amount rides along; de/th used to drop `by N` on decrement (not on
    // increment) for want of the mirror patterns.
    en: 'on click decrement the value of #n by 2',
    reference: "on click decrement #n's value by 2",
    action: 'decrement',
    role: 'patient',
    path: '#n|value',
    quantity: 2,
  },
  {
    en: 'on click decrement the value of the first <input/> in #form',
    reference: 'on click decrement the value of first <input/> in #form',
    action: 'decrement',
    role: 'patient',
    path: 'first <input/> in #form|value',
  },
  {
    // `set` took `of #id` already; a positional owner dropped the whole command.
    en: 'on click set the textContent of the next <output/> to 1',
    reference: 'on click set the textContent of next <output/> to 1',
    action: 'set',
    role: 'destination',
    path: 'next <output/>|textContent',
  },
  {
    // A `*` style property is a selector-shaped token: the owner-first clitic
    // languages (`最も近い <div/> の *opacity`) read `の *opacity` as a
    // locative source clause and the run swallowed the property it owns.
    en: 'on click set the *opacity of the closest <div/> to 1',
    reference: 'on click set the *opacity of closest <div/> to 1',
    action: 'set',
    role: 'destination',
    path: 'closest <div/>|*opacity',
  },
];

describe('of-possessive paths survive en → L → en', () => {
  for (const row of OF_ROWS) {
    describe(row.en, () => {
      it('en parses the owner into the property path and renders the reference', () => {
        const cmd = bodyCommand(row.en, 'en');
        expect(cmd.action).toBe(row.action);
        expect(pathOf(cmd.roles.get(row.role))).toBe(row.path);
        expect(translate(row.en, 'en', 'en')).toBe(row.reference);
      });

      for (const lang of LANGS) {
        it(`${lang}: the owner survives the render and the re-parse`, () => {
          const rendered = translate(row.en, 'en', lang);
          const cmd = bodyCommand(rendered, lang);
          expect(cmd.action, rendered).toBe(row.action);
          expect(pathOf(cmd.roles.get(row.role)), rendered).toBe(row.path);
          if (row.quantity !== undefined) {
            const q = cmd.roles.get('quantity') as { value?: unknown } | undefined;
            expect(q?.value, rendered).toBe(row.quantity);
          }
          expect(translate(rendered, lang, 'en')).toBe(row.reference);
        });
      }
    });
  }
});

describe('decrement keeps its amount in every language', () => {
  const en = 'on click decrement :n by 2';
  for (const lang of LANGS) {
    it(`${lang}: by 2 survives`, () => {
      const rendered = translate(en, 'en', lang);
      const q = bodyCommand(rendered, lang).roles.get('quantity') as { value?: unknown };
      expect(q?.value, rendered).toBe(2);
      expect(translate(rendered, lang, 'en')).toBe(en);
    });
  }
});

interface PseudoRow {
  en: string;
  /** The `call` it is: the English reference and the patient raw. */
  reference: string;
  raw: string;
}

const PSEUDO_ROWS: PseudoRow[] = [
  // The book (ch. 10), verbatim.
  { en: 'on load click() me', reference: 'on load call me.click()', raw: 'me.click()' },
  {
    en: 'on click foo(1, 2) on #x',
    reference: 'on click call #x.foo(1,2)',
    raw: '#x.foo(1,2)',
  },
  {
    en: "on click setAttribute('a', 'b') on me",
    reference: "on click call me.setAttribute('a','b')",
    raw: "me.setAttribute('a','b')",
  },
  {
    // `the` is one of the engine's pseudo-command prepositions; a query target
    // is parenthesized, and its positional word localizes and comes back.
    en: 'on click submit() the closest <form/>',
    reference: 'on click call (closest <form/>).submit()',
    raw: '(closest <form/>).submit()',
  },
  {
    en: 'on click scrollIntoView() on the next <section/>',
    reference: 'on click call (next <section/>).scrollIntoView()',
    raw: '(next <section/>).scrollIntoView()',
  },
  {
    // A dotted head names its own receiver.
    en: "on click console.log('hi')",
    reference: "on click call console.log('hi')",
    raw: "console.log('hi')",
  },
];

describe('pseudo-commands are the `call` they denote, in every language', () => {
  for (const row of PSEUDO_ROWS) {
    describe(row.en, () => {
      it('en parses it as call and renders the reference', () => {
        const cmd = bodyCommand(row.en, 'en');
        expect(cmd.action).toBe('call');
        expect((cmd.roles.get('patient') as { raw?: string })?.raw).toBe(row.raw);
        expect(translate(row.en, 'en', 'en')).toBe(row.reference);
      });

      for (const lang of LANGS) {
        it(`${lang}: renders a call that re-parses and comes back`, () => {
          const rendered = translate(row.en, 'en', lang);
          const cmd = bodyCommand(rendered, lang);
          expect(cmd.action, rendered).toBe('call');
          expect((cmd.roles.get('patient') as { raw?: string })?.raw, rendered).toBe(row.raw);
          expect(translate(rendered, lang, 'en')).toBe(row.reference);
        });
      }
    });
  }

  it('a pseudo-command is one clause of a longer body', () => {
    const node = parse('on click foo() then add .x to me', 'en') as EventHandlerSemanticNode;
    const compound = node.body[0] as unknown as { statements: SemanticNode[] };
    expect(compound.statements.map(s => s.action)).toEqual(['call', 'add']);
  });

  it('a bare pseudo-command parses outside a handler', () => {
    expect(translate('click() me', 'en', 'en')).toBe('call me.click()');
  });

  it('`call #x.foo(1, 2)` keeps its arguments', () => {
    const cmd = parse('call #x.foo(1, 2)', 'en') as SemanticNode;
    expect((cmd.roles.get('patient') as { raw?: string })?.raw).toBe('#x.foo(1,2)');
  });
});

describe('what is not a pseudo-command', () => {
  it('a real command head keeps its command (`focus() me` is `focus me`)', () => {
    expect(bodyCommand('on click focus() me', 'en').action).toBe('focus');
  });

  it('an event with params inside `wait for` never becomes a call', () => {
    const node = parse(
      'on pointerdown(clientY) from me wait for pointermove(clientY) or pointerup(clientY) from document then add .x to me',
      'en'
    ) as EventHandlerSemanticNode;
    const actions = JSON.stringify(node, (_k, v) => (v instanceof Map ? [...v] : v));
    expect(actions).not.toContain('"action":"call"');
  });

  it('a SPACED paren after `#id.prop` is the next operand, not an argument list', () => {
    // it/pl/ru/uk render `set`'s to-marker before the destination, so the
    // patient's parenthesized operand directly follows it (corpus computed-value).
    const it_ =
      'su input da .quantity impostare in #total.innerText ( the valore of #price as Number ) * ( mio valore as Number )';
    const cmd = bodyCommand(it_, 'it');
    expect(pathOf(cmd.roles.get('destination'))).toBe('#total|innerText');
    expect((cmd.roles.get('patient') as { raw?: string })?.raw).toMatch(/^\( .* as Number \)$/);
  });

  it('a following handler is not the pseudo-command\'s `on <target>`', () => {
    const node = parse('on click foo() on keyup bar()', 'en') as unknown as {
      statements: EventHandlerSemanticNode[];
    };
    expect(node.statements).toHaveLength(2);
    const raws = node.statements.map(
      h => ((h.body[0] as SemanticNode).roles.get('patient') as { raw?: string })?.raw
    );
    expect(raws).toEqual(['foo()', 'bar()']);
  });

  it('`send update(value: 42) to #target` stays a send', () => {
    expect(bodyCommand('on click send update(value: 42) to #target', 'en').action).toBe('send');
  });
});
