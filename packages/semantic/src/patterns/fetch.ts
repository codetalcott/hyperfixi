/**
 * Fetch Command Patterns (hand-crafted)
 *
 * Most languages parse `fetch <url>` via the auto-generated
 * `fetch-{lang}-generated` pattern, which marks the `source` URL with the
 * profile's source marker (zh `从`). Chinese needs a hand-crafted variant
 * because the i18n grammar transformer runs `fetch /api/data` through its
 * generic argument parser, which defaults the leading argument to the `patient`
 * role and therefore marks it with the BA particle `把` — emitting
 * `抓取 把 /api/data` (and `抓取 把 /api/data 的 json` for `fetch … as json`,
 * with `的` standing in for `as`). Neither matches the generated `抓取 从 …`
 * form, so a `fetch` inside an event block / then-chain dropped (degenerate
 * `{on}`). See docs-internal/ZH_BLOCK_BODY_SCOPE.md (#3).
 *
 * This pattern tolerates the BA marker (`把`, optional) before the `source` URL
 * — mirroring the `toggle-zh-ba` / `wait-zh-ba` convention — and the `的` / `作为`
 * "as" marker before the optional `responseType`. The `从`-marked form is still
 * covered by the generated pattern.
 */

import type {
  LanguagePattern,
  PatternToken,
  ExtractionRule,
  LiteralPatternToken,
  RolePatternToken,
} from '../types';
import { tryGetProfile } from '../registry';

/**
 * The optional `with {options}` group, built from the profile's own `style`
 * marker.
 *
 * Every hand-written fetch pattern here sits at priority 105 and exists to
 * recover a surface the generated pattern cannot anchor. But none of them
 * carried a `style` slot, and priority is what `findBestPattern` reads first —
 * so `fetch /api with {method:"POST"}` selected a pattern with nowhere to put
 * the options object and dropped it. `fetch.style` was the single largest role
 * loss in the whole en->foreign residual (92 pairs), and `responseType` (40)
 * rode along with it.
 *
 * The marker comes from `profile.roleMarkers.style`, which every one of the 23
 * profiles defines — so this stays one source of truth rather than a 23-entry
 * table, and its `position` decides the order: SVO marks before the value
 * (es `con {…}`), SOV after it (ja `{…} で`).
 */
function styleGroup(language: string): { token: PatternToken; extraction: ExtractionRule } | null {
  const marker = tryGetProfile(language)?.roleMarkers?.style;
  if (!marker?.primary) return null;
  const literal: LiteralPatternToken = {
    type: 'literal',
    value: marker.primary,
    ...(marker.alternatives?.length ? { alternatives: marker.alternatives } : {}),
  };
  // `style` is expression-ONLY by schema: the matcher routes a `{ … }` run in an
  // expression-only slot through its object-literal fold, which is what lets the
  // expression parser rebuild a real objectLiteral rather than a token soup.
  const role: RolePatternToken = { type: 'role', role: 'style', expectedTypes: ['expression'] };
  return {
    token: {
      type: 'group',
      optional: true,
      tokens: marker.position === 'after' ? [role, literal] : [literal, role],
    },
    extraction: {
      marker: marker.primary,
      ...(marker.alternatives?.length ? { markerAlternatives: marker.alternatives } : {}),
    },
  };
}

function getFetchPatternsZh(): LanguagePattern[] {
  const zhStyle = styleGroup('zh');
  return [
    {
      id: 'fetch-zh-ba',
      language: 'zh',
      command: 'fetch',
      priority: 105,
      template: {
        format: '抓取 把 {source} 的 {responseType}',
        tokens: [
          // `获得` removed: it is the zh dict's `get` word (profile get is 获取/获得/
          // 取得), so listing it here let `获得 把 #x` mis-parse as fetch (get-value
          // lossy → phantom fetch). The dedicated `get-zh-ba` pattern now claims it.
          { type: 'literal', value: '抓取', alternatives: ['取'] },
          // BA-marked source (transformer output); 从 also tolerated for symmetry
          // with the generated source-marked form.
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: '把', alternatives: ['从', '由'] }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          // Optional "as <responseType>": transformer emits 的; 作为 is the natural form.
          ...(zhStyle ? [zhStyle.token] : []),
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: '的', alternatives: ['作为', '当作'] },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: '把', markerAlternatives: ['从', '由'] },
        ...(zhStyle ? { style: zhStyle.extraction } : {}),
        responseType: { marker: '的', markerAlternatives: ['作为', '当作'] },
      },
    },
  ];
}

function getFetchPatternsMs(): LanguagePattern[] {
  const msStyle = styleGroup('ms');
  return [
    {
      // Malay fetch. The transformer emits `ambil_dari {source}` for `fetch <url>`
      // (the verb `ambil_dari` already carries "from"), and `… sebagai {responseType}`
      // for `as json`. The generated pattern expected a separate `dari` source marker
      // (`ambil_dari dari …`), so the marker-less transform output dropped. This
      // tolerates the optional `dari` and the `sebagai` responseType. See
      // ZH_BLOCK_BODY_SCOPE.md (#2 sweep / ms profile; same shape as fetch-zh-ba).
      id: 'fetch-ms',
      language: 'ms',
      command: 'fetch',
      priority: 105,
      template: {
        format: 'ambil_dari dari {source} sebagai {responseType}',
        tokens: [
          { type: 'literal', value: 'ambil_dari', alternatives: ['muat', 'ambil'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'dari' }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          ...(msStyle ? [msStyle.token] : []),
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'sebagai', alternatives: ['sbg'] },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: 'dari' },
        ...(msStyle ? { style: msStyle.extraction } : {}),
        responseType: { marker: 'sebagai', markerAlternatives: ['sbg'] },
      },
    },
  ];
}

function getFetchPatternsFr(): LanguagePattern[] {
  const frStyle = styleGroup('fr');
  return [
    {
      // French fetch. For `fetch <url>` (no `from`) the i18n transformer emits a
      // marker-less `récupérer /api/data` (dict `fetch: récupérer`; profile primary
      // `chercher`), but the generated pattern requires a `de` source marker
      // (`chercher de …`), so the marker-less form dropped — collapsing an
      // `async fetch … then put …` / `fetch … as JSON then put …` body to a phantom
      // `set` (degenerate `{on, set}`). Tolerates the optional `de` and the `comme`
      // responseType. Same shape as fetch-ms / fetch-zh-ba; the `de`-marked form is
      // still covered by the generated pattern.
      id: 'fetch-fr',
      language: 'fr',
      command: 'fetch',
      priority: 105,
      template: {
        format: 'chercher de {source} comme {responseType}',
        tokens: [
          { type: 'literal', value: 'chercher', alternatives: ['récupérer'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'de' }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          ...(frStyle ? [frStyle.token] : []),
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'comme' },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: 'de' },
        responseType: { marker: 'comme' },
        ...(frStyle ? { style: frStyle.extraction } : {}),
      },
    },
  ];
}

function getFetchPatternsPt(): LanguagePattern[] {
  const ptStyle = styleGroup('pt');
  return [
    {
      // Portuguese fetch — same marker-less-transform shape as French (above).
      // `fetch <url>` emits `buscar /api/data` (dict + profile `buscar`), but the
      // generated pattern requires a `de` source marker, so the marker-less form
      // dropped. Tolerates the optional `de` and the `como` responseType.
      id: 'fetch-pt',
      language: 'pt',
      command: 'fetch',
      priority: 105,
      template: {
        format: 'buscar de {source} como {responseType}',
        tokens: [
          { type: 'literal', value: 'buscar' },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'de' }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          ...(ptStyle ? [ptStyle.token] : []),
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'como' },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: 'de' },
        responseType: { marker: 'como' },
        ...(ptStyle ? { style: ptStyle.extraction } : {}),
      },
    },
  ];
}

// Shared shape for the marker-less `fetch <url>` recovery (see fetch-fr / fetch-pt):
// `<verb> [<from-marker>] {source} [<as-marker> {responseType}]`. For `fetch <url>`
// (no `from`) the i18n transformer emits a marker-less `<verb> /api/data`, but the
// generated pattern requires the source marker — so `fetch` dropped (the body kept
// {on, put}, fid ~0.67: a faithful-but-incomplete pass that silently lost `fetch`).
function markerlessFetch(
  id: string,
  language: string,
  verb: string,
  fromMarker: string,
  asMarker: string,
  verbAlternatives?: string[],
  fromMarkerAlternatives?: string[],
  asMarkerAlternatives?: string[]
): LanguagePattern {
  const style = styleGroup(language);
  return {
    id,
    language,
    command: 'fetch',
    priority: 105,
    template: {
      format: `${verb} ${fromMarker} {source} ${asMarker} {responseType}`,
      tokens: [
        {
          type: 'literal',
          value: verb,
          ...(verbAlternatives ? { alternatives: verbAlternatives } : {}),
        },
        {
          type: 'group',
          optional: true,
          tokens: [
            {
              type: 'literal',
              value: fromMarker,
              ...(fromMarkerAlternatives ? { alternatives: fromMarkerAlternatives } : {}),
            },
          ],
        },
        { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
        ...(style ? [style.token] : []),
        {
          type: 'group',
          optional: true,
          tokens: [
            {
              type: 'literal',
              value: asMarker,
              ...(asMarkerAlternatives ? { alternatives: asMarkerAlternatives } : {}),
            },
            { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
          ],
        },
      ],
    },
    extraction: {
      source: {
        marker: fromMarker,
        ...(fromMarkerAlternatives ? { markerAlternatives: fromMarkerAlternatives } : {}),
      },
      ...(style ? { style: style.extraction } : {}),
      responseType: {
        marker: asMarker,
        ...(asMarkerAlternatives ? { markerAlternatives: asMarkerAlternatives } : {}),
      },
    },
  };
}

// Verb-FINAL SOV `fetch <url>` recovery. The transformer reorders `fetch /api/data`
// to `{source} <patient-marker> <verb>` (ja `/api/data を フェッチ`, qu `/api/data ta
// apamuy`) — the URL is fronted and marked with the *patient* (object) marker, since
// the generic argument parser defaults the first unmarked arg to `patient` and SOV is
// verb-final. The generated `fetch-{lang}-generated` requires the SOURCE marker
// (qu `manta`, bn `থেকে`), which the transformer never emits here, so the bare SOV
// fetch matched nothing and returned NULL (ja/ko/tr/hi/qu/bn). This accepts the
// patient marker before the verb-final fetch verb and maps the URL to `source`
// (mirroring fetch-zh-ba, which tolerates zh's BA object marker `把` for the source).
// The patient marker is optional so a hand-written marker-less `<url> <verb>` also
// parses. responseType (`as json`) is intentionally omitted: its SOV surface marker
// varies per language (ja none, ko 로, tr olarak, hi के रूप में) and is not in the
// R1 drop cluster — the trailing tokens are left unconsumed (source still captured).
function sovFetch(
  id: string,
  language: string,
  verb: string,
  patientMarker: string,
  verbAlternatives?: string[],
  patientMarkerAlternatives?: string[],
  asMarker?: string,
  asMarkerAlternatives?: string[]
): LanguagePattern {
  const style = styleGroup(language);
  // Trailing `as {responseType}`, which the six SOV languages put AFTER the
  // verb-final verb — the one thing that made this a group of its own rather
  // than another pre-verb slot. bn and ja emit no marker at all, so the slot is
  // bare there; see the call sites for the surfaces each language actually
  // produces.
  const responseTypeTokens: PatternToken[] = [
    { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
  ];
  if (asMarker) {
    responseTypeTokens.push({
      type: 'literal',
      value: asMarker,
      ...(asMarkerAlternatives ? { alternatives: asMarkerAlternatives } : {}),
    });
  }
  const responseTypeGroup: PatternToken = {
    type: 'group',
    optional: true,
    tokens: responseTypeTokens,
  };
  return {
    id,
    language,
    command: 'fetch',
    priority: 105,
    template: {
      format: `{source} ${patientMarker} ${verb}`,
      tokens: [
        { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
        {
          type: 'group',
          optional: true,
          tokens: [
            {
              type: 'literal',
              value: patientMarker,
              ...(patientMarkerAlternatives ? { alternatives: patientMarkerAlternatives } : {}),
            },
          ],
        },
        ...(style ? [style.token] : []),
        {
          type: 'literal',
          value: verb,
          ...(verbAlternatives ? { alternatives: verbAlternatives } : {}),
        },
        responseTypeGroup,
      ],
    },
    extraction: {
      source: {
        marker: patientMarker,
        ...(patientMarkerAlternatives ? { markerAlternatives: patientMarkerAlternatives } : {}),
      },
      ...(style ? { style: style.extraction } : {}),
      responseType: asMarker
        ? {
            marker: asMarker,
            ...(asMarkerAlternatives ? { markerAlternatives: asMarkerAlternatives } : {}),
          }
        : {},
    },
  };
}

/**
 * Get fetch patterns for a specific language.
 */
export function getFetchPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'zh':
      return getFetchPatternsZh();
    case 'ms':
      return getFetchPatternsMs();
    case 'fr':
      return getFetchPatternsFr();
    case 'pt':
      return getFetchPatternsPt();
    // Marker-less fetch recovery for languages whose generated pattern requires a
    // source marker the transformer doesn't emit for `fetch <url>` (no `from`).
    case 'es':
      return [markerlessFetch('fetch-es', 'es', 'buscar', 'de', 'como')];
    case 'pl':
      return [markerlessFetch('fetch-pl', 'pl', 'pobierz', 'z', 'jako')];
    case 'id':
      // dict emits `ambil`, profile primary is `muat` — accept both.
      return [markerlessFetch('fetch-id', 'id', 'muat', 'dari', 'sebagai', ['ambil'])];
    case 'sw':
      // `kuwa` is what the transformer now emits for `as` (sw `kama` is the IF
      // keyword — the phantom-if homonym; see dictionaries/sw.ts). Hand-written
      // `kama` stays tolerated in as-marker position.
      return [
        markerlessFetch('fetch-sw', 'sw', 'leta', 'kutoka', 'kuwa', undefined, undefined, ['kama']),
      ];
    case 'he':
      // transformer inserts the `את` accusative particle (`הבא את /url`) where the
      // generated pattern expects `מ` (from); accept either. Verb alt `טען`.
      return [markerlessFetch('fetch-he', 'he', 'הבא', 'מ', 'כ', ['טען'], ['את'])];
    // fetch-loading-state / event-debounce cluster (9 langs): same marker-less
    // shape — the dict verb matches the profile, but `fetch <url>` emits no
    // source marker so the generated pattern never anchors mid then-chain.
    case 'de':
      return [markerlessFetch('fetch-de', 'de', 'abrufen', 'von', 'als', ['laden'])];
    case 'ru':
      return [markerlessFetch('fetch-ru', 'ru', 'загрузить', 'из', 'как', ['загрузи'])];
    case 'uk':
      return [markerlessFetch('fetch-uk', 'uk', 'завантажити', 'з', 'як', ['завантаж'])];
    case 'it':
      return [markerlessFetch('fetch-it', 'it', 'recuperare', 'da', 'come')];
    case 'vi':
      return [markerlessFetch('fetch-vi', 'vi', 'tải', 'từ', 'như')];
    case 'th':
      return [markerlessFetch('fetch-th', 'th', 'ดึงข้อมูล', 'จาก', 'เป็น')];
    case 'ar':
      return [markerlessFetch('fetch-ar', 'ar', 'احضر', 'من', 'كـ', ['جلب'])];
    case 'tl':
      return [
        markerlessFetch('fetch-tl', 'tl', 'kuhanin_mula', 'mula_sa', 'bilang', ['kunin_mula']),
      ];
    // Verb-final SOV `fetch <url>` — patient-marked URL → source (see sovFetch).
    // Verbs/markers from each profile (the transformer may emit a keyword
    // *alternative*, e.g. ko 가져오기, so both primary + alternatives are listed).
    case 'ja':
      // ja emits `フェッチ json` with NO as-marker — the schema's `として`
      // markerOverride is not what the transformer produces here — so the slot
      // is bare and positional.
      return [sovFetch('fetch-ja-sov', 'ja', 'フェッチ', 'を', ['取得'])];
    case 'ko':
      // ko emits `가져오기 json 로`. NOTE `로` is ALSO ko's style marker, so the
      // two groups are told apart by position (style precedes the verb, this
      // trails it) rather than by the marker itself.
      return [sovFetch('fetch-ko-sov', 'ko', '패치', '을', ['가져오기'], ['를'], '로', ['으로'])];
    case 'tr':
      return [
        // tr emits `getir json olarak`.
        sovFetch(
          'fetch-tr-sov',
          'tr',
          'getir',
          'i',
          undefined,
          ['ı', 'u', 'ü', 'yi', 'yı', 'yu', 'yü'],
          'olarak'
        ),
      ];
    case 'hi':
      // hi emits `लाएं json के रूप में`, but the marker is deliberately OMITTED
      // here: a multi-token literal does not match in this trailing position
      // (`के रूप में`, `रूप में` and `के रूप` were each measured — all three
      // leave the group unmatched, so the optional group is skipped and the role
      // never binds). A bare slot captures `json` and leaves the postposition as
      // trailing unconsumed tokens, which means it parses BOTH the rendered
      // surface and the i18n corpus surface. The cost is that the rendered hi
      // reads `लाएं json` rather than the fuller `लाएं json के रूप में` — less
      // idiomatic, but the role survives, and a lost role is the worse outcome.
      return [sovFetch('fetch-hi-sov', 'hi', 'लाएं', 'को')];
    case 'qu':
      // qu emits `apamuy json hina`.
      return [sovFetch('fetch-qu-sov', 'qu', 'apamuy', 'ta', ['taripakaramuy'], undefined, 'hina')];
    case 'bn':
      // bn emits `আনুন json` — like ja, no as-marker.
      return [sovFetch('fetch-bn-sov', 'bn', 'আনুন', 'কে')];
    default:
      return [];
  }
}
