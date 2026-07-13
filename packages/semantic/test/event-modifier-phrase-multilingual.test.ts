/**
 * Arc F lock — event-modifier phrases captured in all 24 languages.
 *
 * Red contract (probe matrix archived in the arc transcript, fresh populate
 * 2026-07-13): the `once` / `debounced at Nms` / `throttled at Nms` handler
 * phrases parsed with eventModifiers=null in every mid-clause position — 69
 * corpus rows fired unconsumed-input (window-resize ×23, event-debounce ×16,
 * event-throttle ×16, event-once ×14), en INCLUDED, and it/th lost `once`
 * silently with no firing at all. The en reference also swallowed
 * `from window` with no trace (pattern event-en-source captured the source
 * role and dropped it on the floor).
 *
 * Green contract locked here, for every one of the 4 × 24 renders below
 * (verbatim from patterns.db pattern_translations, the marker ground truth):
 *  - eventModifiers carries the exact modifier the source declares;
 *  - the event canonicalizes to the en literal (documented exceptions below);
 *  - window-resize carries eventModifiers.from (the reclaimed from-tail);
 *  - zero unconsumed-input diagnostics anywhere in the tree.
 *
 * Documented residuals (pre-existing, meter-blind, NOT regressions):
 *  - th/zh window-resize: the event word never reaches the event slot
 *    (th shatters ปรับขนาด, zh strands 调整大小) — event stays null while the
 *    row parses clean; fixing it is event-slot work outside this arc.
 *  - qu window-resize: the fused pattern silently swallows `k_iri manta`
 *    (from-tail) — no diagnostic, so the reclaim has nothing to anchor on.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import type { EventHandlerSemanticNode, SemanticNode } from '../src/types';

const WALK_KEYS = ['body', 'thenBranch', 'elseBranch', 'commands', 'statements'] as const;

function walk(node: unknown, visit: (n: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return;
  const rec = node as Record<string, unknown>;
  visit(rec);
  for (const key of WALK_KEYS) {
    const child = rec[key];
    if (Array.isArray(child)) child.forEach(c => walk(c, visit));
    else if (child && typeof child === 'object') walk(child, visit);
  }
}

function unconsumedFirings(node: SemanticNode): string[] {
  const out: string[] = [];
  walk(node, n => {
    const diags = n.diagnostics as Array<{ code?: string; message: string }> | undefined;
    for (const d of diags ?? []) if (d.code === 'unconsumed-input') out.push(d.message);
  });
  return out;
}

function findHandler(node: SemanticNode): EventHandlerSemanticNode | null {
  let handler: EventHandlerSemanticNode | null = null;
  walk(node, n => {
    if (!handler && n.kind === 'event-handler') handler = n as unknown as EventHandlerSemanticNode;
  });
  return handler;
}

interface PatternSpec {
  readonly expectMods: { once?: boolean; debounce?: number; throttle?: number };
  readonly expectEvent: string;
  /** Languages whose event stays null (pre-existing event-slot gaps). */
  readonly eventNullResiduals?: readonly string[];
  /** Languages that must carry eventModifiers.from. */
  readonly expectFrom?: boolean;
  /** Languages exempt from the from expectation (silent swallow, no anchor). */
  readonly fromResiduals?: readonly string[];
  readonly renders: Record<string, string>;
}

const PATTERNS: Record<string, PatternSpec> = {
  'event-debounce': {
    expectMods: { debounce: 300 },
    expectEvent: 'input',
    renders: {
      ar: 'debounced عند 300ms احضر /api/search?q=${my value} عند إدخال كـjson ثم ضع هو إلى #results',
      bn: 'debounced at 300ms /api/search?q=${my value} কে ইনপুট এ আনুন json তারপর এটি কে #results তে রাখুন',
      de: 'bei eingabe debounced bei 300ms abrufen /api/search?q=${my value} als json dann setzen es zu #results',
      en: 'on input debounced at 300ms fetch /api/search?q=${my value} as json then put it into #results',
      es: 'en entrada debounced en 300ms buscar /api/search?q=${my value} como json entonces poner ello a #results',
      fr: 'sur saisie debounced à 300ms récupérer /api/search?q=${my value} comme json alors mettre ça à #results',
      he: 'ב קלט debounced את at 300ms הבא /api/search?q=${my value} כ json אז שים את זה על #results',
      hi: 'debounced at 300ms /api/search?q=${my value} को इनपुट पर लाएं json के रूप में फिर यह को #results में रखें',
      id: 'pada masukan debounced di 300ms muat /api/search?q=${my value} sebagai json lalu taruh itu ke #results',
      it: 'su input debounced a 300ms recuperare /api/search?q=${my value} come json allora mettere esso in #results',
      ja: 'debounced at 300ms /api/search?q=${my value} を 入力 で フェッチ json それから それ を #results に 置く',
      ko: 'debounced at 300ms /api/search?q=${my value} 를 입력 할 때 가져오기 json 로 그러면 그것 를 #results 에 넣다',
      ms: 'apabila input debounced di 300ms ambil_dari /api/search?q=${my value} sebagai json kemudian letak ia ke #results',
      pl: 'gdy wejście debounced przy 300ms pobierz /api/search?q=${my value} jako json wtedy umieść to do #results',
      pt: 'em entrada debounced em 300ms buscar /api/search?q=${my value} como json então colocar isso para #results',
      qu: 'debounced at 300ms /api/search?q=${my value} ta yaykuchiy pi apamuy json hina chayqa chay ta #results man churay',
      ru: 'при ввод debounced у 300ms загрузить /api/search?q=${my value} как json затем положить это в #results',
      sw: 'kwenye ingizo debounced katika 300ms leta /api/search?q=${my value} kuwa json kisha weka hiyo kwa #results',
      th: 'เมื่อ อินพุต debounced ที่ 300ms ดึงข้อมูล /api/search?q=${my value} เป็น json แล้ว ใส่ มัน ใน #results',
      tl: 'debounced sa 300ms kuhanin_mula /api/search?q=${my value} kapag input bilang json pagkatapos ilagay ito sa #results',
      tr: 'debounced at 300ms /api/search?q=${my value} i giriş de getir json olarak ardından o i #results e koy',
      uk: 'при введення debounced в 300ms завантажити /api/search?q=${my value} як json тоді покласти це в #results',
      vi: 'khi nhập debounced tại 300ms tải /api/search?q=${my value} như json rồi đặt nó vào #results',
      zh: '当 输入 时 debounced 把 在 300ms 抓取 /api/search?q=${my value} 的 json 那么 把 它 放置 到 #results',
    },
  },
  'event-once': {
    expectMods: { once: true },
    expectEvent: 'click',
    renders: {
      ar: 'once أضف .initialized إلى أنا عند نقر ثم استدع setup()',
      bn: 'once .initialized কে ক্লিক এ যোগ আমি তে তারপর setup() কে কল',
      de: 'bei klick once hinzufügen .initialized zu ich dann aufrufen setup()',
      en: 'on click once add .initialized to me call setup()',
      es: 'en clic once agregar .initialized a yo entonces llamar setup()',
      fr: 'sur clic once ajouter .initialized à moi alors appeler setup()',
      he: 'ב לחיצה once הוסף את .initialized על אני אז קרא את setup()',
      hi: 'once .initialized को क्लिक पर जोड़ें मैं में फिर setup() को कॉल',
      id: 'pada klik once tambah .initialized ke saya lalu panggil setup()',
      it: 'su clic once aggiungere .initialized in io allora chiamare setup()',
      ja: 'once .initialized を クリック で 追加 私 に それから setup() を 呼び出し',
      ko: 'once .initialized 를 클릭 할 때 추가 나 에 그러면 setup() 를 호출',
      ms: 'apabila click once tambah .initialized ke saya kemudian panggil setup()',
      pl: 'gdy kliknięcie once dodaj .initialized do ja wtedy wywołaj setup()',
      pt: 'em clique once adicionar .initialized para eu então chamar setup()',
      qu: 'once .initialized ta noqa man ñitiy pi yapay chayqa setup() ta qayay',
      ru: 'при клик однажды добавить .initialized в я затем вызвать setup()',
      sw: 'kwenye bonyeza once ongeza .initialized kwa mimi kisha ita setup()',
      th: 'เมื่อ คลิก once เพิ่ม .initialized ใน ฉัน แล้ว เรียก setup()',
      tl: 'once idagdag .initialized sa ako kapag click pagkatapos tawagin setup()',
      tr: 'once .initialized i tıklama de ekle ben e ardından setup() i çağır',
      uk: 'при клік один_раз додати .initialized в я тоді викликати setup()',
      vi: 'khi nhấp một lần thêm .initialized vào tôi rồi gọi setup()',
      zh: '当 点击 时 once 把 添加 .initialized 到 我 那么 调用 把 setup()',
    },
  },
  'event-throttle': {
    expectMods: { throttle: 100 },
    expectEvent: 'scroll',
    renders: {
      ar: 'throttled عند 100ms عند تمرير ثم استدع updateScrollPosition()',
      bn: 'throttled at 100ms updateScrollPosition() কে স্ক্রোল এ কল',
      de: 'bei scrollen throttled bei 100ms dann aufrufen updateScrollPosition()',
      en: 'on scroll throttled at 100ms call updateScrollPosition()',
      es: 'en desplazar throttled en 100ms entonces llamar updateScrollPosition()',
      fr: 'sur défiler throttled à 100ms alors appeler updateScrollPosition()',
      he: 'ב גלול throttled את at 100ms אז קרא את updateScrollPosition()',
      hi: 'throttled at 100ms updateScrollPosition() को स्क्रॉल पर कॉल',
      id: 'pada gulir throttled di 100ms lalu panggil updateScrollPosition()',
      it: 'su scorrimento throttled a 100ms allora chiamare updateScrollPosition()',
      ja: 'throttled at 100ms updateScrollPosition() を スクロール で 呼び出し',
      ko: 'throttled at 100ms updateScrollPosition() 를 스크롤 할 때 호출',
      ms: 'apabila scroll throttled di 100ms kemudian panggil updateScrollPosition()',
      pl: 'gdy przewiń throttled przy 100ms wtedy wywołaj updateScrollPosition()',
      pt: 'em rolar throttled em 100ms então chamar updateScrollPosition()',
      qu: 'throttled at 100ms updateScrollPosition() ta kunray pi qayay',
      ru: 'при прокрутить throttled у 100ms затем вызвать updateScrollPosition()',
      sw: 'kwenye sogeza throttled katika 100ms kisha ita updateScrollPosition()',
      th: 'เมื่อ เลื่อน throttled ที่ 100ms แล้ว เรียก updateScrollPosition()',
      tl: 'throttled sa 100ms kapag scroll pagkatapos tawagin updateScrollPosition()',
      tr: 'throttled at 100ms updateScrollPosition() i kaydır de çağır',
      uk: 'при прокрутити throttled в 100ms тоді викликати updateScrollPosition()',
      vi: 'khi cuộn throttled tại 100ms rồi gọi updateScrollPosition()',
      zh: '当 滚动 时 throttled 把 在 100ms 那么 调用 把 updateScrollPosition()',
    },
  },
  'window-resize': {
    expectMods: { debounce: 200 },
    expectEvent: 'resize',
    eventNullResiduals: ['th', 'zh'],
    expectFrom: true,
    fromResiduals: ['qu'],
    renders: {
      ar: 'استدع adjustLayout() من نافذة debounced عند 200ms عند تغيير حجم',
      bn: 'debounced at 200ms adjustLayout() কে রিসাইজ এ কল window থেকে',
      de: 'bei größeändern aufrufen adjustLayout() von fenster debounced bei 200ms',
      en: 'on resize from window debounced at 200ms call adjustLayout()',
      es: 'en redimensionar llamar adjustLayout() de ventana debounced en 200ms',
      fr: 'sur redimensionner appeler adjustLayout() de fenêtre debounced à 200ms',
      he: 'ב resize קרא את adjustLayout() מ window debounced at 200ms',
      hi: 'debounced at 200ms adjustLayout() को आकार_बदलें पर कॉल विंडो से',
      id: 'pada ubah_ukuran panggil adjustLayout() dari jendela debounced di 200ms',
      it: 'su ridimensiona chiamare adjustLayout() da finestra debounced a 200ms',
      ja: 'debounced at 200ms adjustLayout() を サイズ変更 で 呼び出し ウィンドウ から',
      ko: 'debounced at 200ms adjustLayout() 를 리사이즈 할 때 호출 창 에서',
      ms: 'apabila resize panggil adjustLayout() dari tetingkap debounced di 200ms',
      pl: 'gdy zmieńrozmiar wywołaj adjustLayout() z okno debounced przy 200ms',
      pt: 'em redimensionar chamar adjustLayout() de janela debounced em 200ms',
      qu: 'debounced at 200ms adjustLayout() ta k_iri manta hatun_kay pi qayay',
      ru: 'при изменениеразмера вызвать adjustLayout() из окно debounced у 200ms',
      sw: 'kwenye badilisha_ukubwa ita adjustLayout() kutoka dirisha debounced katika 200ms',
      th: 'เมื่อ ปรับขนาด เรียก adjustLayout() จาก window debounced ที่ 200ms',
      tl: 'tawagin adjustLayout() mula_sa bintana debounced sa 200ms kapag resize',
      tr: 'debounced at 200ms adjustLayout() i boyutlandırma de çağır pencere den',
      uk: 'при змінарозміру викликати adjustLayout() з вікно debounced в 200ms',
      vi: 'khi đổi kích thước gọi adjustLayout() từ window debounced tại 200ms',
      zh: '当 调整大小 时 调用 把 adjustLayout() 从 窗口 debounced 在 200ms',
    },
  },
};

describe('event-modifier phrases — 4 patterns × 24 languages (Arc F)', () => {
  for (const [patternId, spec] of Object.entries(PATTERNS)) {
    describe(patternId, () => {
      for (const [lang, render] of Object.entries(spec.renders)) {
        it(`${lang}: captures ${JSON.stringify(spec.expectMods)} with zero unconsumed input`, () => {
          const node = parse(render, lang);
          expect(node).not.toBeNull();
          const handler = findHandler(node as SemanticNode);
          expect(handler, 'expected an event-handler node').not.toBeNull();

          const mods = handler!.eventModifiers ?? {};
          for (const [key, value] of Object.entries(spec.expectMods)) {
            expect(mods[key as keyof typeof mods], `eventModifiers.${key}`).toEqual(value);
          }

          if (!(spec.eventNullResiduals ?? []).includes(lang)) {
            const event = handler!.roles.get('event');
            const eventWord =
              event?.type === 'literal'
                ? String(event.value)
                : event?.type === 'expression'
                  ? event.raw
                  : undefined;
            expect(eventWord, 'canonical event name').toBe(spec.expectEvent);
          }

          if (spec.expectFrom && !(spec.fromResiduals ?? []).includes(lang)) {
            expect(mods.from, 'eventModifiers.from (reclaimed from-tail)').toBeDefined();
          }

          expect(unconsumedFirings(node as SemanticNode)).toEqual([]);
        });
      }
    });
  }
});

describe('event-modifier phrase lift — phantom protection pins', () => {
  it('`.once` selector is never lifted (add .once to me)', () => {
    const node = parse('on click add .once to me', 'en');
    const handler = findHandler(node as SemanticNode);
    expect(handler).not.toBeNull();
    expect(handler!.eventModifiers?.once).toBeUndefined();
  });

  it('mid-stream debounced WITHOUT a duration never defaults', () => {
    const node = parse('on click debounced toggle .active', 'en');
    const handler = findHandler(node as SemanticNode);
    expect(handler).not.toBeNull();
    expect(handler!.eventModifiers?.debounce).toBeUndefined();
  });

  it('a wait duration is not a modifier (`wait 2s` untouched)', () => {
    const node = parse('on click wait 2s then add .done to me', 'en');
    const handler = findHandler(node as SemanticNode);
    expect(handler).not.toBeNull();
    const mods = handler!.eventModifiers ?? {};
    expect(mods.debounce).toBeUndefined();
    expect(mods.throttle).toBeUndefined();
    expect(mods.once).toBeUndefined();
  });

  it('leading + mid-stream modifiers merge (once then debounced at 100ms)', () => {
    const node = parse('on click once debounced at 100ms toggle .active', 'en');
    const handler = findHandler(node as SemanticNode);
    expect(handler).not.toBeNull();
    expect(handler!.eventModifiers?.once).toBe(true);
    expect(handler!.eventModifiers?.debounce).toBe(100);
  });

  it('a non-handler input containing a modifier word is untouched', () => {
    const node = parse('put "once" into #label', 'en');
    expect(node).not.toBeNull();
    expect((node as SemanticNode).kind).not.toBe('event-handler');
  });
});
