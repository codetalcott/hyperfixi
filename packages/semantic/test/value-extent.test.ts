/**
 * The expression parser says where a value ends (pattern-matcher
 * `absorbExpressionTail`).
 *
 * A role capture takes one known shape of value, so a value longer than the
 * shape it recognized stopped short: `put obj's v into #out` parsed as a bare
 * `on click`, `set x to length of arr` kept `length`, and every translation,
 * rendered from the English parse, inherited the loss. After a capture the
 * matcher now takes the longest run the expression parser reads whole, up to
 * the value's boundary.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

/**
 * Spellings that read the same on both engines: the English join spaces a
 * call's parentheses and a unary minus (`String ( n )`, `- n`).
 */
const normalize = (code: string): string =>
  code
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(^|[\s(])- (?=\w)/g, '$1-');

/** Every language that renders `length` in its own word, which the value then reads back wrong. */
const LOCAL_LENGTH = ['bn', 'ms', 'th', 'tl'];

// Each source, with the languages whose round trip still loses it (filed with
// PR 53): a localized `length` word, pl's chained `of`, and a chained
// possessive, whose inner link alone the renderer localizes.
const SOURCES: Array<[string, string[]]> = [
  [`on click put obj's v into #out`, []],
  [`on click put obj's v + 2 into #out`, []],
  [`on click put 2 + obj's v into #out`, []],
  [`on click put length of arr into #out`, LOCAL_LENGTH],
  [`on click put v of w of obj into #out`, ['pl']],
  [`on click put 1 < arr's length into #out`, []],
  [`on click put String(n) + 2 into #out`, []],
  [`on click put -n into #out`, []],
  [`on click set x to obj's v + 2 then put x into #out`, []],
  [`on click set x to length of arr then put x into #out`, LOCAL_LENGTH],
  [
    `on click put #a's textContent's length into #out`,
    LANGUAGES.filter(l => !['bn', 'hi', 'ja', 'ko', 'tl', 'vi', 'zh'].includes(l)),
  ],
  // The `to` of an `equal to` phrase is the operator's, not a marker (PR 94):
  // `put` dropped its whole value there, and `set` (whose marker it is) kept
  // `obj's v` alone.
  [`on click put obj's v is equal to 6 into #out`, []],
  [`on click put v of obj is greater than or equal to 4 into #out`, []],
  [`on click put obj's v is really equal to 6 into #out`, []],
  [`on click set x to obj's v is equal to 6 then put x into #out`, []],
  // The article of a type check is the operator's, not a marker (PR 102): es,
  // it and pt spell `to` `a` and tr a dative, so a value longer than one token
  // stopped there, and `put` dropped its whole value (es `{ } es a Number`).
  [`on click put obj's v is a Number into #out`, []],
  [`on click put v of obj is not a Number into #out`, []],
  [`on click put String(n) is a String into #out`, []],
  [`on click put { } is not a String into #out`, []],
  [`on click set x to length of arr is a Number then put x into #out`, LOCAL_LENGTH],
  // A reference after a possessive is the property (PR 105): English itself
  // parsed `put event's detail into #out` as a bare `on click`. qu and uk read
  // a reference's `'s` apart since PR 109 (`ruway` `'` `s`).
  [`on click put event's detail into #out`, []],
  [`on click put obj's target into #out`, []],
  [`on click set x to obj's body then put x into #out`, []],
  [`on click if event's detail is 1 put "Y" into #out end`, []],
];

describe.each(SOURCES)('%s', (source, broken) => {
  const english = render(parse(source, 'en')!, 'en');

  it('keeps the whole value in English', () => {
    expect(normalize(english)).toBe(normalize(source));
  });

  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(normalize(source));
  });
});

describe("a reference word is a possessive's property (PR 105)", () => {
  it.each(['result', 'target', 'body', 'detail'])("obj's %s", word => {
    const source = `on click put obj's ${word} into #out`;
    expect(render(parse(source, 'en')!, 'en')).toBe(source);
  });
});

describe('a class name is not an expression', () => {
  // The patient of add/remove/toggle/take is a class NAME. Read as a value,
  // `.open in #panel` is a scoped query, and the toggle does nothing and says
  // nothing; kept a name, the unread `in #panel` is reported.
  it.each([
    ['on click toggle .open in #panel', 'toggle'],
    ['on click add .open in #panel', 'add'],
    ['on click remove .open in #panel', 'remove'],
  ])('%s', (source, action) => {
    const node = parse(source, 'en')!;
    const found = JSON.stringify(signature(node));
    expect(found).toContain(`${action}(`);
    expect(found).toContain('patient:selector');
  });
});

describe('a variable named `equal` keeps its marker', () => {
  // The `to` of `equal to` continues a value only after a comparison word.
  it.each(['on click set equal to 5 then put equal into #out', 'on click put equal into #out'])(
    '%s',
    source => {
      expect(render(parse(source, 'en')!, 'en')).toBe(source);
    }
  );
});

describe('a variable named `a` keeps its marker', () => {
  // The article of `is a` continues a value only after a copula and before a
  // type name: es/it/pt `a` is still `set`'s marker after a value.
  it.each(['es', 'it', 'pt', 'tr'])('%s', language => {
    const source = "on click set obj's v to a then put a into #out";
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });
});

describe('a variable spelled like the of-marker, after `of`', () => {
  // A value runs on through an of-marker. After an English `of` the join does
  // not read one as `of`, so without that a variable spelled like the
  // language's of-marker (de `aus`, `von`; fr `de`) ended the value at `of`:
  // `length of` alone is no expression, and the `put` parsed as a bare `on
  // click`. The name still reads back as its role (`length of source`, filed
  // with PR 91), so the command is what this pins.
  it.each([
    ['de', 'aus'],
    ['de', 'von'],
    ['fr', 'de'],
  ])('%s %s', (language, name) => {
    const foreign = render(parse(`on click put length of ${name} into #out`, 'en')!, language);
    expect(signature(parse(foreign, language)), foreign).toBe(
      'on(event:literal) put(destination:selector,patient:expression)'
    );
  });
});

/**
 * Each command, conditional, loop and handler in document order, with its
 * roles' names and value types: `fetch(responseType:expression,source:literal)`.
 */
function signature(node: unknown): string {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== 'object') return;
    const record = n as Record<string, unknown>;
    const kinds = ['command', 'conditional', 'loop', 'event-handler'];
    if (kinds.includes(record.kind as string) && typeof record.action === 'string') {
      const roles =
        record.roles instanceof Map
          ? [...record.roles.entries()]
          : Object.entries((record.roles ?? {}) as Record<string, unknown>);
      const parts = roles.map(([k, v]) => `${k}:${(v as { type?: string } | null)?.type ?? '?'}`);
      out.push(`${record.action}(${parts.sort().join(',')})`);
    }
    for (const [key, value] of Object.entries(record)) if (key !== 'roles') walk(value);
  };
  walk(node);
  return out.join(' ');
}

/**
 * Stored corpus translations whose parse a first cut of this change moved,
 * each a variant or SOV clause split that used to FAIL (so the right one won)
 * and then succeeded by swallowing a word: a marker another variant owns
 * (bn `থেকে`, ru `на`, uk `з`, es fetch `como json`), an operator word as the
 * value's head (bn `আছে`), a `.class` across a space read as a member
 * (`.active .active`, `null .error`), a word the English expression parser
 * cannot read. Each must still re-render to the English it did before.
 */
const PINNED: Array<[string, string, string, string, string]> = [
  [
    'fetch-do-not-throw',
    'es',
    'al clic buscar "/api/users" como JSON do not throw entonces si ello establecer $users a ello fin',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'he',
    'ב click הבא "/api/users" כ JSON do not throw אז אם זה קבע את $users על זה סוף',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'id',
    'ketika klik muat "/api/users" sebagai JSON do not throw lalu jika itu atur $users ke itu selesai',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'it',
    'su click recuperare "/api/users" come JSON do not throw allora se esso impostare in $users esso fine',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'ms',
    'apabila click ambil_dari "/api/users" sebagai JSON do not throw kemudian jika ia tetapkan $users ke ia tamat',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'pl',
    'gdy click pobierz "/api/users" jako JSON do not throw wtedy jeśli to ustaw do $users to koniec',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'pt',
    'ao clique buscar "/api/users" como JSON do not throw então se isso definir $users para ele fim',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'ru',
    'при click загрузить "/api/users" как JSON do not throw затем если это установить в $users это конец',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'sw',
    'unapo click leta "/api/users" kuwa JSON do not throw kisha kama hiyo seti $users kwa hiyo mwisho',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'th',
    'เมื่อ click ดึงข้อมูล "/api/users" เป็น JSON do not throw แล้ว ถ้า มัน ตั้ง $users ใน มัน จบ',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'tl',
    'kapag click kuhanin_mula "/api/users" bilang JSON do not throw pagkatapos kung ito itakda $users sa ito wakas',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'uk',
    'при click завантажити "/api/users" як JSON do not throw потім якщо це встановити в $users це кінець',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-do-not-throw',
    'vi',
    'khi click tải "/api/users" như JSON do not throw rồi nếu nó gán $users vào nó kết thúc',
    'on click fetch "/api/users" as JSON do not throw then if it set $users to it end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) set(destination:reference,patient:reference)',
  ],
  [
    'fetch-error-handling',
    'es',
    'al clic buscar "/api/data" como json entonces si it.error poner su.error en #error sino poner su.data en #result fin',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'he',
    'ב click הבא "/api/data" כ json אז אם it.error שים את שלו.error ב #error אחרת שים את שלו.data ב #result סוף',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'id',
    'ketika klik muat "/api/data" sebagai json lalu jika it.error taruh nya.error ke dalam #error selainnya taruh nya.data ke dalam #result selesai',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'it',
    'su click recuperare "/api/data" come json allora se it.error mettere suo.error in #error altrimenti mettere suo.data in #result fine',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'ms',
    'apabila click ambil_dari "/api/data" sebagai json kemudian jika it.error letak it.error ke #error kalau_tidak letak it.data ke #result tamat',
    'on click fetch "/api/data" as json then if it.error put its.error into #error else put its.data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'pl',
    'gdy click pobierz "/api/data" jako json wtedy jeśli it.error umieść jego.error do #error inaczej umieść jego.data do #result koniec',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'pt',
    'ao clique buscar "/api/data" como json então se it.error colocar seu.error em #error senão colocar seu.data em #result fim',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'ru',
    'при click загрузить "/api/data" как json затем если it.error положить его.error в #error иначе положить его.data в #result конец',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'sw',
    'unapo click leta "/api/data" kuwa json kisha kama it.error weka yake.error kwa #error vinginevyo weka yake.data kwa #result mwisho',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'th',
    'เมื่อ click ดึงข้อมูล "/api/data" เป็น json แล้ว ถ้า it.error ใส่ it.error ใน #error ไม่งั้น ใส่ it.data ใน #result จบ',
    'on click fetch "/api/data" as json then if it.error put its.error into #error else put its.data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'tl',
    'kapag click kuhanin_mula "/api/data" bilang json pagkatapos kung it.error ilagay it.error sa #error kung_hindi ilagay it.data sa #result wakas',
    'on click fetch "/api/data" as json then if it.error put its.error into #error else put its.data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'uk',
    'при click завантажити "/api/data" як json потім якщо it.error покласти його.error в #error інакше покласти його.data в #result кінець',
    'on click fetch "/api/data" as json then if it.error put its error into #error else put its data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-error-handling',
    'vi',
    'khi click tải "/api/data" như json rồi nếu it.error đặt it.error vào #error không thì đặt it.data vào #result kết thúc',
    'on click fetch "/api/data" as json then if it.error put its.error into #error else put its.data into #result end',
    'on(event:literal) fetch(responseType:expression,source:literal) if(condition:expression) put(destination:selector,patient:property-path) put(destination:selector,patient:property-path)',
  ],
  [
    'fetch-json',
    'es',
    'al clic buscar "/api/user" como json entonces establecer #name.innerText a su.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'he',
    'ב click הבא "/api/user" כ json אז קבע את #name.innerText על שלו.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'id',
    'ketika klik muat "/api/user" sebagai json lalu atur #name.innerText ke nya.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'it',
    'su click recuperare "/api/user" come json allora impostare in #name.innerText suo.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'ms',
    'apabila click ambil_dari "/api/user" sebagai json kemudian tetapkan #name.innerText ke it.name',
    'on click fetch "/api/user" as json then set #name.innerText to its.name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'pl',
    'gdy click pobierz "/api/user" jako json wtedy ustaw do #name.innerText jego.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'pt',
    'ao clique buscar "/api/user" como json então definir #name.innerText para seu.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'ru',
    'при click загрузить "/api/user" как json затем установить в #name.innerText его.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'sw',
    'unapo click leta "/api/user" kuwa json kisha seti #name.innerText kwa yake.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'th',
    'เมื่อ click ดึงข้อมูล "/api/user" เป็น json แล้ว ตั้ง #name.innerText ใน it.name',
    'on click fetch "/api/user" as json then set #name.innerText to its.name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'tl',
    'kapag click kuhanin_mula "/api/user" bilang json pagkatapos itakda #name.innerText sa it.name',
    'on click fetch "/api/user" as json then set #name.innerText to its.name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'uk',
    'при click завантажити "/api/user" як json потім встановити в #name.innerText його.name',
    'on click fetch "/api/user" as json then set #name.innerText to its name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'fetch-json',
    'vi',
    'khi click tải "/api/user" như json rồi gán #name.innerText vào it.name',
    'on click fetch "/api/user" as json then set #name.innerText to its.name',
    'on(event:literal) fetch(responseType:expression,source:literal) set(destination:property-path,patient:property-path)',
  ],
  [
    'get-value',
    'bn',
    'ক্লিক তে #input.value থেকে পান তারপর এটি কে লগ',
    'on click get #input.value then log it',
    'on(event:literal) get(source:property-path) log(patient:reference)',
  ],
  [
    'if-condition',
    'bn',
    'ক্লিক তে যদি I match .active .active কে সরান নতুবা .active কে যোগ করুন শেষ',
    'on click if I match .active remove .active else add .active end',
    'on(event:literal) if(condition:expression) remove(patient:selector,source:reference) add(destination:reference,patient:selector)',
  ],
  [
    'if-condition',
    'hi',
    'click पर अगर I match .active .active को हटाएं वरना .active को जोड़ें समाप्त',
    'on click if I match .active remove .active else add .active end',
    'on(event:literal) if(condition:expression) remove(patient:selector,source:reference) add(destination:reference,patient:selector)',
  ],
  [
    'if-condition',
    'ja',
    'クリック を で もし I match .active .active を 削除 そうでなければ .active を 追加 終わり',
    'on click if I match .active remove .active else add .active end',
    'on(event:literal) if(condition:expression) remove(patient:selector,source:reference) add(destination:reference,patient:selector)',
  ],
  [
    'if-condition',
    'ko',
    '클릭 할 때 만약 I match .active .active 을 제거 아니면 .active 을 추가 끝',
    'on click if I match .active remove .active else add .active end',
    'on(event:literal) if(condition:expression) remove(patient:selector,source:reference) add(destination:reference,patient:selector)',
  ],
  [
    'if-condition',
    'qu',
    'maykama click sichus I match .active .active ta qichuy manachus .active ta yapay tukukuy',
    'on click if I match .active remove .active else add .active end',
    'on(event:literal) if(condition:expression) remove(patient:selector,source:reference) add(destination:reference,patient:selector)',
  ],
  [
    'if-condition',
    'tr',
    'tıklama i üzerinde eğer I match .active .active i kaldır yoksa .active i ekle son',
    'on click if I match .active remove .active else add .active end',
    'on(event:literal) if(condition:expression) remove(patient:selector,source:reference) add(destination:reference,patient:selector)',
  ],
  [
    'if-empty',
    'qu',
    'maykama paqariy sichus noqaq chanin kanqa chusaq .error ta noqa man yapay chaymantataq "Required" ta qhipantin .error-message man churay tukukuy',
    'on blur if my value is empty add .error to me then put "Required" into next .error-message end',
    'on(event:literal) if(condition:expression) add(destination:reference,patient:selector) put(destination:expression,patient:literal)',
  ],
  [
    'if-exists',
    'bn',
    'ক্লিক তে যদি #modal আছে #modal কে দেখান নতুবা <div#modal/> কে তৈরি করুন তারপর এটি কে বডি এ রাখুন শেষ',
    'on click if #modal exists show #modal else make <div#modal/> then put it into body end',
    'on(event:literal) if(condition:expression) show(patient:selector) make(patient:selector) put(destination:reference,patient:reference)',
  ],
  [
    'increment-by-amount',
    'ru',
    'при click увеличить #score на 10',
    'on click increment #score by 10',
    'on(event:literal) increment(patient:selector,quantity:literal)',
  ],
  [
    'increment-by-amount',
    'uk',
    'при click збільшити #score на 10',
    'on click increment #score by 10',
    'on(event:literal) increment(patient:selector,quantity:literal)',
  ],
  [
    'input-validation',
    'qu',
    'maykama paqariy sichus noqaq chanin kanqa chusaq .error ta noqa man yapay manachus .error ta noqa manta qichuy tukukuy',
    'on blur if my value is empty add .error to me else remove .error from me end',
    'on(event:literal) if(condition:expression) add(destination:reference,patient:selector) remove(patient:selector,source:reference)',
  ],
  [
    'modal-close-backdrop',
    'bn',
    'ক্লিক তে যদি লক্ষ্য matches .modal-backdrop .modal-backdrop কে লুকান শেষ',
    'on click if target matches .modal-backdrop hide .modal-backdrop end',
    'on(event:literal) if(condition:expression) hide(patient:selector)',
  ],
  [
    'modal-close-backdrop',
    'hi',
    'click पर अगर लक्ष्य मेल खाता .modal-backdrop .modal-backdrop को छिपाएं समाप्त',
    'on click if target matches .modal-backdrop hide .modal-backdrop end',
    'on(event:literal) if(condition:expression) hide(patient:selector)',
  ],
  [
    'modal-close-backdrop',
    'ja',
    'クリック を で もし 対象 一致する .modal-backdrop .modal-backdrop を 隠す 終わり',
    'on click if target matches .modal-backdrop hide .modal-backdrop end',
    'on(event:literal) if(condition:expression) hide(patient:selector)',
  ],
  [
    'modal-close-backdrop',
    'ko',
    '클릭 할 때 만약 대상 일치 .modal-backdrop .modal-backdrop 을 숨기다 끝',
    'on click if target matches .modal-backdrop hide .modal-backdrop end',
    'on(event:literal) if(condition:expression) hide(patient:selector)',
  ],
  [
    'modal-close-backdrop',
    'qu',
    'maykama click sichus punta tupan .modal-backdrop .modal-backdrop ta pakay tukukuy',
    'on click if target matches .modal-backdrop hide .modal-backdrop end',
    'on(event:literal) if(condition:expression) hide(patient:selector)',
  ],
  [
    'modal-close-backdrop',
    'tr',
    'tıklama i üzerinde eğer hedef eşleşir .modal-backdrop .modal-backdrop i gizle son',
    'on click if target matches .modal-backdrop hide .modal-backdrop end',
    'on(event:literal) if(condition:expression) hide(patient:selector)',
  ],
  [
    'repeat-for-each',
    'hi',
    'click पर repeat item में .items .processed को item में जोड़ें समाप्त',
    'on click repeat for item in .items add .processed to item end',
    'on(event:literal) repeat(loopType:literal,patient:expression,source:selector) add(destination:expression,patient:selector)',
  ],
  [
    'repeat-for-each',
    'qu',
    'maykama click repeat item ukupi .items .processed ta item man yapay tukukuy',
    'on click repeat for item in .items add .processed to item end',
    'on(event:literal) repeat(loopType:literal,patient:expression,source:selector) add(destination:expression,patient:selector)',
  ],
  [
    'repeat-for-each',
    'zh',
    '一 点击 就 repeat item 在 .items 给 item 添加 .processed 结束',
    'on click repeat for item in .items add .processed to item end',
    'on(event:literal) repeat(loopType:literal,patient:expression,source:selector) add(destination:expression,patient:selector)',
  ],
  [
    'stagger-animation',
    'hi',
    'load पर repeat item में .item with index .visible को item में जोड़ें फिर 100ms प्रतीक्षा समाप्त',
    'on load repeat for item in .item with index add .visible to item then wait 100ms end',
    'on(event:literal) repeat(loopType:literal,patient:expression,source:selector) add(destination:expression,patient:selector) wait(duration:literal)',
  ],
  [
    'stagger-animation',
    'qu',
    'maykama load repeat item ukupi .item with index .visible ta item man yapay chaymantataq 100ms suyay tukukuy',
    'on load repeat for item in .item with index add .visible to item then wait 100ms end',
    'on(event:literal) repeat(loopType:literal,patient:expression,source:selector) add(destination:expression,patient:selector) wait(duration:literal)',
  ],
  [
    'stagger-animation',
    'zh',
    '一 加载 就 repeat item 在 .item with index 给 item 添加 .visible 然后 等待 把 100ms 结束',
    'on load repeat for item in .item with index add .visible to item then wait 100ms end',
    'on(event:literal) repeat(loopType:literal,patient:expression,source:selector) add(destination:expression,patient:selector) wait(duration:literal)',
  ],
  [
    'swap-content',
    'ru',
    'при click поменять #a с #b',
    'on click swap #a with #b',
    'on(event:literal) swap(destination:selector,patient:selector)',
  ],
  [
    'swap-content',
    'uk',
    'при click поміняти #a з #b',
    'on click swap #a with #b',
    'on(event:literal) swap(destination:selector,patient:selector)',
  ],
  [
    'swap-view-transition',
    'ru',
    'при click поменять #a с #b using view transition',
    'on click swap #a with #b using view transition',
    'on(event:literal) swap(destination:selector,manner:literal,patient:selector)',
  ],
  [
    'swap-view-transition',
    'uk',
    'при click поміняти #a з #b using view transition',
    'on click swap #a with #b using view transition',
    'on(event:literal) swap(destination:selector,manner:literal,patient:selector)',
  ],
  [
    'tell-other-element',
    'bn',
    'ক্লিক তে #panel তে বলুন .open কে যোগ করুন তারপর 200ms অপেক্ষা তারপর .visible কে যোগ করুন শেষ',
    'on click tell #panel add .open then wait 200ms then add .visible end',
    'on(event:literal) tell(destination:selector) add(destination:reference,patient:selector) wait(duration:literal) add(destination:reference,patient:selector)',
  ],
  [
    'tell-other-element',
    'hi',
    'click पर #panel में बताएं .open को जोड़ें फिर 200ms प्रतीक्षा फिर .visible को जोड़ें समाप्त',
    'on click tell #panel add .open then wait 200ms then add .visible end',
    'on(event:literal) tell(destination:selector) add(destination:reference,patient:selector) wait(duration:literal) add(destination:reference,patient:selector)',
  ],
  [
    'tell-other-element',
    'ko',
    '클릭 할 때 #panel 에 말하다 .open 을 추가 그다음 200ms 대기 그다음 .visible 을 추가 끝',
    'on click tell #panel add .open then wait 200ms then add .visible end',
    'on(event:literal) tell(destination:selector) add(destination:reference,patient:selector) wait(duration:literal) add(destination:reference,patient:selector)',
  ],
  [
    'window-scroll',
    'hi',
    'विंडो से scroll पर अगर window.scrollY > 100 .sticky को #header में जोड़ें वरना .sticky को #header से हटाएं समाप्त',
    'on scroll from window if window.scrollY > 100 add .sticky to #header else remove .sticky from #header end',
    'on(event:literal) if(condition:expression) add(destination:selector,patient:selector) remove(patient:selector,source:selector)',
  ],
  [
    'window-scroll',
    'qu',
    'k_iri manta maykama kunray sichus window.scrollY > 100 .sticky ta #header man yapay manachus .sticky ta #header manta qichuy tukukuy',
    'on scroll from window if window.scrollY > 100 add .sticky to #header else remove .sticky from #header end',
    'on(event:literal) if(condition:expression) add(destination:selector,patient:selector) remove(patient:selector,source:selector)',
  ],
];

describe('stored translations keep their reading', () => {
  it.each(PINNED)('%s %s', (_id, language, source, english, roles) => {
    const node = parse(source, language)!;
    expect(render(node, 'en')).toBe(english);
    // The English render alone cannot see a role move INTO a value: `fetch
    // "/api/user" as json` renders the same whether `as json` is its
    // responseType or part of its source.
    expect(signature(node)).toBe(roles);
  });
});
