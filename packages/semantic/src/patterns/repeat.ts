/**
 * Counted-loop HEAD patterns: `{verb} [marker] {quantity} {countWord}` (verb-first)
 * and `{quantity} {countWord} {marker} {verb}` (verb-last / SOV).
 *
 * Mirrors the English `repeat {quantity} times` HEAD pattern (en.ts, #521): it
 * captures the count as `quantity:literal` and defaults `loopType:literal="times"`,
 * stopping after the count word so the loop BODY is parsed by the surrounding
 * clause loop (not swallowed). Without it the generated positional `repeat` pattern
 * grabs the NUMBER as `loopType` and drops `quantity` — the `repeat.quantity:literal`
 * R1 residue.
 *
 * Two surface shapes:
 * - **Verb-FIRST** (SVO/VSO): the count phrase follows the verb, so the en-shaped
 *   HEAD pattern applies directly (`repetir 3 times`).
 * - **Verb-LAST** (SOV ja/ko/tr/hi/bn/qu): the count is FRONTED ahead of a clause-final
 *   verb (`3 times を 繰り返し` = `{quantity} {countWord} {objMarker} {verb}`). Inside
 *   an event handler the event is stripped first, so the body clause re-parse sees
 *   exactly this 4-token shape; without a dedicated HEAD the generated positional
 *   repeat mis-binds the count to `loopType:literal=3` and drops `quantity`. (qu uses
 *   `kutipay` for repeat (normalized `repeat`) in the FRESHLY-populated corpus — the
 *   committed patterns.db can lag with the older `kutichiy`=`return`, but CI always
 *   re-populates, so the qu HEAD fires there.)
 *
 * The count word is taken VERBATIM from the corpus: most languages leave the
 * English `times` untranslated (es `repetir 3 times`); a few translate it
 * (th `ครั้ง`, vi `lần`, tl `beses`, bn `বার`).
 */

import type { LanguagePattern } from '../types';

/**
 * One verb-first counted-loop HEAD pattern.
 * @param markerBefore optional token between the verb and the count (he accusative
 *   `את`, zh object marker `把`).
 */
function repeatTimesHead(
  language: string,
  verb: string,
  countWord: string,
  markerBefore?: string
): LanguagePattern {
  const tokens: LanguagePattern['template']['tokens'] = [];
  // Match the verb as a SINGLE literal token. A multi-word surface verb (vi
  // `lặp lại`) tokenizes as ONE fused keyword token — splitting it on whitespace
  // would expect two tokens the tokenizer never produces, so the pattern would
  // never match (vi's repeat-times fell through to the generated positional
  // repeat, mis-binding the count to loopType). For single-word verbs this is
  // identical to the previous per-word push.
  tokens.push({ type: 'literal', value: verb });
  if (markerBefore) tokens.push({ type: 'literal', value: markerBefore });
  tokens.push({ type: 'role', role: 'quantity', expectedTypes: ['literal', 'expression'] });
  tokens.push({ type: 'literal', value: countWord });
  return {
    id: `repeat-${language}-times`,
    language,
    command: 'repeat',
    priority: 110, // > the generated positional repeat (100)
    template: {
      format: `${verb}${markerBefore ? ' ' + markerBefore : ''} {quantity} ${countWord}`,
      tokens,
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'times' } },
    },
  };
}

// [lang, repeat-verb (corpus form), count-word, markerBefore?]
const VERB_FIRST_REPEAT_TIMES: Array<[string, string, string, string?]> = [
  ['es', 'repetir', 'times'],
  ['de', 'wiederholen', 'times'],
  ['fr', 'répéter', 'times'],
  ['it', 'ripetere', 'times'],
  ['pt', 'repetir', 'times'],
  ['ru', 'повторить', 'times'],
  ['uk', 'повторити', 'times'],
  ['pl', 'powtórz', 'times'],
  ['ar', 'كرر', 'times'],
  ['he', 'חזור', 'times', 'את'],
  ['id', 'ulangi', 'times'],
  ['ms', 'ulang', 'kali'],
  ['sw', 'rudia', 'times'],
  ['th', 'ทำซ้ำ', 'ครั้ง'],
  ['vi', 'lặp lại', 'lần'],
  ['tl', 'ulitin', 'beses'],
  ['zh', '重复', 'times', '把'],
];

/**
 * One verb-LAST (SOV) counted-loop HEAD pattern: `{quantity} {countWord} {marker} {verb}`.
 * The verb token matches the repeat keyword by its NORMALIZED form (`repeat`), so it
 * is robust to every conjugation/alternative the profile lists. The object marker
 * (ja `を` / ko `를` / tr `i` / hi `को` / bn `কে`) sits between the count phrase and
 * the clause-final verb and must be consumed for the verb token to align.
 */
function repeatTimesHeadSOV(language: string, countWord: string, marker: string): LanguagePattern {
  return {
    id: `repeat-${language}-times`,
    language,
    command: 'repeat',
    priority: 110, // > the generated positional repeat (100)
    template: {
      format: `{quantity} ${countWord} ${marker} repeat`,
      tokens: [
        { type: 'role', role: 'quantity', expectedTypes: ['literal', 'expression'] },
        { type: 'literal', value: countWord },
        { type: 'literal', value: marker },
        { type: 'literal', value: 'repeat' }, // matches the verb's normalized form
      ],
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'times' } },
    },
  };
}

// [lang, count-word (corpus form), object-marker]
const SOV_REPEAT_TIMES: Array<[string, string, string]> = [
  ['ja', 'times', 'を'],
  ['ko', 'times', '를'],
  ['tr', 'times', 'i'],
  ['hi', 'times', 'को'],
  ['bn', 'বার', 'কে'],
  ['qu', 'times', 'ta'],
];

// =============================================================================
// R1 cluster D — `repeat for X in Y` / `repeat while C` / `repeat until event E
// [from S]` loop-HEAD patterns (docs-internal/HANDOFF-r1-residual.md).
//
// Before these heads, only the en `-times`/`forever`/`until event` variants had
// HEAD-ONLY patterns; every other repeat head fell to the GENERATED positional
// repeat, which binds junk (`repeat for item in .items` → `loopType="for",
// quantity:expression="item", event:literal="in"`, `.items` dropped — the en
// reference NOISE every translation then "missed"), or to the bare-`repeat`
// clause-loop recovery (roles lost entirely). Each head below captures the
// canonical roles and STOPS before the loop body, so the surrounding clause
// loop parses the body as sibling commands (the same contract as the `-times`
// heads; ids must stay under the /^repeat-.*-(times|for-in|while-head|
// until-head)$/ head-only allowlist in semantic-parser's fused re-parse gate).
//
// Surface forms are taken VERBATIM from the freshly-populated corpus (the i18n
// transformer's emission is deterministic — see the probe tables in the
// handoff). Literal tokens also match by NORMALIZED form, so `repeat`/`until`/
// `event` literals cover every language whose tokenizer normalizes its verb.
// =============================================================================

/**
 * For-binding loop HEAD: `{repeat-verb} [for-word(s)] {patient} {in-word(s)}
 * {source}` — canonical roles `loopType:literal="for"` + `patient` (the binding
 * variable) + `source` (the collection). The transformer usually DROPS the
 * `for` binder in transit (`repetir item en .items`) but keeps it in the
 * `with index` variant (`repetir para item en .item con index`), so the
 * for-group is optional. Any trailing `with index` tail is left unconsumed —
 * it is marker-led, so the clause loop's skipped-run recovery discards it.
 */
function repeatForInHead(
  language: string,
  spec: { forWords?: string[]; inWords: string[] }
): LanguagePattern {
  const tokens: LanguagePattern['template']['tokens'] = [
    { type: 'literal', value: 'repeat' }, // matches the verb's normalized form
  ];
  if (spec.forWords && spec.forWords.length > 0) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: spec.forWords.map(w => ({ type: 'literal' as const, value: w })),
    });
  }
  tokens.push({ type: 'role', role: 'patient', expectedTypes: ['expression', 'reference'] });
  for (const w of spec.inWords) tokens.push({ type: 'literal', value: w });
  tokens.push({
    type: 'role',
    role: 'source',
    expectedTypes: ['selector', 'expression', 'reference'],
  });
  return {
    id: `repeat-${language}-for-in`,
    language,
    command: 'repeat',
    priority: 110, // > the generated positional repeat (100)
    template: {
      format: `repeat [${(spec.forWords ?? []).join(' ')}] {patient} ${spec.inWords.join(' ')} {source}`,
      tokens,
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'for' } },
    },
  };
}

// in-word/for-word surfaces per language (corpus forms; several langs tokenize
// the in-word as TWO tokens — ja `の 中`, ko `안 에`, qu `uku pi`).
const FOR_IN_HEADS: Array<[string, { forWords?: string[]; inWords: string[] }]> = [
  ['en', { forWords: ['for'], inWords: ['in'] }],
  ['es', { forWords: ['para'], inWords: ['en'] }],
  ['pt', { forWords: ['para'], inWords: ['dentro'] }],
  ['fr', { forWords: ['pour'], inWords: ['en'] }],
  ['it', { forWords: ['per'], inWords: ['in'] }],
  ['de', { forWords: ['für'], inWords: ['in'] }],
  ['ru', { forWords: ['для'], inWords: ['в'] }],
  ['uk', { forWords: ['для'], inWords: ['у'] }],
  ['pl', { forWords: ['dla'], inWords: ['w'] }],
  ['ar', { forWords: ['لكل'], inWords: ['في'] }],
  // he keeps English `in` untranslated; stagger inserts `עבור את` before the var.
  ['he', { forWords: ['עבור', 'את'], inWords: ['in'] }],
  ['hi', { inWords: ['में'] }],
  ['bn', { inWords: ['এ'] }],
  ['ja', { inWords: ['の', '中'] }],
  ['ko', { inWords: ['안', '에'] }],
  ['zh', { forWords: ['为', '把'], inWords: ['在'] }],
  ['tr', { inWords: ['içinde'] }],
  ['id', { forWords: ['untuk'], inWords: ['dalam'] }],
  ['ms', { forWords: ['untuk'], inWords: ['dalam'] }],
  ['sw', { forWords: ['kwa'], inWords: ['ndani'] }],
  ['th', { forWords: ['สำหรับ'], inWords: ['ใน'] }],
  ['vi', { forWords: ['với mỗi'], inWords: ['trong'] }],
  ['tl', { forWords: ['para_sa'], inWords: ['sa_loob'] }],
  ['qu', { inWords: ['uku', 'pi'] }],
];

/**
 * Conditional loop HEAD: `{repeat-verb} [pre] {while-word} {condition}` —
 * canonical roles `loopType:literal="while"` + `condition` (the guard
 * expression; typed `property-path` for the corpus's `#id.prop < N` shape —
 * the trailing comparator tokens are junk-led and discarded by the clause
 * loop, same as the en reference). Verb-first languages only: the SOV six
 * front the while-phrase BEFORE the event (`जब तक <cond> को क्लिक पर दोहराएं`),
 * which parses as a separate `while` node — out of scope for this head.
 */
function repeatWhileHead(
  language: string,
  spec: { pre?: string[]; whileWord: string }
): LanguagePattern {
  const tokens: LanguagePattern['template']['tokens'] = [{ type: 'literal', value: 'repeat' }];
  for (const w of spec.pre ?? []) tokens.push({ type: 'literal', value: w });
  tokens.push({ type: 'literal', value: spec.whileWord });
  tokens.push({
    type: 'role',
    role: 'condition',
    expectedTypes: ['property-path', 'expression'],
  });
  return {
    id: `repeat-${language}-while-head`,
    language,
    command: 'repeat',
    priority: 110,
    template: {
      format: `repeat ${(spec.pre ?? []).join(' ')} ${spec.whileWord} {condition}`,
      tokens,
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'while' } },
    },
  };
}

const WHILE_HEADS: Array<[string, { pre?: string[]; whileWord: string }]> = [
  ['en', { whileWord: 'while' }],
  ['es', { whileWord: 'mientras' }],
  ['pt', { whileWord: 'enquanto' }],
  ['fr', { whileWord: 'tantque' }],
  ['it', { whileWord: 'mentre' }],
  ['de', { whileWord: 'während' }],
  ['ru', { whileWord: 'пока' }],
  ['uk', { whileWord: 'поки' }],
  ['pl', { whileWord: 'dopóki' }],
  ['ar', { whileWord: 'بينما' }],
  ['he', { pre: ['את'], whileWord: 'כל עוד' }], // fused two-word token
  ['zh', { pre: ['把'], whileWord: '当' }],
  ['id', { whileWord: 'selama' }],
  ['ms', { whileWord: 'selagi' }],
  ['sw', { whileWord: 'wakati' }],
  ['th', { whileWord: 'ในขณะที่' }],
  ['vi', { whileWord: 'trong khi' }], // fused two-word token
  ['tl', { whileWord: 'habang' }],
];

/**
 * Event-terminated loop HEAD, verb-first: `{repeat-verb} [pre] {until-word}
 * [pre-event] {event-word} {event} [{from-word} {source}]` — the translation of
 * en's hand-crafted `repeat until event {event} [from {source}]` (which is
 * registered for en only, so every other language previously fell to the
 * generated repeat or the bare-`repeat` recovery and dropped event+source —
 * the behaviors-×3 `repeat.event`/`repeat.source` residue).
 */
function repeatUntilHeadVerbFirst(
  language: string,
  spec: {
    pre?: string[];
    untilWord: string;
    preEvent?: string;
    eventWord: string;
    fromWord: string;
  }
): LanguagePattern {
  const tokens: LanguagePattern['template']['tokens'] = [{ type: 'literal', value: 'repeat' }];
  for (const w of spec.pre ?? []) tokens.push({ type: 'literal', value: w });
  tokens.push({ type: 'literal', value: spec.untilWord });
  if (spec.preEvent) tokens.push({ type: 'literal', value: spec.preEvent });
  tokens.push({ type: 'literal', value: spec.eventWord });
  tokens.push({ type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] });
  tokens.push({
    type: 'group',
    optional: true,
    tokens: [
      { type: 'literal', value: spec.fromWord },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
    ],
  });
  return {
    id: `repeat-${language}-until-head`,
    language,
    command: 'repeat',
    priority: 110,
    template: {
      format: `repeat ${spec.untilWord} ${spec.eventWord} {event} [${spec.fromWord} {source}]`,
      tokens,
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'until-event' } },
    },
  };
}

const VERB_FIRST_UNTIL_HEADS: Array<
  [
    string,
    { pre?: string[]; untilWord: string; preEvent?: string; eventWord: string; fromWord: string },
  ]
> = [
  ['es', { untilWord: 'hasta', eventWord: 'evento', fromWord: 'de' }],
  ['pt', { untilWord: 'até', eventWord: 'evento', fromWord: 'de' }],
  ['fr', { untilWord: 'jusquà', eventWord: 'événement', fromWord: 'de' }],
  ['it', { untilWord: 'fino', eventWord: 'evento', fromWord: 'da' }],
  ['de', { untilWord: 'bis', eventWord: 'ereignis', fromWord: 'von' }],
  ['ru', { untilWord: 'до', eventWord: 'событие', fromWord: 'из' }],
  ['uk', { untilWord: 'до', eventWord: 'подія', fromWord: 'з' }],
  ['pl', { untilWord: 'aż', eventWord: 'zdarzenie', fromWord: 'z' }],
  ['ar', { untilWord: 'حتى', eventWord: 'حدث', fromWord: 'من' }],
  ['he', { untilWord: 'עד', preEvent: 'את', eventWord: 'אירוע', fromWord: 'מ' }],
  ['id', { untilWord: 'sampai', eventWord: 'peristiwa', fromWord: 'dari' }],
  ['ms', { untilWord: 'sehingga', eventWord: 'peristiwa', fromWord: 'dari' }],
  ['sw', { untilWord: 'hadi', eventWord: 'tukio', fromWord: 'kutoka' }],
  ['th', { untilWord: 'จนถึง', eventWord: 'เหตุการณ์', fromWord: 'จาก' }],
  ['vi', { untilWord: 'cho đến khi', eventWord: 'sự kiện', fromWord: 'từ' }],
  ['tl', { untilWord: 'hanggang', eventWord: 'pangyayari', fromWord: 'mula_sa' }],
  ['zh', { pre: ['把'], untilWord: '直到', eventWord: '事件', fromWord: '从' }],
];

/**
 * Event-terminated loop HEAD, SOV statement order: `{until-word} {event-word}
 * {event} {obj-marker} {repeat-verb} [{source} {from-marker}]`. This is the
 * transformer's STATEMENT-context emission (the behaviors' repeat line:
 * ko `까지 이벤트 pointerup 를 반복 문서 에서`); the HANDLER-context emission
 * (`반복 이벤트 X 를 까지`) is covered by the fused-capture recovery in
 * buildEventHandler. The trailing `{source} {from-marker}` pair is part of the
 * head (postpositional), captured in-pattern so its TYPE matches the en
 * reference's `source:expression`.
 */
function repeatUntilHeadSOV(
  language: string,
  spec: { untilWord: string; eventWord: string; objMarker: string; fromWord: string }
): LanguagePattern {
  return {
    id: `repeat-${language}-until-head`,
    language,
    command: 'repeat',
    priority: 110,
    template: {
      format: `${spec.untilWord} ${spec.eventWord} {event} ${spec.objMarker} repeat [{source} ${spec.fromWord}]`,
      tokens: [
        { type: 'literal', value: spec.untilWord },
        { type: 'literal', value: spec.eventWord },
        { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
        { type: 'literal', value: spec.objMarker },
        { type: 'literal', value: 'repeat' },
        {
          type: 'group',
          optional: true,
          tokens: [
            {
              type: 'role',
              role: 'source',
              expectedTypes: ['selector', 'reference', 'expression'],
            },
            { type: 'literal', value: spec.fromWord },
          ],
        },
      ],
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'until-event' } },
    },
  };
}

/**
 * Verb-final twin of {@link repeatUntilHeadSOV}: `{until-word} {event-word}
 * {event} {obj-marker} {source} {from-marker} {repeat-verb}` — the source
 * phrase INSIDE the clause, before the verb (tr `kadar olay pointerup i belge
 * den tekrarla`). This is the grammatically-correct SOV order the i18n
 * transformer emits since the transformer-rendering arc; the post-verb
 * variant above still matches the pre-arc corpus shape (`… tekrarla belge
 * den`), kept as a tolerance lock. The source group is REQUIRED here so this
 * variant never outbids the post-verb one on sourceless heads.
 */
function repeatUntilHeadSOVVerbFinal(
  language: string,
  spec: { untilWord: string; eventWord: string; objMarker: string; fromWord: string }
): LanguagePattern {
  return {
    id: `repeat-${language}-until-head-verb-final`,
    language,
    command: 'repeat',
    priority: 111, // above the post-verb variant so the correct shape wins
    template: {
      format: `${spec.untilWord} ${spec.eventWord} {event} ${spec.objMarker} {source} ${spec.fromWord} repeat`,
      tokens: [
        { type: 'literal', value: spec.untilWord },
        { type: 'literal', value: spec.eventWord },
        { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
        { type: 'literal', value: spec.objMarker },
        {
          type: 'role',
          role: 'source',
          expectedTypes: ['selector', 'reference', 'expression'],
        },
        { type: 'literal', value: spec.fromWord },
        { type: 'literal', value: 'repeat' },
      ],
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'until-event' } },
    },
  };
}

/**
 * Mid-clause twin of {@link repeatUntilHeadQu}: anchors at `kama`(→until)
 * WITHOUT the `hayk _ a` junk prefix. Inside a multi-command clause (the
 * sortable behavior body) the PRECEDING command's verb-first pattern greedily
 * consumes `hayk` as its trailing role, so the clause loop reaches the repeat
 * head at `_ a kama …` and skips to `kama` — where the prefixed variant can no
 * longer match. Both variants are HEAD-ONLY (id ends in `-until-head` for the
 * re-parse allowlist).
 */
const repeatUntilHeadQuMidClause: LanguagePattern = {
  id: 'repeat-qu-midclause-until-head',
  language: 'qu',
  command: 'repeat',
  priority: 109, // below the prefixed variant so position-0 parses prefer it
  template: {
    format: 'until event {event} ta {source} manta repeat',
    tokens: [
      { type: 'literal', value: 'until' },
      { type: 'literal', value: 'event' },
      { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'ta' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
      { type: 'literal', value: 'manta' },
      { type: 'literal', value: 'repeat' },
    ],
  },
  extraction: {
    loopType: { default: { type: 'literal', value: 'until-event' } },
  },
};

const SOV_UNTIL_HEADS: Array<
  [string, { untilWord: string; eventWord: string; objMarker: string; fromWord: string }]
> = [
  ['hi', { untilWord: 'तक', eventWord: 'घटना', objMarker: 'को', fromWord: 'से' }],
  ['bn', { untilWord: 'পর্যন্ত', eventWord: 'ঘটনা', objMarker: 'কে', fromWord: 'থেকে' }],
  ['ja', { untilWord: 'まで', eventWord: 'イベント', objMarker: 'を', fromWord: 'から' }],
  ['ko', { untilWord: '까지', eventWord: '이벤트', objMarker: '를', fromWord: '에서' }],
  ['tr', { untilWord: 'kadar', eventWord: 'olay', objMarker: 'i', fromWord: 'den' }],
];

/**
 * qu event-terminated loop HEAD: `hayk_akama ruway {event} ta {source} manta
 * kutipay` — until + event-kw fronted, source phrase BEFORE the clause-final
 * verb (unlike the other SOV five, where source trails the verb). The
 * `hayk_akama` until-compound tokenizes as `hayk _ a kama`(→until); the junk
 * prefix is matched IN-PATTERN because a standalone statement parse only
 * tries patterns at position 0 (it has no skip-ahead — the behaviors' repeat
 * line is exactly this statement). The trailing literals are NORMALIZED forms
 * (kama→until, ruway→event, kutipay→repeat), so the head survives dictionary
 * respellings of the verbs.
 */
const repeatUntilHeadQu: LanguagePattern = {
  id: 'repeat-qu-until-head',
  language: 'qu',
  command: 'repeat',
  priority: 110,
  template: {
    format: 'hayk _ a until event {event} ta {source} manta repeat',
    tokens: [
      { type: 'literal', value: 'hayk' },
      { type: 'literal', value: '_' },
      { type: 'literal', value: 'a' },
      { type: 'literal', value: 'until' },
      { type: 'literal', value: 'event' },
      { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'ta' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
      { type: 'literal', value: 'manta' },
      { type: 'literal', value: 'repeat' },
    ],
  },
  extraction: {
    loopType: { default: { type: 'literal', value: 'until-event' } },
  },
};

/**
 * Verb-FINAL for-binding head — the SOV mirror of `repeatForInHead`, emitted
 * as action `for` to match the en reference (`for-en-basic`: `for item in
 * $items` → for.patient:expression + for.source:reference; list-build's loop
 * head). The transformer renders the SOV head clause-final-verb:
 *   ja `item の 中 $items を ために`      qu `item uku pi $items ta sapankaq`
 * No pattern covered the shape, so the verb-anchoring fallback shredded it on
 * the in/object particles (ja destination:literal="item" patient:literal=
 * "中$items", qu event:literal="itemuku" — R1 Family D, ×2 rows in all six).
 * The object particle before the for-verb is optional so a hand-written
 * marker-less head still parses. Head-only: the loop BODY follows after a
 * then-connective and parses as sibling commands, exactly like en.
 */
function sovForBindingHead(
  language: string,
  spec: { inWords: string[]; objMarker: string; forVerb: string }
): LanguagePattern {
  return {
    id: `for-${language}-sov-basic`,
    language,
    command: 'for',
    priority: 105,
    template: {
      format: `{patient} ${spec.inWords.join(' ')} {source} [${spec.objMarker}] ${spec.forVerb}`,
      tokens: [
        { type: 'role', role: 'patient', expectedTypes: ['expression', 'reference'] },
        ...spec.inWords.map(w => ({ type: 'literal' as const, value: w })),
        { type: 'role', role: 'source', expectedTypes: ['selector', 'expression', 'reference'] },
        {
          type: 'group',
          optional: true,
          tokens: [{ type: 'literal', value: spec.objMarker }],
        },
        { type: 'literal', value: spec.forVerb },
      ],
    },
    extraction: {
      patient: { position: 0 },
    },
  };
}

// Corpus surfaces (token kinds vary — tr için is a particle, bn জন্য carries
// no normalized 'for' — so literals match by VALUE; in-words reuse the
// FOR_IN_HEADS table's split forms).
const SOV_FOR_BINDING_HEADS: Array<
  [string, { inWords: string[]; objMarker: string; forVerb: string }]
> = [
  ['ja', { inWords: ['の', '中'], objMarker: 'を', forVerb: 'ために' }],
  ['ko', { inWords: ['안', '에'], objMarker: '를', forVerb: '각각' }],
  ['tr', { inWords: ['içinde'], objMarker: 'i', forVerb: 'için' }],
  ['qu', { inWords: ['uku', 'pi'], objMarker: 'ta', forVerb: 'sapankaq' }],
  ['bn', { inWords: ['এ'], objMarker: 'কে', forVerb: 'জন্য' }],
  ['hi', { inWords: ['में'], objMarker: 'को', forVerb: 'हेतु' }],
];

const BY_LANG = new Map<string, LanguagePattern[]>();
const addPattern = (lang: string, p: LanguagePattern) => {
  const list = BY_LANG.get(lang);
  if (list) list.push(p);
  else BY_LANG.set(lang, [p]);
};
for (const [lang, verb, countWord, marker] of VERB_FIRST_REPEAT_TIMES) {
  addPattern(lang, repeatTimesHead(lang, verb, countWord, marker));
}
for (const [lang, countWord, marker] of SOV_REPEAT_TIMES) {
  addPattern(lang, repeatTimesHeadSOV(lang, countWord, marker));
}
for (const [lang, spec] of FOR_IN_HEADS) {
  addPattern(lang, repeatForInHead(lang, spec));
}
for (const [lang, spec] of SOV_FOR_BINDING_HEADS) {
  addPattern(lang, sovForBindingHead(lang, spec));
}
for (const [lang, spec] of WHILE_HEADS) {
  addPattern(lang, repeatWhileHead(lang, spec));
}
for (const [lang, spec] of VERB_FIRST_UNTIL_HEADS) {
  addPattern(lang, repeatUntilHeadVerbFirst(lang, spec));
}
for (const [lang, spec] of SOV_UNTIL_HEADS) {
  addPattern(lang, repeatUntilHeadSOV(lang, spec));
  // tr renders the source phrase pre-verb since the transformer-rendering
  // arc (the i18n `repeat-until-event-verb-final` rule); hi/bn/ja/ko renders
  // are unchanged (post-verb) so they don't get the verb-final variant.
  if (lang === 'tr') {
    addPattern(lang, repeatUntilHeadSOVVerbFinal(lang, spec));
  }
}
addPattern('qu', repeatUntilHeadQu);
addPattern('qu', repeatUntilHeadQuMidClause);

/**
 * Get repeat loop-HEAD patterns for a specific language (counted `-times`
 * heads + the cluster-D `for-in` / `while` / `until-event` heads).
 * Note: `en` rows here are ALSO pushed by patterns/en.ts buildEnglishPatterns
 * (the registered-patterns path); builders.ts picks them up via
 * PATTERN_LOADERS. The en `until event` variants stay in en.ts (hand-crafted
 * originals).
 */
export function getRepeatPatternsForLanguage(language: string): LanguagePattern[] {
  return BY_LANG.get(language) ?? [];
}
