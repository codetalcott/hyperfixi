/**
 * Expression-internal lexicon — possessive property-name normalization (Phase 1
 * of the foreign→English canonical-validity burndown).
 *
 * A possessive property authored in a non-English language (`mi valor`, `私の 値`,
 * `لي قيمة`) was captured with the foreign property surface verbatim, so the
 * foreign→English render leaked it (`put my valor into #preview`, invalid) and the
 * AST-execution path read a non-existent `.valor` DOM property. The property head
 * now normalizes to its English DOM name at parse time.
 */

import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';
import {
  translateConnective,
  translatePropertyName,
} from '../src/parser/utils/expression-lexicon';
import { getEnglishPossessiveAdjective } from '../src/parser/utils/possessive-keywords';

type Node = { roles?: unknown };
function roleValue(node: Node, role: string): { type?: string; property?: string } {
  const roles =
    node.roles instanceof Map
      ? Object.fromEntries(node.roles as Map<string, unknown>)
      : (node.roles as Record<string, unknown>);
  return (roles?.[role] ?? {}) as never;
}

describe('translatePropertyName (reverse property lexicon)', () => {
  it('maps a foreign property surface to its English DOM name', () => {
    expect(translatePropertyName('es', 'valor')).toBe('value');
    expect(translatePropertyName('ja', '値')).toBe('value');
    expect(translatePropertyName('ar', 'قيمة')).toBe('value');
    expect(translatePropertyName('de', 'wert')).toBe('value');
    expect(translatePropertyName('vi', 'giá trị')).toBe('value'); // multi-word surface
  });

  it('is case-insensitive on the surface', () => {
    expect(translatePropertyName('de', 'Wert')).toBe('value');
  });

  it('passes an unlisted / already-English surface through unchanged', () => {
    expect(translatePropertyName('es', 'innerHTML')).toBe('innerHTML');
    expect(translatePropertyName('es', 'value')).toBe('value');
    expect(translatePropertyName('en', 'value')).toBe('value');
    expect(translatePropertyName('he', 'value')).toBe('value'); // he keeps `value`
    expect(translatePropertyName('zz', 'anything')).toBe('anything'); // unknown language
  });
});

describe('possessive property head normalizes to English at parse time', () => {
  // input-mirror: `on input put my value into #preview` — possessor-first `my X`,
  // captured inside an event-handler body, so assert on the canonical render.
  const inputMirror: Array<[string, string]> = [
    ['es', 'en entrada poner mi valor a #preview'],
    ['ja', '私の 値 を #preview に 置く 入力 で'],
    ['ar', 'ضع لي قيمة إلى #preview عند إدخال'],
    ['vi', 'khi nhập đặt của tôi giá trị vào #preview'],
    ['zh', '当 输入 时 放置 把 我的 值 到 #preview'],
  ];
  for (const [lang, code] of inputMirror) {
    it(`${lang}: renders "put my value" (no leaked property surface)`, () => {
      expect(render(parse(code, lang), 'en')).toContain('put my value into #preview');
    });
  }

  // bind-explicit-property: `bind $color to #picker's value` — of-possessive and
  // selector-possessive both normalize the property.
  const bindProp: Array<[string, string]> = [
    ['ja', '$color を #pickerの 値 に バインド'],
    ['es', 'bind $color a valor de #picker'],
    ['ar', 'اربط $color إلى قيمة لـ #picker'],
  ];
  for (const [lang, code] of bindProp) {
    it(`${lang}: bind source captures property-path #picker.value`, () => {
      const source = roleValue(parse(code, lang) as Node, 'source');
      expect(source.type).toBe('property-path');
      expect(source.property).toBe('value');
    });
  }

  it('renders canonical English (no leaked foreign property surface)', () => {
    expect(render(parse('私の 値 を #preview に 置く 入力 で', 'ja'), 'en')).toContain(
      'my value'
    );
    expect(render(parse('اربط $color إلى قيمة لـ #picker', 'ar'), 'en')).toContain(
      "#picker's value"
    );
  });
});

/**
 * Phase 1b/3 — the same vocabulary inside a RAW EXPRESSION. A property held in a
 * captured expression string (`"Hello, " + mi valor`, `mi valor is empty`) is not
 * a property-path node, so the possessive matchers above never see it. Two
 * independent joins fed those captures — the conditional's `joinTokenText` and the
 * operator-run join — and both leaked the source language.
 */
describe('getEnglishPossessiveAdjective (reference concept → English)', () => {
  it('maps the three references that have possessive adjectives', () => {
    expect(getEnglishPossessiveAdjective('me')).toBe('my');
    expect(getEnglishPossessiveAdjective('it')).toBe('its');
    expect(getEnglishPossessiveAdjective('you')).toBe('your');
  });

  it("falls through to the 's marker for references that have no adjective", () => {
    // `result value` is not English; `result's value` is.
    expect(getEnglishPossessiveAdjective('result')).toBe("result's");
    expect(getEnglishPossessiveAdjective('event')).toBe("event's");
    expect(getEnglishPossessiveAdjective('target')).toBe("target's");
    expect(getEnglishPossessiveAdjective('body')).toBe("body's");
  });
});

describe('translateConnective (unambiguous connectives only)', () => {
  it('maps a foreign connective surface to English', () => {
    expect(translateConnective('es', 'como')).toBe('as');
    expect(translateConnective('de', 'als')).toBe('as');
    expect(translateConnective('ja', 'として')).toBe('as');
  });

  it('passes an unlisted / already-English surface through unchanged', () => {
    expect(translateConnective('es', 'as')).toBe('as');
    expect(translateConnective('en', 'anything')).toBe('anything');
  });

  it('omits a surface the language reuses for another sense', () => {
    // th `เป็น` is BOTH `as` and the copula `is` — carrying it would rewrite
    // every Thai `is` condition into `as`.
    expect(translateConnective('th', 'เป็น')).toBe('เป็น');
    // es spells `of` and `from` the same `de`; `of` is emitted structurally by
    // the of-possessive anchor instead, never by surface lookup.
    expect(translateConnective('es', 'de')).toBe('de');
  });
});

describe('possessives inside raw expressions render English (Phase 1b)', () => {
  // two-way-binding — the possessive sits inside an operator run
  // (`"Hello, " + my value`), which joined fully verbatim.
  const twoWay: Array<[string, string]> = [
    ['es', 'al entrada establecer #greeting de innerText a "Hello, " + mi valor'],
    ['zh', '当 输入 时 设置 #greeting 的 innerText 为 "Hello, " + 我的 值'],
  ];
  for (const [lang, code] of twoWay) {
    it(`${lang}: operator-run possessive renders "my value"`, () => {
      expect(render(parse(code, lang), 'en')).toContain('"Hello, " + my value');
    });
  }

  // input-validation — the possessive sits inside a folded condition. es `mi`
  // normalizes to the reference `me`, so this rendered the invalid `me valor`:
  // the property leaked AND the pronoun was the wrong part of speech.
  it('es: condition possessive renders "my value", not "me valor"', () => {
    const english = render(
      parse('al desenfoque si mi valor es vacío agregar .error a yo sino quitar .error de yo fin', 'es'),
      'en'
    );
    expect(english).toContain('if my value is empty');
    expect(english).not.toContain('me valor');
  });
});

describe('expression connectives and locatives render English (Phase 3)', () => {
  it('es: computed-value renders the same English as its en reference', () => {
    const es = render(
      parse(
        'al entrada establecer #total de innerText a (the valor de #price como Number) * (mi valor como Number)',
        'es'
      ),
      'en'
    );
    expect(es).toContain('the value of #price as Number');
    expect(es).toContain('my value as Number');
  });

  // The `as` connective's reverse-render entries (CONNECTIVE_LEXICON zh/hi) always
  // existed, but the tokenizer shattered the multi-char/underscore surface before
  // lookup: zh `作为` split into `作` + `为`→`for`, and hi `के_रूप_में` split on its
  // underscores. Whole-token EXTRAS entries (chinese.ts/hindi.ts) let the greedy
  // longest-first walk / underscore-recovery claim the whole surface. Sources are
  // the verbatim authored corpus rows (computed-value).
  it('zh: computed-value `作为` renders `as Number`, not `作 for Number`', () => {
    const zh = render(
      parse(
        '当 输入 时 设置 把 #total.innerText 到 (the 值 的 #price 作为 Number) * (我的 值 作为 Number) 从 .quantity',
        'zh'
      ),
      'en'
    );
    expect(zh).toContain('the value of #price as Number');
    expect(zh).toContain('my value as Number');
    expect(zh).not.toMatch(/[^\x00-\x7F]/); // no leaked foreign surface
  });

  it('hi: computed-value `के_रूप_में` renders `as Number`, not shattered underscores', () => {
    const hi = render(
      parse(
        '#total.innerText को (the मान का #price के_रूप_में Number) * (मेरा मान के_रूप_में Number) में सेट इनपुट पर .quantity से',
        'hi'
      ),
      'en'
    );
    expect(hi).toContain('the value of #price as Number');
    expect(hi).toContain('my value as Number');
    expect(hi).not.toMatch(/[^\x00-\x7F]/); // no leaked foreign surface
  });

  it('es: positional locative renders `in`, not the role name', () => {
    // es `en` is registered as the `destination` role marker, so the marker's
    // normalized form is the ROLE NAME — this rendered `... destination #chat`.
    expect(render(parse('al clic desplazar a último <.message/> en #chat', 'es'), 'en')).toContain(
      'last <.message/> in #chat'
    );
    expect(render(parse('al clic enfocar primero <button/> en .modal', 'es'), 'en')).toContain(
      'first <button/> in .modal'
    );
  });

  // The locative markers do not all fail the same way, so cover one of each:
  // zh/id are not role markers at all and leaked verbatim, while pt normalizes to
  // English `into` — which the canonical parser rejects in this slot.
  const locatives: Array<[string, string]> = [
    ['zh', '当 点击 时 滚动 到 最后一个 <.message/> 在 #chat'],
    ['pt', 'em clique rolar para último <.message/> dentro #chat'],
    ['id', 'pada klik gulir ke terakhir <.message/> dalam #chat'],
  ];
  for (const [lang, code] of locatives) {
    it(`${lang}: positional locative renders \`in\``, () => {
      expect(render(parse(code, lang), 'en')).toContain('last <.message/> in #chat');
    });
  }

  it('en: the reference render is unchanged (en defines the target)', () => {
    expect(render(parse('on click scroll to last <.message/> in #chat', 'en'), 'en')).toContain(
      'last <.message/> in #chat'
    );
  });
});

describe('condition locative renders English (Phase 4)', () => {
  // focus-trap authors the SAME positional run TWICE: `last <button/> in .modal` in
  // the CONDITION and `first <button/> in .modal` in the then-branch. The then-branch
  // reaches PatternMatcher.tryMatchPositionalExpression and rendered `in` in all 24
  // languages; the condition goes through tryParseConditionalBlock → joinTokenText →
  // joinExpressionTokens, which had no locative anchor, so `surfaceOf` leaked it TWO
  // different ways:
  //   verbatim  — ru `в`, zh `在`, tr `içinde`: not role markers at all;
  //   ROLE NAME — de `in`, th `ใน` → `destination`, because role markers are
  //               registered with `normalized: <role>` (base-tokenizer).
  // Both seams now share matchPositionalRun, so they cannot disagree again.
  // Sources are the AUTHORED corpus rows (patterns.db), not hand-written.
  const focusTrap: Array<[string, string]> = [
    [
      'ru',
      'при keydown[key=="Tab"] из .modal если цель соответствует последний <button/> в .modal сфокусировать первый <button/> в .modal затем остановить конец',
    ],
    [
      'de',
      'bei keydown[key=="Tab"] von .modal falls ziel passt letzte <button/> in .modal fokussieren erste <button/> in .modal dann anhalten ende',
    ],
    [
      'es',
      'en keydown[key=="Tab"] de .modal si objetivo coincide último <button/> en .modal enfocar primero <button/> en .modal entonces detener fin',
    ],
    [
      'tr',
      'keydown[key=="Tab"] de .modal den eğer hedef eşleşir sonuncu <button/> içinde .modal ardından ilk <button/> içinde .modal i odak ardından durdur son',
    ],
    [
      'zh',
      '当 keydown[key=="Tab"] 从 .modal 如果 目标 匹配 最后一个 <button/> 在 .modal 聚焦 把 第一个 <button/> 在 .modal 那么 停止 结束',
    ],
    [
      'th',
      'เมื่อ keydown[key=="Tab"] จาก .modal ถ้า เป้าหมาย matches สุดท้าย <button/> ใน .modal โฟกัส แรก <button/> ใน .modal แล้ว หยุด จบ',
    ],
  ];
  for (const [lang, code] of focusTrap) {
    it(`${lang}: condition locative renders \`in\`, like the then-branch`, () => {
      const english = render(parse(code, lang), 'en');
      // The point is that BOTH seams agree — the then-branch already rendered `in`.
      expect(english).toContain('last <button/> in .modal');
      expect(english).toContain('first <button/> in .modal');
    });
  }

  it('ru: the condition no longer leaks the marker surface verbatim', () => {
    expect(render(parse(focusTrap[0][1], 'ru'), 'en')).not.toContain('в .modal');
  });

  it('de: the condition no longer leaks the ROLE NAME', () => {
    // `destination` is the normalized form of de's `in` role marker — a role name,
    // not an English word. This rendered `last <button/> destination .modal`.
    expect(render(parse(focusTrap[1][1], 'de'), 'en')).not.toContain('destination');
  });

  it('en: the reference render is unchanged (en defines the target)', () => {
    expect(
      render(
        parse(
          'on keydown[key=="Tab"] from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end',
          'en'
        ),
        'en'
      )
    ).toContain('if target matches last <button/> in .modal');
  });

  it('a member chain inside a condition keeps its glue', () => {
    // matchPositionalRun returns {text, token} pairs precisely so this join can still
    // compute SOURCE adjacency. Bare strings would render `previous <input/> .value`
    // here (the role seam's join rule) — silently, and only in conditions.
    expect(
      render(parse('on blur if previous <input/>.value is empty add .error to me end', 'en'), 'en')
    ).toContain('previous <input/>.value');
  });

  it('a juxtaposed command verb is never eaten as a locative marker', () => {
    // The run consumes `<marker> <selector>` only when a SELECTOR follows, so
    // `remove` cannot be read as the source marker of `closest .modal`.
    const english = render(
      parse('on click hide closest .modal remove .modal-open from body', 'en'),
      'en'
    );
    expect(english).toContain('hide closest .modal');
    expect(english).toContain('remove .modal-open from body');
  });

  // bn is deliberately absent: its positional `শেষ` normalizes to `end` (the block
  // terminator), so the run's head gate correctly declines and `এ` still leaks —
  // `if target matches end <button/> এ .modal`. That is a dict/tokenizer realign, not
  // a seam fix, and bn stays on the foreign-validity allowlist.
});

describe('raw-expression translation is anchored, never blanket', () => {
  it('never translates inside a string literal', () => {
    // The literal must survive byte-identical even though it contains `valor`.
    const english = render(
      parse('al entrada establecer #g de innerText a "Hola, valor" + mi valor', 'es'),
      'en'
    );
    expect(english).toContain('"Hola, valor"');
    expect(english).toContain('my value');
  });

  it('leaves a bare word with no possessive in front of it alone', () => {
    // `valor` here is a user variable, not the DOM property — nothing vouches
    // for it as a property head, so it must pass through untouched.
    expect(render(parse('al entrada establecer #g de innerText a valor + 1', 'es'), 'en')).toContain(
      'valor + 1'
    );
  });

  it('leaves selectors and sigil refs alone', () => {
    const english = render(parse('al entrada establecer #g de innerText a $valor + 1', 'es'), 'en');
    expect(english).toContain('$valor');
  });

  // ms `ia` and qu `chay` are BOTH the possessive (`its`) and the bare reference
  // (`it`). Reading the surface as a possessive wherever it appeared rewrote
  // `if it` — a truthiness check on the fetch result — into the invalid
  // `if its`, breaking `fetch-do-not-throw` in both languages. A possessive is
  // only a possessive when a property actually follows it.
  const bareReference: Array<[string, string]> = [
    ['ms', 'apabila click ambil_dari /api/users sebagai JSON do bukan lempar kemudian jika ia tetapkan $users ke ia tamat'],
    ['qu', '/api/users ta ñitiy pi apamuy JSON do mana wikchuy chayqa hina sichus chay $users ta chay man churanay tukuy'],
  ];
  for (const [lang, code] of bareReference) {
    it(`${lang}: a possessive surface used as a BARE reference stays \`it\``, () => {
      const english = render(parse(code, lang), 'en');
      expect(english).toContain('if it');
      expect(english).not.toContain('if its');
    });
  }
});

describe('connector-joined dot-member possessive in raw expressions (Phase 10)', () => {
  // fetch-error-handling qu: `chaypaq.error` = chay(→it) + paq(connector) +
  // `.error`. The value-slot matcher accepts the `.`-selector as the property
  // (put path rendered `put its error into #error`), but the raw-expression
  // seam's bare-word guard declined it, so the connector leaked glued to the
  // member: the condition rendered the invalid `if it paq.error`. The seam now
  // fires the possessive anchor when a skipped connector is source-adjacent to
  // a dot-member, matching the value-slot seam.
  it('qu: condition `chaypaq.error` renders `if its error`, not `it paq.error`', () => {
    const english = render(
      parse(
        '/api/data ta ñitiy pi apamuy json chayqa hina sichus chaypaq.error chaypaq.error ta #error man churay manachus chaypaq.data ta #result man churay tukuy',
        'qu'
      ),
      'en'
    );
    expect(english).toContain('if its error');
    expect(english).not.toContain('paq');
  });

  // The guard must stay adjacency-gated: a SPACED `.cls` after the same
  // surface is a class selector in a comparison, not a member access.
  it('qu: spaced dot token after `chay` is not rewritten into a possessive', () => {
    const english = render(
      parse('/api/users ta ñitiy pi apamuy JSON do mana wikchuy chayqa hina sichus chay $users ta chay man churanay tukuy', 'qu'),
      'en'
    );
    expect(english).toContain('if it');
    expect(english).not.toContain('if its');
  });
});

describe('Phase 11: possessive + source-adjacent dot-member, no connector (bn এর.error)', () => {
  // bn fetch-error-handling authors `যদি এর.error …`: the condition-boundary
  // used to break AT the glued `.error` (the SOV verb-final checker saw a
  // command head there), stranding the member — render `if এর` — and the seam
  // then leaked the particle. Two coordinated fixes: the boundary skips a
  // source-adjacent `.member` token, and the join seam renders
  // possessive+adjacent-dot-member as `its <prop>` (the connectorless sibling
  // of the Phase-10 qu branch).
  it('bn: যদি এর.error condition renders `if its error` (full corpus row shape)', () => {
    const out = render(
      parse(
        '/api/data কে ক্লিক এ আনুন json তারপর যদি এর.error এর.error কে #error তে রাখুন নতুবা এর.data কে #result তে রাখুন শেষ',
        'bn'
      ),
      'en'
    );
    expect(out).toContain('if its error');
    expect(out).toContain('put its error into #error');
    expect(out).toContain('put its data into #result');
    expect(/[ঀ-৿]/.test(out)).toBe(false);
  });

  it('collision guard: surfaces doubling as bare references keep their it.prop glue (ms/qu shape)', () => {
    // ms `ia` / qu `chay` are both `it` and `its` — the new branch must decline
    // them (isAlsoBareReference) so their glued member access renders unchanged.
    const ms = render(parse('bila klik ambil /api/data letak ia.name ke #result', 'ms'), 'en');
    expect(ms).toContain('its name');
    expect(ms).not.toContain('its its');
    // en `it` is not a possessive keyword, so the CONDITION seam keeps the
    // glued member access verbatim (put slots assemble property-paths via the
    // value-slot matcher — that is pre-existing and separate).
    const en = render(
      parse(
        'on click fetch "/api/data" as json then if it.error put it.error into #error end',
        'en'
      ),
      'en'
    );
    expect(en).toContain('if it.error');
  });

  it('qu Phase-10 connector branch unchanged: chaypaq.error still renders its error', () => {
    const out = render(
      parse(
        'yaykuchiy /api/data kanan click json hina chaymanta sichus chaypaq.error chaypaq.error churay #error man mana chayqa chaypaq.data churay #result man tukuy',
        'qu'
      ),
      'en'
    );
    expect(out).toContain('its error');
  });
});

describe('Phase 11: bn শেষ positional-head dual (focus-trap, last-in-collection)', () => {
  // bn `শেষ` is registered as `end` (block terminator), so positional runs it
  // heads (`শেষ <button/> এ .modal` = "last <button/> in .modal") failed the
  // recognizer and leaked the locative particle. The dual maps the surface to
  // `last` ONLY inside matchPositionalRun and only before an angle-bracket
  // element query — behavior-sortable's block-end শেষ adjacent to the next
  // clause's bare `.{dragClass}` must never mint a phantom `last`.
  it('bn last-in-collection row renders byte-identical to en', () => {
    const out = render(parse('ক্লিক এ স্ক্রোল শেষ <.message/> এ #chat তে', 'bn'), 'en');
    expect(out).toBe('on click scroll to last <.message/> in #chat');
  });

  it('bn focus-trap condition folds both positional runs', () => {
    const out = render(
      parse(
        'keydown[key=="Tab"] এ .modal থেকে যদি লক্ষ্য matches শেষ <button/> এ .modal তারপর প্রথম <button/> এ .modal কে ফোকাস তারপর থামুন শেষ',
        'bn'
      ),
      'en'
    );
    expect(out).toContain('matches last <button/> in .modal');
    expect(out).toContain('focus first <button/> in .modal');
    expect(/[ঀ-৿]/.test(out)).toBe(false);
  });

  it('bn block-end শেষ before a bare class selector never becomes `last`', () => {
    const out = render(
      parse(
        'Sortable(dragClass) কে আচরণ\n    pointerdown(clientY) এ আমি থেকে\n        পর্যন্ত ঘটনা pointerup কে পুনরাবৃত্তি document থেকে\n            sortable:move কে ট্রিগার আমি তে\n        শেষ\n        .{dragClass} কে সরান item থেকে\n    শেষ\nশেষ',
        'bn'
      ),
      'en'
    );
    expect(out).toContain('remove .{dragClass} from item');
    expect(out).not.toContain('last .{dragClass}');
  });
});

// Full authored corpus rows for the Phase 12 ambiguous-sense guards: standalone
// single-line probes parse via DIFFERENT paths (a bare `if` line truncates its
// condition before the seam sees the full run), so the guards must parse the
// whole behavior exactly as the gate does.
const AR_REMOVABLE = `behavior Removable(triggerEl, confirmRemoval, effect)
    init
        إذا triggerEl هو غير معرف
            اضبط triggerEl إلى أنا
        النهاية
    النهاية
    من triggerEl عند نقر
        إذا confirmRemoval
            js(me)
        if (!window.confirm("Are you sure?")) return "cancel";
      end
            إذا هو هو "cancel"
                أوقف
            النهاية
        النهاية
        تشغيل removable:before
        إذا effect هو "fade"
            انتقال opacity إلى 0 300ms
        النهاية
        تشغيل removable:removed
        احذف أنا
    النهاية
النهاية`;

const TL_DRAGGABLE = `ugali Draggable(dragHandle)
    simulan
        kung walang dragHandle pagkatapos itakda dragHandle sa ako
    wakas
    mula_sa dragHandle kapag pointerdown(clientX, clientY)
        huminto the pangyayari
        palitawin draggable:start
        sukatin x
        itakda startX sa ito
        sukatin y
        itakda startY sa ito
        itakda xoff sa clientX - startX
        itakda yoff sa clientY - startY
        ulitin hanggang pangyayari pointerup mula_sa dokumento
            maghintay pointermove(clientX, clientY) o
                                pointerup(clientX, clientY) mula_sa dokumento
            idagdag { left: \${clientX - xoff}px; top: \${clientY - yoff}px; }
            palitawin draggable:move
        wakas
        palitawin draggable:end
    wakas
wakas`;


describe('Phase 12: ambiguous-sense anchor (blocked dual-sense words, local-context gates)', () => {
  // Each word here was a deliberately-blocked ambiguous exclusion (copula
  // it/is, is/as, is/has; no/not/without; exists/has; the ja ç©º phantom). The
  // render seam resolves them by neighbor shape ONLY â a failed gate leaves the
  // pre-existing render byte-identical. Sources are authored corpus rows
  // (never hand-written foreign text). Census + gates: probe 2026-07-19.

  it('ar: ÙÙ before a predicate renders `is` (copula sense)', () => {
    const out = render(
      parse(
        'عند ضبابية إذا لي قيمة هو فارغ أضف .error إلى أنا وإلا احذف .error من أنا النهاية',
        'ar'
      ),
      'en'
    );
    expect(out).toContain('if my value is null');
    expect(out).not.toContain(' it null');
  });

  it('ar: doubled هو هو resolves to `it is` (reference then copula)', () => {
    const out = render(parse(AR_REMOVABLE, 'ar'), 'en');
    expect(out).toContain('if it is "cancel"');
    expect(out).toContain('if triggerEl is undefined');
    expect(out).toContain('if effect is "fade"');
  });

  it('ar: it-sense هو before a verb/marker stays `it`', () => {
    const out = render(
      parse(
        'احضر /api/users عند نقر كـJSON do ليس ارم ثم إذا هو اضبط $users إلى هو النهاية',
        'ar'
      ),
      'en'
    );
    expect(out).toContain('if it set $users to it');
    expect(out).not.toContain('if is');
  });

  it('hi: है before a predicate renders `is`', () => {
    const out = render(
      parse(
        'धुंधला पर अगर मेरा मान है खाली .error को जोड़ें मैं में वरना .error को हटाएं मैं से समाप्त',
        'hi'
      ),
      'en'
    );
    expect(out).toContain('if my value is null');
    expect(/[ऀ-ॿ]/.test(out)).toBe(false);
  });

  it('hi: not-sense नहीं before a verb keyword never becomes `no`', () => {
    const out = render(
      parse(
        '/api/users को क्लिक पर लाएं JSON do नहीं फेंकें फिर के रूप में अगर यह $users को यह में सेट समाप्त',
        'hi'
      ),
      'en'
    );
    expect(out).not.toContain('no throw');
    expect(out).toContain('if it set $users to it');
  });

  it('th: เป็น before a predicate renders `is`', () => {
    const out = render(
      parse(
        'เมื่อ เบลอ ถ้า ของฉัน ค่า เป็น ว่าง เพิ่ม .error ใน ฉัน ไม่งั้น ลบ .error จาก ฉัน จบ',
        'th'
      ),
      'en'
    );
    expect(out).toContain('if my value is null');
  });

  it('th: เป็น before a type name renders `as`', () => {
    const out = render(
      parse(
        'เมื่อ อินพุต ตั้ง #total.innerText ใน (the ค่า ของ #price เป็น Number) * (ของฉัน ค่า เป็น Number) จาก .quantity',
        'th'
      ),
      'en'
    );
    expect(out).toContain('as Number');
    expect(out).not.toContain('เป็น');
  });

  it('th: the fetch as-clause is untouched (different seam)', () => {
    const out = render(
      parse(
        'เมื่อ คลิก ดึงข้อมูล /api/user เป็น json แล้ว ตั้ง #name.innerText ใน ของมัน.name',
        'th'
      ),
      'en'
    );
    expect(out).toContain('as json');
  });

  it('ja: 空 directly after the copula renders `empty` (no phantom command)', () => {
    const out = render(
      parse(
        'ぼかし で もし 私の 値 である 空 .error を 追加 私 に それから "Required" を 次 .error-message に 置く 終わり',
        'ja'
      ),
      'en'
    );
    expect(out).toContain('if my value is empty');
    expect(out).not.toContain('空');
  });

  const existsRows: Array<[string, string]> = [
    ['bn', 'ক্লিক এ যদি #modal আছে #modal কে দেখান নতুবা a <div#modal/> কে তৈরি করুন তারপর এটি কে বডি তে রাখুন শেষ'],
    ['tl', 'kapag click kung #modal may ipakita #modal kung_hindi gumawa a <div#modal/> pagkatapos ilagay ito sa katawan wakas'],
    ['tr', 'tıklama de eğer #modal var #modal i göster yoksa a <div#modal/> i yap ardından o i gövde e koy son'],
  ];
  for (const [lang, code] of existsRows) {
    it(`${lang}: exists-word after a selector subject renders \`exists\``, () => {
      const out = render(parse(code, lang), 'en');
      expect(out).toContain('if #modal exists');
    });
  }

  it('tl: walang before a bare identifier renders `no` (compound walang_laman untouched)', () => {
    const out = render(parse(TL_DRAGGABLE, 'tl'), 'en');
    expect(out).toContain('if no dragHandle');
  });
});
