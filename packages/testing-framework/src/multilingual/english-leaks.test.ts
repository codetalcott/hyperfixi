/**
 * The English-leak scanner (english-leaks.ts) on hand-written renders: each
 * guard is pinned both ways, so a scanner that stopped applying one fails here
 * rather than silently moving the baselines.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  compressLanguages,
  diffLeakBaseline,
  expandLanguages,
  gainedLeaks,
  prunableLeaks,
  findingKey,
  initLeakScanner,
  leakBaselineFrom,
  leakRatesByLanguage,
  type LeakFinding,
  type LeakResults,
  type LeakScanner,
} from './english-leaks';

let scanner: LeakScanner;

beforeAll(async () => {
  scanner = await initLeakScanner();
}, 120_000);

/** The finding keys of `render`, a render of English `source` into `language`. */
function keys(source: string, render: string, language: string): string[] {
  const info = scanner.sourceInfo(source, 'program');
  if (!info) throw new Error(`the engine rejects ${source}`);
  return scanner.scan(render, info, language).map(findingKey).sort();
}

function findings(source: string, render: string, language: string): LeakFinding[] {
  const info = scanner.sourceInfo(source, 'program');
  if (!info) throw new Error(`the engine rejects ${source}`);
  return scanner.scan(render, info, language);
}

describe('english-leaks scanner', () => {
  it('counts an English grammar word the language has its own word for, or not', () => {
    const source = 'on click if I match .a then add .b to me end';
    expect(keys(source, 'al clic si I match .a entonces agregar .b a mí fin', 'es')).toEqual([
      'I',
      'match',
    ]);
  });

  it('never counts a word spelled like the language’s own word (de `in`)', () => {
    const source = 'on click repeat for x in .item add .y to x end';
    // es has no word spelled `in`; de's `in` is its own word.
    expect(keys(source, 'al clic repetir para x in .item agregar .y a x fin', 'es')).toEqual([
      'in',
    ]);
    expect(
      keys(source, 'bei klick wiederholen für x in .item hinzufügen .y zu x ende', 'de')
    ).toEqual([]);
  });

  it('counts an English alternative the reader still takes, beside the language’s own word', () => {
    // ru's `forever` is `всегда`; the profile lists English `forever` too, so the
    // reader takes code-switched input, but a render that writes it leaks.
    const source = 'on click repeat forever log 1 end';
    expect(keys(source, 'при клик повторить всегда записать 1 конец', 'ru')).toEqual([]);
    expect(keys(source, 'при клик повторить forever записать 1 конец', 'ru')).toEqual(['forever']);
  });

  it('counts a reference the engine reads as a name (`me`)', () => {
    expect(keys('on click log 1, me', 'al clic registrar 1, me', 'es')).toEqual(['me']);
  });

  it('never counts a name, even one spelled like a keyword', () => {
    // `index` is a variable here, a keyword below.
    expect(keys('on click set index to 1', 'al clic establecer index a 1', 'es')).toEqual([]);
    expect(
      keys(
        'on load repeat for x in .item index i add .v to x end',
        'al carga repeat x en .item index i agregar .v a x fin',
        'es'
      )
    ).toEqual(['index', 'repeat']);
  });

  it('counts a word no more often than the source uses it as grammar', () => {
    // `index` once as a keyword, once as a name: the render's two count once.
    expect(
      keys(
        'on load repeat for x in .item index index add .v to x end',
        'al carga repetir para x en .item index index agregar .v a x fin',
        'es'
      )
    ).toEqual(['index']);
  });

  it('does not read strings, `js` blocks (with their parameters) or brace interiors', () => {
    expect(
      keys('on click put "repeat in me" into #a', 'al clic poner "repeat in me" en #a', 'es')
    ).toEqual([]);
    expect(
      keys(
        'on click js(me) return new Date() end then put it into #a',
        'al clic js (me) return new Date() fin entonces ponerlo en #a',
        'es'
      )
    ).toEqual([]);
    expect(
      keys(
        'on click fetch /a with {body: it, method: "POST"}',
        'al clic buscar "/a" con {body: it, method: "POST"}',
        'es'
      )
    ).toEqual([]);
  });

  it('does not read a `js` body or its parameter list, even where they repeat a grammar word', () => {
    // `if` is grammar once (the handler's); the body's `if` is JavaScript.
    expect(
      keys(
        'on click if x then js(x) if (x) return 1 end end',
        'al clic si x entonces js (x) if (x) return 1 fin fin',
        'es'
      )
    ).toEqual([]);
    // `me` is a reference once (put's); the parameter list passes it to JavaScript.
    expect(
      keys(
        'on click put me into #a then js(me) return 1 end',
        'al clic ponerme en #a entonces js (me) return 1 fin',
        'es'
      )
    ).toEqual([]);
  });

  it("reads a word after a possessive quote (`the element's x`) and not as a string", () => {
    expect(
      keys(
        "on click set the element's x to the element's y",
        "al clic establecer the element's x a the element's y",
        'es'
      )
    ).toEqual(['element', 'element', 'the', 'the']);
  });

  it('gives each word its context: clause, bracket, call, property, plain', () => {
    const clause = findings(
      'on click take .foo from .div for #d3',
      'al clic tomar .foo de .div for #d3',
      'es'
    );
    expect(clause.map(f => `${f.word}/${f.context}`)).toEqual(['for/clause']);
    const bracket = findings(
      'on keyup[key is "Escape"] add .x',
      'al keyup[key is "Escape"] agregar .x',
      'es'
    );
    expect(bracket.map(f => `${f.word}/${f.context}`)).toEqual(['is/bracket']);
    const property = findings(
      "on click put #a's children into #b",
      'bei klick setzen children von #a in #b',
      'de'
    );
    expect(property.map(f => `${f.word}/${f.context}/${f.hasWord}`)).toEqual([
      'children/property/true',
    ]);
  });

  it('counts a property name only where the language has a word for it', () => {
    // innerHTML is a DOM name no lexicon translates.
    expect(
      keys("on click put #a's innerHTML into #b", 'bei klick setzen innerHTML von #a in #b', 'de')
    ).toEqual([]);
  });

  it('counts an English event only where the lexicon has a word and the renderer may use it', () => {
    expect(keys('on click add .x', 'при click добавить .x', 'ru')).toEqual(['event:click']);
    expect(keys('on click add .x', 'при клик добавить .x', 'ru')).toEqual([]);
    // A custom event has no word anywhere.
    expect(keys('on foo add .x', 'при foo добавить .x', 'ru')).toEqual([]);
  });

  it('never counts an event the renderer is told to keep English (its denylist)', async () => {
    const { getEventLocalizationDenylist } = await import('@lokascript/semantic');
    const [language, events] = Object.entries(getEventLocalizationDenylist()).find(
      ([, e]) => e.size > 0
    )!;
    const event = [...events][0]!;
    const found = keys(`on ${event} add .x`, `${event} add .x`, language).filter(k =>
      k.startsWith('event:')
    );
    expect(found).toEqual([]);
  });

  it('counts a nominative `me` beside a marker, in the languages where that is wrong', () => {
    expect(keys('on click add .b to me', 'al clic agregar .b a yo', 'es')).toEqual(['case:me']);
    expect(keys('on click add .b to me', 'tıklama da .b i ben e ekle', 'tr')).toEqual(['case:me']);
    // fr writes the stressed form; ja's particle attaches to any noun.
    expect(keys('on click add .b to me', 'sur clic ajouter .b à moi', 'fr')).toEqual([]);
    expect(keys('on click add .b to me', 'クリック で 自分 に .b を 追加', 'ja')).toEqual([]);
    // The oblique forms are right.
    expect(keys('on click add .b to me', 'al clic agregar .b a mí', 'es')).toEqual([]);
    expect(keys('on click add .b to me', 'при клик добавить .b ко мне', 'ru')).toEqual([]);
  });

  it('counts a nominative `it` beside a marker, where the language has another form', () => {
    const source = 'on click add .b to it';
    expect(keys(source, 'при клик добавить .b к это', 'ru')).toEqual(['case:it']);
    expect(keys(source, 'wenn klick hinzufügen .b zu es', 'de')).toEqual(['case:it']);
    expect(keys(source, 'tıklama i üzerinde o e .b i ekle', 'tr')).toEqual(['case:it']);
    expect(keys(source, 'при клик добавить .b к этому', 'ru')).toEqual([]);
    // es `ello` and it `esso` are right after a marker.
    expect(keys(source, 'al clic agregar .b a ello', 'es')).toEqual([]);
    expect(keys(source, 'su clic aggiungere .b a esso', 'it')).toEqual([]);
    // pt: only `em` and `de` contract with `ele` (nele, dele); `a ele` is right.
    expect(keys('on click put "x" into it', 'ao clique colocar "x" em ele', 'pt')).toEqual([
      'case:it',
    ]);
    expect(keys(source, 'ao clique adicionar .b a ele', 'pt')).toEqual([]);
    // The ru/uk/pl demonstrative's accusative is its nominative: right after a
    // marker that takes the accusative (a direction), wrong after one that never does.
    const into = 'on click put "x" into it';
    expect(keys(into, 'при клик положить "x" в это', 'ru')).toEqual([]);
    expect(keys(into, 'gdy kliknięcie umieść "x" w to', 'pl')).toEqual([]);
    expect(keys(source, 'gdy kliknięcie dodaj .b do to', 'pl')).toEqual(['case:it']);
    expect(keys(source, 'при клік додати .b до це', 'uk')).toEqual(['case:it']);
    // tl `bago ito` (before this) is right; `sa ito` is `dito`.
    expect(keys(source, 'kapag click idagdag .b sa ito', 'tl')).toEqual(['case:it']);
    expect(keys('on click wait 1s', 'kapag click maghintay bago ito', 'tl')).toEqual([]);
  });

  it('does not count a pronoun that opens a parenthesized expression', () => {
    const source = 'on click set $b to (it * 2)';
    expect(keys(source, 'wenn klick setze $b auf (es * 2)', 'de')).toEqual([]);
    expect(keys('on click set $b to it', 'wenn klick setze $b auf es', 'de')).toEqual(['case:it']);
  });

  it("counts a nominative pronoun as a verb's unmarked object, where that is wrong", () => {
    expect(keys('on click measure me', 'wenn klick messen ich', 'de')).toEqual(['case:me-object']);
    expect(keys('on click show me', 'al clic mostrar yo', 'es')).toEqual(['case:me-object']);
    expect(keys('on click hide it', 'al clic ocultar ello', 'es')).toEqual(['case:it-object']);
    expect(keys('on click hide it', 'quand clic cacher il', 'fr')).toEqual(['case:it-object']);
    expect(keys('on click put me into #o', 'при клик положить я в #o', 'ru')).toEqual([
      'case:me-object',
    ]);
    // A verb its patterns write (de `verstecke`; the keyword is `verbergen`).
    expect(keys('on click hide me', 'wenn klick verstecke ich', 'de')).toEqual(['case:me-object']);
    // The right object forms, and the objects that are right in the nominative.
    expect(keys('on click measure me', 'wenn klick messen mich', 'de')).toEqual([]);
    expect(keys('on click hide it', 'wenn klick verstecke es', 'de')).toEqual([]);
    expect(keys('on click hide it', 'при клик скрыть это', 'ru')).toEqual([]);
    // fr `moi` is not counted as an object.
    expect(keys('on click show me', 'quand clic afficher moi', 'fr')).toEqual([]);
    // A condition is not an object: `if` is no verb.
    expect(
      keys('on click if it is empty hide me end', 'al clic si ello es vacío ocultar yo fin', 'es')
    ).toEqual(['case:me-object']);
    // A word before the pronoun that is no verb at all.
    expect(keys('on click put it into #o', 'al clic ello en #o', 'es')).toEqual([]);
  });
});

describe('english-leaks baseline', () => {
  const finding = (word: string): LeakFinding => ({
    kind: 'word',
    word,
    context: 'plain',
    hasWord: false,
  });
  const results = (byLanguage: Record<string, string[] | null>): LeakResults =>
    new Map([
      [
        'row',
        new Map(Object.entries(byLanguage).map(([l, ws]) => [l, ws ? ws.map(finding) : null])),
      ],
    ]);

  it('groups languages with the same findings, `*` for all 23', () => {
    const all = expandLanguages('*');
    expect(all).toHaveLength(23);
    expect(compressLanguages(all)).toBe('*');
    const doc = leakBaselineFrom(
      results(Object.fromEntries(all.map(l => [l, l === 'ja' ? [] : ['repeat']]))),
      'test'
    );
    expect(doc.entries.row).toEqual({ repeat: compressLanguages(all.filter(l => l !== 'ja')) });
    expect([doc.renders, doc.leaky, doc.findings, doc.kinds.word.renders]).toEqual([
      23, 22, 22, 22,
    ]);
  });

  it('counts a lane with no render as no render, not as a clean one', () => {
    const doc = leakBaselineFrom(results({ es: ['repeat'], fr: [], de: null }), 'test');
    expect([doc.renders, doc.leaky]).toEqual([2, 1]);
    expect(doc.unrendered).toEqual({ row: 'de' });
  });

  it('reports a lane that was refused and renders now as one to prune, never as gained English', () => {
    const baseline = { entries: { row: { repeat: 'es' } }, unrendered: { row: 'de' } };
    const changes = diffLeakBaseline(results({ es: ['repeat'], de: ['event:click'] }), baseline);
    expect(changes).toEqual([
      { id: 'row', language: 'de', added: ['event:click'], gone: [], newRender: true },
    ]);
    expect(gainedLeaks(changes)).toEqual([]);
    expect(prunableLeaks(changes)).toHaveLength(1);
    // Still unrendered: nothing to say.
    expect(diffLeakBaseline(results({ de: null }), baseline)).toEqual([]);
  });

  it('reports a finding a pair gained, and a listed one that is gone (a lane with no render included)', () => {
    const baseline = { entries: { row: { 'match repeat': 'es', repeat: 'de' } } };
    const changes = diffLeakBaseline(
      results({ es: ['repeat'], de: ['repeat', 'as'], fr: null }),
      baseline
    );
    expect(changes).toEqual([
      { id: 'row', language: 'es', added: [], gone: ['match'] },
      { id: 'row', language: 'de', added: ['as'], gone: [] },
    ]);
    const noRender = diffLeakBaseline(results({ es: null }), baseline);
    expect(noRender).toEqual([{ id: 'row', language: 'es', added: [], gone: ['match', 'repeat'] }]);
  });
});

describe('English a recorded decision keeps', () => {
  it('marks a kept phrase and a kept context, and nothing else', () => {
    const debounced = findings(
      'on input debounced at 300ms log 1',
      'al entrada debounced at 300ms registrar 1',
      'es'
    );
    expect(debounced.map(f => `${f.word}:${f.kept ?? false}`)).toEqual([
      'debounced:true',
      'at:true',
    ]);
    // `start` is counted; the API name after it is kept.
    const view = findings(
      'on click start view transition add .a end',
      'al clic start view transition agregar .a fin',
      'es'
    );
    expect(view.map(f => `${f.word}:${f.kept ?? false}`)).toEqual([
      'start:false',
      'view:true',
      'transition:true',
    ]);
    const bracket = findings(
      'on keyup[key is "Escape"] add .x',
      'al keyup[key is "Escape"] agregar .x',
      'es'
    );
    expect(bracket.map(f => f.kept)).toEqual([true]);
  });
});

describe('M2 exit targets', () => {
  const f = (kind: LeakFinding['kind'], word = 'x'): LeakFinding => ({
    kind,
    word,
    context: 'plain',
    hasWord: false,
  });
  /** 20 renders per language: `n` of them with each listed kind, the rest clean. */
  const rows = (perLanguage: Record<string, LeakFinding['kind'][] | 'none'>): LeakResults => {
    const out: LeakResults = new Map();
    for (let i = 0; i < 20; i++) {
      const byLanguage = new Map<string, LeakFinding[] | null>();
      for (const [language, kinds] of Object.entries(perLanguage)) {
        byLanguage.set(language, kinds === 'none' ? null : i < kinds.length ? [f(kinds[i])] : []);
      }
      out.set(`row${i}`, byLanguage);
    }
    return out;
  };

  it('holds each language to the target on its own, by share of renders', () => {
    const rates = leakRatesByLanguage(rows({ es: ['word'], de: ['word', 'word'] }), 'corpus');
    expect(rates.get('es')).toMatchObject({ renders: 20, met: { word: true } });
    expect(rates.get('es')!.rate.word).toBeCloseTo(0.05);
    expect(rates.get('de')!.met.word).toBe(false);
    // The command-shape half allows twice as many.
    expect(leakRatesByLanguage(rows({ de: ['word', 'word'] }), 'shapes').get('de')!.met.word).toBe(
      true
    );
  });

  it('allows no event and no pronoun case, and skips a lane with no render', () => {
    const rates = leakRatesByLanguage(rows({ ru: ['event'], pl: ['case'], he: 'none' }), 'shapes');
    expect(rates.get('ru')!.met).toEqual({ word: true, event: false, case: true });
    expect(rates.get('pl')!.met).toEqual({ word: true, event: true, case: false });
    expect(rates.has('he')).toBe(false);
  });

  it('does not count a kept finding', () => {
    const results: LeakResults = new Map([
      ['a', new Map([['es', [{ ...f('word', 'url'), kept: true as const }]]])],
      ['b', new Map([['es', [f('word', 'in')]]])],
    ]);
    expect(leakRatesByLanguage(results, 'corpus').get('es')!.rate.word).toBe(0.5);
  });

  it('counts a render once per kind, however many findings it holds', () => {
    const results: LeakResults = new Map([
      ['a', new Map([['es', [f('word', 'in'), f('word', 'of')]]])],
      ['b', new Map([['es', []]])],
    ]);
    expect(leakRatesByLanguage(results, 'corpus').get('es')!.rate.word).toBe(0.5);
  });
});
