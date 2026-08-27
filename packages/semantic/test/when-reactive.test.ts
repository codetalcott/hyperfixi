/**
 * Reactive `when <expr> [or <expr>]* changes <body> [end]` — canonical
 * _hyperscript (0.9.93 verified: `or` is the only separator, `changes` is a
 * REQUIRED literal, `end` is optional; the engine has NO temporal `when <event>`
 * form), supported in all 24 languages.
 *
 * Before this layer nothing modelled it. The temporal `when {event} {body}`
 * handler patterns claimed it and kept the FIRST token of the watched
 * expression as the "event":
 *
 *   when $firstName or $lastName changes put … end  -> on { event: $firstName }
 *   when (#price's value * #qty's value) changes …  -> on { event: "(" }
 *
 * An ENGLISH-REFERENCE truncation first (the runtime would watch the wrong
 * thing), and a multilingual one second: every language is scored against the
 * English reference, so all 24 translations scored CLEAN by reproducing it —
 * measured: every stored corpus row parsed to `on,put` with
 * `on.event:reference`, identical to the truncated reference.
 *
 * The structural layer now folds it into a `when` feature node whose watched
 * expression rides in `condition`. The `changes` word is the discriminator in
 * both directions: no `changes` → the temporal handler patterns, untouched; a
 * command verb inside the would-be expression → a handler body that merely
 * mentions the word. Assert on the captured expression and body, never on
 * "does it parse": it always parsed.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src';
import { collectActions, collectRoleSignatureStrict } from '../src/fidelity';
import type { CommandSemanticNode, FeatureSemanticNode, SemanticNode } from '../src/types';

const cond = (n: SemanticNode | null): string | undefined =>
  (n?.roles.get('condition' as never) as { raw?: string } | undefined)?.raw;
const body = (n: SemanticNode | null): string[] =>
  ((n as FeatureSemanticNode | null)?.body ?? []).map(c => (c as CommandSemanticNode).action);
const sig = (n: SemanticNode | null): string =>
  `${collectActions(n).join(',')} | ${collectRoleSignatureStrict(n).join(',')}`;

const MULTI =
  'when $firstName or $lastName changes put `${$firstName} ${$lastName}` into #full-name end';
const VALUE = "when (#price's value * #qty's value) changes put `$${it}` into me end";

describe('reactive when — English reference', () => {
  it.each([
    ['when $count changes put "x" into me end', '$count'],
    ['when $a or $b changes put "x" into me end', '$a or $b'],
    ['when $a or $b or $c changes put "x" into me end', '$a or $b or $c'],
    [VALUE, "(#price's value * #qty's value)"],
    ['when $a * $b changes log it', '$a * $b'],
    ["when #p's value changes log it", "#p's value"],
    ['when #p changes log it', '#p'],
    [MULTI, '$firstName or $lastName'],
  ])('captures the whole watched expression: %s', (source, expected) => {
    const node = parse(source, 'en') as FeatureSemanticNode;
    expect(node.kind).toBe('feature');
    expect(node.action).toBe('when');
    // BYTE-FAITHFUL: `raw` is what the runtime evaluates, and the English
    // tokenizer lexes the possessive inside parens with a stray quote.
    expect(cond(node)).toBe(expected);
    expect(body(node).length).toBeGreaterThan(0);
    expect((node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input')).toHaveLength(0);
  });

  it('the body is the whole statement list, and `end` is optional', () => {
    expect(body(parse('when $count changes put "x" into me', 'en'))).toEqual(['put']);
    expect(body(parse('when $x changes\n  put "a" into me\n  toggle .b\nend', 'en'))).toEqual([
      'put',
      'toggle',
    ]);
  });

  it('the action set is {when, put} — no phantom `on`', () => {
    expect(collectActions(parse(MULTI, 'en'))).toEqual(['put', 'when']);
    expect(collectRoleSignatureStrict(parse(MULTI, 'en'))).toContain('when.condition:expression');
  });

  it('carries the watched expression and the body into the built AST', () => {
    const { ast } = buildAST(
      parse('when $a or $b changes put "x" into me end', 'en')
    ) as unknown as {
      ast: { name: string; args: Array<{ type: string; operator?: string; commands?: unknown[] }> };
    };
    expect(ast.name).toBe('when');
    expect(ast.args[0]).toMatchObject({ type: 'binaryExpression', operator: 'or' });
    expect(ast.args.find(a => a.type === 'block')?.commands).toHaveLength(1);
  });
});

describe('reactive when — what must NOT fold', () => {
  it.each([
    // No `changes` word: the temporal handler patterns keep it.
    ['when click toggle .active', 'on'],
    // The `change` EVENT is not the `changes` word.
    ['on change put me into me', 'on'],
    // A string literal is never the word.
    ['on click put "changes" into me', 'on'],
    // A command verb inside the would-be expression: a handler body that
    // merely mentions the word.
    ['on click set x to changes', 'on'],
    // Sibling feature, untouched.
    ['live put `Count: ${$count}` into me end', 'live'],
  ])('%s stays %s', (source, action) => {
    const node = parse(source, 'en');
    expect(node.action).toBe(action);
    expect(collectActions(node)).not.toContain('when');
  });
});

/**
 * The stored corpus rows, VERBATIM from patterns.db (written by the i18n
 * transformer from its dictionary's `changes` word — the surfaces the profiles'
 * new `changes` keywords are synced from). Each must parse to the same action
 * set and role signature as the English reference.
 */
const STORED_MULTI: Record<string, string> = {
  ar: 'عندما $firstName أو $lastName يتغير ضع `${$firstName} ${$lastName}` إلى #full-name النهاية',
  bn: 'যখন $firstName অথবা $lastName পরিবর্তিত হলে `${$firstName} ${$lastName}` কে #full-name তে রাখুন শেষ',
  de: 'wenn $firstName oder $lastName ändert setzen `${$firstName} ${$lastName}` zu #full-name ende',
  es: 'cuando $firstName o $lastName cambia poner `${$firstName} ${$lastName}` a #full-name fin',
  fr: 'quand $firstName ou $lastName change mettre `${$firstName} ${$lastName}` à #full-name fin',
  he: 'כאשר $firstName or $lastName משתנה שים את `${$firstName} ${$lastName}` על #full-name סוף',
  hi: 'जब $firstName या $lastName बदलने पर `${$firstName} ${$lastName}` को #full-name में रखें समाप्त',
  id: 'ketika $firstName atau $lastName berubah taruh `${$firstName} ${$lastName}` ke #full-name akhir',
  it: 'quando $firstName o $lastName cambia mettere `${$firstName} ${$lastName}` in #full-name fine',
  ja: '時 $firstName または $lastName 変わったら `${$firstName} ${$lastName}` を #full-name に 置く 終わり',
  ko: '때 $firstName 또는 $lastName 변경되면 `${$firstName} ${$lastName}` 를 #full-name 에 넣다 끝',
  ms: 'apabila $firstName atau $lastName berubah letak `${$firstName} ${$lastName}` ke #full-name tamat',
  pl: 'kiedy $firstName lub $lastName zmienia umieść `${$firstName} ${$lastName}` do #full-name koniec',
  pt: 'quando $firstName ou $lastName muda colocar `${$firstName} ${$lastName}` para #full-name fim',
  qu: 'maykama $firstName utaq $lastName tukurikun `${$firstName} ${$lastName}` ta #full-name man churay tukuy',
  ru: 'когда $firstName или $lastName изменяется положить `${$firstName} ${$lastName}` в #full-name конец',
  sw: 'wakati $firstName au $lastName inabadilika weka `${$firstName} ${$lastName}` kwa #full-name mwisho',
  th: 'เมื่อ $firstName หรือ $lastName เปลี่ยน ใส่ `${$firstName} ${$lastName}` ใน #full-name จบ',
  tl: 'kapag $firstName o $lastName nagbabago ilagay `${$firstName} ${$lastName}` sa #full-name wakas',
  tr: 'iken $firstName veya $lastName değiştiğinde `${$firstName} ${$lastName}` i #full-name e koy son',
  uk: 'коли $firstName або $lastName змінюється покласти `${$firstName} ${$lastName}` в #full-name кінець',
  vi: 'khi $firstName hoặc $lastName thay đổi đặt `${$firstName} ${$lastName}` vào #full-name kết thúc',
  zh: '当 $firstName 或 $lastName 改变时 把 `${$firstName} ${$lastName}` 放置 到 #full-name 结束',
};

const LANGUAGES = Object.keys(STORED_MULTI);

describe('reactive when — all 24 languages', () => {
  const reference = sig(parse(MULTI, 'en'));

  it.each(LANGUAGES)('the stored %s corpus row parses like the English reference', lang => {
    const node = parse(STORED_MULTI[lang], lang);
    expect(node.action).toBe('when');
    expect(sig(node)).toBe(reference);
  });

  it.each(LANGUAGES)('the stored %s row renders back to the canonical English', lang => {
    // The or-conjunction is normalized by SURFACE where the tokenizer leaves
    // it a bare identifier (de `oder`, fr `ou`, …): the engine rejects
    // `$a oder $b` ("Expected 'changes' but found 'oder'").
    const english = render(parse(STORED_MULTI[lang], lang), 'en').replace(/\s+/g, ' ');
    expect(english).toBe(
      'when $firstName or $lastName changes put `${$firstName} ${$lastName}` into #full-name end'
    );
  });

  it.each(LANGUAGES)('en → %s → parse round-trips both corpus heads', lang => {
    for (const source of [MULTI, VALUE]) {
      const ref = parse(source, 'en');
      const rendered = render(ref, lang);
      // The head is `<when-word> <expr> <changes-word>`, never `<expr> <event-marker>`.
      expect(rendered.split('\n')[0]).toMatch(/^\S+ .+ \S+$/);
      expect(sig(parse(rendered, lang))).toBe(sig(ref));
    }
  });
});
