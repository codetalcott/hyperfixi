/**
 * Arc E — `fetch … with { … }` captured in all 24 languages (release-bar
 * stretch item 5, docs-internal/HANDOFF_arc-e-fetch-with.md). The en braced
 * form is pinned by fetch-with-options.test.ts; this file locks the NAKED
 * named-arg form (`with method:"POST" body:form`) across the 24 corpus
 * renders of the four fetch-options rows.
 *
 * Red side (probe log 2026-07-13, pre-change): the naked form dropped in
 * EVERY language including en — the style slot took the first key and the
 * rest of the run fired `unconsumed-input` (Arc C fetch-options family,
 * 78 firings). The SOV six captured a space-joined corrupt raw (qu shattered
 * `FormData` → `FormDa ta`); ar/es/de/… dropped the whole prepositional run;
 * pl/ru/uk stranded after the head key (`z method` → style="method").
 *
 * Green side, locked here: the four corpus rows capture the SAME
 * object-literal-shaped style raw in every language (offset-exact healing:
 * qu `FormData`, hi `के_रूप_में`, zh `作为` re-fuse), the headers row also
 * captures responseType, and every row leaves ZERO unconsumed input.
 * Mechanisms under test: the pattern-matcher naked-args fold (en), the
 * prepositional/postpositional/continuation branches of
 * tryAttachTrailingStyle, and the post-style responseType attach.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function walk(node: SemanticNode, visit: (n: SemanticNode) => void): void {
  visit(node);
  const rec = node as unknown as Record<string, unknown>;
  for (const key of ['body', 'thenBranch', 'elseBranch', 'commands', 'statements']) {
    const kids = rec[key];
    if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode, visit));
  }
}

function findFetch(node: SemanticNode | null): CommandSemanticNode | null {
  if (!node) return null;
  let found: CommandSemanticNode | null = null;
  walk(node, n => {
    if (!found && (n as CommandSemanticNode).action === 'fetch') {
      found = n as CommandSemanticNode;
    }
  });
  return found;
}

function unconsumedFirings(node: SemanticNode | null): string[] {
  if (!node) return [];
  const msgs: string[] = [];
  walk(node, n => {
    for (const d of n.diagnostics ?? []) {
      if (d.code === 'unconsumed-input') msgs.push(d.message);
    }
  });
  return msgs;
}

function styleRaw(node: SemanticNode | null): string | undefined {
  const fetch = findFetch(node);
  const style = fetch?.roles.get('style') as { raw?: string } | undefined;
  return style?.raw;
}

function responseTypeRaw(node: SemanticNode | null): string | undefined {
  const fetch = findFetch(node);
  const rt = fetch?.roles.get('responseType') as { raw?: string } | undefined;
  return rt?.raw;
}

/**
 * The 24 corpus renders per row (patterns.db pattern_translations,
 * 2026-07-13 populate — the render surfaces are the marker ground truth).
 */
const WITH_METHOD: Record<string, string> = {
  ar: 'احضر /api/form عند إرسال بـmethod:"POST" body:form',
  bn: '/api/form কে জমা এ আনুন method:"POST" body:form দিয়ে',
  de: 'bei absenden abrufen /api/form mit method:"POST" body:form',
  en: 'on submit fetch /api/form with method:"POST" body:form',
  es: 'en envío buscar /api/form con method:"POST" body:form',
  fr: 'sur soumettre récupérer /api/form avec method:"POST" body:form',
  he: 'ב שליחה הבא את /api/form עם method:"POST" body:form',
  hi: '/api/form को जमा पर लाएं method:"POST" body:form से',
  id: 'pada kirim muat /api/form dengan method:"POST" body:form',
  it: 'su invio recuperare /api/form con method:"POST" body:form',
  ja: '/api/form を 送信 で フェッチ method:"POST" body:form で',
  ko: '/api/form 를 제출 할 때 가져오기 method:"POST" body:form 로',
  ms: 'apabila submit ambil_dari /api/form dengan method:"POST" body:form',
  pl: 'gdy wysłaniu pobierz /api/form z method:"POST" body:form',
  pt: 'em envio buscar /api/form com method:"POST" body:form',
  qu: '/api/form ta apaykachay pi apamuy method:"POST" body:form wan',
  ru: 'при отправка загрузить /api/form с method:"POST" body:form',
  sw: 'kwenye wasilisha leta /api/form na method:"POST" body:form',
  th: 'เมื่อ ส่ง ดึงข้อมูล /api/form ด้วย method:"POST" body:form',
  tl: 'kuhanin_mula /api/form kapag submit nang method:"POST" body:form',
  tr: '/api/form i gönderme de getir method:"POST" body:form ile',
  uk: 'при надсилання завантажити /api/form з method:"POST" body:form',
  vi: 'khi nộp tải /api/form với method:"POST" body:form',
  zh: '当 提交 时 抓取 把 /api/form 用 method:"POST" body:form',
};

const WITH_HEADERS: Record<string, string> = {
  ar: 'احضر /api/me عند نقر بـheaders:{Authorization:`Bearer ${$token}`} كـJSON ثم ضع له.name إلى أنا',
  bn: '/api/me কে ক্লিক এ আনুন headers:{Authorization:`Bearer ${$token}`} দিয়ে JSON তারপর এর.name কে আমি তে রাখুন',
  de: 'bei klick abrufen /api/me mit headers:{Authorization:`Bearer ${$token}`} als JSON dann setzen sein.name zu ich',
  en: 'on click fetch /api/me with headers:{Authorization:`Bearer ${$token}`} as JSON then put it.name into me',
  es: 'en clic buscar /api/me con headers:{Authorization:`Bearer ${$token}`} como JSON entonces poner su.name a yo',
  fr: 'sur clic récupérer /api/me avec headers:{Authorization:`Bearer ${$token}`} comme JSON alors mettre son.name à moi',
  he: 'ב לחיצה הבא את /api/me עם headers:{Authorization:`Bearer ${$token}`} כ JSON אז שים את שלו.name על אני',
  hi: '/api/me को क्लिक पर लाएं headers:{Authorization:`Bearer ${$token}`} से JSON के रूप में फिर इसका.name को मैं में रखें',
  id: 'pada klik muat /api/me dengan headers:{Authorization:`Bearer ${$token}`} sebagai JSON lalu taruh miliknya.name ke saya',
  it: 'su clic recuperare /api/me con headers:{Authorization:`Bearer ${$token}`} come JSON allora mettere suo.name in io',
  ja: '/api/me を クリック で フェッチ headers:{Authorization:`Bearer ${$token}`} で JSON それから その.name を 私 に 置く',
  ko: '/api/me 를 클릭 할 때 가져오기 headers:{Authorization:`Bearer ${$token}`} 로 JSON 로 그러면 그것의.name 를 나 에 넣다',
  ms: 'apabila click ambil_dari /api/me dengan headers:{Authorization:`Bearer ${$token}`} sebagai JSON kemudian letak nya.name ke saya',
  pl: 'gdy kliknięcie pobierz /api/me z headers:{Authorization:`Bearer ${$token}`} jako JSON wtedy umieść jego.name do ja',
  pt: 'em clique buscar /api/me com headers:{Authorization:`Bearer ${$token}`} como JSON então colocar seu.name para eu',
  qu: '/api/me ta ñitiy pi apamuy headers:{Authorization:`Bearer ${$token}`} wan JSON hina chayqa chaypaq.name ta noqa man churay',
  ru: 'при клик загрузить /api/me с headers:{Authorization:`Bearer ${$token}`} как JSON затем положить его.name в я',
  sw: 'kwenye bonyeza leta /api/me na headers:{Authorization:`Bearer ${$token}`} kuwa JSON kisha weka yake.name kwa mimi',
  th: 'เมื่อ คลิก ดึงข้อมูล /api/me ด้วย headers:{Authorization:`Bearer ${$token}`} เป็น JSON แล้ว ใส่ ของมัน.name ใน ฉัน',
  tl: 'kuhanin_mula /api/me kapag click nang headers:{Authorization:`Bearer ${$token}`} bilang JSON pagkatapos ilagay nito.name sa ako',
  tr: '/api/me i tıklama de getir headers:{Authorization:`Bearer ${$token}`} ile JSON olarak ardından onun.name i ben e koy',
  uk: 'при клік завантажити /api/me з headers:{Authorization:`Bearer ${$token}`} як JSON тоді покласти його.name в я',
  vi: 'khi nhấp tải /api/me với headers:{Authorization:`Bearer ${$token}`} như JSON rồi đặt it.name vào tôi',
  zh: '当 点击 时 抓取 把 /api/me 用 headers:{Authorization:`Bearer ${$token}`} 的 JSON 那么 把 它的.name 放置 到 我',
};

const WITH_METHOD_BODY: Record<string, string> = {
  ar: 'احضر /api/users عند نقر بـmethod:"POST", body:"name=Joe"',
  bn: '/api/users কে ক্লিক এ আনুন method:"POST", body:"name=Joe" দিয়ে',
  de: 'bei klick abrufen /api/users mit method:"POST", body:"name=Joe"',
  en: 'on click fetch /api/users with method:"POST", body:"name=Joe"',
  es: 'en clic buscar /api/users con method:"POST", body:"name=Joe"',
  fr: 'sur clic récupérer /api/users avec method:"POST", body:"name=Joe"',
  he: 'ב לחיצה הבא את /api/users עם method:"POST", body:"name=Joe"',
  hi: '/api/users को क्लिक पर लाएं method:"POST", body:"name=Joe" से',
  id: 'pada klik muat /api/users dengan method:"POST", body:"name=Joe"',
  it: 'su clic recuperare /api/users con method:"POST", body:"name=Joe"',
  ja: '/api/users を クリック で フェッチ method:"POST", body:"name=Joe" で',
  ko: '/api/users 를 클릭 할 때 가져오기 method:"POST", body:"name=Joe" 로',
  ms: 'apabila click ambil_dari /api/users dengan method:"POST", body:"name=Joe"',
  pl: 'gdy kliknięcie pobierz /api/users z method:"POST", body:"name=Joe"',
  pt: 'em clique buscar /api/users com method:"POST", body:"name=Joe"',
  qu: '/api/users ta ñitiy pi apamuy method:"POST", body:"name=Joe" wan',
  ru: 'при клик загрузить /api/users с method:"POST", body:"name=Joe"',
  sw: 'kwenye bonyeza leta /api/users na method:"POST", body:"name=Joe"',
  th: 'เมื่อ คลิก ดึงข้อมูล /api/users ด้วย method:"POST", body:"name=Joe"',
  tl: 'kuhanin_mula /api/users kapag click nang method:"POST", body:"name=Joe"',
  tr: '/api/users i tıklama de getir method:"POST", body:"name=Joe" ile',
  uk: 'при клік завантажити /api/users з method:"POST", body:"name=Joe"',
  vi: 'khi nhấp tải /api/users với method:"POST", body:"name=Joe"',
  zh: '当 点击 时 抓取 把 /api/users 用 method:"POST", body:"name=Joe"',
};

const FORMDATA: Record<string, string> = {
  ar: 'احضر /api/submit عند إرسال بـmethod:"POST", body:(closest <form/> كـ FormData)',
  bn: '/api/submit কে জমা এ আনুন method:"POST", body:(closest <form/> হিসাবে FormData) দিয়ে',
  de: 'bei absenden abrufen /api/submit mit method:"POST", body:(closest <form/> als FormData)',
  en: 'on submit fetch /api/submit with method:"POST", body:(closest <form/> as FormData)',
  es: 'en envío buscar /api/submit con method:"POST", body:(closest <form/> como FormData)',
  fr: 'sur soumettre récupérer /api/submit avec method:"POST", body:(closest <form/> comme FormData)',
  he: 'ב שליחה הבא את /api/submit עם method:"POST", body:(closest <form/> as FormData)',
  hi: '/api/submit को जमा पर लाएं method:"POST", body:(closest <form/> के_रूप_में FormData) से',
  id: 'pada kirim muat /api/submit dengan method:"POST", body:(closest <form/> sebagai FormData)',
  it: 'su invio recuperare /api/submit con method:"POST", body:(closest <form/> come FormData)',
  ja: '/api/submit を 送信 で フェッチ method:"POST", body:(closest <form/> として FormData) で',
  ko: '/api/submit 를 제출 할 때 가져오기 method:"POST", body:(closest <form/> 로 FormData) 로',
  ms: 'apabila submit ambil_dari /api/submit dengan method:"POST", body:(closest <form/> sebagai FormData)',
  pl: 'gdy wysłaniu pobierz /api/submit z method:"POST", body:(closest <form/> jako FormData)',
  pt: 'em envio buscar /api/submit com method:"POST", body:(closest <form/> como FormData)',
  qu: '/api/submit ta apaykachay pi apamuy method:"POST", body:(closest <form/> hina FormData) wan',
  ru: 'при отправка загрузить /api/submit с method:"POST", body:(closest <form/> как FormData)',
  sw: 'kwenye wasilisha leta /api/submit na method:"POST", body:(closest <form/> kuwa FormData)',
  th: 'เมื่อ ส่ง ดึงข้อมูล /api/submit ด้วย method:"POST", body:(closest <form/> เป็น FormData)',
  tl: 'kuhanin_mula /api/submit kapag submit nang method:"POST", body:(closest <form/> bilang FormData)',
  tr: '/api/submit i gönderme de getir method:"POST", body:(closest <form/> olarak FormData) ile',
  uk: 'при надсилання завантажити /api/submit з method:"POST", body:(closest <form/> як FormData)',
  vi: 'khi nộp tải /api/submit với method:"POST", body:(closest <form/> như FormData)',
  zh: '当 提交 时 抓取 把 /api/submit 用 method:"POST", body:(closest <form/> 作为 FormData)',
};

const LANGS = Object.keys(WITH_METHOD);

describe('fetch with-options ×24 (Arc E)', () => {
  describe('en red-side contract (braced worked, naked dropped)', () => {
    it('naked named-arg form folds to an object-literal raw (was: style="method" + drop)', () => {
      const node = parse(WITH_METHOD.en, 'en');
      expect(styleRaw(node)).toBe('{method:"POST", body:form}');
      expect(unconsumedFirings(node)).toHaveLength(0);
    });

    it('standalone (non-event) naked form parses via the pattern path', () => {
      const node = parse('fetch /api/form with method:"POST" body:form', 'en');
      expect(styleRaw(node)).toBe('{method:"POST", body:form}');
    });
  });

  describe('fetch-with-method — space-separated pairs, ×24 byte-identical', () => {
    for (const lang of LANGS) {
      it(`${lang} captures {method, body} with zero unconsumed input`, () => {
        const node = parse(WITH_METHOD[lang], lang);
        expect(styleRaw(node)).toBe('{method:"POST", body:form}');
        expect(unconsumedFirings(node)).toHaveLength(0);
      });
    }
  });

  describe('fetch-with-method-body — comma-separated pairs, ×24 byte-identical', () => {
    for (const lang of LANGS) {
      it(`${lang} captures {method, body} with zero unconsumed input`, () => {
        const node = parse(WITH_METHOD_BODY[lang], lang);
        expect(styleRaw(node)).toBe('{method:"POST", body:"name=Joe"}');
        expect(unconsumedFirings(node)).toHaveLength(0);
      });
    }
  });

  describe('fetch-with-headers — braced value + as-phrase, ×24', () => {
    for (const lang of LANGS) {
      it(`${lang} captures headers AND responseType with zero unconsumed input`, () => {
        const node = parse(WITH_HEADERS[lang], lang);
        expect(styleRaw(node)).toBe('{headers:{Authorization:`Bearer ${$token}`}}');
        expect(responseTypeRaw(node)?.toLowerCase()).toBe('json');
        expect(unconsumedFirings(node)).toHaveLength(0);
      });
    }
  });

  describe('fetch-formdata — parenthesized expression value, ×24', () => {
    for (const lang of LANGS) {
      it(`${lang} captures the paren body losslessly with zero unconsumed input`, () => {
        const node = parse(FORMDATA[lang], lang);
        const raw = styleRaw(node);
        // The paren value keeps the language's own as-word (a legitimate
        // translation, not an R3-invariant value) — pin the shape instead:
        // both pairs present, the paren run whole, no shattered fragments
        // (qu FormDa+ta / hi के_रूप_में / zh 作+为 re-fused by offset gaps).
        expect(raw).toMatch(/^\{method:"POST", body:\(closest <form\/> \S+ FormData\)\}$/u);
        expect(unconsumedFirings(node)).toHaveLength(0);
      });
    }
  });

  describe('guard rails (must not move)', () => {
    it('ko bare as-phrase without options keeps its existing capture (no phantom style)', () => {
      const node = parse('/api/search 를 클릭 할 때 가져오기 json 로', 'ko');
      const fetch = findFetch(node);
      expect(fetch).toBeTruthy();
      expect(fetch!.roles.has('style')).toBe(false);
      expect((fetch!.roles.get('responseType') as { raw?: string })?.raw).toBe('json');
    });

    it('plain fetch rows stay untouched (en/ja)', () => {
      const en = parse('on click fetch /api/data then put it into #result', 'en');
      const ja = parse('/api/data を クリック で フェッチ', 'ja');
      expect(findFetch(en)!.roles.has('style')).toBe(false);
      expect(findFetch(ja)!.roles.has('style')).toBe(false);
      expect(unconsumedFirings(en)).toHaveLength(0);
      expect(unconsumedFirings(ja)).toHaveLength(0);
    });
  });
});
